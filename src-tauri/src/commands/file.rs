use std::path::Path;

use crate::errors::CommandResult;
use crate::models::file::{FileContent, FileMatch, FileNode};
use crate::services::file_service::FileService;
use crate::state::AppState;

/// ファイルツリーを取得する（遅延ロード対応）
///
/// - path: 取得対象のディレクトリパス
/// - depth: 展開する深さ（1=直下のみ、デフォルト1）
/// - AppConfig.exclude_patterns に該当するエントリは除外
///
/// エラー: FileNotFound, IoError
#[tauri::command]
pub async fn get_file_tree(
    state: tauri::State<'_, AppState>,
    path: String,
    depth: Option<u32>,
) -> CommandResult<Vec<FileNode>> {
    let config = state.config_service.read().await;
    let exclude_patterns = config.get_config().exclude_patterns.clone();
    drop(config);

    let svc = FileService::new(exclude_patterns);
    let nodes = svc
        .get_tree(Path::new(&path), depth.unwrap_or(1))
        .await
        .map_err(crate::errors::CommandError::from)?;

    Ok(nodes)
}

/// ファイルを読み込む
///
/// 1. バイナリ判定（先頭8192バイトにNULバイトが含まれるか）
/// 2. chardetng でエンコーディング自動判定
/// 3. encoding_rs で UTF-8 に変換
///
/// エラー: FileNotFound, EncodingError, IoError
#[tauri::command]
pub async fn read_file(
    state: tauri::State<'_, AppState>,
    path: String,
) -> CommandResult<FileContent> {
    let config = state.config_service.read().await;
    let exclude_patterns = config.get_config().exclude_patterns.clone();
    drop(config);

    let svc = FileService::new(exclude_patterns);
    let content = svc
        .read_file(Path::new(&path))
        .await
        .map_err(crate::errors::CommandError::from)?;

    Ok(content)
}

/// OSのファイルエクスプローラーで指定パスを表示
///
/// Windows: explorer.exe /select,"<path>"
///
/// エラー: IoError
#[tauri::command]
pub async fn reveal_in_os_explorer(path: String) -> CommandResult<()> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| crate::errors::CommandError::from(crate::errors::AppError::IoError(e)))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        // macOS / Linux は open コマンドで代替
        let dir = Path::new(&path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or(path.clone());

        std::process::Command::new("open")
            .arg(&dir)
            .spawn()
            .map_err(|e| crate::errors::CommandError::from(crate::errors::AppError::IoError(e)))?;
    }

    Ok(())
}

/// ワークスペースルートからの相対パスを取得
///
/// - posix: trueの場合 "/" 区切り、falseの場合OS標準区切り
///
/// エラー: InvalidArgument（ワークスペース未選択時）
#[tauri::command]
pub async fn get_relative_path(
    state: tauri::State<'_, AppState>,
    path: String,
    posix: Option<bool>,
) -> CommandResult<String> {
    let workspace_path = state
        .workspace_service
        .current_path()
        .ok_or_else(|| crate::errors::CommandError {
            code: "INVALID_ARGUMENT".to_string(),
            message: "ワークスペースが開かれていません".to_string(),
        })?;

    let abs = Path::new(&path);
    let root = Path::new(&workspace_path);

    let relative = abs
        .strip_prefix(root)
        .map_err(|_| crate::errors::CommandError {
            code: "INVALID_ARGUMENT".to_string(),
            message: format!("パスがワークスペース外です: {}", path),
        })?;

    let result = if posix.unwrap_or(false) {
        // POSIX形式（"/" 区切り）
        relative
            .components()
            .map(|c| c.as_os_str().to_string_lossy())
            .collect::<Vec<_>>()
            .join("/")
    } else {
        relative.to_string_lossy().to_string()
    };

    Ok(result)
}

/// ファイル名あいまい検索（クイックオープン用）
#[tauri::command]
pub async fn search_files(
    state: tauri::State<'_, AppState>,
    query: String,
    limit: Option<u32>,
) -> CommandResult<Vec<FileMatch>> {
    let workspace_path = state
        .workspace_service
        .current_path()
        .ok_or_else(|| crate::errors::CommandError {
            code: "INVALID_ARGUMENT".to_string(),
            message: "ワークスペースが開かれていません".to_string(),
        })?;

    let config = state.config_service.read().await;
    let exclude_patterns = config.get_config().exclude_patterns.clone();
    drop(config);

    let svc = FileService::new(exclude_patterns);
    let matches = svc
        .search_files(Path::new(&workspace_path), &query, limit.unwrap_or(50))
        .await
        .map_err(crate::errors::CommandError::from)?;

    Ok(matches)
}
