import React from "react";

// アクティビティバーのアイコン種別
export type SidebarKind = "explorer" | "search" | "settings";

interface ActivityBarProps {
  // 現在アクティブなサイドバー種別
  activeSidebar: SidebarKind;
  // サイドバーが表示中かどうか
  isSidebarVisible: boolean;
  // アイコンクリック時のコールバック（同じアイコン再クリックで閉じる）
  onToggle: (sidebar: SidebarKind) => void;
}

// アクティビティバーコンポーネント
// エクスプローラー・検索・設定の3アイコンを縦並びで表示
// クリックでサイドバーを切り替え、同じアイコン再クリックで閉じる
const ActivityBar: React.FC<ActivityBarProps> = ({
  activeSidebar,
  isSidebarVisible,
  onToggle,
}) => {
  const isExplorerActive = activeSidebar === "explorer" && isSidebarVisible;
  const isSearchActive = activeSidebar === "search" && isSidebarVisible;
  const isSettingsActive = activeSidebar === "settings" && isSidebarVisible;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    color: active
      ? "var(--color-activity-bar-active-fg)"
      : "var(--color-activity-bar-fg)",
    borderLeft: active
      ? "2px solid var(--color-activity-bar-active-border)"
      : "2px solid transparent",
  });

  return (
    <div
      className="activity-bar"
      data-testid="activity-bar"
      style={{
        width: "var(--activity-bar-width)",
        backgroundColor: "var(--color-activity-bar-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "8px",
        gap: "4px",
        flexShrink: 0,
      }}
    >
      {/* エクスプローラーアイコンボタン */}
      <button
        data-testid="activity-explorer"
        aria-label="Explorer"
        aria-pressed={isExplorerActive}
        onClick={() => onToggle("explorer")}
        style={btnStyle(isExplorerActive)}
        title="エクスプローラー"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 3h8v2H5v14h14v-6h2v8H3V3zm11 0h7v7h-2V6.414l-8.293 8.293-1.414-1.414L17.586 5H14V3z" />
        </svg>
      </button>

      {/* 検索アイコンボタン */}
      <button
        data-testid="activity-search"
        aria-label="Search"
        aria-pressed={isSearchActive}
        onClick={() => onToggle("search")}
        style={btnStyle(isSearchActive)}
        title="検索"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
      </button>

      {/* スペーサー：設定ボタンを一番下に押し出す */}
      <div style={{ flex: 1 }} />

      {/* 設定アイコンボタン */}
      <button
        data-testid="activity-settings"
        aria-label="Settings"
        aria-pressed={isSettingsActive}
        onClick={() => onToggle("settings")}
        style={{ ...btnStyle(isSettingsActive), marginBottom: "8px" }}
        title="設定"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      </button>
    </div>
  );
};

export default ActivityBar;
