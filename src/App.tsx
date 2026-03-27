import React, { useState, useEffect } from "react";
import TitleBar from "./components/layout/TitleBar";
import MainLayout from "./components/layout/MainLayout";
import StatusBar from "./components/layout/StatusBar";
import QuickOpen from "./components/common/QuickOpen";
import ToastContainer from "./components/common/ToastContainer";
import { useIndexEvents } from "./hooks/useIndexEvents";
import "./theme/global.css";

// アプリケーションルートコンポーネント
// レイアウト: TitleBar / MainLayout / StatusBar の縦積み
// QuickOpen (Ctrl+P) を管理する
const App: React.FC = () => {
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);

  // インデックス関連イベントをリッスンしてトーストに表示する
  useIndexEvents();

  // Ctrl+P でクイックオープンを開く
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        setQuickOpenVisible(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      <QuickOpen
        isOpen={quickOpenVisible}
        onClose={() => setQuickOpenVisible(false)}
      />
      <ToastContainer />
    </div>
  );
};

export default App;
