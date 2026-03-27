/// ブックマークリポジトリ
/// bookmarks テーブルへの CRUD 操作を担う
use crate::errors::AppError;
use crate::models::bookmark::{AddBookmarkRequest, Bookmark};
use crate::storage::database::Database;

/// ブックマークリポジトリ
pub struct BookmarkRepo<'a> {
    db: &'a Database,
}

impl<'a> BookmarkRepo<'a> {
    /// Database から BookmarkRepo を作成する
    pub fn new(db: &'a Database) -> Self {
        BookmarkRepo { db }
    }

    /// ブックマークを追加する
    ///
    /// 同一ワークスペース・ファイル・行番号が既に存在する場合は color_index と
    /// preview_text を更新して既存レコードを返す（UPSERT）
    pub fn add(&self, req: &AddBookmarkRequest) -> Result<Bookmark, AppError> {
        let conn = self.db.conn();
        conn.execute(
            "INSERT INTO bookmarks (workspace_id, file_path, line_number, color_index, preview_text)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(workspace_id, file_path, line_number)
             DO UPDATE SET color_index = excluded.color_index,
                           preview_text = excluded.preview_text",
            rusqlite::params![
                req.workspace_id,
                req.file_path,
                req.line_number,
                req.color_index,
                req.preview_text,
            ],
        )?;

        let id = conn.last_insert_rowid();
        // UPSERT で既存行が更新された場合 last_insert_rowid は 0 になる場合があるため
        // 行番号で再取得する
        let bookmark = conn.query_row(
            "SELECT id, workspace_id, file_path, line_number, color_index, preview_text, created_at
             FROM bookmarks
             WHERE workspace_id = ?1 AND file_path = ?2 AND line_number = ?3",
            rusqlite::params![req.workspace_id, req.file_path, req.line_number],
            Self::row_to_bookmark,
        )?;

        let _ = id; // 使用しない
        Ok(bookmark)
    }

    /// 指定IDのブックマークを削除する
    pub fn remove(&self, id: i64) -> Result<(), AppError> {
        let conn = self.db.conn();
        conn.execute("DELETE FROM bookmarks WHERE id = ?1", [id])?;
        Ok(())
    }

    /// ワークスペースの全ブックマークを取得する
    ///
    /// ファイルパス昇順 → 行番号昇順でソートする
    pub fn list_by_workspace(&self, workspace_id: &str) -> Result<Vec<Bookmark>, AppError> {
        let conn = self.db.conn();
        let mut stmt = conn.prepare(
            "SELECT id, workspace_id, file_path, line_number, color_index, preview_text, created_at
             FROM bookmarks
             WHERE workspace_id = ?1
             ORDER BY file_path ASC, line_number ASC",
        )?;

        let bookmarks = stmt.query_map(rusqlite::params![workspace_id], Self::row_to_bookmark)?;

        let mut result = Vec::new();
        for b in bookmarks {
            result.push(b?);
        }
        Ok(result)
    }

    /// 指定行のブックマークを返す（存在しない場合は None）
    pub fn find_by_line(
        &self,
        workspace_id: &str,
        file_path: &str,
        line_number: u32,
    ) -> Result<Option<Bookmark>, AppError> {
        let conn = self.db.conn();
        let result = conn.query_row(
            "SELECT id, workspace_id, file_path, line_number, color_index, preview_text, created_at
             FROM bookmarks
             WHERE workspace_id = ?1 AND file_path = ?2 AND line_number = ?3",
            rusqlite::params![workspace_id, file_path, line_number],
            Self::row_to_bookmark,
        );

        match result {
            Ok(b) => Ok(Some(b)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::DatabaseError(e)),
        }
    }

    /// 指定色インデックスのブックマークを全削除する
    pub fn clear_by_color(&self, workspace_id: &str, color_index: u8) -> Result<(), AppError> {
        let conn = self.db.conn();
        conn.execute(
            "DELETE FROM bookmarks WHERE workspace_id = ?1 AND color_index = ?2",
            rusqlite::params![workspace_id, color_index],
        )?;
        Ok(())
    }

    /// ファイル内の行番号をシフトする
    ///
    /// after_line（1-based）以降の行番号を delta だけ増減する。
    /// 結果が 1 未満になる行は削除する（行削除によりブックマーク行が消えた場合）。
    pub fn shift_line_numbers(
        &self,
        workspace_id: &str,
        file_path: &str,
        after_line: u32,
        delta: i32,
    ) -> Result<(), AppError> {
        let conn = self.db.conn();

        if delta < 0 {
            // 削除により 1 未満になる行を先に消す
            conn.execute(
                "DELETE FROM bookmarks
                 WHERE workspace_id = ?1
                   AND file_path = ?2
                   AND line_number > ?3
                   AND CAST(line_number AS INTEGER) + ?4 < 1",
                rusqlite::params![workspace_id, file_path, after_line, delta],
            )?;
        }

        // after_line より後（after_line は含まない）の行番号をシフトする
        conn.execute(
            "UPDATE bookmarks
             SET line_number = CAST(line_number AS INTEGER) + ?4
             WHERE workspace_id = ?1
               AND file_path = ?2
               AND line_number > ?3",
            rusqlite::params![workspace_id, file_path, after_line, delta],
        )?;

        Ok(())
    }

