import React from "react";
import { useEditorStore } from "../../stores/editor";
import TabBar from "./TabBar";
import EditorContent from "./EditorContent";
import type { EditorGroup as EditorGroupType } from "../../stores/editor";

interface EditorGroupProps {
  group: EditorGroupType;
  isActive: boolean;
}

/// エディタグループコンポーネント
/// TabBar + EditorContent を縦に並べる1区画
const EditorGroup: React.FC<EditorGroupProps> = ({ group, isActive }) => {
  const { setActiveTab, closeTab } = useEditorStore();

  const activeTab =
    group.tabs.find((t) => t.id === group.activeTabId) ?? null;

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
        onTabContextMenu={(_tabId, _e) => {
          // Phase 1-8 でコンテキストメニュー実装予定
        }}
      />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <EditorContent tab={activeTab} />
      </div>
    </div>
  );
};

export default EditorGroup;
