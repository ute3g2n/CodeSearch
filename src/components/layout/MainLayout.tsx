import React, { useState } from "react";
import ActivityBar from "./ActivityBar";
import SidebarContainer from "./SidebarContainer";
import EditorArea from "./EditorArea";

// サイドバー種別
type SidebarKind = "explorer" | "search";

// MainLayout コンポーネント
// ActivityBar + SidebarContainer + EditorArea の3カラムレイアウト
// サイドバー幅はドラッグリサイズ対応（後続フェーズで実装）
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
      // 同じアイコン → 開閉トグル
      setIsSidebarVisible((prev) => !prev);
    } else {
      // 別のアイコン → 切り替えて表示
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

      {/* サイドバー（エクスプローラー or 検索） */}
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
