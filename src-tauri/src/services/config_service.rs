/// 設定管理サービス
/// settings.json の読み書きと AppConfig の管理を担う

use std::fs;
use std::path::{Path, PathBuf};

use crate::errors::AppError;
use crate::models::config::AppConfig;

/// 設定ファイル名
const SETTINGS_FILE: &str = "settings.json";

/// 設定管理サービス
pub struct ConfigService {
    /// 設定ファイルのパス
    settings_path: PathBuf,
    /// メモリ上の設定値
    config: AppConfig,
}

impl ConfigService {
    /// データディレクトリを指定して ConfigService を作成する
    ///
    /// settings.json が存在すれば読み込み、なければデフォルト値を使用する
    pub fn new(data_dir: &Path) -> Self {
        let settings_path = data_dir.join(SETTINGS_FILE);
        let config = Self::load_from_file(&settings_path).unwrap_or_default();
        Self {
            settings_path,
            config,
        }
    }

    /// 現在の設定を返す
    pub fn get_config(&self) -> &AppConfig {
        &self.config
    }

    /// 設定を更新して settings.json に保存する
    pub fn save_config(&mut self, config: AppConfig) -> Result<(), AppError> {
        self.config = config;
        self.save_to_file()
    }

    /// settings.json からデシリアライズして AppConfig を返す
    fn load_from_file(path: &Path) -> Option<AppConfig> {
        let text = fs::read_to_string(path).ok()?;
        serde_json::from_str(&text).ok()
    }

    /// 現在の設定を settings.json にシリアライズして書き込む
    fn save_to_file(&self) -> Result<(), AppError> {
        // 親ディレクトリを確保する
        if let Some(parent) = self.settings_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let text = serde_json::to_string_pretty(&self.config).map_err(|e| {
            AppError::InvalidArgument {
                message: format!("設定のシリアライズに失敗: {e}"),
            }
        })?;
        fs::write(&self.settings_path, text)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup() -> (TempDir, ConfigService) {
        let tmp = TempDir::new().unwrap();
        let service = ConfigService::new(tmp.path());
        (tmp, service)
    }

    #[test]
    fn デフォルト設定で初期化されること() {
        let (_tmp, service) = setup();
        let config = service.get_config();
        assert_eq!(config.language, "ja");
        assert!(config.minimap_enabled);
        assert_eq!(config.editor_font_size, 14);
    }

    #[test]
    fn 設定を保存して再読み込みできること() {
        let tmp = TempDir::new().unwrap();
        {
            let mut service = ConfigService::new(tmp.path());
            let mut config = service.get_config().clone();
            config.language = "en".to_string();
            config.minimap_enabled = false;
            service.save_config(config).unwrap();
        }
        // 再作成して読み込み確認
        let service2 = ConfigService::new(tmp.path());
        assert_eq!(service2.get_config().language, "en");
        assert!(!service2.get_config().minimap_enabled);
    }

    #[test]
    fn 設定ファイルが壊れていてもデフォルトで起動できること() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("settings.json");
        fs::write(&path, "{ invalid json").unwrap();
        let service = ConfigService::new(tmp.path());
        // デフォルト値にフォールバック
        assert_eq!(service.get_config().language, "ja");
    }
}
