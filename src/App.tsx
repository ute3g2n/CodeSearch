import React, { useState, useEffect } from "react";
import TitleBar from "./components/layout/TitleBar";
import MainLayout from "./components/layout/MainLayout";
import StatusBar from "./components/layout/StatusBar";
import QuickOpen from "./components/common/QuickOpen";
import ToastContainer from "./components/common/ToastContainer";
import { useIndexEvents } from "./hooks/useIndexEvents";
import { useEditorStore } from "./stores/editor";
import { useConfigStore } from "./stores/config";
import { useWorkspaceStore } from "./stores/workspace";
import { listRecentWorkspaces } from "./ipc/commands";
import "./theme/global.css";

// アプリケーションルートコンポーネント
// レイアウト: TitleBar / MainLayout / StatusBar の縦積み
// QuickOpen (Ctrl+P) とグローバルキーバインドを管理する
const App: React.FC = () => {
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const { openWelcomeTab, closeTab, groups, activeGroupId } = useEditorStore();

  // インデックス関連イベントをリッスンしてトーストに表示する
  useIndexEvents();

  // 起動時にウェルカムタブを開く
  useEffect(() => {
    openWelcomeTab();
  }, [openWelcomeTab]);

  // 起動時に設定を読み込み、前回のワークスペースを自動復元する
  useEffect(() => {
    const initApp = async () => {
      try {
        // 設定を読み込む
        await useConfigStore.getState().loadConfig();

        // 最近開いたワークスペース一覧を読み込む（ウェルカムタブに表示）
        await useWorkspaceStore.getState().loadRecentWorkspaces();

        // 前回のワークスペースを自動復元する
        const { lastWorkspaceId } = useConfigStore.getState().config;
        if (lastWorkspaceId) {
          const recents = await listRecentWorkspaces();
          const ws = recents.find((w) => w.id === lastWorkspaceId);
          if (ws) {
            await useWorkspaceStore.getState().openWorkspace(ws.path);
          }
        }
      } catch {
        // 初期化エラーは無視する（次回起動時に再試行）
      }
    };
    initApp();
  }, []);

  // グローバルキーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+P: クイックオープン
      if (ctrl && e.key === "p") {
        e.preventDefault();
        setQuickOpenVisible(true);
        return;
      }

      // Ctrl+W: アクティブタブを閉じる
      if (ctrl && e.key === "w") {
        e.preventDefault();
        const group = groups.find((g) => g.id === activeGroupId);
        if (group?.activeTabId) {
          closeTab(activeGroupId, group.activeTabId);
        }
        return;
      }

      // Ctrl+Shift+F: 検索サイドバーにフォーカス
      if (ctrl && e.shiftKey && e.key === "F") {
        e.preventDefault();
        // ActivityBar の検索ボタンをクリックして検索入力にフォーカスを移動
        const searchBtn = document.querySelector<HTMLButtonElement>(
          '[data-testid="activity-search"]'
        );
        searchBtn?.click();
        setTimeout(() => {
          const searchInput = document.querySelector<HTMLInputElement>(
            '[data-testid="search-input"]'
          );
          searchInput?.focus();
        }, 50);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // groups/activeGroupId/closeTab の変化に追従するが openWelcomeTab は安定している
  }, [groups, activeGroupId, closeTab]);

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
