/// 検索関連の Tauri コマンド
///
/// - search_fulltext: 全文検索を実行する
/// - build_index: ワークスペースのインデックスを構築する（進捗 emit あり）
/// - start_file_watcher: ファイル監視を開始する
/// - get_index_status: インデックスの状態を取得する
/// - get_search_history: 検索履歴を取得する
/// - clear_search_history: 検索履歴を全件削除する
use std::path::Path;

use tauri::{AppHandle, State};

use crate::errors::{CommandError, CommandResult};
use crate::models::search::{HistoryEntry, IndexStatus, SearchOptions, SearchResult};
use crate::state::AppState;
use crate::storage::history_repo::HistoryRepo;

/// 全文検索を実行する
///
/// - `query`: 検索テキスト
/// - `opts`: 検索オプション
#[tauri::command]
pub async fn search_fulltext(
    query: String,
    opts: SearchOptions,
    state: State<'_, AppState>,
) -> CommandResult<SearchResult> {
    let svc = state.search_service.read().await;
    let result = svc
        .search(&query, &opts, &state.database)
        .map_err(CommandError::from)?;
    Ok(result)
}

/// ワークスペースのインデックスを構築する
///
/// - `workspace_root`: ワークスペースのルートパス（絶対パス）
/// - `workspace_id`: ワークスペースID（インデックスディレクトリ名）
/// - 進捗は `index://progress` / `index://ready` イベントで通知される
#[tauri::command]
pub async fn build_index(
    workspace_root: String,
    workspace_id: String,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> CommandResult<u64> {
    let mut svc = state.search_service.write().await;
    let doc_count = svc
        .build_index_with_handle(&workspace_root, &workspace_id, Some(&app_handle))
        .map_err(CommandError::from)?;
    Ok(doc_count)
}

/// ファイル監視を開始する
///
/// - `workspace_root`: 監視するワークスペースのルートパス
/// - `exclude_patterns`: 除外する glob パターン（カンマ区切り文字列のリスト）
#[tauri::command]
pub async fn start_file_watcher(
    workspace_root: String,
    exclude_patterns: Vec<String>,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    use std::sync::Arc;

    let search_service_arc = Arc::clone(&state.search_service);
    let svc = state.search_service.read().await;

    let watcher = svc
        .start_watcher(
            Path::new(&workspace_root),
            exclude_patterns,
            search_service_arc,
            app_handle,
        )
        .map_err(CommandError::from)?;

    // FileWatcher を AppState の file_watcher に格納して生存させる
    let mut fw = state.file_watcher.lock().await;
    *fw = Some(watcher);

    Ok(())
}

/// インデックスの状態を取得する
#[tauri::command]
pub async fn get_index_status(
    state: State<'_, AppState>,
) -> CommandResult<IndexStatus> {
    let svc = state.search_service.read().await;
    Ok(svc.status())
}

/// 検索履歴を取得する
///
/// - `workspace_id`: ワークスペースID
/// - `limit`: 取得件数（省略時は 50）
#[tauri::command]
pub async fn get_search_history(
    workspace_id: String,
    limit: Option<u32>,
    state: State<'_, AppState>,
) -> CommandResult<Vec<HistoryEntry>> {
    let repo = HistoryRepo::new(&state.database);
    let entries = repo
        .list(&workspace_id, limit.unwrap_or(50))
        .map_err(CommandError::from)?;
    Ok(entries)
}

/// 検索履歴を全件削除する
///
/// - `workspace_id`: ワークスペースID
#[tauri::command]
pub async fn clear_search_history(
    workspace_id: String,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let repo = HistoryRepo::new(&state.database);
    repo.clear_workspace(&workspace_id)
        .map_err(CommandError::from)?;
    Ok(())
}