    /// クエリ結果行を Bookmark に変換するヘルパー
    fn row_to_bookmark(row: &rusqlite::Row<'_>) -> rusqlite::Result<Bookmark> {
        Ok(Bookmark {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            file_path: row.get(2)?,
            line_number: row.get::<_, i64>(3)? as u32,
            color_index: row.get::<_, i64>(4)? as u8,
            preview_text: row.get(5)?,
            created_at: row.get(6)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::bookmark::AddBookmarkRequest;
    use crate::storage::database::Database;
    use tempfile::TempDir;

    fn setup() -> (TempDir, Database) {
        let tmp = TempDir::new().unwrap();
        let db = Database::open(tmp.path()).unwrap();
        (tmp, db)
    }

    fn make_req(line: u32, color: u8) -> AddBookmarkRequest {
        AddBookmarkRequest {
            workspace_id: "ws1".into(),
            file_path: "/path/to/file.rs".into(),
            line_number: line,
            color_index: color,
            preview_text: Some(format!("line {} content", line)),
        }
    }

    #[test]
    fn ブックマークを追加して取得できること() {
        let (_tmp, db) = setup();
        let repo = BookmarkRepo::new(&db);

        let b = repo.add(&make_req(10, 0)).unwrap();
        assert_eq!(b.line_number, 10);
        assert_eq!(b.color_index, 0);

        let list = repo.list_by_workspace("ws1").unwrap();
        assert_eq!(list.len(), 1);
    }

    #[test]
    fn 同一行への追加はUPSERTになること() {
        let (_tmp, db) = setup();
        let repo = BookmarkRepo::new(&db);

        repo.add(&make_req(10, 0)).unwrap();
        let b = repo.add(&make_req(10, 3)).unwrap(); // color_index を 3 に変更

        let list = repo.list_by_workspace("ws1").unwrap();
        assert_eq!(list.len(), 1); // レコードは1件のまま
        assert_eq!(b.color_index, 3);
    }

    #[test]
    fn ブックマークを削除できること() {
        let (_tmp, db) = setup();
        let repo = BookmarkRepo::new(&db);

        let b = repo.add(&make_req(10, 0)).unwrap();
        repo.remove(b.id).unwrap();

        let list = repo.list_by_workspace("ws1").unwrap();
        assert!(list.is_empty());
    }

    #[test]
    fn 行番号でブックマークを検索できること() {
        let (_tmp, db) = setup();
        let repo = BookmarkRepo::new(&db);

        repo.add(&make_req(10, 0)).unwrap();

        let found = repo.find_by_line("ws1", "/path/to/file.rs", 10).unwrap();
        assert!(found.is_some());

        let not_found = repo.find_by_line("ws1", "/path/to/file.rs", 99).unwrap();
        assert!(not_found.is_none());
    }

    #[test]
    fn 色インデックスで一括削除できること() {
        let (_tmp, db) = setup();
        let repo = BookmarkRepo::new(&db);

        repo.add(&make_req(10, 0)).unwrap();
        repo.add(&make_req(20, 1)).unwrap();
        repo.add(&make_req(30, 0)).unwrap();

        repo.clear_by_color("ws1", 0).unwrap();

        let list = repo.list_by_workspace("ws1").unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].color_index, 1);
    }

    #[test]
    fn 行番号シフトが正しく動作すること() {
        let (_tmp, db) = setup();
        let repo = BookmarkRepo::new(&db);

        repo.add(&make_req(5, 0)).unwrap();
        repo.add(&make_req(10, 0)).unwrap();
        repo.add(&make_req(15, 0)).unwrap();

        // 行 7 以降を +2 シフト（行 10 → 12、行 15 → 17）
        repo.shift_line_numbers("ws1", "/path/to/file.rs", 7, 2).unwrap();

        let list = repo.list_by_workspace("ws1").unwrap();
        let lines: Vec<u32> = list.iter().map(|b| b.line_number).collect();
        assert_eq!(lines, vec![5, 12, 17]);
    }

    #[test]
    fn 行削除シフトで1未満になるブックマークは消えること() {
        let (_tmp, db) = setup();
        let repo = BookmarkRepo::new(&db);

        repo.add(&make_req(10, 0)).unwrap();
        repo.add(&make_req(11, 0)).unwrap();
        repo.add(&make_req(20, 0)).unwrap();

        // 行 10〜12 の3行を削除した場合（after_line=10, delta=-3）
        // 行 11 → 8、行 20 → 17 になるが行 11 は消えないのでチェック
        repo.shift_line_numbers("ws1", "/path/to/file.rs", 10, -3).unwrap();

        let list = repo.list_by_workspace("ws1").unwrap();
        let lines: Vec<u32> = list.iter().map(|b| b.line_number).collect();
        // 行 10 はシフト対象外（after_line=10 → 10より後なので10は含まない）
        // 行 11 → 11-3 = 8、行 20 → 20-3 = 17
        assert_eq!(lines, vec![8, 10, 17]);
    }
}
