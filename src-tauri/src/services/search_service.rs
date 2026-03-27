/// 全文検索サービス
///
/// - IndexManager の生成・保持
/// - インデックス構築（ファイルツリー走査 → index_file）
/// - 検索実行（Searcher 委譲）
/// - 検索履歴の記録（HistoryRepo 委譲）
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;

use crate::errors::AppError;
use crate::indexer::index_manager::IndexManager;
use crate::indexer::searcher::Searcher;
use crate::models::search::{IndexState, IndexStatus, SearchOptions, SearchResult};
use crate::storage::database::Database;
use crate::storage::history_repo::{HistoryRepo, NewHistoryEntry};

/// 検索サービス
pub struct SearchService {
    /// 現在のワークスペースID（インデックスディレクトリ名に使用）
    workspace_id: Option<String>,
    /// ワークスペースルートパス
    workspace_root: Option<PathBuf>,
    /// Tantivy インデックスマネージャー
    index_manager: Option<IndexManager>,
    /// インデックス状態
    index_state: IndexState,
    /// インデックスを最後に構築した日時（ISO 8601）
    last_built_at: Option<String>,
    /// データディレクトリ（SQLite / indexes の親）
    data_dir: PathBuf,
}

impl SearchService {
    /// SearchService を作成する
    pub fn new(data_dir: PathBuf) -> Self {
        SearchService {
            workspace_id: None,
            workspace_root: None,
            index_manager: None,
            index_state: IndexState::Idle,
            last_built_at: None,
            data_dir,
        }
    }

    /// ワークスペースのインデックスを構築する
    ///
    /// 1. ワークスペース以下のテキストファイルを列挙
    /// 2. 各ファイルを読み込んで index_file
    /// 3. commit
    pub fn build_index(
        &mut self,
        workspace_root: &str,
        workspace_id: &str,
    ) -> Result<u64, AppError> {
        self.index_state = IndexState::Building;
        self.workspace_id = Some(workspace_id.to_string());
        self.workspace_root = Some(PathBuf::from(workspace_root));

        // IndexManager を開く（既存があれば再利用、なければ新規作成）
        let mut mgr = IndexManager::open_or_create(&self.data_dir, workspace_id)?;

        let files = collect_text_files(Path::new(workspace_root));
        let total = files.len();

        for file_path in &files {
            let path_str = file_path.to_string_lossy().to_string();
            let lines = read_lines(file_path)?;
            // 既存ドキュメントを削除してから再登録（重複防止）
            mgr.delete_file_docs(&path_str)?;
            mgr.index_file(&path_str, &lines)?;
        }

        mgr.commit()?;
        let doc_count = mgr.doc_count();

        self.index_manager = Some(mgr);
        self.index_state = IndexState::Ready;
        self.last_built_at = Some(chrono::Local::now().to_rfc3339());

        tracing::info!("インデックス構築完了: {} ファイル, {} ドキュメント", total, doc_count);
        Ok(doc_count)
    }

    /// 全文検索を実行する
    pub fn search(
        &self,
        query: &str,
        opts: &SearchOptions,
        db: &Arc<Database>,
    ) -> Result<SearchResult, AppError> {
        let mgr = self.index_manager.as_ref().ok_or(AppError::IndexError {
            message: "インデックスが未構築です".to_string(),
        })?;

        let workspace_root = self
            .workspace_root
            .as_ref()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        let start = Instant::now();
        let searcher = Searcher::new(mgr)?;
        let groups = searcher.search(query, opts, &workspace_root)?;
        let elapsed_ms = start.elapsed().as_millis() as u64;

        let total_matches: u64 = groups.iter().map(|g| g.matches.len() as u64).sum();

        // 検索履歴を記録する
        if let Some(ws_id) = &self.workspace_id {
            let repo = HistoryRepo::new(db);
            let _ = repo.record(&NewHistoryEntry {
                workspace_id: ws_id,
                query,
                is_regex: opts.is_regex,
                case_sensitive: opts.case_sensitive,
                whole_word: opts.whole_word,
                include_glob: opts.include_glob.as_deref(),
                exclude_glob: opts.exclude_glob.as_deref(),
                result_count: Some(total_matches),
            });
        }

        Ok(SearchResult {
            groups,
            total_matches,
            elapsed_ms,
        })
    }

    /// 現在のインデックス状態を返す
    pub fn status(&self) -> IndexStatus {
        let doc_count = self
            .index_manager
            .as_ref()
            .map(|m| m.doc_count())
            .unwrap_or(0);

        IndexStatus {
            state: self.index_state.clone(),
            document_count: doc_count,
            last_built_at: self.last_built_at.clone(),
            error_message: None,
        }
    }

