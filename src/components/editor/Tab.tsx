import React from "react";
import { getFileIcon } from "../../utils/fileIcons";
import type { Tab as TabType } from "../../stores/editor";

interface TabProps {
  tab: TabType;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

/** タブの kind に応じたアイコンを返す */
function getTabIcon(tab: TabType): string {
  switch (tab.kind) {
    case "file": {
      const ext = tab.filePath?.split(".").pop() ?? null;
      return getFileIcon(ext);
    }
    case "search-editor":
      return "🔍";
    case "plain-text":
      return "📄";
    case "welcome":
      return "🏠";
  }
}

/// エディタタブ1枚コンポーネント
/// - アクティブ時は上部にアクセントカラーのボーダー
/// - 閉じるボタン（×）で onClose を呼び出す
const Tab: React.FC<TabProps> = ({ tab, isActive, onClick, onClose, onContextMenu }) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      data-testid="tab"
      data-title={tab.title}
      data-active={isActive ? "true" : "false"}
      data-preview={tab.isPreview ? "true" : "false"}
      onContextMenu={onContextMenu}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "0 8px",
        height: "35px",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        fontSize: "13px",
        color: isActive
          ? "var(--color-tab-active-fg, #ffffff)"
          : "var(--color-tab-inactive-fg, #8c8c8c)",
        backgroundColor: isActive
          ? "var(--color-tab-active-bg, #1e1e1e)"
          : "var(--color-tab-inactive-bg, #2d2d2d)",
        borderTop: isActive
          ? "2px solid var(--color-accent, #007acc)"
          : "2px solid transparent",
        borderRight: "1px solid var(--color-border, #3e3e3e)",
        flexShrink: 0,
      }}
      onClick={onClick}
    >
      {/* ファイルアイコン */}
      <span style={{ fontSize: "12px" }}>{getTabIcon(tab)}</span>

      {/* タブタイトル（プレビュータブはイタリック表示） */}
      <span style={{ fontStyle: tab.isPreview ? "italic" : "normal" }}>{tab.title}</span>

      {/* 閉じるボタン */}
      <button
        data-testid="tab-close-btn"
        aria-label="タブを閉じる"
        onClick={handleClose}
        style={{
          marginLeft: "4px",
          background: "none",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          fontSize: "14px",
          lineHeight: 1,
          padding: "0 2px",
          opacity: 0.7,
          borderRadius: "2px",
        }}
      >
        ×
      </button>
    </div>
  );
};

export default Tab;
