import React from "react";
import TitleBar from "./components/layout/TitleBar";
import MainLayout from "./components/layout/MainLayout";
import StatusBar from "./components/layout/StatusBar";
import "./theme/global.css";

// アプリケーションルートコンポーネント
// レイアウト: TitleBar / MainLayout / StatusBar の縦積み
// 後続フェーズで QuickOpen・ContextMenu 等を追加する
const App: React.FC = () => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows:
          "var(--title-bar-height) 1fr var(--status-bar-height)",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <TitleBar />
      <MainLayout />
      <StatusBar />
    </div>
  );
};

export default App;
