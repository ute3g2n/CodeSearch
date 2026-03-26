import React, { useEffect, useRef } from "react";
import type { TokenSpan } from "../../workers/tokenizer";

interface MinimapProps {
  /// 全行のトークンスパン（Canvas 描画用）
  spans: TokenSpan[][];
  /// ミニマップ表示フラグ
  isVisible: boolean;
  /// 表示/非表示トグルコールバック
  onToggle: () => void;
}

const MINIMAP_WIDTH = 80;
const MINIMAP_LINE_HEIGHT = 2;
const MINIMAP_CHAR_WIDTH = 1;

/// ミニマップコンポーネント
/// - Canvas でコード全体の縮小表示を描画
/// - ON/OFF トグルボタン付き
const Minimap: React.FC<MinimapProps> = ({ spans, isVisible, onToggle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isVisible || !canvasRef.current || spans.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const height = Math.min(spans.length * MINIMAP_LINE_HEIGHT, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 各行を縮小描画
    spans.slice(0, Math.floor(height / MINIMAP_LINE_HEIGHT)).forEach((lineSpans, lineIdx) => {
      let charOffset = 0;
      lineSpans.forEach((span) => {
        const x = charOffset * MINIMAP_CHAR_WIDTH;
        const y = lineIdx * MINIMAP_LINE_HEIGHT;
        const w = span.text.length * MINIMAP_CHAR_WIDTH;

        if (x < MINIMAP_WIDTH) {
          ctx.fillStyle = span.color + "99"; // 透過付き
          ctx.fillRect(x, y, Math.min(w, MINIMAP_WIDTH - x), MINIMAP_LINE_HEIGHT - 0.5);
        }
        charOffset += span.text.length;
      });
    });
  }, [spans, isVisible]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        position: "relative",
      }}
    >
      {/* トグルボタン */}
      <button
        aria-label="ミニマップ切り替え"
        onClick={onToggle}
        style={{
          position: "absolute",
          top: "4px",
          right: isVisible ? `${MINIMAP_WIDTH + 4}px` : "4px",
          zIndex: 1,
          background: "var(--color-editor-bg, #1e1e1e)",
          border: "1px solid var(--color-border, #3e3e3e)",
          color: "var(--color-editor-fg, #d4d4d4)",
          borderRadius: "3px",
          padding: "2px 6px",
          fontSize: "11px",
          cursor: "pointer",
          opacity: 0.7,
        }}
      >
        {isVisible ? "⊟" : "⊞"}
      </button>

      {/* ミニマップ Canvas */}
      {isVisible && (
        <canvas
          ref={canvasRef}
          width={MINIMAP_WIDTH}
          height={600}
          style={{
            backgroundColor: "var(--color-editor-bg, #1e1e1e)",
            opacity: 0.8,
          }}
        />
      )}
    </div>
  );
};

export default Minimap;
