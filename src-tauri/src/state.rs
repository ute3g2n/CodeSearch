use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

use crate::services::{
    bookmark_service::BookmarkService,
    config_service::ConfigService,
    search_service::SearchService,
    workspace_service::WorkspaceService,
};
use crate::storage::database::Database;
use crate::watcher::file_watcher::FileWatcher as FileWatcherHandle;

/// アプリケーション全体の共有状態
/// 基本設計書セクション3.2に基づく
/// Tauri の manage() で登録し、各コマンドから State<'_, AppState> として参照する
pub struct AppState {
    /// ワークスペース管理サービス（読み取り専用操作のみ並行実行）
    pub workspace_service: Arc<WorkspaceService>,

    /// 検索サービス（インデックス更新は排他、検索は並行）
    pub search_service: Arc<RwLock<SearchService>>,

    /// ブックマーク管理サービス
    pub bookmark_service: Arc<BookmarkService>,

    /// 設定管理サービス（設定更新は排他）
    pub config_service: Arc<RwLock<ConfigService>>,

    /// ファイル監視（ワークスペース切替時に差し替え）
    pub file_watcher: Arc<Mutex<Option<FileWatcherHandle>>>,

    /// SQLite データベース（WALモード + busy_timeout=5000ms）
    pub database: Arc<Database>,
}

impl AppState {
    /// データディレクトリを指定して AppState を生成する
    pub fn new(data_dir: PathBuf) -> Self {
        let database = Arc::new(
            Database::open(&data_dir).expect("データベースの初期化に失敗しました"),
        );
        Self {
            workspace_service: Arc::new(WorkspaceService::new(&data_dir)),
            search_service: Arc::new(RwLock::new(SearchService::new(data_dir.clone()))),
            bookmark_service: Arc::new(BookmarkService::new(database.clone())),
            config_service: Arc::new(RwLock::new(ConfigService::new(&data_dir))),
            file_watcher: Arc::new(Mutex::new(None)),
            database,
        }
    }
}
