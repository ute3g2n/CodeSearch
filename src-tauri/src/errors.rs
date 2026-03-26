use serde::Serialize;
use thiserror::Error;

/// アプリケーション全体で使用するエラー型
/// 基本設計書セクション11.1に基づく
#[derive(Debug, Error)]
pub enum AppError {
    /// ファイルが存在しない
    #[error("ファイルが見つかりません: {path}")]
    FileNotFound { path: String },

    /// エンコーディング変換に失敗
    #[error("エンコーディングエラー: {path}")]
    EncodingError { path: String },

    /// インデックス操作に失敗
    #[error("インデックスエラー: {message}")]
    IndexError { message: String },

    /// インデックス書き込みロックを取得できない（別インスタンスが使用中）
    #[error("インデックスの書き込みロックを取得できません")]
    IndexLockUnavailable,

    /// SQLite データベースエラー
    #[error("データベースエラー: {0}")]
    DatabaseError(#[from] rusqlite::Error),

    /// ファイル監視エラー
    #[error("ファイル監視エラー: {0}")]
    WatcherError(#[from] notify::Error),

    /// OS I/O エラー
    #[error("I/Oエラー: {0}")]
    IoError(#[from] std::io::Error),

    /// 引数が不正
    #[error("不正な引数: {message}")]
    InvalidArgument { message: String },
}

/// フロントエンドに返却するコマンドエラー型
/// Tauri IPC で JSON シリアライズされる
#[derive(Debug, Serialize)]
pub struct CommandError {
    /// エラーコード（フロントエンドでの分岐に使用）
    pub code: String,
    /// ユーザー向けエラーメッセージ
    pub message: String,
}

impl From<AppError> for CommandError {
    fn from(err: AppError) -> Self {
        let (code, message) = match &err {
            AppError::FileNotFound { .. } => {
                ("FILE_NOT_FOUND".to_string(), err.to_string())
            }
            AppError::EncodingError { .. } => {
                ("ENCODING_ERROR".to_string(), err.to_string())
            }
            AppError::IndexError { .. } => {
                ("INDEX_ERROR".to_string(), err.to_string())
            }
            AppError::IndexLockUnavailable => (
                "INDEX_LOCK_UNAVAILABLE".to_string(),
                "別のインスタンスがインデックスを更新中です（読み取り専用モード）".to_string(),
            ),
            AppError::DatabaseError(_) => {
                ("DATABASE_ERROR".to_string(), err.to_string())
            }
            AppError::WatcherError(_) => {
                ("WATCHER_ERROR".to_string(), err.to_string())
            }
            AppError::IoError(_) => {
                ("IO_ERROR".to_string(), err.to_string())
            }
            AppError::InvalidArgument { .. } => {
                ("INVALID_ARGUMENT".to_string(), err.to_string())
            }
        };
        CommandError { code, message }
    }
}

/// Tauri コマンドの戻り値型エイリアス
pub type CommandResult<T> = Result<T, CommandError>;
