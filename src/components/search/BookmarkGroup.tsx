// ブックマークグループコンポーネント
// 同一色のブックマーク一覧を折りたたみ可能なグループとして表示する
import React, { useState } from "react";
import type { Bookmark } from "../../ipc/types";
import { BOOKMARK_COLORS } from "../../models/bookmarkColors";

interface BookmarkGroupProps {
  /** このグループのカラーインデックス */
  colorIndex: number;
  /** グループ内のブックマーク一覧 */
  items: Bookmark[];
  /** ブックマーク行クリック時（エディタジャンプ） */
  onJump: (bookmark: Bookmark) => void;
  /** グループ一括削除時のコールバック */
  onClearGroup: (colorIndex: number) => void;
}

/// ブックマークグループ
/// グループヘッダー（色バッジ＋件数＋削除ボタン）と
/// 折りたたみ可能なブックマークアイテム一覧を表示する
const BookmarkGroup: React.FC<BookmarkGroupProps> = ({
  colorIndex,
  items,
  onJump,
  onClearGroup,
}) => {
  const [expanded, setExpanded] = useState(true);
  const color = BOOKMARK_COLORS[colorIndex] ?? "#888";

  return (
    <div style={{ marginBottom: "4px" }}>
      {/* グループヘッダー */}
      <div
        data-testid="bookmark-group-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "2px 8px",
          cursor: "pointer",
          userSelect: "none",
          fontSize: "11px",
          color: "var(--color-sidebar-fg, #cccccc)",
          opacity: 0.8,
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span style={{ fontSize: "9px" }}>{expanded ? "▼" : "▶"}</span>
        <span
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1 }}>{items.length} 件</span>
        <button
          data-testid="bookmark-group-clear"
          title="このグループのブックマークを全て削除"
          onClick={(e) => {
            e.stopPropagation();
            onClearGroup(colorIndex);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#f48771",
            cursor: "pointer",
            fontSize: "11px",
            padding: "0 2px",
            opacity: 0.7,
          }}
        >
          🗑
        </button>
      </div>

      {expanded && (
        <div>
          {items.map((bookmark) => (
            <div
              key={bookmark.id}
              data-testid="bookmark-item"
              title={`${bookmark.filePath}:${bookmark.lineNumber}`}
              onClick={() => onJump(bookmark)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "3px 8px 3px 24px",
                cursor: "pointer",
                fontSize: "12px",
                color: "var(--color-editor-fg, #d4d4d4)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--color-list-hover-bg, rgba(255,255,255,0.04))";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {bookmark.previewText ?? "(no preview)"}
              </span>
              <span style={{ fontSize: "10px", opacity: 0.5, flexShrink: 0 }}>
                :{bookmark.lineNumber}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarkGroup;
