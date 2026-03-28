/// 設定コマンド
/// get_config / save_config の Tauri IPC エンドポイント
use tauri::State;

use crate::errors::{CommandError, CommandResult};
use crate::models::config::AppConfig;
use crate::state::AppState;

/// 現在の設定を返す
#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> CommandResult<AppConfig> {
    let service = state.config_service.read().await;
    Ok(service.get_config().clone())
}

/// 設定を更新して保存する
#[tauri::command]
pub async fn save_config(
    config: AppConfig,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    let mut service = state.config_service.write().await;
    service.save_config(config).map_err(CommandError::from)
}
