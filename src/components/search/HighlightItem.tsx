// ハイライトアイテムコンポーネント
// テキスト・ignoreCase表示・← → ナビゲーションボタンを表示する
import React from "react";
import type { HighlightEntry } from "../../stores/highlight";
import { HIGHLIGHT_COLORS } from "../../stores/highlight";

interface HighlightItemProps {
  entry: HighlightEntry;
  /** → ボタン（前方検索）クリック時 */
  onNext: (id: string) => void;
  /** ← ボタン（後方検索）クリック時 */
  onPrev: (id: string) => void;
  /** 右クリックでコンテキストメニュー表示 */
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

/// ハイライトアイテム
/// 色バッジ + テキスト + ignoreCase バッジ + ← → ナビゲーションボタン
const HighlightItem: React.FC<HighlightItemProps> = ({
  entry,
  onNext,
  onPrev,
  onContextMenu,
}) => {
  const color = HIGHLIGHT_COLORS[entry.colorIndex] ?? "#888";

  return (
    <div
      data-testid="highlight-item"
      onContextMenu={(e) => onContextMenu(e, entry.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 8px",
        fontSize: "12px",
        color: "var(--color-editor-fg, #d4d4d4)",
      }}
    >
      {/* 色バッジ */}
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "2px",
          backgroundColor: color,
          flexShrink: 0,
        }}
      />

      {/* テキスト */}
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {entry.text}
      </span>

      {/* ignoreCase バッジ */}
      {entry.ignoreCase && (
        <span
          title="大文字小文字を無視"
          style={{
            fontSize: "9px",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "2px",
            padding: "0 3px",
            opacity: 0.6,
          }}
        >
          Aa
        </span>
      )}

      {/* 後方検索ボタン */}
      <button
        title="前のマッチ（←）"
        onClick={() => onPrev(entry.id)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--color-sidebar-fg, #cccccc)",
          cursor: "pointer",
          fontSize: "12px",
          padding: "0 2px",
          opacity: 0.7,
        }}
      >
        ←
      </button>

      {/* 前方検索ボタン */}
      <button
        title="次のマッチ（→）"
        onClick={() => onNext(entry.id)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--color-sidebar-fg, #cccccc)",
          cursor: "pointer",
          fontSize: "12px",
          padding: "0 2px",
          opacity: 0.7,
        }}
      >
        →
      </button>
    </div>
  );
};

export default HighlightItem;
