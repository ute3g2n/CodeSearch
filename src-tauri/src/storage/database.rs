/// SQLite データベース初期化モジュール
/// WALモード + busy_timeout=5000ms + マイグレーション管理
use std::path::Path;

use rusqlite::Connection;

use crate::errors::AppError;

/// SQLite データベース接続ラッパー
pub struct Database {
    conn: std::sync::Mutex<Connection>,
}

impl Database {
    /// データベースを開く（存在しなければ新規作成）
    ///
    /// `data_dir/codesearch.db` に SQLite ファイルを作成する
    pub fn open(data_dir: &Path) -> Result<Self, AppError> {
        let db_path = data_dir.join("codesearch.db");
        let conn = Connection::open(&db_path)?;

        // WALモードで並行読み書き性能を向上
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")?;

        let db = Database {
            conn: std::sync::Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    /// マイグレーションを実行する
    fn run_migrations(&self) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(MIGRATION_V1)?;
        Ok(())
    }

    /// ロックを取得して接続を返す
    ///
    /// # Panics
    /// Mutex が汚染されている場合はパニックする
    pub fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().unwrap()
    }
}

/// V1 マイグレーション: search_history テーブルの作成
const MIGRATION_V1: &str = "
CREATE TABLE IF NOT EXISTS search_history (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id   TEXT    NOT NULL,
    query          TEXT    NOT NULL,
    is_regex       INTEGER NOT NULL DEFAULT 0,
    case_sensitive INTEGER NOT NULL DEFAULT 0,
    whole_word     INTEGER NOT NULL DEFAULT 0,
    include_glob   TEXT,
    exclude_glob   TEXT,
    result_count   INTEGER,
    searched_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_search_history_workspace
    ON search_history (workspace_id, searched_at DESC);
";

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn データベースを作成してテーブルが存在すること() {
        let tmp = TempDir::new().unwrap();
        let db = Database::open(tmp.path()).unwrap();
        let conn = db.conn();

        // search_history テーブルが存在するか確認
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='search_history'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn マイグレーションが冪等であること() {
        let tmp = TempDir::new().unwrap();
        // 2回オープンしてもエラーにならない
        let _db1 = Database::open(tmp.path()).unwrap();
        let _db2 = Database::open(tmp.path()).unwrap();
    }
}
