import React from "react";

// サイドバーに表示するパネル種別
type SidebarKind = "explorer" | "search";

interface SidebarContainerProps {
  // 表示するパネル種別
  activeSidebar: SidebarKind;
  // サイドバーを表示するかどうか
  isVisible: boolean;
  // サイドバー幅（px）
  width: number;
}

// サイドバーコンテナコンポーネント
// アクティビティバーの選択に応じてパネルを切り替え表示する
// isVisible=false のとき幅を0にして非表示（将来的にリサイズハンドルを追加）
const SidebarContainer: React.FC<SidebarContainerProps> = ({
  activeSidebar,
  isVisible,
  width,
}) => {
  return (
    <div
      className="sidebar-container"
      aria-hidden={!isVisible}
      data-panel={activeSidebar}
      style={{
        width: isVisible ? `${width}px` : "0px",
        backgroundColor: "var(--color-sidebar-bg)",
        color: "var(--color-sidebar-fg)",
        overflow: "hidden",
        flexShrink: 0,
        borderRight: isVisible
          ? "1px solid var(--color-border)"
          : "none",
        transition: "width 0.15s ease",
      }}
    >
      {/* パネルの中身は後続フェーズで実装 */}
      {isVisible && (
        <div
          style={{
            width: `${width}px`,
            height: "100%",
          }}
        >
          {activeSidebar === "explorer" && (
            <div className="sidebar-panel" data-panel-type="explorer" />
          )}
          {activeSidebar === "search" && (
            <div className="sidebar-panel" data-panel-type="search" />
          )}
        </div>
      )}
    </div>
  );
};

export default SidebarContainer;
