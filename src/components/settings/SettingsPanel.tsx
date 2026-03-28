// 設定パネルコンポーネント
// フォント設定・ミニマップ・言語切替・除外パターンを提供する
import React, { useEffect, useState } from "react";
import { useConfigStore } from "../../stores/config";
import type { AppConfig } from "../../stores/config";
import { t } from "../../i18n";

// セクションヘッダー
const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "0.08em",
      color: "var(--color-sidebar-fg, #cccccc)",
      textTransform: "uppercase",
      opacity: 0.7,
      padding: "12px 0 4px",
    }}
  >
    {label}
  </div>
);

// テキスト入力行
const SettingRow: React.FC<{
  label: string;
  type?: "text" | "number";
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  testId?: string;
}> = ({ label, type = "text", value, onChange, min, max, testId }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "8px" }}>
    <label style={{ fontSize: "12px", color: "var(--color-sidebar-fg, #cccccc)" }}>
      {label}
    </label>
    <input
      data-testid={testId}
      type={type}
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "var(--color-input-bg, #3c3c3c)",
        border: "1px solid var(--color-input-border, #555555)",
        borderRadius: "3px",
        color: "var(--color-input-fg, #cccccc)",
        fontSize: "12px",
        padding: "4px 8px",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
      }}
    />
  </div>
);

// トグルスイッチ行
const ToggleRow: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testId?: string;
}> = ({ label, value, onChange, testId }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "8px",
    }}
  >
    <label style={{ fontSize: "12px", color: "var(--color-sidebar-fg, #cccccc)" }}>
      {label}
    </label>
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
      style={{ cursor: "pointer" }}
      data-testid={testId}
    />
  </div>
);

/// 設定パネル本体
const SettingsPanel: React.FC = () => {
  const { config, isLoaded, loadConfig, saveConfig } = useConfigStore();
  const [draft, setDraft] = useState<AppConfig>(config);
  const [saved, setSaved] = useState(false);

  // 初回読み込み
  useEffect(() => {
    if (!isLoaded) {
      loadConfig();
    }
  }, [isLoaded, loadConfig]);

  // 設定変更時にドラフトを更新する
  useEffect(() => {
    setDraft(config);
  }, [config]);

  const handleSave = async () => {
    await saveConfig(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div
      data-testid="settings-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
        padding: "16px",
        fontSize: "13px",
        color: "var(--color-sidebar-fg, #cccccc)",
      }}
    >
      {/* タイトル */}
      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          marginBottom: "8px",
          color: "var(--color-sidebar-fg, #cccccc)",
        }}
      >
        {t("settings.title")}
      </div>

      {/* エディタセクション */}
      <SectionHeader label={t("settings.editor")} />
      <SettingRow
        label={t("settings.editorFontFamily")}
        value={draft.editorFontFamily}
        onChange={(v) => setDraft((d) => ({ ...d, editorFontFamily: v }))}
        testId="settings-font-family"
      />
      <SettingRow
        label={t("settings.editorFontSize")}
        type="number"
        value={String(draft.editorFontSize)}
        min={8}
        max={32}
        onChange={(v) =>
          setDraft((d) => ({ ...d, editorFontSize: Number(v) || d.editorFontSize }))
        }
        testId="editor-font-size"
      />

      {/* UIセクション */}
      <SectionHeader label={t("settings.ui")} />
      <SettingRow
        label={t("settings.uiFontFamily")}
        value={draft.uiFontFamily}
        onChange={(v) => setDraft((d) => ({ ...d, uiFontFamily: v }))}
      />
      <SettingRow
        label={t("settings.uiFontSize")}
        type="number"
        value={String(draft.uiFontSize)}
        min={8}
        max={24}
        onChange={(v) =>
          setDraft((d) => ({ ...d, uiFontSize: Number(v) || d.uiFontSize }))
        }
      />

      {/* ミニマップ */}
      <SectionHeader label={t("settings.minimap")} />
      <ToggleRow
        label={t("settings.minimapEnabled")}
        value={draft.minimapEnabled}
        onChange={(v) => setDraft((d) => ({ ...d, minimapEnabled: v }))}
        testId="settings-minimap-toggle"
      />

      {/* 言語 */}
      <SectionHeader label={t("settings.language")} />
      <div style={{ marginBottom: "8px" }}>
        <select
          data-testid="language-select"
          value={draft.language}
          onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))}
          style={{
            background: "var(--color-input-bg, #3c3c3c)",
            border: "1px solid var(--color-input-border, #555555)",
            borderRadius: "3px",
            color: "var(--color-input-fg, #cccccc)",
            fontSize: "12px",
            padding: "4px 8px",
            outline: "none",
            width: "100%",
            cursor: "pointer",
          }}
        >
          <option value="ja">{t("settings.languageJa")}</option>
          <option value="en">{t("settings.languageEn")}</option>
        </select>
      </div>

      {/* 除外パターン */}
      <SectionHeader label={t("settings.excludePatterns")} />
      <div style={{ marginBottom: "4px", fontSize: "11px", opacity: 0.7 }}>
        {t("settings.excludePatternsHelp")}
      </div>
      <textarea
        data-testid="settings-exclude-patterns"
        value={draft.excludePatterns.join("\n")}
        onChange={(e) =>
          setDraft((d) => ({
            ...d,
            excludePatterns: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
          }))
        }
        rows={6}
        style={{
          background: "var(--color-input-bg, #3c3c3c)",
          border: "1px solid var(--color-input-border, #555555)",
          borderRadius: "3px",
          color: "var(--color-input-fg, #cccccc)",
          fontSize: "12px",
          padding: "4px 8px",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
          fontFamily: "monospace",
          marginBottom: "16px",
        }}
      />

      {/* 保存ボタン */}
      <button
        data-testid="settings-save-btn"
        onClick={handleSave}
        style={{
          background: "var(--color-accent, #007acc)",
          border: "none",
          borderRadius: "4px",
          color: "#fff",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          padding: "8px 20px",
          alignSelf: "flex-start",
        }}
      >
        {saved ? t("settings.saved") : t("settings.save")}
      </button>
    </div>
  );
};

export default SettingsPanel;
