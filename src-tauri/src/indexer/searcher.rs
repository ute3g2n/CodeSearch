/// Tantivy 検索実行モジュール
/// クエリパース → 検索 → 結果グルーピング → マッチ範囲計算
use std::collections::BTreeMap;

use tantivy::{
    collector::TopDocs,
    query::{AllQuery, BooleanQuery, Occur, Query, TermQuery},
    schema::{IndexRecordOption, Value},
    Term,
};

use crate::errors::AppError;
use crate::models::search::{SearchMatch, SearchOptions, SearchResultGroup};

use super::index_manager::IndexManager;

/// 検索実行クラス
pub struct Searcher<'a> {
    mgr: &'a IndexManager,
}

impl<'a> Searcher<'a> {
    /// IndexManager から Searcher を作成する
    pub fn new(mgr: &'a IndexManager) -> Result<Self, AppError> {
        Ok(Searcher { mgr })
    }

    /// クエリを実行し、ファイルごとにグループ化した結果を返す
    ///
    /// - `query`: 検索テキスト（正規表現 or 全文）
    /// - `opts`: 検索オプション
    /// - `workspace_root`: 相対パス計算のルートパス
    pub fn search(
        &self,
        query: &str,
        opts: &SearchOptions,
        workspace_root: &str,
    ) -> Result<Vec<SearchResultGroup>, AppError> {
        if query.is_empty() {
            return Ok(vec![]);
        }

        let max = opts.max_results.unwrap_or(10_000) as usize;

        let searcher = self.mgr.reader().searcher();

        // クエリ構築
        // 正規表現モードは AllQuery で全ドキュメントを取得し、後処理でフィルタする
        let tantivy_query: Box<dyn Query> = if opts.is_regex {
            Box::new(AllQuery)
        } else {
            self.build_term_query(query, opts)?
        };

        // 検索実行（ドキュメント件数の上限は max * 10 で余裕を持つ）
        let top_docs = searcher
            .search(&tantivy_query, &TopDocs::with_limit(max * 10))
            .map_err(|e| AppError::IndexError {
                message: format!("検索に失敗: {e}"),
            })?;

        // file_path → (line_number, line_content) のマップで集約
        let mut grouped: BTreeMap<String, Vec<(u32, String)>> = BTreeMap::new();

        for (_score, doc_address) in &top_docs {
            let doc: tantivy::TantivyDocument = searcher
                .doc(*doc_address)
                .map_err(|e| AppError::IndexError {
                    message: format!("ドキュメント取得に失敗: {e}"),
                })?;

            let file_path = doc
                .get_first(self.mgr.schema.file_path)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let line_number = doc
                .get_first(self.mgr.schema.line_number)
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as u32;
            let line_content = doc
                .get_first(self.mgr.schema.line_content)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            grouped
                .entry(file_path)
                .or_default()
                .push((line_number, line_content));
        }

        // 結果を SearchResultGroup に変換
        let mut result_groups: Vec<SearchResultGroup> = Vec::new();

        for (file_path, mut matches) in grouped {
            // ファイルフィルタ適用
            if let Some(inc) = &opts.include_glob {
                if !matches_glob_pattern(inc, &file_path) {
                    continue;
                }
            }
            if let Some(exc) = &opts.exclude_glob {
                if matches_glob_pattern(exc, &file_path) {
                    continue;
                }
            }

            // 行番号で昇順ソート
            matches.sort_by_key(|(ln, _)| *ln);

            let relative_path = file_path
                .strip_prefix(workspace_root)
                .unwrap_or(&file_path)
                .trim_start_matches('/')
                .trim_start_matches('\\')
                .to_string();

            let search_matches: Vec<SearchMatch> = matches
                .into_iter()
                .filter_map(|(line_number, line_content)| {
                    // 後処理フィルタ: 大文字小文字・単語境界
                    let ranges = find_match_ranges(&line_content, query, opts)?;
                    Some(SearchMatch {
                        line_number,
                        line_content,
                        match_ranges: ranges,
                    })
                })
                .collect();

            if search_matches.is_empty() {
                continue;
            }

            result_groups.push(SearchResultGroup {
                file_path,
                relative_path,
                matches: search_matches,
            });
        }

        // ファイルパス昇順でソート
        result_groups.sort_by(|a, b| a.file_path.cmp(&b.file_path));

        Ok(result_groups)
    }

