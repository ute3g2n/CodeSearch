import React, { useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import type { TokenSpan } from "../../workers/tokenizer";
import { useConfigStore } from "../../stores/config";
import { useHighlightStore } from "../../stores/highlight";
import { useSearchStore } from "../../stores/search";
import { useEditorStore } from "../../stores/editor";
import { useBookmarkStore } from "../../stores/bookmark";
import { useWorkspaceStore } from "../../stores/workspace";
import { BOOKMARK_COLORS } from "../../models/bookmarkColors";
import Gutter from "./Gutter";
import CodeLines from "./CodeLines";
import Minimap from "./Minimap";
import ContextMenu from "../common/ContextMenu";
import ColorPalette from "../common/ColorPalette";
import type { ContextMenuPosition } from "../../hooks/useContextMenu";

interface CodeViewProps {
  /// 表示するファイルの内容（null = 未選択）
  content: string | null;
  /// ファイル拡張子（シンタックスハイライト言語判定用）
  extension: string | null;
  /// 現在表示中のファイルパス（ブックマーク操作用）
  filePath: string | null;
}

/// コードビューコンポーネント（読み取り専用エディタ）
/// - react-virtuoso による仮想スクロールで大規模ファイルを効率表示
/// - WebWorker を使ったシンタックスハイライト（非同期・チャンク単位）
/// - Gutter（行番号）、Minimap（ON/OFFトグル）を統合
const CodeView: React.FC<CodeViewProps> = ({ content, extension, filePath }) => {
  // 行テキスト配列
  const lines = useMemo(() => content?.split("\n") ?? [], [content]);

  // トークン済みスパン（全行分、インデックスで管理）
  const [tokenizedSpans, setTokenizedSpans] = useState<Map<number, TokenSpan[]>>(new Map());

  // 選択行インデックスセット
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());

  // コンテキストメニュー状態
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const [selectedText, setSelectedText] = useState("");
  // 右クリック時の行インデックス（ブックマーク判定用）
  const [contextMenuLine, setContextMenuLine] = useState<number | null>(null);

  // ガタークリック時のカラーパレット表示状態
  const [gutterPaletteState, setGutterPaletteState] = useState<{
    lineIndex: number;
    x: number;
    y: number;
  } | null>(null);

  // ストアのアクション取得
  const addHighlight = useHighlightStore((s) => s.add);
  const setQuery = useSearchStore((s) => s.setQuery);
  const openSearchEditor = useEditorStore((s) => s.openSearchEditor);

  // ブックマークストアからファイルのブックマーク一覧を取得する
  // NOTE: getBookmarksForFile は毎回新しい配列参照を返すため、
  // セレクタとして直接使うと無限ループが発生する。
  // allBookmarks + useMemo でフィルタリングすることで参照の安定性を確保する。
  const allBookmarks = useBookmarkStore((s) => s.bookmarks);
  const bookmarks = useMemo(
    () => (filePath ? allBookmarks.filter((b) => b.filePath === filePath) : []),
    [allBookmarks, filePath]
  );
  const addBookmark = useBookmarkStore((s) => s.addBookmark);
  const removeBookmark = useBookmarkStore((s) => s.removeBookmark);
  const selectedColorIndex = useBookmarkStore((s) => s.selectedColorIndex);

  // 現在のワークスペースIDを取得する
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id ?? null);

  // ブックマーク行インデックスセットとカラーマップを生成する
  const bookmarkedLines = useMemo(() => {
    const set = new Set<number>();
    bookmarks.forEach((b) => set.add(b.lineNumber));
    return set;
  }, [bookmarks]);

  const bookmarkColors = useMemo(() => {
    const map = new Map<number, string>();
    bookmarks.forEach((b) => {
      const color = BOOKMARK_COLORS[b.colorIndex] ?? "#E53935";
      map.set(b.lineNumber, color);
    });
    return map;
  }, [bookmarks]);

  // ミニマップ表示フラグ（設定の minimapEnabled に連動）
  const minimapEnabled = useConfigStore((s) => s.config.minimapEnabled);
  const [isMinimapVisible, setIsMinimapVisible] = useState(minimapEnabled);

  // minimapEnabled 設定変更時にローカル状態を同期する
  useEffect(() => {
    setIsMinimapVisible(minimapEnabled);
  }, [minimapEnabled]);

  // WebWorker の参照
  const workerRef = useRef<Worker | null>(null);

  // コンテンツ変更時にハイライトを実行
  useEffect(() => {
    if (!content || lines.length === 0) {
      setTokenizedSpans(new Map());
      return;
    }

    // 前のワーカーをキャンセル
    if (workerRef.current) {
      const prevId = "prev";
      workerRef.current.postMessage({ type: "cancel", id: prevId });
    }

    // フォールバック: プレーンテキストとして即座に表示
    const plainSpans = new Map<number, TokenSpan[]>();
    lines.forEach((line, idx) => {
      plainSpans.set(idx, [{ text: line, color: "#D4D4D4" }]);
    });
    setTokenizedSpans(plainSpans);

    // WebWorker によるハイライト（環境が Worker をサポートする場合）
    if (typeof Worker !== "undefined" && extension) {
      try {
        const worker = new Worker(
          new URL("../../workers/highlight.worker.ts", import.meta.url),
          { type: "module" }
        );
        workerRef.current = worker;
        const requestId = `${Date.now()}`;

        worker.onmessage = (event) => {
          const { type, id, startLine, spans } = event.data;
          if (id !== requestId) return;

          if (type === "chunk" && startLine !== undefined && spans) {
            setTokenizedSpans((prev) => {
              const next = new Map(prev);
              spans.forEach((lineSpans: TokenSpan[], i: number) => {
                next.set(startLine + i, lineSpans);
              });
              return next;
            });
          } else if (type === "done") {
            worker.terminate();
          } else if (type === "error") {
            worker.terminate();
          }
        };

        worker.postMessage({
          type: "tokenize",
          id: requestId,
          lines,
          extension,
        });
      } catch {
        // Worker 初期化失敗時はプレーンテキスト表示のまま
      }
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [content, extension, lines]);

  // コードエリアの右クリックでコンテキストメニューを表示する
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const sel = window.getSelection()?.toString() ?? "";
    setSelectedText(sel);
    // クリック位置のdata-line-indexを探して現在行を取得する
    let el: HTMLElement | null = e.target as HTMLElement;
    let lineIdx: number | null = null;
    while (el && el !== e.currentTarget) {
      const attr = el.getAttribute("data-line-index");
      if (attr !== null) { lineIdx = Number(attr); break; }
      el = el.parentElement;
    }
    // 見つからない場合は選択行（最小インデックス）をフォールバックとして使う
    if (lineIdx === null && selectedLines.size > 0) {
      lineIdx = Math.min(...selectedLines);
    }
    setContextMenuLine(lineIdx);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // 行番号ガタークリック時の処理
  // - ブックマーク済みの行: ブックマークを削除する
  // - 未ブックマークの行: カラーパレットを表示してブックマークを追加する
  const handleLineClick = (lineIndex: number, e?: React.MouseEvent) => {
    // 選択行トグル（常に実行）
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineIndex)) {
        next.delete(lineIndex);
      } else {
        next.add(lineIndex);
      }
      return next;
    });

    if (!filePath || !workspaceId) return;

    // 既存ブックマークの検索
    const existing = useBookmarkStore
      .getState()
      .getBookmarkAtLine(filePath, lineIndex);

    if (existing) {
      // ブックマーク済みの行はクリックで削除する
      removeBookmark(existing.id);
    } else {
      // 未ブックマークの行はカラーパレットを表示する
      const rect = e
        ? { x: e.clientX, y: e.clientY }
        : { x: 0, y: 0 };
      setGutterPaletteState({ lineIndex, x: rect.x, y: rect.y });
    }
  };

  // カラーパレットで色を選択した時の処理
  const handleColorSelect = (colorIndex: number) => {
    if (!filePath || !workspaceId || gutterPaletteState === null) return;

    const { lineIndex } = gutterPaletteState;
    const lineText = lines[lineIndex] ?? "";

    // ブックマークストアの selectedColorIndex を更新してからブックマークを追加する
    useBookmarkStore.getState().setSelectedColor(colorIndex);
    // ブックマーク追加（lineNumber は 0始まりのインデックスで保存）
    addBookmark(workspaceId, filePath, lineIndex, lineText);
    setGutterPaletteState(null);
  };

  // ミニマップ用スパン（全行分）
  const allSpans = useMemo(() => {
    return lines.map((_, i) => tokenizedSpans.get(i) ?? [{ text: lines[i], color: "#D4D4D4" }]);
  }, [lines, tokenizedSpans]);

  // コンテンツ未選択時のプレースホルダ
  if (!content) {
    return (
      <div
        data-testid="editor-placeholder"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--color-editor-fg, #d4d4d4)",
          opacity: 0.4,
          fontSize: "14px",
          backgroundColor: "var(--color-editor-bg, #1e1e1e)",
        }}
      >
        ファイルを選択してください
      </div>
    );
  }

  return (
    <div
      data-testid="code-view-container"
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
        backgroundColor: "var(--color-editor-bg, #1e1e1e)",
        overflow: "hidden",
        position: "relative",
      }}
      onContextMenu={handleContextMenu}
      onClick={() => {
        // パレット表示中に外側をクリックしたら閉じる
        if (gutterPaletteState) setGutterPaletteState(null);
      }}
    >
      {/* 行番号ガター */}
      <div data-testid="gutter-container">
        <Gutter
          lineCount={lines.length}
          startLine={0}
          selectedLines={selectedLines}
          onLineClick={(lineIndex) => {
            // ガタークリックはイベントオブジェクトが必要なため、div の onClick で拾えないため
            // Gutter コンポーネントからは lineIndex のみ渡される
            handleLineClick(lineIndex);
          }}
          bookmarkedLines={bookmarkedLines}
          bookmarkColors={bookmarkColors}
        />
      </div>

      {/* コードエリア（仮想スクロール） */}
      <Virtuoso
        style={{ flex: 1, height: "100%" }}
        totalCount={lines.length}
        itemContent={(index) => {
          const lineSpans = tokenizedSpans.get(index) ?? [
            { text: lines[index], color: "#D4D4D4" },
          ];
          return (
            <div data-line-index={index}>
              <CodeLines
                spans={[lineSpans]}
                startLine={index}
                selectedLines={selectedLines}
              />
            </div>
          );
        }}
      />

      {/* ミニマップ */}
      <Minimap
        spans={allSpans}
        isVisible={isMinimapVisible}
        onToggle={() => setIsMinimapVisible((v) => !v)}
      />

      {/* ガタークリック時のカラーパレットポップアップ */}
      {gutterPaletteState && (
        <div
          style={{
            position: "fixed",
            left: gutterPaletteState.x,
            top: gutterPaletteState.y,
            zIndex: 3000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ColorPalette
            selectedIndex={selectedColorIndex}
            onSelect={handleColorSelect}
          />
        </div>
      )}

      {/* エディタコンテキストメニュー */}
      {contextMenuPos && (() => {
        // 右クリック行のブックマーク確認
        const lineBookmark = filePath && contextMenuLine !== null
          ? useBookmarkStore.getState().getBookmarkAtLine(filePath, contextMenuLine)
          : undefined;
        return (
          <ContextMenu
            position={contextMenuPos}
            onClose={() => setContextMenuPos(null)}
            hasSelection={selectedText.length > 0}
            selectedText={selectedText}
            hasBookmark={!!lineBookmark}
            onSearchInSidebar={(text) => {
              setQuery(text);
              const btn = document.querySelector<HTMLButtonElement>('[data-testid="activity-search"]');
              btn?.click();
            }}
            onSearchInNewEditor={(text) => openSearchEditor(text)}
            onHighlight={(text) => addHighlight(text, false)}
            onAddBookmark={() => {
              if (contextMenuLine !== null) {
                setGutterPaletteState({
                  lineIndex: contextMenuLine,
                  x: contextMenuPos.x,
                  y: contextMenuPos.y,
                });
              }
            }}
            onRemoveBookmark={() => {
              if (lineBookmark) removeBookmark(lineBookmark.id);
            }}
          />
        );
      })()}
    </div>
  );
};

export default CodeView;
