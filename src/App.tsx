import React, { useState, useEffect, useRef } from "react";
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
  const [findBarVisible, setFindBarVisible] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  // コードショートカットのプレフィックスキー（例: "k" は Ctrl+K 押下後の状態）
  // ref で管理することで React の再レンダリングを待たずに即時参照できる
  const chordKeyRef = useRef<string | null>(null);
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

      // Ctrl+K: コードショートカットのプレフィックスキー
      if (ctrl && !e.shiftKey && e.key === "k") {
        e.preventDefault();
        chordKeyRef.current = "k";
        return;
      }

      // Ctrl+O（Ctrl+K 後）: フォルダー選択ダイアログでワークスペースを開く
      if (ctrl && e.key === "o" && chordKeyRef.current === "k") {
        e.preventDefault();
        chordKeyRef.current = null;
        useWorkspaceStore.getState().openWorkspaceDialog();
        return;
      }

      // モディファイアキー単体（Control/Shift/Alt/Meta）はコードショートカット状態をリセットしない
      const isModifierOnly = ["Control", "Shift", "Alt", "Meta"].includes(e.key);
      if (!isModifierOnly) {
        chordKeyRef.current = null;
      }

      // Ctrl+P: クイックオープン
      if (ctrl && e.key === "p") {
        e.preventDefault();
        setQuickOpenVisible(true);
        return;
      }

      // Ctrl+W / Ctrl+F4: アクティブタブを閉じる
      if (ctrl && (e.key === "w" || e.key === "F4")) {
        e.preventDefault();
        const group = groups.find((g) => g.id === activeGroupId);
        if (group?.activeTabId) {
          closeTab(activeGroupId, group.activeTabId);
        }
        return;
      }

      // Ctrl+Shift+T: 最後に閉じたタブを再開する
      if (ctrl && e.shiftKey && e.key === "T") {
        e.preventDefault();
        useEditorStore.getState().reopenClosedTab();
        return;
      }

      // Ctrl+Tab: アクティブグループの次のタブに切り替える
      if (ctrl && e.key === "Tab") {
        e.preventDefault();
        const state = useEditorStore.getState();
        const group = state.groups.find((g) => g.id === state.activeGroupId);
        if (group && group.tabs.length > 1) {
          const idx = group.tabs.findIndex((t) => t.id === group.activeTabId);
          const nextIdx = (idx + 1) % group.tabs.length;
          state.setActiveTab(state.activeGroupId, group.tabs[nextIdx].id);
        }
        return;
      }

      // Ctrl+\: エディタを右に分割する
      if (ctrl && e.key === "\\") {
        e.preventDefault();
        const state = useEditorStore.getState();
        const group = state.groups.find((g) => g.id === state.activeGroupId);
        if (group?.activeTabId) {
          state.splitRight(state.activeGroupId, group.activeTabId);
        }
        return;
      }

      // Ctrl+,: 設定パネルを開く
      if (ctrl && e.key === ",") {
        e.preventDefault();
        const settingsBtn = document.querySelector<HTMLButtonElement>(
          '[data-testid="activity-settings"]'
        );
        settingsBtn?.click();
        return;
      }

      // Ctrl+Shift+M: ミニマップの表示/非表示を切り替える
      if (ctrl && e.shiftKey && e.key === "M") {
        e.preventDefault();
        const { config, saveConfig } = useConfigStore.getState();
        saveConfig({ ...config, minimapEnabled: !config.minimapEnabled });
        return;
      }

      // Ctrl+Shift+H: 新しい検索エディタタブを開く
      if (ctrl && e.shiftKey && e.key === "H") {
        e.preventDefault();
        useEditorStore.getState().openSearchEditor();
        return;
      }

      // Ctrl+F: ファイル内検索バーを表示
      if (ctrl && !e.shiftKey && e.key === "f") {
        e.preventDefault();
        setFindBarVisible(true);
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
  // groups/activeGroupId/closeTab の変化に追従する（chordKeyRef は ref なので依存不要）
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

      {/* ファイル内検索バー（Ctrl+F） */}
      {findBarVisible && (
        <div
          data-testid="find-bar"
          style={{
            position: "fixed",
            top: "var(--title-bar-height, 30px)",
            right: "16px",
            zIndex: 1500,
            background: "var(--color-editor-bg, #1e1e1e)",
            border: "1px solid var(--color-border, #3c3c3c)",
            borderRadius: "4px",
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <input
            data-testid="find-bar-input"
            autoFocus
            type="text"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            placeholder="ファイル内検索..."
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setFindBarVisible(false);
                setFindQuery("");
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--color-input-fg, #cccccc)",
              fontSize: "13px",
              width: "200px",
            }}
          />
          <button
            onClick={() => { setFindBarVisible(false); setFindQuery(""); }}
            style={{ background: "transparent", border: "none", color: "var(--color-sidebar-fg, #cccccc)", cursor: "pointer", fontSize: "14px", padding: "0 4px" }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
