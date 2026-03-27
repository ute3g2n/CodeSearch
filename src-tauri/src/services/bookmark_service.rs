/// ブックマーク管理サービス
/// BookmarkRepo をラップし、ビジネスロジックを提供する
use std::sync::Arc;

use crate::errors::AppError;
use crate::models::bookmark::{AddBookmarkRequest, Bookmark};
use crate::storage::bookmark_repo::BookmarkRepo;
use crate::storage::database::Database;

/// ブックマーク管理サービス
pub struct BookmarkService {
    db: Arc<Database>,
}

impl BookmarkService {
    /// Database を受け取って BookmarkService を作成する
    pub fn new(db: Arc<Database>) -> Self {
        BookmarkService { db }
    }

    /// ブックマークを追加する
    pub fn add(&self, req: AddBookmarkRequest) -> Result<Bookmark, AppError> {
        let repo = BookmarkRepo::new(&self.db);
        repo.add(&req)
    }

    /// ブックマークを削除する
    pub fn remove(&self, id: i64) -> Result<(), AppError> {
        let repo = BookmarkRepo::new(&self.db);
        repo.remove(id)
    }

    /// ワークスペースの全ブックマークを取得する
    pub fn list_by_workspace(&self, workspace_id: &str) -> Result<Vec<Bookmark>, AppError> {
        let repo = BookmarkRepo::new(&self.db);
        repo.list_by_workspace(workspace_id)
    }

    /// 指定色インデックスのブックマークを全削除する
    pub fn clear_by_color(&self, workspace_id: &str, color_index: u8) -> Result<(), AppError> {
        let repo = BookmarkRepo::new(&self.db);
        repo.clear_by_color(workspace_id, color_index)
    }

    /// ファイル編集時の行番号自動調整
    ///
    /// after_line（1-based）以降のブックマーク行番号を delta だけシフトする。
    /// 行挿入時は delta > 0、行削除時は delta < 0 を渡す。
    pub fn shift_line_numbers(
        &self,
        workspace_id: &str,
        file_path: &str,
        after_line: u32,
        delta: i32,
    ) -> Result<(), AppError> {
        let repo = BookmarkRepo::new(&self.db);
        repo.shift_line_numbers(workspace_id, file_path, after_line, delta)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::database::Database;
    use tempfile::TempDir;

    fn setup() -> (TempDir, BookmarkService) {
        let tmp = TempDir::new().unwrap();
        let db = Arc::new(Database::open(tmp.path()).unwrap());
        let svc = BookmarkService::new(db);
        (tmp, svc)
    }

    #[test]
    fn ブックマークのCRUDが動作すること() {
        let (_tmp, svc) = setup();

        // 追加
        let b = svc
            .add(AddBookmarkRequest {
                workspace_id: "ws1".into(),
                file_path: "/src/main.rs".into(),
                line_number: 42,
                color_index: 2,
                preview_text: Some("fn main()".into()),
            })
            .unwrap();
        assert_eq!(b.line_number, 42);

        // 一覧取得
        let list = svc.list_by_workspace("ws1").unwrap();
        assert_eq!(list.len(), 1);

        // 削除
        svc.remove(b.id).unwrap();
        let list = svc.list_by_workspace("ws1").unwrap();
        assert!(list.is_empty());
    }

    #[test]
    fn 色別一括削除が動作すること() {
        let (_tmp, svc) = setup();

        for (line, color) in [(10, 0), (20, 1), (30, 0)] {
            svc.add(AddBookmarkRequest {
                workspace_id: "ws1".into(),
                file_path: "/src/main.rs".into(),
                line_number: line,
                color_index: color,
                preview_text: None,
            })
            .unwrap();
        }

        svc.clear_by_color("ws1", 0).unwrap();

        let list = svc.list_by_workspace("ws1").unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].color_index, 1);
    }

    #[test]
    fn 行番号自動調整が動作すること() {
        let (_tmp, svc) = setup();

        for line in [5u32, 10, 20] {
            svc.add(AddBookmarkRequest {
                workspace_id: "ws1".into(),
                file_path: "/src/main.rs".into(),
                line_number: line,
                color_index: 0,
                preview_text: None,
            })
            .unwrap();
        }

        // 行 8 以降に 3 行挿入（after_line=8, delta=+3）
        svc.shift_line_numbers("ws1", "/src/main.rs", 8, 3).unwrap();

        let list = svc.list_by_workspace("ws1").unwrap();
        let lines: Vec<u32> = list.iter().map(|b| b.line_number).collect();
        assert_eq!(lines, vec![5, 13, 23]); // 5 は変化なし、10→13、20→23
    }
}
