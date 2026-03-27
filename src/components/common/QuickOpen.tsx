// クイックオープンコンポーネント（Ctrl+P）
// ファイル名あいまい検索→選択でタブを開く
import React, { useState, useEffect, useRef, useCallback } from "react";
import { searchFiles } from "../../ipc/commands";
import { useEditorStore } from "../../stores/editor";
import { useDebounce } from "../../hooks/useDebounce";
import type { FileMatch } from "../../ipc/types";

interface QuickOpenProps {
  isOpen: boolean;
  onClose: () => void;
}

// ファイルアイテム1行
const FileItem: React.FC<{
  match: FileMatch;
  isSelected: boolean;
  onClick: () => void;
}> = ({ match, isSelected, onClick }) => (
  <div
    role="option"
    aria-selected={isSelected}
    onClick={onClick}
    style={{
      display: "flex",
      flexDirection: "column",
      padding: "6px 12px",
      cursor: "pointer",
      background: isSelected
        ? "var(--color-list-active-bg, #094771)"
        : "transparent",
      borderBottom: "1px solid transparent",
    }}
    onMouseEnter={(e) => {
      if (!isSelected) {
        (e.currentTarget as HTMLElement).style.background =
          "var(--color-list-hover-bg, #2a2d2e)";
      }
    }}
    onMouseLeave={(e) => {
      if (!isSelected) {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }
    }}
  >
    <span
      style={{
        fontSize: "13px",
        color: "var(--color-editor-fg, #d4d4d4)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {match.name}
    </span>
    <span
      style={{
        fontSize: "11px",
        color: "var(--color-editor-fg, #d4d4d4)",
        opacity: 0.5,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {match.relativePath}
    </span>
  </div>
);

// クイックオープン本体
const QuickOpen: React.FC<QuickOpenProps> = ({ isOpen, onClose }) => {
  const { openFile } = useEditorStore();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<FileMatch[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 150);

  // 開くたびにリセットしてフォーカス
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setMatches([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // デバウンス後のクエリで検索
  useEffect(() => {
    if (!isOpen) return;

    const runSearch = async () => {
      setIsLoading(true);
      try {
        const results = await searchFiles(debouncedQuery, 50);
        setMatches(results);
        setSelectedIndex(0);
      } catch {
        setMatches([]);
      } finally {
        setIsLoading(false);
      }
    };

    runSearch();
  }, [debouncedQuery, isOpen]);

  // ファイルを開いてダイアログを閉じる
  const openSelected = useCallback(
    (index: number) => {
      const match = matches[index];
      if (!match) return;
      openFile(match.absolutePath);
      onClose();
    },
    [matches, openFile, onClose]
  );

  // キーボード操作
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, matches.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        openSelected(selectedIndex);
        break;
      case "Escape":
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    // オーバーレイ
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "80px",
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={onClose}
    >
      {/* ダイアログ本体 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "500px",
          maxHeight: "400px",
          background: "var(--color-editor-bg, #1e1e1e)",
          border: "1px solid var(--color-border, #3c3c3c)",
          borderRadius: "4px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 検索入力 */}
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--color-border, #3c3c3c)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ファイルを検索..."
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--color-editor-fg, #d4d4d4)",
              fontSize: "14px",
              padding: "4px 0",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* 検索中インジケータ */}
        {isLoading && (
          <div
            style={{
              padding: "8px 12px",
              fontSize: "11px",
              color: "var(--color-editor-fg, #d4d4d4)",
              opacity: 0.5,
            }}
          >
            検索中...
          </div>
        )}

        {/* ファイル一覧 */}
        <div
          role="listbox"
          style={{ overflowY: "auto", flex: 1 }}
        >
          {matches.map((match, index) => (
            <FileItem
              key={match.absolutePath}
              match={match}
              isSelected={index === selectedIndex}
              onClick={() => openSelected(index)}
            />
          ))}
          {!isLoading && matches.length === 0 && (
            <div
              style={{
                padding: "16px 12px",
                fontSize: "12px",
                color: "var(--color-editor-fg, #d4d4d4)",
                opacity: 0.5,
                textAlign: "center",
              }}
            >
              {query ? "ファイルが見つかりません" : "ファイル名を入力してください"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickOpen;
