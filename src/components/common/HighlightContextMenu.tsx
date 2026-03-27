// HighlightContextMenu コンポーネント
// ハイライトアイテム右クリック時に「削除」「全て削除」を提供する
import React, { useEffect, useRef } from "react";

interface HighlightContextMenuProps {
  x: number;
  y: number;
  highlightId: string;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}

/// ハイライトコンテキストメニュー
const HighlightContextMenu: React.FC<HighlightContextMenuProps> = ({
  x,
  y,
  highlightId,
  onClose,
  onDelete,
  onDeleteAll,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // 画面外にはみ出ないよう位置を調整する
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  const itemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "5px 16px",
    fontSize: "13px",
    textAlign: "left",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "var(--color-editor-fg, #d4d4d4)",
    userSelect: "none",
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 2000,
        background: "var(--color-editor-bg, #1e1e1e)",
        border: "1px solid var(--color-border, #3c3c3c)",
        borderRadius: "4px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        minWidth: "160px",
        padding: "4px 0",
      }}
    >
      <button
        role="menuitem"
        style={itemStyle}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "var(--color-list-active-bg, #094771)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
        onClick={() => {
          onDelete(highlightId);
          onClose();
        }}
      >
        削除
      </button>
      <div
        style={{
          height: "1px",
          background: "var(--color-border, #3c3c3c)",
          margin: "3px 0",
        }}
      />
      <button
        role="menuitem"
        style={{ ...itemStyle, color: "#f48771" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "var(--color-list-active-bg, #094771)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
        onClick={() => {
          onDeleteAll();
          onClose();
        }}
      >
        全て削除
      </button>
    </div>
  );
};

export default HighlightContextMenu;
