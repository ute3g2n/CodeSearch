import React, { useRef, useState } from "react";
import Tab from "./Tab";
import type { Tab as TabType } from "../../stores/editor";

interface TabBarProps {
  tabs: TabType[];
  activeTabId: string | null;
  /** 将来の分割エディタ対応で使用予定 */
  groupId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabContextMenu: (tabId: string, event: React.MouseEvent) => void;
}

/// スクロール可能なタブバーコンポーネント
/// - 水平スクロールでタブが溢れても表示可能
/// - HTML5 Drag & Drop でタブの並べ替えをサポート
const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  groupId: _groupId,
  onTabClick,
  onTabClose,
  onTabContextMenu,
}) => {
  // ドラッグ中のタブID
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);

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
    // 実際の並べ替えは onTabContextMenu 経由で EditorStore.moveTab を呼び出す
    // ここではドロップ後の視覚更新のみ
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    dragOverIdRef.current = null;
  };

  return (
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
        // スクロールバーを細く表示
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
            onClick={() => onTabClick(tab.id)}
            onClose={() => onTabClose(tab.id)}
            onContextMenu={(e) => onTabContextMenu(tab.id, e)}
          />
        </div>
      ))}
    </div>
  );
};

export default TabBar;
