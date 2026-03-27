/// インデックスマネージャー
/// Tantivy インデックスの open/create/commit/更新 を管理する
use std::path::{Path, PathBuf};

use tantivy::{
    doc, Index, IndexReader, IndexWriter, ReloadPolicy, Term,
};

use crate::errors::AppError;

use super::schema::LineSchema;
use super::tokenizer::register_tokenizer;

/// ドキュメント件数と書き込み処理を担うマネージャー
pub struct IndexManager {
    pub(crate) schema: LineSchema,
    pub(crate) index: Index,
    writer: IndexWriter,
    reader: IndexReader,
    #[allow(dead_code)]
    index_path: PathBuf,
    #[allow(dead_code)]
    workspace_id: String,
}

impl IndexManager {
    /// インデックスを開く（存在しなければ新規作成）
    ///
    /// `data_dir/indexes/<workspace_id>/` にインデックスファイルを保存する
    pub fn open_or_create(data_dir: &Path, workspace_id: &str) -> Result<Self, AppError> {
        let index_path = data_dir.join("indexes").join(workspace_id);
        std::fs::create_dir_all(&index_path).map_err(AppError::IoError)?;

        let schema = LineSchema::build();

        let index = if index_path.join("meta.json").exists() {
            Index::open_in_dir(&index_path).map_err(|e| AppError::IndexError {
                message: format!("インデックスのオープンに失敗: {e}"),
            })?
        } else {
            Index::create_in_dir(&index_path, schema.schema.clone()).map_err(|e| {
                AppError::IndexError {
                    message: format!("インデックスの作成に失敗: {e}"),
                }
            })?
        };

        // 日本語トークナイザを登録
        register_tokenizer(&index);

        let writer = index
            .writer(50_000_000) // 50MB ヒープ
            .map_err(|e| AppError::IndexError {
                message: format!("ライターの作成に失敗: {e}"),
            })?;

        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::Manual)
            .try_into()
            .map_err(|e| AppError::IndexError {
                message: format!("リーダーの作成に失敗: {e}"),
            })?;

        Ok(IndexManager {
            schema,
            index,
            writer,
            reader,
            index_path,
            workspace_id: workspace_id.to_string(),
        })
    }

    /// ファイルの全行をインデックスに登録する
    ///
    /// 呼び出し前に `delete_file_docs` で既存ドキュメントを削除すること
    pub fn index_file(&mut self, file_path: &str, lines: &[String]) -> Result<(), AppError> {
        for (i, line) in lines.iter().enumerate() {
            let line_number = (i + 1) as i64;
            let doc = doc!(
                self.schema.file_path => file_path,
                self.schema.line_number => line_number,
                self.schema.line_content => line.as_str(),
            );
            self.writer
                .add_document(doc)
                .map_err(|e| AppError::IndexError {
                    message: format!("ドキュメント追加に失敗: {e}"),
                })?;
        }
        Ok(())
    }

    /// 指定ファイルのドキュメントをインデックスから全件削除する
    pub fn delete_file_docs(&mut self, file_path: &str) -> Result<(), AppError> {
        let term = Term::from_field_text(self.schema.file_path, file_path);
        self.writer.delete_term(term);
        Ok(())
    }

    /// ライターをコミットして変更を確定する
    /// Manual リロードポリシーのため、コミット後にリーダーを明示的に更新する
    pub fn commit(&mut self) -> Result<(), AppError> {
        self.writer.commit().map_err(|e| AppError::IndexError {
            message: format!("コミットに失敗: {e}"),
        })?;
        self.reader.reload().map_err(|e| AppError::IndexError {
            message: format!("リーダーの再ロードに失敗: {e}"),
        })?;
        Ok(())
    }

    /// 現在のインデックスのドキュメント総数を返す
    pub fn doc_count(&self) -> u64 {
        let searcher = self.reader.searcher();
        searcher.num_docs()
    }

    /// Tantivy の Searcher を取得する
    pub fn reader(&self) -> &IndexReader {
        &self.reader
    }
}
