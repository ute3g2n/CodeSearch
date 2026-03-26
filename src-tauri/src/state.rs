use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

use crate::services::{
    bookmark_service::BookmarkService,
    config_service::ConfigService,
    search_service::SearchService,
    workspace_service::WorkspaceService,
};
use crate::storage::database::Database;
use crate::watcher::file_watcher::FileWatcher;

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
    pub file_watcher: Arc<Mutex<Option<FileWatcher>>>,

    /// SQLite データベース（WALモード + busy_timeout=5000ms）
    pub database: Arc<Database>,
}
