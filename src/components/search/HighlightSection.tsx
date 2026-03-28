// HIGHLIGHTSサブセクションコンポーネント
// ハイライトワード一覧・← → ナビゲーション・コンテキストメニューを提供する
import React, { useState } from "react";
import { useHighlightStore } from "../../stores/highlight";
import { useEditorStore } from "../../stores/editor";
import HighlightItem from "./HighlightItem";
import HighlightContextMenu from "../common/HighlightContextMenu";

interface ContextMenuState {
  x: number;
  y: number;
  highlightId: string;
}

/// HIGHLIGHTSサブセクション
/// ハイライトワード一覧を表示し、前後ナビゲーションを提供する
const HighlightSection: React.FC = () => {
  const { highlights, remove, clear, navigateNext, navigatePrev } =
    useHighlightStore();
  const { groups, activeGroupId, openFile } = useEditorStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // アクティブタブのファイル情報を取得する
  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const activeTab = activeGroup?.tabs.find((t) => t.id === activeGroup.activeTabId);
  const activeFilePath =
    activeTab?.kind === "file" ? (activeTab.filePath ?? null) : null;
  const currentLine = activeTab?.cursorLine ?? 0;

  // アクティブファイルのテキスト行を取得する（plainText タブの場合のみ対応）
  const activeLines: string[] = activeTab?.plainText
    ? activeTab.plainText.split("\n")
    : [];

  const handleNext = (id: string) => {
    if (!activeFilePath || activeLines.length === 0) return;
    const result = navigateNext(activeLines, currentLine, id);
    if (result) {
      openFile(activeFilePath, { lineNumber: result.line });
    }
  };

  const handlePrev = (id: string) => {
    if (!activeFilePath || activeLines.length === 0) return;
    const result = navigatePrev(activeLines, currentLine, id);
    if (result) {
      openFile(activeFilePath, { lineNumber: result.line });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, highlightId: id });
  };

  return (
    <div data-testid="highlight-section" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* セクションヘッダー */}
      <div
        style={{
          padding: "4px 8px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "var(--color-sidebar-fg, #cccccc)",
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        Highlights
      </div>

      {/* ハイライト一覧 */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {highlights.length === 0 ? (
          <div
            style={{
              padding: "16px 8px",
              fontSize: "12px",
              color: "var(--color-sidebar-fg, #cccccc)",
              opacity: 0.5,
              textAlign: "center",
            }}
          >
            ハイライトはありません
          </div>
        ) : (
          highlights.map((entry) => (
            <HighlightItem
              key={entry.id}
              entry={entry}
              onNext={handleNext}
              onPrev={handlePrev}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
      </div>

      {/* コンテキストメニュー */}
      {contextMenu && (
        <HighlightContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          highlightId={contextMenu.highlightId}
          onClose={() => setContextMenu(null)}
          onDelete={(id) => remove(id)}
          onDeleteAll={() => clear()}
        />
      )}
    </div>
  );
};

export default HighlightSection;
