use std::path::Path;
use tokio::fs;

use crate::encoding::detector;
use crate::errors::AppError;
use crate::models::file::{FileContent, FileMatch, FileNode};

/// バイナリ判定に使用する先頭バイト数
const BINARY_CHECK_BYTES: usize = 8192;

/// ファイル操作サービス
pub struct FileService {
    /// 除外パターン（glob形式）
    exclude_patterns: Vec<glob::Pattern>,
}

impl FileService {
    /// 新しい FileService を生成する
    pub fn new(exclude_patterns: Vec<String>) -> Self {
        let patterns = exclude_patterns
            .iter()
            .filter_map(|p| glob::Pattern::new(p).ok())
            .collect();
        Self {
            exclude_patterns: patterns,
        }
    }

    /// ディレクトリを走査してFileNodeのリストを返す
    ///
    /// - 除外パターンにマッチするエントリはスキップ
    /// - ソート: ディレクトリ優先、名前昇順（大文字小文字無視）
    pub async fn get_tree(&self, path: &Path, depth: u32) -> Result<Vec<FileNode>, AppError> {
        if !path.exists() {
            return Err(AppError::FileNotFound {
                path: path.to_string_lossy().to_string(),
            });
        }

        let mut entries = fs::read_dir(path).await?;
        let mut nodes: Vec<FileNode> = Vec::new();

        while let Some(entry) = entries.next_entry().await? {
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            // 除外パターン判定
            if self.is_excluded(&name) {
                continue;
            }

            let metadata = entry.metadata().await?;
            let is_dir = metadata.is_dir();
            let size = if is_dir { 0 } else { metadata.len() };
            let extension = if is_dir {
                None
            } else {
                entry_path
                    .extension()
                    .map(|e| e.to_string_lossy().to_string())
            };

            // 子ノードの取得（depth > 1 の場合に再帰）
            let children = if is_dir && depth > 1 {
                Some(
                    Box::pin(self.get_tree(&entry_path, depth - 1))
                        .await
                        .unwrap_or_default(),
                )
            } else if is_dir {
                // depth=1 では子ノードを取得しない（遅延ロード）
                None
            } else {
                None
            };

            nodes.push(FileNode {
                name,
                path: entry_path.to_string_lossy().to_string(),
                is_dir,
                children,
                extension,
                size,
            });
        }

        // ソート: ディレクトリ優先、名前昇順（大文字小文字無視）
        nodes.sort_by(|a, b| {
            b.is_dir
                .cmp(&a.is_dir)
                .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });

        Ok(nodes)
    }

    /// ファイルを読み込み、UTF-8に変換して返す
    ///
    /// 1. ファイル存在確認
    /// 2. 先頭8192バイト読み込み
    /// 3. バイナリ判定（NULバイト検出）
    /// 4. chardetng でエンコーディング推定
    /// 5. encoding_rs で UTF-8 に変換
    pub async fn read_file(&self, path: &Path) -> Result<FileContent, AppError> {
        if !path.exists() {
            return Err(AppError::FileNotFound {
                path: path.to_string_lossy().to_string(),
            });
        }

        let full_content = fs::read(path).await?;
        let size = full_content.len() as u64;

        // バイナリ判定
        let check_buf = &full_content[..full_content.len().min(BINARY_CHECK_BYTES)];
        if Self::is_binary(check_buf) {
            return Err(AppError::EncodingError {
                path: path.to_string_lossy().to_string(),
            });
        }

        // エンコーディング検出
        let encoding_name = detector::detect_encoding(check_buf);

        // UTF-8に変換
        let content = detector::decode_to_utf8(&full_content, encoding_name)?;
        let line_count = content.lines().count() as u64;

        Ok(FileContent {
            path: path.to_string_lossy().to_string(),
            content,
            encoding: encoding_name.to_string(),
            line_count,
            size,
        })
    }

    /// バイナリファイルかどうかを判定する
    ///
    /// 先頭8192バイト中にNULバイト(0x00)が含まれていればtrue
    pub fn is_binary(buf: &[u8]) -> bool {
        buf.contains(&0x00)
    }

    /// 除外パターンにマッチするか確認する
    fn is_excluded(&self, name: &str) -> bool {
        self.exclude_patterns
            .iter()
            .any(|p| p.matches(name))
    }

