import React, { useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import type { TokenSpan } from "../../workers/tokenizer";
import Gutter from "./Gutter";
import CodeLines from "./CodeLines";
import Minimap from "./Minimap";

interface CodeViewProps {
  /// 表示するファイルの内容（null = 未選択）
  content: string | null;
  /// ファイル拡張子（シンタックスハイライト言語判定用）
  extension: string | null;
}


/// コードビューコンポーネント（読み取り専用エディタ）
/// - react-virtuoso による仮想スクロールで大規模ファイルを効率表示
/// - WebWorker を使ったシンタックスハイライト（非同期・チャンク単位）
/// - Gutter（行番号）、Minimap（ON/OFFトグル）を統合
const CodeView: React.FC<CodeViewProps> = ({ content, extension }) => {
  // 行テキスト配列
  const lines = useMemo(() => content?.split("\n") ?? [], [content]);

  // トークン済みスパン（全行分、インデックスで管理）
  const [tokenizedSpans, setTokenizedSpans] = useState<Map<number, TokenSpan[]>>(new Map());

  // 選択行インデックスセット
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());

  // ミニマップ表示フラグ
  const [isMinimapVisible, setIsMinimapVisible] = useState(true);

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

  // 行番号クリックで選択状態をトグル
  const handleLineClick = (lineIndex: number) => {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineIndex)) {
        next.delete(lineIndex);
      } else {
        next.add(lineIndex);
      }
      return next;
    });
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
    >
      {/* 行番号ガター */}
      <div data-testid="gutter-container">
        <Gutter
          lineCount={lines.length}
          startLine={0}
          selectedLines={selectedLines}
          onLineClick={handleLineClick}
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
            <CodeLines
              spans={[lineSpans]}
              startLine={index}
              selectedLines={selectedLines}
            />
          );
        }}
      />

      {/* ミニマップ */}
      <Minimap
        spans={allSpans}
        isVisible={isMinimapVisible}
        onToggle={() => setIsMinimapVisible((v) => !v)}
      />
    </div>
  );
};

export default CodeView;
