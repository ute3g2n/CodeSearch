// タブコンテキストメニュー（付録B準拠）
// ファイルタブ / 検索タブ で表示項目を切り替える
import React, { useEffect, useRef } from "react";
import type { ContextMenuPosition } from "../../hooks/useContextMenu";
import type { Tab } from "../../stores/editor";
import { useEditorStore } from "../../stores/editor";
import { getRelativePath, revealInOsExplorer } from "../../ipc/commands";

interface TabContextMenuProps {
  position: ContextMenuPosition;
  tab: Tab;
  groupId: string;
  onClose: () => void;
}

// メニュー項目
interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: false;
  onClick: () => void;
}

interface Separator {
  separator: true;
}

type MenuEntry = MenuItem | Separator;

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
      color: "var(--color-editor-fg, #d4d4d4)",
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

// TabContextMenu 本体
const TabContextMenu: React.FC<TabContextMenuProps> = ({
  position,
  tab,
  groupId,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
    openSearchEditor,
    splitRight,
  } = useEditorStore();

  const isFileTab = tab.kind === "file";

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

  // Escape キーでメニューを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 付録B に準拠したメニュー項目を構築する
  const entries: MenuEntry[] = [
    {
      label: "閉じる",
      shortcut: "Ctrl+W",
      onClick: () => closeTab(groupId, tab.id),
    },
    {
      label: "その他を閉じる",
      onClick: () => closeOtherTabs(groupId, tab.id),
    },
    {
      label: "右側を閉じる",
      onClick: () => closeTabsToRight(groupId, tab.id),
    },
    {
      label: "すべて閉じる",
      onClick: () => closeAllTabs(groupId),
    },
    { separator: true },
    // ファイルタブのみ
    ...(isFileTab
      ? [
          {
            label: "パスのコピー",
            disabled: !tab.filePath,
            onClick: () => {
              if (tab.filePath) navigator.clipboard.writeText(tab.filePath);
            },
          } as MenuItem,
          {
            label: "相対パスをコピー",
            disabled: !tab.filePath,
            onClick: async () => {
              if (tab.filePath) {
                const rel = await getRelativePath(tab.filePath, false);
                navigator.clipboard.writeText(rel);
              }
            },
          } as MenuItem,
          {
            label: "相対パスをコピー（Posix形式）",
            disabled: !tab.filePath,
            onClick: async () => {
              if (tab.filePath) {
                const rel = await getRelativePath(tab.filePath, true);
                navigator.clipboard.writeText(rel);
              }
            },
          } as MenuItem,
          { separator: true } as Separator,
          {
            label: "エクスプローラーで表示する",
            disabled: !tab.filePath,
            onClick: () => {
              if (tab.filePath) revealInOsExplorer(tab.filePath);
            },
          } as MenuItem,
          { separator: true } as Separator,
        ]
      : []),
    // 検索タブのみ: 「新しい検索ウインドウで検索」（将来用）
    ...(!isFileTab && tab.kind === "search-editor"
      ? [
          {
            label: "新しい検索ウインドウで検索",
            disabled: !tab.searchQuery,
            onClick: () => {
              if (tab.searchQuery) openSearchEditor(tab.searchQuery);
            },
          } as MenuItem,
          { separator: true } as Separator,
        ]
      : []),
    {
      label: "右に分割",
      onClick: () => splitRight(groupId, tab.id),
    },
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
        minWidth: "220px",
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

export default TabContextMenu;
