/// 全文検索サービス
///
/// - IndexManager の生成・保持
/// - インデックス構築（ファイルツリー走査 → index_file）
/// - インクリメンタル更新（update_file / remove_file）
/// - ファイル監視連携（start_watcher）
/// - 検索実行（Searcher 委譲）
/// - 検索履歴の記録（HistoryRepo 委譲）
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;

use serde::Serialize;

use crate::errors::AppError;
use crate::indexer::index_manager::IndexManager;
use crate::indexer::searcher::Searcher;
use crate::models::search::{IndexState, IndexStatus, SearchOptions, SearchResult};
use crate::storage::database::Database;
use crate::storage::history_repo::{HistoryRepo, NewHistoryEntry};
use crate::watcher::file_watcher::{FileWatcher, WatchEvent, WatchEventKind};

// ===== Tauri イベントペイロード =====

/// インデックス更新完了イベント
#[derive(Debug, Clone, Serialize)]
pub struct IndexUpdatedPayload {
    pub file_path: String,
    pub doc_count: u64,
}

/// インデックス構築進捗イベント
#[derive(Debug, Clone, Serialize)]
pub struct IndexProgressPayload {
    pub current: u64,
    pub total: u64,
    pub message: String,
}

/// インデックス構築完了イベント
#[derive(Debug, Clone, Serialize)]
pub struct IndexReadyPayload {
    pub doc_count: u64,
    pub elapsed_ms: u64,
}

/// インデックスエラーイベント
#[derive(Debug, Clone, Serialize)]
pub struct IndexErrorPayload {
    pub message: String,
}

/// ファイルシステム変更イベント
#[derive(Debug, Clone, Serialize)]
pub struct FsChangedPayload {
    pub kind: String,
    pub file_path: String,
}

