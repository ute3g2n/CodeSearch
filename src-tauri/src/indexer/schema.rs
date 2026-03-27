/// Tantivy インデックススキーマ定義
/// 基本設計書セクション6.3: 1ドキュメント = 1行
use tantivy::schema::{
    Field, IndexRecordOption, Schema, SchemaBuilder, TextFieldIndexing, TextOptions, INDEXED,
    STORED, STRING,
};

use super::tokenizer::JA_TOKENIZER_NAME;

/// 行インデックスのスキーマフィールドをまとめた構造体
pub struct LineSchema {
    pub schema: Schema,
    /// ファイル絶対パス（STRING | STORED）
    pub file_path: Field,
    /// 行番号（I64 | INDEXED | STORED）
    pub line_number: Field,
    /// 行テキスト（TEXT | STORED | ja_tokenizer でインデックス）
    pub line_content: Field,
}

impl LineSchema {
    /// スキーマを構築して返す
    pub fn build() -> Self {
        let mut builder = SchemaBuilder::new();

        // ファイルパス: 完全一致フィルタ用（トークナイズなし）
        let file_path = builder.add_text_field("file_path", STRING | STORED);

        // 行番号: 数値フィールド（検索・ソート用）
        let line_number = builder.add_i64_field("line_number", INDEXED | STORED);

        // 行テキスト: 全文検索対象（日本語トークナイザ）
        let text_options = TextOptions::default()
            .set_indexing_options(
                TextFieldIndexing::default()
                    .set_tokenizer(JA_TOKENIZER_NAME)
                    .set_index_option(IndexRecordOption::WithFreqsAndPositions),
            )
            .set_stored();
        let line_content = builder.add_text_field("line_content", text_options);

        let schema = builder.build();

        LineSchema {
            schema,
            file_path,
            line_number,
            line_content,
        }
    }
}
