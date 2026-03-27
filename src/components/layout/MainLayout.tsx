import React, { useState } from "react";
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

  // 未使用変数の警告を回避（後続フェーズでリサイズハンドルから使用）
  void setSidebarWidth;

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

      {/* エディタエリア（メインコンテンツ） */}
      <EditorArea />
    </div>
  );
};

export default MainLayout;
