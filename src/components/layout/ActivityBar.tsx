import React from "react";

// アクティビティバーのアイコン種別
type SidebarKind = "explorer" | "search";

interface ActivityBarProps {
  // 現在アクティブなサイドバー種別
  activeSidebar: SidebarKind;
  // サイドバーが表示中かどうか
  isSidebarVisible: boolean;
  // アイコンクリック時のコールバック（同じアイコン再クリックで閉じる）
  onToggle: (sidebar: SidebarKind) => void;
}

// アクティビティバーコンポーネント
// エクスプローラーと検索の2アイコンを縦並びで表示
// クリックでサイドバーを切り替え、同じアイコン再クリックで閉じる
const ActivityBar: React.FC<ActivityBarProps> = ({
  activeSidebar,
  isSidebarVisible,
  onToggle,
}) => {
  const isExplorerActive = activeSidebar === "explorer" && isSidebarVisible;
  const isSearchActive = activeSidebar === "search" && isSidebarVisible;

  return (
    <div
      className="activity-bar"
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
        aria-label="Explorer"
        aria-pressed={isExplorerActive}
        onClick={() => onToggle("explorer")}
        style={{
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          color: isExplorerActive
            ? "var(--color-activity-bar-active-fg)"
            : "var(--color-activity-bar-fg)",
          borderLeft: isExplorerActive
            ? "2px solid var(--color-activity-bar-active-border)"
            : "2px solid transparent",
        }}
        title="エクスプローラー"
      >
        {/* ファイルツリーアイコン（SVG） */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M3 3h8v2H5v14h14v-6h2v8H3V3zm11 0h7v7h-2V6.414l-8.293 8.293-1.414-1.414L17.586 5H14V3z" />
        </svg>
      </button>

      {/* 検索アイコンボタン */}
      <button
        aria-label="Search"
        aria-pressed={isSearchActive}
        onClick={() => onToggle("search")}
        style={{
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          color: isSearchActive
            ? "var(--color-activity-bar-active-fg)"
            : "var(--color-activity-bar-fg)",
          borderLeft: isSearchActive
            ? "2px solid var(--color-activity-bar-active-border)"
            : "2px solid transparent",
        }}
        title="検索"
      >
        {/* 虫眼鏡アイコン（SVG） */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
      </button>
    </div>
  );
};

export default ActivityBar;
