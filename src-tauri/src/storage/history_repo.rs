/// 検索履歴リポジトリ
/// search_history テーブルへの CRUD 操作を担う
use crate::errors::AppError;
use crate::models::search::HistoryEntry;
use crate::storage::database::Database;

/// 検索履歴の新規登録パラメータ
pub struct NewHistoryEntry<'a> {
    pub workspace_id: &'a str,
    pub query: &'a str,
    pub is_regex: bool,
    pub case_sensitive: bool,
    pub whole_word: bool,
    pub include_glob: Option<&'a str>,
    pub exclude_glob: Option<&'a str>,
    pub result_count: Option<u64>,
}

/// 検索履歴リポジトリ
pub struct HistoryRepo<'a> {
    db: &'a Database,
}

impl<'a> HistoryRepo<'a> {
    /// Database から HistoryRepo を作成する
    pub fn new(db: &'a Database) -> Self {
        HistoryRepo { db }
    }

    /// 検索履歴を記録する
    ///
    /// 同一クエリが直前に存在する場合は更新（重複防止）
    pub fn record(&self, entry: &NewHistoryEntry) -> Result<i64, AppError> {
        let conn = self.db.conn();
        conn.execute(
            "INSERT INTO search_history
                (workspace_id, query, is_regex, case_sensitive, whole_word,
                 include_glob, exclude_glob, result_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                entry.workspace_id,
                entry.query,
                entry.is_regex as i32,
                entry.case_sensitive as i32,
                entry.whole_word as i32,
                entry.include_glob,
                entry.exclude_glob,
                entry.result_count.map(|n| n as i64),
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    /// ワークスペースの検索履歴を新しい順に取得する
    pub fn list(&self, workspace_id: &str, limit: u32) -> Result<Vec<HistoryEntry>, AppError> {
        let conn = self.db.conn();
        let mut stmt = conn.prepare(
            "SELECT id, workspace_id, query, is_regex, case_sensitive, whole_word,
                    include_glob, exclude_glob, result_count, searched_at
             FROM search_history
             WHERE workspace_id = ?1
             ORDER BY searched_at DESC, id DESC
             LIMIT ?2",
        )?;

        let entries = stmt.query_map(
            rusqlite::params![workspace_id, limit],
            |row| {
                Ok(HistoryEntry {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    query: row.get(2)?,
                    is_regex: row.get::<_, i32>(3)? != 0,
                    case_sensitive: row.get::<_, i32>(4)? != 0,
                    whole_word: row.get::<_, i32>(5)? != 0,
                    include_glob: row.get(6)?,
                    exclude_glob: row.get(7)?,
                    result_count: row.get::<_, Option<i64>>(8)?.map(|n| n as u64),
                    searched_at: row.get(9)?,
                })
            },
        )?;

        let mut result = Vec::new();
        for entry in entries {
            result.push(entry?);
        }
        Ok(result)
    }

    /// 指定IDの履歴を削除する
    pub fn delete(&self, id: i64) -> Result<(), AppError> {
        let conn = self.db.conn();
        conn.execute("DELETE FROM search_history WHERE id = ?1", [id])?;
        Ok(())
    }

    /// ワークスペースの全履歴を削除する
    pub fn clear_workspace(&self, workspace_id: &str) -> Result<(), AppError> {
        let conn = self.db.conn();
        conn.execute(
            "DELETE FROM search_history WHERE workspace_id = ?1",
            [workspace_id],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::database::Database;
    use tempfile::TempDir;

    fn setup() -> (TempDir, Database) {
        let tmp = TempDir::new().unwrap();
        let db = Database::open(tmp.path()).unwrap();
        (tmp, db)
    }

    #[test]
    fn 検索履歴を記録して取得できること() {
        let (_tmp, db) = setup();
        let repo = HistoryRepo::new(&db);

        let id = repo
            .record(&NewHistoryEntry {
                workspace_id: "ws1",
                query: "fn main",
                is_regex: false,
                case_sensitive: false,
                whole_word: false,
                include_glob: None,
                exclude_glob: None,
                result_count: Some(5),
            })
            .unwrap();
        assert!(id > 0);

        let list = repo.list("ws1", 10).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].query, "fn main");
        assert_eq!(list[0].result_count, Some(5));
    }

    #[test]
    fn 複数履歴が新しい順に返ること() {
        let (_tmp, db) = setup();
        let repo = HistoryRepo::new(&db);

        for q in ["alpha", "beta", "gamma"] {
            repo.record(&NewHistoryEntry {
                workspace_id: "ws1",
                query: q,
                is_regex: false,
                case_sensitive: false,
                whole_word: false,
                include_glob: None,
                exclude_glob: None,
                result_count: None,
            })
            .unwrap();
        }

        let list = repo.list("ws1", 10).unwrap();
        assert_eq!(list.len(), 3);
        // 新しい順（gamma が先頭）
        assert_eq!(list[0].query, "gamma");
    }

    #[test]
    fn 別ワークスペースの履歴は取得されないこと() {
        let (_tmp, db) = setup();
        let repo = HistoryRepo::new(&db);

        repo.record(&NewHistoryEntry {
            workspace_id: "ws1",
            query: "test",
            is_regex: false,
            case_sensitive: false,
            whole_word: false,
            include_glob: None,
            exclude_glob: None,
            result_count: None,
        })
        .unwrap();

        let list = repo.list("ws2", 10).unwrap();
        assert!(list.is_empty());
    }

    #[test]
    fn 履歴を削除できること() {
        let (_tmp, db) = setup();
        let repo = HistoryRepo::new(&db);

        let id = repo
            .record(&NewHistoryEntry {
                workspace_id: "ws1",
                query: "delete_me",
                is_regex: false,
                case_sensitive: false,
                whole_word: false,
                include_glob: None,
                exclude_glob: None,
                result_count: None,
            })
            .unwrap();

        repo.delete(id).unwrap();
        let list = repo.list("ws1", 10).unwrap();
        assert!(list.is_empty());
    }

    #[test]
    fn ワークスペースの全履歴を削除できること() {
        let (_tmp, db) = setup();
        let repo = HistoryRepo::new(&db);

        for q in ["a", "b", "c"] {
            repo.record(&NewHistoryEntry {
                workspace_id: "ws1",
                query: q,
                is_regex: false,
                case_sensitive: false,
                whole_word: false,
                include_glob: None,
                exclude_glob: None,
                result_count: None,
            })
            .unwrap();
        }

        repo.clear_workspace("ws1").unwrap();
        let list = repo.list("ws1", 10).unwrap();
        assert!(list.is_empty());
    }
}