/// ファイル監視エラーイベント
#[derive(Debug, Clone, Serialize)]
pub struct WatcherErrorPayload {
    pub message: String,
}

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
    /// 4. 進捗 emit（app_handle が Some の場合）
    pub fn build_index(
        &mut self,
        workspace_root: &str,
        workspace_id: &str,
    ) -> Result<u64, AppError> {
        self.build_index_with_handle(workspace_root, workspace_id, None)
    }

    /// app_handle を受け取ってインデックス構築し、進捗をイベントで emit する
    pub fn build_index_with_handle(
        &mut self,
        workspace_root: &str,
        workspace_id: &str,
        app_handle: Option<&tauri::AppHandle>,
    ) -> Result<u64, AppError> {
        use tauri::Emitter;
        use std::time::Instant as StdInstant;

        self.index_state = IndexState::Building;
        self.workspace_id = Some(workspace_id.to_string());
        self.workspace_root = Some(PathBuf::from(workspace_root));

        let start = StdInstant::now();

        // IndexManager を開く（既存があれば再利用、なければ新規作成）
        let mut mgr = IndexManager::open_or_create(&self.data_dir, workspace_id)?;

        let files = collect_text_files(Path::new(workspace_root));
        let total = files.len() as u64;

        for (i, file_path) in files.iter().enumerate() {
            let path_str = file_path.to_string_lossy().to_string();
            let lines = read_lines(file_path)?;
            // 既存ドキュメントを削除してから再登録（重複防止）
            mgr.delete_file_docs(&path_str)?;
            mgr.index_file(&path_str, &lines)?;

            // 100ファイルごとに進捗を emit
            if let Some(handle) = app_handle {
                if i % 100 == 0 {
                    let _ = handle.emit(
                        "index://progress",
                        IndexProgressPayload {
                            current: i as u64,
                            total,
                            message: format!("インデックス構築中... {}/{}", i, total),
                        },
                    );
                }
            }
        }

        mgr.commit()?;
        let doc_count = mgr.doc_count();
        let elapsed_ms = start.elapsed().as_millis() as u64;

        self.index_manager = Some(mgr);
        self.index_state = IndexState::Ready;
        self.last_built_at = Some(chrono::Local::now().to_rfc3339());

        // 完了イベントを emit
        if let Some(handle) = app_handle {
            let _ = handle.emit(
                "index://ready",
                IndexReadyPayload { doc_count, elapsed_ms },
            );
        }

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

    /// 単一ファイルのインデックスを更新する（ファイル監視コールバック用）
    ///
    /// 既存ドキュメントを全削除してから全行を再登録する
    pub fn update_file(&mut self, file_path: &Path) -> Result<(), AppError> {
        let mgr = self.index_manager.as_mut().ok_or(AppError::IndexError {
            message: "インデックスが未構築です".to_string(),
        })?;

        let path_str = file_path.to_string_lossy().to_string();
        let lines = read_lines(file_path)?;

        mgr.delete_file_docs(&path_str)?;
        mgr.index_file(&path_str, &lines)?;
        mgr.commit()?;

        tracing::debug!("ファイル更新: {}", path_str);
        Ok(())
    }

    /// 単一ファイルをインデックスから削除する（ファイル監視コールバック用）
    pub fn remove_file(&mut self, file_path: &Path) -> Result<(), AppError> {
        let mgr = self.index_manager.as_mut().ok_or(AppError::IndexError {
            message: "インデックスが未構築です".to_string(),
        })?;

        let path_str = file_path.to_string_lossy().to_string();
        mgr.delete_file_docs(&path_str)?;
        mgr.commit()?;

        tracing::debug!("ファイル削除: {}", path_str);
        Ok(())
    }

    /// ファイル監視を開始し、変更をインデックスに自動反映する
    ///
    /// Tauri イベントを emit してフロントエンドに通知する
    pub fn start_watcher(
        &self,
        workspace_root: &Path,
        exclude_patterns: Vec<String>,
        search_service: Arc<tokio::sync::RwLock<SearchService>>,
        app_handle: tauri::AppHandle,
    ) -> Result<FileWatcher, AppError> {
        use tauri::Emitter;

        let (tx, rx) = std::sync::mpsc::channel::<WatchEvent>();

        let watcher = FileWatcher::start(workspace_root, exclude_patterns, tx)?;

        // バックグラウンドスレッドで監視イベントを処理する
        let app_handle_clone = app_handle.clone();
        std::thread::spawn(move || {
            let rt = tokio::runtime::Handle::current();
            loop {
                match rx.recv() {
                    Ok(event) => {
                        let file_path = event.path.to_string_lossy().to_string();
                        let kind_str = match event.kind {
                            WatchEventKind::Created | WatchEventKind::Modified => "modified",
                            WatchEventKind::Deleted => "deleted",
                        };

                        // fs://changed イベントを emit
                        let _ = app_handle_clone.emit(
                            "fs://changed",
                            FsChangedPayload {
                                kind: kind_str.to_string(),
                                file_path: file_path.clone(),
                            },
                        );

                        // インデックスを非同期で更新
                        let svc_clone = Arc::clone(&search_service);
                        let path = event.path.clone();
                        let app_handle_2 = app_handle_clone.clone();
                        rt.spawn(async move {
                            let mut svc = svc_clone.write().await;
                            let result = match event.kind {
                                WatchEventKind::Created | WatchEventKind::Modified => {
                                    svc.update_file(&path)
                                }
                                WatchEventKind::Deleted => svc.remove_file(&path),
                            };

                            match result {
                                Ok(_) => {
                                    let doc_count = svc
                                        .index_manager
                                        .as_ref()
                                        .map(|m| m.doc_count())
                                        .unwrap_or(0);
                                    let _ = app_handle_2.emit(
                                        "index://updated",
                                        IndexUpdatedPayload {
                                            file_path: path.to_string_lossy().to_string(),
                                            doc_count,
                                        },
                                    );
                                }
                                Err(e) => {
                                    let _ = app_handle_2.emit(
                                        "index://error",
                                        IndexErrorPayload {
                                            message: e.to_string(),
                                        },
                                    );
                                }
                            }
                        });
                    }
                    Err(_) => break, // チャネルが閉じられたら終了
                }
            }
        });

        Ok(watcher)
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
    fn ファイル更新でインデックスが再構築されること() {
        let (tmp, db) = setup();
        let workspace = TempDir::new().unwrap();
        write_file(workspace.path(), "update.rs", "old content line");

        let mut svc = SearchService::new(tmp.path().to_path_buf());
        svc.build_index(&workspace.path().to_string_lossy(), "ws_update")
            .unwrap();

        // 古い内容で検索できること
        let opts = SearchOptions {
            case_sensitive: false,
            whole_word: false,
            is_regex: false,
            include_glob: None,
            exclude_glob: None,
            max_results: None,
        };
        let r1 = svc.search("old", &opts, &db).unwrap();
        assert!(!r1.groups.is_empty());

        // ファイルを更新してインデックスに反映
        let file_path = workspace.path().join("update.rs");
        std::fs::write(&file_path, "new content line").unwrap();
        svc.update_file(&file_path).unwrap();

        // 新しい内容で検索できること
        let r2 = svc.search("new", &opts, &db).unwrap();
        assert!(!r2.groups.is_empty());

        // 古い内容は検索されないこと
        let r3 = svc.search("old", &opts, &db).unwrap();
        assert!(r3.groups.is_empty());
    }

    #[test]
    fn ファイル削除でインデックスから消えること() {
        let (tmp, db) = setup();
        let workspace = TempDir::new().unwrap();
        write_file(workspace.path(), "delete_me.rs", "fn to_delete() {}");

        let mut svc = SearchService::new(tmp.path().to_path_buf());
        svc.build_index(&workspace.path().to_string_lossy(), "ws_delete")
            .unwrap();

        let opts = SearchOptions {
            case_sensitive: false,
            whole_word: false,
            is_regex: false,
            include_glob: None,
            exclude_glob: None,
            max_results: None,
        };

        let r1 = svc.search("to_delete", &opts, &db).unwrap();
        assert!(!r1.groups.is_empty());

        let file_path = workspace.path().join("delete_me.rs");
        svc.remove_file(&file_path).unwrap();

        let r2 = svc.search("to_delete", &opts, &db).unwrap();
        assert!(r2.groups.is_empty());
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
