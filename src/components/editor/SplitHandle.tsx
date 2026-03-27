// 画面分割ハンドルコンポーネント
// ドラッグによりエディタグループの幅を調整する
import React, { useCallback, useRef } from "react";
import { useEditorStore } from "../../stores/editor";

interface SplitHandleProps {
  /** このハンドルが担う「左グループ」と「右グループ」のインデックス */
  leftIndex: number;
  rightIndex: number;
}

/// 水平ドラッグで隣接グループのサイズ比を調整するハンドル
const SplitHandle: React.FC<SplitHandleProps> = ({ leftIndex, rightIndex }) => {
  const { groupSizes, setGroupSizes } = useEditorStore();
  const startXRef = useRef<number>(0);
  const startSizesRef = useRef<number[]>([]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;
      startSizesRef.current = [...groupSizes];

      const onMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startXRef.current;
        const containerWidth = window.innerWidth; // 近似値
        const totalUnits = startSizesRef.current.reduce((s, v) => s + v, 0);
        // ピクセル差を比率に換算
        const deltaUnit = (dx / containerWidth) * totalUnits;
        const next = [...startSizesRef.current];
        next[leftIndex] = Math.max(0.1, next[leftIndex] + deltaUnit);
        next[rightIndex] = Math.max(
          0.1,
          startSizesRef.current[leftIndex] +
            startSizesRef.current[rightIndex] -
            next[leftIndex]
        );
        setGroupSizes(next);
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [groupSizes, leftIndex, rightIndex, setGroupSizes]
  );

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: "4px",
        cursor: "col-resize",
        backgroundColor: "var(--color-border, #3c3c3c)",
        flexShrink: 0,
        transition: "background-color 0.1s",
        zIndex: 10,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--color-accent, #007acc)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--color-border, #3c3c3c)";
      }}
    />
  );
};

export default SplitHandle;
