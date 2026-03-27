/// ブックマーク操作コマンド
/// フロントエンドから IPC 経由で呼び出される
use tauri::State;

use crate::errors::{CommandError, CommandResult};
use crate::models::bookmark::{AddBookmarkRequest, Bookmark};
use crate::state::AppState;

/// ブックマークを追加する
#[tauri::command]
pub async fn add_bookmark(
    state: State<'_, AppState>,
    workspace_id: String,
    file_path: String,
    line_number: u32,
    color_index: u8,
    preview_text: Option<String>,
) -> CommandResult<Bookmark> {
    let req = AddBookmarkRequest {
        workspace_id,
        file_path,
        line_number,
        color_index,
        preview_text,
    };
    state
        .bookmark_service
        .add(req)
        .map_err(CommandError::from)
}

/// 指定IDのブックマークを削除する
#[tauri::command]
pub async fn remove_bookmark(state: State<'_, AppState>, id: i64) -> CommandResult<()> {
    state
        .bookmark_service
        .remove(id)
        .map_err(CommandError::from)
}

/// ワークスペースの全ブックマークを取得する
#[tauri::command]
pub async fn get_bookmarks(
    state: State<'_, AppState>,
    workspace_id: String,
) -> CommandResult<Vec<Bookmark>> {
    state
        .bookmark_service
        .list_by_workspace(&workspace_id)
        .map_err(CommandError::from)
}

/// 指定色のブックマークを全削除する
#[tauri::command]
pub async fn clear_bookmarks_by_color(
    state: State<'_, AppState>,
    workspace_id: String,
    color_index: u8,
) -> CommandResult<()> {
    state
        .bookmark_service
        .clear_by_color(&workspace_id, color_index)
        .map_err(CommandError::from)
}