    /// インデックスマネージャーが初期化済みかどうか
    pub fn is_ready(&self) -> bool {
        self.index_manager.is_some()
    }
}

/// ディレクトリ以下のテキストファイルを再帰的に列挙する
///
/// バイナリファイル・隠しディレクトリ・node_modules 等は除外する
fn collect_text_files(root: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    collect_files_recursive(root, &mut files);
    files
}

/// 再帰的にテキストファイルを収集する内部関数
fn collect_files_recursive(dir: &Path, files: &mut Vec<PathBuf>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");

        // 隠しファイル・除外ディレクトリをスキップ
        if name.starts_with('.') || EXCLUDED_DIRS.contains(&name) {
            continue;
        }

        if path.is_dir() {
            collect_files_recursive(&path, files);
        } else if is_text_file(&path) {
            files.push(path);
        }
    }
}

/// テキストファイルとして扱う拡張子
const TEXT_EXTENSIONS: &[&str] = &[
    "rs", "ts", "tsx", "js", "jsx", "json", "toml", "yaml", "yml",
    "md", "txt", "html", "css", "scss", "py", "go", "java", "c", "cpp",
    "h", "hpp", "sh", "bash", "zsh", "fish", "rb", "php", "swift",
    "kt", "kts", "cs", "xml", "sql", "env", "gitignore", "lock",
    "vue", "svelte", "graphql", "proto",
];

/// 除外するディレクトリ名
const EXCLUDED_DIRS: &[&str] = &[
    "node_modules", "target", ".git", "dist", "build", ".next",
    "__pycache__", ".venv", "venv", ".cache",
];

/// ファイルがテキストファイルかどうかを拡張子で判定する
fn is_text_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|ext| TEXT_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// ファイルの全行を読み込んで返す
fn read_lines(path: &Path) -> Result<Vec<String>, AppError> {
    let content = std::fs::read_to_string(path).map_err(AppError::IoError)?;
    Ok(content.lines().map(|l| l.to_string()).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tempfile::TempDir;

    fn setup() -> (TempDir, Arc<Database>) {
        let tmp = TempDir::new().unwrap();
        let db = Arc::new(Database::open(tmp.path()).unwrap());
        (tmp, db)
    }

    fn write_file(dir: &Path, name: &str, content: &str) {
        std::fs::write(dir.join(name), content).unwrap();
    }

    #[test]
    fn インデックス構築後に検索できること() {
        let (tmp, db) = setup();
        let workspace = TempDir::new().unwrap();

        write_file(workspace.path(), "main.rs", "fn main() {\n    println!(\"hello\");\n}");
        write_file(workspace.path(), "lib.rs", "pub fn add(a: i32, b: i32) -> i32 { a + b }");

        let mut svc = SearchService::new(tmp.path().to_path_buf());
        let doc_count = svc
            .build_index(
                &workspace.path().to_string_lossy(),
                "test_workspace",
            )
            .unwrap();

        assert!(doc_count >= 2);

        let opts = SearchOptions {
            case_sensitive: false,
            whole_word: false,
            is_regex: false,
            include_glob: None,
            exclude_glob: None,
            max_results: None,
        };

        let result = svc.search("fn", &opts, &db).unwrap();
        assert!(!result.groups.is_empty());
        assert!(result.total_matches > 0);
    }

    #[test]
    fn インデックス未構築時にエラーになること() {
        let (tmp, db) = setup();
        let svc = SearchService::new(tmp.path().to_path_buf());
        let opts = SearchOptions {
            case_sensitive: false,
            whole_word: false,
            is_regex: false,
            include_glob: None,
            exclude_glob: None,
            max_results: None,
        };
        let result = svc.search("fn", &opts, &db);
        assert!(result.is_err());
    }

    #[test]
    fn ステータスが正しく返ること() {
        let (tmp, _db) = setup();
        let svc = SearchService::new(tmp.path().to_path_buf());
        let status = svc.status();
        assert_eq!(svc.is_ready(), false);
        assert_eq!(status.document_count, 0);
    }

    #[test]
    fn 正規表現で検索できること() {
        let (tmp, db) = setup();
        let workspace = TempDir::new().unwrap();

        write_file(workspace.path(), "test.rs", "let x = 42;\nlet y = 100;");

        let mut svc = SearchService::new(tmp.path().to_path_buf());
        svc.build_index(&workspace.path().to_string_lossy(), "ws_regex")
            .unwrap();

        let opts = SearchOptions {
            case_sensitive: false,
            whole_word: false,
            is_regex: true,
            include_glob: None,
            exclude_glob: None,
            max_results: None,
        };

        let result = svc.search(r"\d+", &opts, &db).unwrap();
        assert!(!result.groups.is_empty());
    }
}
