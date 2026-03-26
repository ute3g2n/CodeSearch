use serde::{Deserialize, Serialize};

/// ブックマークエンティティ（SQLiteテーブルと1:1対応）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bookmark {
    pub id: i64,
    pub workspace_id: String,
    pub file_path: String,
    /// 行番号（1-based）
    pub line_number: u32,
    /// カラーインデックス（0〜14）
    pub color_index: u8,
    /// 該当行のプレビューテキスト（先頭100文字）
    pub preview_text: Option<String>,
    pub created_at: String,
}

/// ブックマーク追加リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddBookmarkRequest {
    pub workspace_id: String,
    pub file_path: String,
    pub line_number: u32,
    pub color_index: u8,
    pub preview_text: Option<String>,
}

/// ブックマークカラー定義（15色プリセット）
/// 要件定義書セクション3.7.2に基づく
pub const BOOKMARK_COLORS: [&str; 15] = [
    "#E53935", // 0: 赤
    "#FF7043", // 1: オレンジ
    "#FFB300", // 2: アンバー
    "#FDD835", // 3: イエロー
    "#C0CA33", // 4: ライム
    "#43A047", // 5: グリーン
    "#00897B", // 6: ティール
    "#00ACC1", // 7: シアン
    "#039BE5", // 8: ライトブルー
    "#3949AB", // 9: インディゴ
    "#5E35B1", // 10: ディープパープル
    "#8E24AA", // 11: パープル
    "#D81B60", // 12: ピンク
    "#6D4C41", // 13: ブラウン
    "#546E7A", // 14: ブルーグレー
];