    /// ファイル名あいまい検索（サブシーケンスマッチ）
    pub async fn search_files(
        &self,
        root: &Path,
        query: &str,
        limit: u32,
    ) -> Result<Vec<FileMatch>, AppError> {
        let mut results: Vec<FileMatch> = Vec::new();
        self.collect_file_matches(root, root, query, limit, &mut results)
            .await?;

        // スコア降順でソート
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit as usize);
        Ok(results)
    }

    /// 再帰的にファイルを収集してあいまいマッチを評価する
    async fn collect_file_matches(
        &self,
        root: &Path,
        dir: &Path,
        query: &str,
        limit: u32,
        results: &mut Vec<FileMatch>,
    ) -> Result<(), AppError> {
        if results.len() >= limit as usize * 2 {
            return Ok(());
        }

        let mut entries = fs::read_dir(dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            if self.is_excluded(&name) {
                continue;
            }

            if entry.metadata().await?.is_dir() {
                Box::pin(self.collect_file_matches(root, &entry_path, query, limit, results))
                    .await?;
            } else {
                // サブシーケンスマッチでスコア計算
                if let Some((score, matched_indices)) = fuzzy_match(&name, query) {
                    let relative_path = entry_path
                        .strip_prefix(root)
                        .unwrap_or(&entry_path)
                        .to_string_lossy()
                        .to_string();

                    results.push(FileMatch {
                        name,
                        relative_path,
                        absolute_path: entry_path.to_string_lossy().to_string(),
                        score,
                        matched_indices,
                    });
                }
            }
        }

        Ok(())
    }
}

/// サブシーケンスあいまいマッチング
/// query の文字が name 中に順番に含まれているか判定し、スコアと位置を返す
fn fuzzy_match(name: &str, query: &str) -> Option<(f64, Vec<usize>)> {
    if query.is_empty() {
        return Some((1.0, vec![]));
    }

    let name_chars: Vec<char> = name.to_lowercase().chars().collect();
    let query_chars: Vec<char> = query.to_lowercase().chars().collect();

    let mut matched_indices: Vec<usize> = Vec::new();
    let mut name_idx = 0;

    for qc in &query_chars {
        loop {
            if name_idx >= name_chars.len() {
                return None; // マッチしない
            }
            if name_chars[name_idx] == *qc {
                matched_indices.push(name_idx);
                name_idx += 1;
                break;
            }
            name_idx += 1;
        }
    }

    // スコア計算: マッチ文字数 / ファイル名長（連続ボーナスあり）
    let base_score = query_chars.len() as f64 / name_chars.len().max(1) as f64;
    let consecutive_bonus = count_consecutive_bonus(&matched_indices) as f64 * 0.1;
    let score = (base_score + consecutive_bonus).min(1.0);

    Some((score, matched_indices))
}

