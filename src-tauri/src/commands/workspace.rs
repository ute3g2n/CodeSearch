/// ワークスペース操作コマンド
/// フロントエンドから IPC 経由で呼び出される
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::errors::{CommandError, CommandResult};
use crate::models::workspace::{IndexStatusKind, Workspace, WorkspaceInfo};
use crate::state::AppState;

/// ディレクトリ選択ダイアログを開く
///
/// ユーザーがキャンセルした場合は None を返す
#[tauri::command]
pub async fn select_directory(app: AppHandle) -> CommandResult<Option<String>> {
    let path = app
        .dialog()
        .file()
        .blocking_pick_folder();

    Ok(path.map(|p| p.to_string()))
}

/// ワークスペースを開く
///
/// - ワークスペース情報を WorkspaceService に登録する
/// - インデックス状態は暫定で Empty を返す（インデックス構築は別コマンドで行う）
#[tauri::command]
pub async fn open_workspace(
    state: State<'_, AppState>,
    path: String,
) -> CommandResult<WorkspaceInfo> {
    let workspace = state
        .workspace_service
        .open(&path)
        .map_err(CommandError::from)?;

    // 書き込みロックが取得可能かどうか確認する（読み取り専用で取得しすぐ解放）
    let has_index_write_lock = state
        .search_service
        .read()
        .await
        .check_write_lock(&workspace.id);

    Ok(WorkspaceInfo {
        workspace,
        index_status: IndexStatusKind::Empty,
        file_count: 0,
        has_index_write_lock,
    })
}

/// 現在のワークスペースを閉じる
#[tauri::command]
pub async fn close_workspace(state: State<'_, AppState>) -> CommandResult<()> {
    state
        .workspace_service
        .close()
        .map_err(CommandError::from)
}

/// 最近開いたワークスペース一覧を返す
#[tauri::command]
pub async fn list_recent_workspaces(
    state: State<'_, AppState>,
) -> CommandResult<Vec<Workspace>> {
    Ok(state.workspace_service.list())
}
