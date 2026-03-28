import React, { useState, useCallback, useRef } from "react";
import ActivityBar from "./ActivityBar";
import type { SidebarKind } from "./ActivityBar";
import SidebarContainer from "./SidebarContainer";
import EditorArea from "./EditorArea";

// MainLayout コンポーネント
// ActivityBar + SidebarContainer + EditorArea の3カラムレイアウト
const MainLayout: React.FC = () => {
  // サイドバー幅（px）
  const [sidebarWidth, setSidebarWidth] = useState<number>(300);
  // サイドバーの表示/非表示
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  // アクティブなサイドバー種別
  const [activeSidebar, setActiveSidebar] = useState<SidebarKind>("explorer");

  // ドラッグ中かどうかのフラグ
  const isDraggingRef = useRef(false);

  // アクティビティバーのアイコンクリック時の処理
  // 同じアイコンを再クリックするとサイドバーを閉じる
  const handleToggle = (sidebar: SidebarKind) => {
    if (activeSidebar === sidebar) {
      setIsSidebarVisible((prev) => !prev);
    } else {
      setActiveSidebar(sidebar);
      setIsSidebarVisible(true);
    }
  };

  // リサイズハンドルのマウスダウン時の処理
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    // マウス移動でサイドバー幅を更新する
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.min(
        Math.max(startWidth + delta, 150),
        window.innerWidth * 0.5
      );
      setSidebarWidth(newWidth);
    };

    // マウスアップでドラッグを終了する
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [sidebarWidth]);

  return (
    <div
      className="main-layout"
      style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
      }}
    >
      {/* アクティビティバー（左端の縦アイコン列） */}
      <ActivityBar
        activeSidebar={activeSidebar}
        isSidebarVisible={isSidebarVisible}
        onToggle={handleToggle}
      />

      {/* サイドバー（エクスプローラー / 検索 / 設定） */}
      <SidebarContainer
        activeSidebar={activeSidebar}
        isVisible={isSidebarVisible}
        width={sidebarWidth}
      />

      {/* リサイズハンドル（サイドバーが表示中のみ表示） */}
      {isSidebarVisible && (
        <div
          data-testid="sidebar-resize-handle"
          onMouseDown={handleResizeMouseDown}
          style={{
            width: "4px",
            cursor: "col-resize",
            backgroundColor: "var(--color-border, #3e3e3e)",
            flexShrink: 0,
            zIndex: 10,
          }}
        />
      )}

      {/* エディタエリア（メインコンテンツ） */}
      <EditorArea />
    </div>
  );
};

export default MainLayout;
