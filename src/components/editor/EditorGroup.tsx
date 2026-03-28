import React, { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../../stores/editor";
import TabBar from "./TabBar";
import EditorContent from "./EditorContent";
import { onFsChanged } from "../../ipc/events";
import type { EditorGroup as EditorGroupType } from "../../stores/editor";

interface EditorGroupProps {
  group: EditorGroupType;
  isActive: boolean;
}

/// エディタグループコンポーネント
/// TabBar + EditorContent を縦に並べる1区画
/// fs://changed イベントで開いているファイルの変更を検知し、再読み込みプロンプトを表示する
const EditorGroup: React.FC<EditorGroupProps> = ({ group, isActive }) => {
  const { setActiveTab, closeTab, openFile } = useEditorStore();

  const activeTab =
    group.tabs.find((t) => t.id === group.activeTabId) ?? null;

  // 変更を検知したファイルパスのセット（再読み込みプロンプト表示用）
  const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set());

  // 現在グループで開いているファイルパスのセット（refで常に最新値を参照）
  const openFilePaths = new Set(
    group.tabs
      .filter((t) => t.kind === "file" && t.filePath)
      .map((t) => t.filePath!)
  );
  const openFilePathsRef = useRef(openFilePaths);
  openFilePathsRef.current = openFilePaths;

  // fs://changed イベントで開いているファイルの変更を検知する
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    onFsChanged((payload) => {
      if (
        payload.kind !== "deleted" &&
        openFilePathsRef.current.has(payload.filePath)
      ) {
        setModifiedFiles((prev) => new Set([...prev, payload.filePath]));
      }
      if (payload.kind === "deleted") {
        // 削除されたファイルは修正セットからも除去
        setModifiedFiles((prev) => {
          const next = new Set(prev);
          next.delete(payload.filePath);
          return next;
        });
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [group.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 再読み込みプロンプト: アクティブタブが変更済みかどうか
  const activeFilePath =
    activeTab?.kind === "file" ? activeTab.filePath ?? null : null;
  const showReloadPrompt =
    activeFilePath !== null && modifiedFiles.has(activeFilePath);

  // 再読み込みを実行してプロンプトを消す
  const handleReload = () => {
    if (activeFilePath) {
      setModifiedFiles((prev) => {
        const next = new Set(prev);
        next.delete(activeFilePath);
        return next;
      });
      openFile(activeFilePath);
    }
  };

  const handleDismiss = () => {
    if (activeFilePath) {
      setModifiedFiles((prev) => {
        const next = new Set(prev);
        next.delete(activeFilePath);
        return next;
      });
    }
  };

  return (
    <div
      data-testid="editor-group"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flex: 1,
        outline: isActive
          ? "1px solid var(--color-accent, #007acc)"
          : "none",
        outlineOffset: "-1px",
      }}
    >
      <TabBar
        tabs={group.tabs}
        activeTabId={group.activeTabId}
        groupId={group.id}
        onTabClick={(tabId) => setActiveTab(group.id, tabId)}
        onTabClose={(tabId) => closeTab(group.id, tabId)}
      />

      {/* ファイル変更通知バナー */}
      {showReloadPrompt && (
        <div
          data-testid="reload-prompt"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 12px",
            background: "#1c3a5e",
            borderBottom: "1px solid var(--color-accent, #007acc)",
            fontSize: "12px",
            color: "#d4d4d4",
            gap: "8px",
          }}
        >
          <span>このファイルはディスク上で変更されました。</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              data-testid="reload-button"
              onClick={handleReload}
              style={{
                background: "var(--color-accent, #007acc)",
                border: "none",
                borderRadius: "3px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "11px",
                padding: "2px 8px",
              }}
            >
              再読み込み
            </button>
            <button
              data-testid="reload-dismiss"
              onClick={handleDismiss}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "3px",
                color: "#d4d4d4",
                cursor: "pointer",
                fontSize: "11px",
                padding: "2px 8px",
              }}
            >
              無視
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: "hidden" }}>
        <EditorContent tab={activeTab} />
      </div>
    </div>
  );
};

export default EditorGroup;
