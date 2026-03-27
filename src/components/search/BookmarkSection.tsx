// BOOKMARKSサブセクションコンポーネント
// 色別グループ・折りたたみ・ジャンプ・一括削除を提供する
import React, { useRef, useState } from "react";
import { useBookmarkStore } from "../../stores/bookmark";
import { useEditorStore } from "../../stores/editor";
import { useWorkspaceStore } from "../../stores/workspace";
import BookmarkGroup from "./BookmarkGroup";
import ColorPalette from "../common/ColorPalette";
import type { Bookmark } from "../../ipc/types";

/// BOOKMARKSサブセクション
/// - ブックマークを colorIndex でグループ化して表示
/// - 色パレットで追加色を選択できる
const BookmarkSection: React.FC = () => {
  const { bookmarks, selectedColorIndex, clearByColor, setSelectedColor } =
    useBookmarkStore();
  const { openFile } = useEditorStore();
  const { currentWorkspace } = useWorkspaceStore();

  const [paletteVisible, setPaletteVisible] = useState(false);
  const paletteAnchorRef = useRef<HTMLButtonElement>(null);

  // colorIndex でグループ化する
  const groups = new Map<number, Bookmark[]>();
  for (const b of bookmarks) {
    if (!groups.has(b.colorIndex)) groups.set(b.colorIndex, []);
    groups.get(b.colorIndex)!.push(b);
  }
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => a - b);

  const handleJump = (bookmark: Bookmark) => {
    openFile(bookmark.filePath, { lineNumber: bookmark.lineNumber - 1 });
  };

  const handleClearGroup = (colorIndex: number) => {
    if (!currentWorkspace) return;
    clearByColor(currentWorkspace.id, colorIndex);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* セクションヘッダー */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "var(--color-sidebar-fg, #cccccc)",
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        <span>Bookmarks</span>
        {/* 色選択ボタン */}
        <button
          ref={paletteAnchorRef}
          title="追加色を選択"
          onClick={() => setPaletteVisible((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "0 4px",
            fontSize: "14px",
          }}
        >
          🎨
        </button>
      </div>

      {/* カラーパレット（ポップアップ） */}
      {paletteVisible && (
        <div
          style={{ position: "relative", zIndex: 100 }}
          onMouseLeave={() => setPaletteVisible(false)}
        >
          <div style={{ position: "absolute", top: 0, right: 0 }}>
            <ColorPalette
              selectedIndex={selectedColorIndex}
              onSelect={(index) => {
                setSelectedColor(index);
                setPaletteVisible(false);
              }}
            />
          </div>
        </div>
      )}

      {/* ブックマーク一覧 */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {sortedGroups.length === 0 ? (
          <div
            style={{
              padding: "16px 8px",
              fontSize: "12px",
              color: "var(--color-sidebar-fg, #cccccc)",
              opacity: 0.5,
              textAlign: "center",
            }}
          >
            ブックマークはありません
          </div>
        ) : (
          sortedGroups.map(([colorIndex, items]) => (
            <BookmarkGroup
              key={colorIndex}
              colorIndex={colorIndex}
              items={items}
              onJump={handleJump}
              onClearGroup={handleClearGroup}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default BookmarkSection;
