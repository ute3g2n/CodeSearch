import React, { useRef, useState } from "react";
import Tab from "./Tab";
import TabContextMenu from "../common/TabContextMenu";
import type { Tab as TabType } from "../../stores/editor";
import { useEditorStore } from "../../stores/editor";

interface TabBarProps {
  tabs: TabType[];
  activeTabId: string | null;
  groupId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabContextMenu?: (tabId: string, event: React.MouseEvent) => void;
}

/// スクロール可能なタブバーコンポーネント
/// - 水平スクロールでタブが溢れても表示可能
/// - HTML5 Drag & Drop でタブの並べ替えをサポート
/// - 右クリックで TabContextMenu を表示
const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  groupId,
  onTabClick,
  onTabClose,
  onTabContextMenu,
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);

  // コンテキストメニュー状態
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggingId(tabId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", tabId);
  };

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    dragOverIdRef.current = tabId;
  };

  const handleDrop = (e: React.DragEvent, _tabId: string) => {
    e.preventDefault();
    setDraggingId(null);
    dragOverIdRef.current = null;
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    dragOverIdRef.current = null;
  };

  const handleContextMenu = (tabId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
    onTabContextMenu?.(tabId, e);
  };

  const contextMenuTab = contextMenu
    ? tabs.find((t) => t.id === contextMenu.tabId) ?? null
    : null;

  return (
    <>
      <div
        data-testid="tab-bar"
        style={{
          display: "flex",
          flexDirection: "row",
          overflowX: "auto",
          overflowY: "hidden",
          backgroundColor: "var(--color-tab-bar-bg, #252526)",
          height: "35px",
          flexShrink: 0,
          scrollbarWidth: "thin",
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDrop={(e) => handleDrop(e, tab.id)}
            onDragEnd={handleDragEnd}
            style={{
              opacity: draggingId === tab.id ? 0.5 : 1,
            }}
          >
            <Tab
              tab={tab}
              isActive={tab.id === activeTabId}
              onClick={() => {
                // プレビュータブをクリックした場合は永続タブに変換する
                useEditorStore.getState().confirmPreviewTab(groupId, tab.id);
                onTabClick(tab.id);
              }}
              onClose={() => onTabClose(tab.id)}
              onContextMenu={(e) => handleContextMenu(tab.id, e)}
            />
          </div>
        ))}
      </div>

      {/* タブコンテキストメニュー */}
      {contextMenu && contextMenuTab && (
        <TabContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          tab={contextMenuTab}
          groupId={groupId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};

export default TabBar;
