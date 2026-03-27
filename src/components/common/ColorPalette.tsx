// 15色プリセットカラーパレットコンポーネント
import React from "react";
import { BOOKMARK_COLORS } from "../../models/bookmarkColors";

interface ColorPaletteProps {
  /** 現在選択中のカラーインデックス（0〜14） */
  selectedIndex: number;
  /** 色選択時のコールバック */
  onSelect: (index: number) => void;
}

/// ブックマーク色選択パレット
/// 5列×3行の15色グリッドを表示する
const ColorPalette: React.FC<ColorPaletteProps> = ({ selectedIndex, onSelect }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 20px)",
        gap: "4px",
        padding: "8px",
        background: "var(--color-editor-bg, #1e1e1e)",
        border: "1px solid var(--color-border, #3c3c3c)",
        borderRadius: "4px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      {BOOKMARK_COLORS.map((color, index) => (
        <button
          key={index}
          title={`色 ${index + 1}`}
          onClick={() => onSelect(index)}
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: color,
            border: selectedIndex === index
              ? "2px solid #fff"
              : "2px solid transparent",
            cursor: "pointer",
            padding: 0,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      ))}
    </div>
  );
};

export default ColorPalette;
