// エディタ内コンテキストメニュー（付録A準拠）
// 状態: 未選択/選択済 × ブックマークあり/なし でメニュー項目を切り替える
import React, { useEffect, useRef } from "react";
import type { ContextMenuPosition } from "../../hooks/useContextMenu";

// メニュー項目の定義
interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: false;
  onClick: () => void;
}

interface Separator {
  separator: true;
}

type MenuEntry = MenuItem | Separator;

interface ContextMenuProps {
  position: ContextMenuPosition;
  onClose: () => void;
  // 選択テキストが存在するか
  hasSelection: boolean;
  selectedText: string;
  // 現在行にブックマークがあるか
  hasBookmark: boolean;
  // コールバック
  onSearchInSidebar: (text: string) => void;
  onSearchInNewEditor: (text: string) => void;
  onHighlight: (text: string) => void;
  onAddBookmark: () => void;
  onRemoveBookmark: () => void;
}

// メニュー項目コンポーネント
const MenuItemView: React.FC<{
  item: MenuItem;
  onClose: () => void;
}> = ({ item, onClose }) => (
  <div
    role="menuitem"
    onClick={() => {
      if (!item.disabled) {
        item.onClick();
        onClose();
      }
    }}
    aria-disabled={item.disabled}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "5px 16px",
      fontSize: "13px",
      color: item.disabled
        ? "var(--color-sidebar-fg, #cccccc)"
        : item.danger
        ? "#f48771"
        : "var(--color-editor-fg, #d4d4d4)",
      opacity: item.disabled ? 0.4 : 1,
      cursor: item.disabled ? "default" : "pointer",
      userSelect: "none",
      gap: "24px",
    }}
    onMouseEnter={(e) => {
      if (!item.disabled) {
        (e.currentTarget as HTMLElement).style.background =
          "var(--color-list-active-bg, #094771)";
      }
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.background = "transparent";
    }}
  >
    <span>{item.label}</span>
    {item.shortcut && (
      <span style={{ fontSize: "11px", opacity: 0.6 }}>{item.shortcut}</span>
    )}
  </div>
);

// ContextMenu 本体
const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  onClose,
  hasSelection,
  selectedText,
  hasBookmark,
  onSearchInSidebar,
  onSearchInNewEditor,
  onHighlight,
  onAddBookmark,
  onRemoveBookmark,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // メニューが画面外にはみ出ないよう位置を調整する
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${position.x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${position.y - rect.height}px`;
    }
  }, [position]);

  // 付録A に準拠したメニュー項目を構築する
  const entries: MenuEntry[] = [
    {
      label: "コピー",
      shortcut: "Ctrl+C",
      disabled: !hasSelection,
      onClick: () => {
        if (selectedText) navigator.clipboard.writeText(selectedText);
      },
    },
    { separator: true },
    {
      label: "選択部分を検索",
      disabled: !hasSelection,
      onClick: () => onSearchInSidebar(selectedText),
    },
    {
      label: "新しい検索ウインドウで検索",
      disabled: !hasSelection,
      onClick: () => onSearchInNewEditor(selectedText),
    },
    {
      label: "選択部分をハイライト",
      disabled: !hasSelection,
      onClick: () => onHighlight(selectedText),
    },
    { separator: true },
    {
      label: "ブックマークを追加",
      onClick: onAddBookmark,
    },
    ...(hasBookmark
      ? [
          {
            label: "ブックマークを削除",
            danger: true,
            onClick: onRemoveBookmark,
          } as MenuItem,
        ]
      : []),
  ];

  return (
    <div
      ref={menuRef}
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 2000,
        background: "var(--color-editor-bg, #1e1e1e)",
        border: "1px solid var(--color-border, #3c3c3c)",
        borderRadius: "4px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        minWidth: "200px",
        padding: "4px 0",
      }}
    >
      {entries.map((entry, i) =>
        "separator" in entry ? (
          <div
            key={`sep-${i}`}
            style={{
              height: "1px",
              background: "var(--color-border, #3c3c3c)",
              margin: "3px 0",
            }}
          />
        ) : (
          <MenuItemView key={entry.label} item={entry} onClose={onClose} />
        )
      )}
    </div>
  );
};

export default ContextMenu;