    /// 全文検索クエリを構築する（トークンをORで結合）
    fn build_term_query(
        &self,
        query: &str,
        opts: &SearchOptions,
    ) -> Result<Box<dyn Query>, AppError> {
        use tantivy::tokenizer::{TokenStream, Tokenizer};

        let normalized = if opts.case_sensitive {
            query.to_string()
        } else {
            query.to_lowercase()
        };

        // JaTokenizer でクエリをトークン化
        let mut tokenizer = super::tokenizer::JaTokenizer;
        let mut stream = tokenizer.token_stream(&normalized);

        let mut sub_queries: Vec<(Occur, Box<dyn Query>)> = Vec::new();

        while stream.advance() {
            let token_text = stream.token().text.clone();
            let term = Term::from_field_text(self.mgr.schema.line_content, &token_text);
            let q: Box<dyn Query> = Box::new(TermQuery::new(
                term,
                IndexRecordOption::WithFreqsAndPositions,
            ));
            sub_queries.push((Occur::Must, q));
        }

        if sub_queries.is_empty() {
            // トークンが空になった場合は元文字列をそのままTermとして使用
            let term = Term::from_field_text(
                self.mgr.schema.line_content,
                &normalized,
            );
            return Ok(Box::new(TermQuery::new(
                term,
                IndexRecordOption::WithFreqsAndPositions,
            )));
        }

        if sub_queries.len() == 1 {
            return Ok(sub_queries.remove(0).1);
        }

        Ok(Box::new(BooleanQuery::new(sub_queries)))
    }

}

/// 行テキスト内でクエリ文字列のマッチ範囲をすべて返す
///
/// 後処理フィルタとして使用（インデックス検索はトークン単位のため、
/// 実際の文字列マッチ位置はここで再計算する）
fn find_match_ranges(
    line: &str,
    query: &str,
    opts: &SearchOptions,
) -> Option<Vec<(usize, usize)>> {
    let (search_line, search_query) = if opts.case_sensitive {
        (line.to_string(), query.to_string())
    } else {
        (line.to_lowercase(), query.to_lowercase())
    };

    if opts.is_regex {
        // 正規表現マッチ
        let re = regex::Regex::new(&search_query).ok()?;
        let ranges: Vec<(usize, usize)> = re
            .find_iter(&search_line)
            .map(|m| (m.start(), m.end()))
            .collect();
        if ranges.is_empty() {
            None
        } else {
            Some(ranges)
        }
    } else {
        // 部分文字列マッチ
        let mut ranges = Vec::new();
        let mut start = 0;
        while let Some(pos) = search_line[start..].find(&search_query) {
            let abs = start + pos;
            let end = abs + search_query.len();
            if opts.whole_word {
                let before_ok = abs == 0
                    || !search_line
                        .chars()
                        .nth(search_line[..abs].chars().count().saturating_sub(1))
                        .map(|c| c.is_alphanumeric() || c == '_')
                        .unwrap_or(false);
                let after_ok = end >= search_line.len()
                    || !search_line[end..]
                        .chars()
                        .next()
                        .map(|c| c.is_alphanumeric() || c == '_')
                        .unwrap_or(false);
                if before_ok && after_ok {
                    ranges.push((abs, end));
                }
            } else {
                ranges.push((abs, end));
            }
            start = abs + search_query.len().max(1);
        }
        if ranges.is_empty() {
            None
        } else {
            Some(ranges)
        }
    }
}

/// glob パターンでファイルパスをマッチするか確認する
fn matches_glob_pattern(pattern: &str, path: &str) -> bool {
    pattern
        .split(',')
        .map(|p| p.trim())
        .filter(|p| !p.is_empty())
        .any(|p| glob::Pattern::new(p).map(|g| g.matches(path)).unwrap_or(false))
}
