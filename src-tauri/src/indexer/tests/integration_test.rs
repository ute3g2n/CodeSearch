/// indexer 統合テスト
/// インデックス構築 → 検索 → 日本語テキスト のパイプラインを検証する
#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use tempfile::TempDir;

    use crate::indexer::index_manager::IndexManager;
    use crate::indexer::searcher::Searcher;
    use crate::models::search::SearchOptions;

    fn default_opts() -> SearchOptions {
        SearchOptions {
            case_sensitive: false,
            whole_word: false,
            is_regex: false,
            include_glob: None,
            exclude_glob: None,
            max_results: Some(100),
        }
    }

    // --- IndexManager テスト ---

    #[test]
    fn インデックスを新規作成できる() {
        let dir = TempDir::new().unwrap();
        let mgr = IndexManager::open_or_create(dir.path(), "ws-001");
        assert!(mgr.is_ok());
    }

    #[test]
    fn ファイルをインデックス登録して件数を確認できる() {
        let dir = TempDir::new().unwrap();
        let mut mgr = IndexManager::open_or_create(dir.path(), "ws-001").unwrap();
        let lines: Vec<String> = vec![
            "fn main() {".to_string(),
            "    println!(\"Hello, world!\");".to_string(),
            "}".to_string(),
        ];
        mgr.index_file("/workspace/main.rs", &lines).unwrap();
        mgr.commit().unwrap();
        assert_eq!(mgr.doc_count(), 3);
    }

    #[test]
    fn 既存ファイルの再登録で件数が重複しないこと() {
        let dir = TempDir::new().unwrap();
        let mut mgr = IndexManager::open_or_create(dir.path(), "ws-001").unwrap();
        let lines = vec!["line one".to_string(), "line two".to_string()];
        mgr.index_file("/workspace/a.rs", &lines).unwrap();
        mgr.commit().unwrap();
        // 同一ファイルを再登録（更新）
        mgr.delete_file_docs("/workspace/a.rs").unwrap();
        let updated = vec!["updated line".to_string()];
        mgr.index_file("/workspace/a.rs", &updated).unwrap();
        mgr.commit().unwrap();
        assert_eq!(mgr.doc_count(), 1);
    }

    #[test]
    fn ファイル削除でドキュメントが消えること() {
        let dir = TempDir::new().unwrap();
        let mut mgr = IndexManager::open_or_create(dir.path(), "ws-001").unwrap();
        mgr.index_file("/workspace/a.rs", &["hello".to_string()]).unwrap();
        mgr.index_file("/workspace/b.rs", &["world".to_string()]).unwrap();
        mgr.commit().unwrap();
        mgr.delete_file_docs("/workspace/a.rs").unwrap();
        mgr.commit().unwrap();
        assert_eq!(mgr.doc_count(), 1);
    }

    // --- Searcher テスト ---

    fn build_index_with_files(
        dir: &TempDir,
        files: &HashMap<&str, Vec<&str>>,
    ) -> IndexManager {
        let mut mgr = IndexManager::open_or_create(dir.path(), "ws-001").unwrap();
        for (path, lines) in files {
            let owned: Vec<String> = lines.iter().map(|s| s.to_string()).collect();
            mgr.index_file(path, &owned).unwrap();
        }
        mgr.commit().unwrap();
        mgr
    }

    #[test]
    fn 英語テキストの全文検索が機能すること() {
        let dir = TempDir::new().unwrap();
        let mut files = HashMap::new();
        files.insert(
            "/workspace/main.rs",
            vec!["fn main() {", "    println!(\"hello\");", "}"],
        );
        files.insert("/workspace/lib.rs", vec!["pub fn helper() {", "}"]);
        let mgr = build_index_with_files(&dir, &files);

        let searcher = Searcher::new(&mgr).unwrap();
        let result = searcher
            .search("println", &default_opts(), "/workspace")
            .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].matches.len(), 1);
        assert!(result[0].matches[0].line_content.contains("println"));
    }

    #[test]
    fn 日本語テキストの検索が機能すること() {
        let dir = TempDir::new().unwrap();
        let mut files = HashMap::new();
        files.insert(
            "/workspace/readme.md",
            vec![
                "# CodeSearch",
                "ローカルコード検索ツール",
                "高速な全文検索を提供します",
            ],
        );
        let mgr = build_index_with_files(&dir, &files);

        let searcher = Searcher::new(&mgr).unwrap();
        let result = searcher
            .search("検索", &default_opts(), "/workspace")
            .unwrap();

        assert!(!result.is_empty(), "日本語検索でマッチが得られること");
    }

    #[test]
    fn 大文字小文字を無視して検索できること() {
        let dir = TempDir::new().unwrap();
        let mut files = HashMap::new();
        files.insert("/workspace/a.ts", vec!["const MyVariable = 42;"]);
        let mgr = build_index_with_files(&dir, &files);

        let searcher = Searcher::new(&mgr).unwrap();
        let opts = SearchOptions {
            case_sensitive: false,
            ..default_opts()
        };
        let result = searcher.search("myvariable", &opts, "/workspace").unwrap();
        assert!(!result.is_empty());
    }

    #[test]
    fn 大文字小文字区別モードで大小異なるテキストはマッチしないこと() {
        let dir = TempDir::new().unwrap();
        let mut files = HashMap::new();
        files.insert("/workspace/a.ts", vec!["const MyVariable = 42;"]);
        let mgr = build_index_with_files(&dir, &files);

        let searcher = Searcher::new(&mgr).unwrap();
        let opts = SearchOptions {
            case_sensitive: true,
            ..default_opts()
        };
        let result = searcher.search("myvariable", &opts, "/workspace").unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn 正規表現で検索できること() {
        let dir = TempDir::new().unwrap();
        let mut files = HashMap::new();
        files.insert(
            "/workspace/main.rs",
            vec!["fn foo() {}", "fn bar() {}", "let x = 1;"],
        );
        let mgr = build_index_with_files(&dir, &files);

        let searcher = Searcher::new(&mgr).unwrap();
        let opts = SearchOptions {
            is_regex: true,
            ..default_opts()
        };
        let result = searcher.search("fn \\w+\\(\\)", &opts, "/workspace").unwrap();
        assert!(!result.is_empty());
        assert_eq!(result[0].matches.len(), 2);
    }

    #[test]
    fn クエリが空の場合は空の結果を返すこと() {
        let dir = TempDir::new().unwrap();
        let mut files = HashMap::new();
        files.insert("/workspace/a.rs", vec!["some content"]);
        let mgr = build_index_with_files(&dir, &files);

        let searcher = Searcher::new(&mgr).unwrap();
        let result = searcher.search("", &default_opts(), "/workspace").unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn マッチ範囲が正確に返されること() {
        let dir = TempDir::new().unwrap();
        let mut files = HashMap::new();
        files.insert("/workspace/a.rs", vec!["hello world hello"]);
        let mgr = build_index_with_files(&dir, &files);

        let searcher = Searcher::new(&mgr).unwrap();
        let result = searcher.search("hello", &default_opts(), "/workspace").unwrap();

        assert_eq!(result.len(), 1);
        let m = &result[0].matches[0];
        // "hello world hello" に "hello" は2箇所
        assert_eq!(m.match_ranges.len(), 2);
        assert_eq!(m.match_ranges[0], (0, 5));
        assert_eq!(m.match_ranges[1], (12, 17));
    }
}