/// 連続マッチのボーナスカウント
fn count_consecutive_bonus(indices: &[usize]) -> usize {
    if indices.len() < 2 {
        return 0;
    }
    indices
        .windows(2)
        .filter(|w| w[1] == w[0] + 1)
        .count()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs as std_fs;
    use tempfile::TempDir;

    fn make_service(patterns: Vec<&str>) -> FileService {
        FileService::new(patterns.iter().map(|s| s.to_string()).collect())
    }

    // --- is_binary テスト ---

    #[test]
    fn nulバイトなしはバイナリでない() {
        let buf = b"Hello, World!\nThis is a text file.";
        assert!(!FileService::is_binary(buf));
    }

    #[test]
    fn nulバイトありはバイナリ() {
        let buf = b"Hello\x00World";
        assert!(FileService::is_binary(buf));
    }

    #[test]
    fn 空バッファはバイナリでない() {
        assert!(!FileService::is_binary(b""));
    }

    // --- is_excluded テスト ---

    #[test]
    fn node_modulesは除外される() {
        let svc = make_service(vec!["node_modules", ".git", "*.exe"]);
        assert!(svc.is_excluded("node_modules"));
        assert!(svc.is_excluded(".git"));
    }

    #[test]
    fn glob_パターンで除外される() {
        let svc = make_service(vec!["*.exe", "*.dll"]);
        assert!(svc.is_excluded("app.exe"));
        assert!(svc.is_excluded("lib.dll"));
        assert!(!svc.is_excluded("main.rs"));
    }

    #[test]
    fn 通常ファイルは除外されない() {
        let svc = make_service(vec!["node_modules"]);
        assert!(!svc.is_excluded("src"));
        assert!(!svc.is_excluded("main.rs"));
    }

    // --- get_tree テスト ---

    #[tokio::test]
    async fn ディレクトリ走査でファイルノードを取得できる() {
        let dir = TempDir::new().unwrap();
        std_fs::write(dir.path().join("a.rs"), "fn main() {}").unwrap();
        std_fs::write(dir.path().join("b.rs"), "fn lib() {}").unwrap();
        std_fs::create_dir(dir.path().join("subdir")).unwrap();

        let svc = make_service(vec![]);
        let nodes = svc.get_tree(dir.path(), 1).await.unwrap();

        // ディレクトリが先頭、名前昇順
        assert_eq!(nodes[0].name, "subdir");
        assert!(nodes[0].is_dir);
        assert_eq!(nodes[1].name, "a.rs");
        assert_eq!(nodes[2].name, "b.rs");
    }

    #[tokio::test]
    async fn 除外パターンに一致するエントリはスキップされる() {
        let dir = TempDir::new().unwrap();
        std_fs::create_dir(dir.path().join("node_modules")).unwrap();
        std_fs::write(dir.path().join("main.rs"), "").unwrap();

        let svc = make_service(vec!["node_modules"]);
        let nodes = svc.get_tree(dir.path(), 1).await.unwrap();

        assert_eq!(nodes.len(), 1);
        assert_eq!(nodes[0].name, "main.rs");
    }

    #[tokio::test]
    async fn 存在しないパスはエラーを返す() {
        let svc = make_service(vec![]);
        let result = svc.get_tree(Path::new("/nonexistent/path/xyz"), 1).await;
        assert!(result.is_err());
    }

    // --- read_file テスト ---

    #[tokio::test]
    async fn utf8テキストファイルを読み込める() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("test.txt");
        std_fs::write(&file_path, "Hello, World!\nLine 2").unwrap();

        let svc = make_service(vec![]);
        let result = svc.read_file(&file_path).await.unwrap();

        assert_eq!(result.content, "Hello, World!\nLine 2");
        assert_eq!(result.line_count, 2);
        assert!(result.size > 0);
    }

    #[tokio::test]
    async fn バイナリファイルはエラーを返す() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("binary.bin");
        std_fs::write(&file_path, b"MZ\x00\x00\x00\x00\x00\x00").unwrap();

        let svc = make_service(vec![]);
        let result = svc.read_file(&file_path).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn 存在しないファイルはエラーを返す() {
        let svc = make_service(vec![]);
        let result = svc.read_file(Path::new("/nonexistent/file.txt")).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn 空ファイルを読み込めること() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("empty.txt");
        std_fs::write(&file_path, b"").unwrap();

        let svc = make_service(vec![]);
        let result = svc.read_file(&file_path).await.unwrap();

        assert_eq!(result.content, "");
        assert_eq!(result.line_count, 0);
        assert_eq!(result.size, 0);
    }

    #[tokio::test]
    async fn 大きなファイルを読み込めること() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("large.txt");

        // 約 1MB のテキストファイルを生成（NUL バイトなし）
        let line = "A".repeat(100) + "\n";
        let content = line.repeat(10_000); // ~1MB
        std_fs::write(&file_path, content.as_bytes()).unwrap();

        let svc = make_service(vec![]);
        let result = svc.read_file(&file_path).await.unwrap();

        assert!(result.size > 900_000, "サイズが 900KB 以上であること");
        assert_eq!(result.line_count, 10_000);
    }

    // --- fuzzy_match テスト ---

    #[test]
    fn サブシーケンスマッチが機能する() {
        let result = fuzzy_match("main.rs", "main");
        assert!(result.is_some());
        let (score, indices) = result.unwrap();
        assert!(score > 0.0);
        assert_eq!(indices, vec![0, 1, 2, 3]);
    }

    #[test]
    fn マッチしない場合はnoneを返す() {
        let result = fuzzy_match("main.rs", "xyz");
        assert!(result.is_none());
    }

    #[test]
    fn 空クエリは全ファイルにマッチする() {
        let result = fuzzy_match("anything.rs", "");
        assert!(result.is_some());
    }
}
