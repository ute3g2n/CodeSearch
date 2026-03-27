// コンテキストメニュー表示制御フック
// 右クリック位置を管理し、メニューの開閉を担う
import { useState, useCallback, useEffect } from "react";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface UseContextMenuReturn {
  position: ContextMenuPosition | null;
  isOpen: boolean;
  open: (e: React.MouseEvent) => void;
  close: () => void;
}

export function useContextMenu(): UseContextMenuReturn {
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);

  const open = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const close = useCallback(() => {
    setPosition(null);
  }, []);

  // ウインドウ外クリックで閉じる
  useEffect(() => {
    if (!position) return;
    const handler = () => close();
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [position, close]);

  // Escape キーで閉じる
  useEffect(() => {
    if (!position) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [position, close]);

  return { position, isOpen: position !== null, open, close };
}
