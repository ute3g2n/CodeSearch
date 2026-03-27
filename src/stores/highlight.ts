// HighlightStore
// ハイライトワードの管理・ナビゲーションを担う（フロントエンドのみで完結）
import { create } from "zustand";

/** ハイライトに使用する20色プリセット（基本設計書セクション4.2.5） */
export const HIGHLIGHT_COLORS: string[] = [
  "#FF6B6B", // 0: 赤
  "#FF9F43", // 1: オレンジ
  "#FECA57", // 2: イエロー
  "#48DBFB", // 3: ライトブルー
  "#54A0FF", // 4: ブルー
  "#5F27CD", // 5: インディゴ
  "#00D2D3", // 6: シアン
  "#01CBC6", // 7: ティール
  "#10AC84", // 8: グリーン
  "#EE5A24", // 9: 深オレンジ
  "#C8D6E5", // 10: ライトグレー
  "#8395A7", // 11: グレー
  "#F368E0", // 12: マゼンタ
  "#FF9FF3", // 13: ライトピンク
  "#FD79A8", // 14: ピンク
  "#E17055", // 15: サーモン
  "#FDCB6E", // 16: ゴールド
  "#00B894", // 17: エメラルド
  "#6C5CE7", // 18: パープル
  "#A29BFE", // 19: ラベンダー
];

/** ハイライトエントリ */
export interface HighlightEntry {
  id: string;
  text: string;
  ignoreCase: boolean;
  /** 0〜19 で自動アサイン（ローテーション） */
  colorIndex: number;
}

interface HighlightState {
  highlights: HighlightEntry[];
  /** 次に割り当てるカラーインデックス */
  nextColorIndex: number;

  /** ハイライトを追加する（重複テキストは無視） */
  add: (text: string, ignoreCase?: boolean) => void;
  /** 指定IDのハイライトを削除する */
  remove: (id: string) => void;
  /** 全ハイライトをクリアする */
  clear: () => void;
  /**
   * 現在行から前方方向（下方向）の次のマッチを返す
   * currentLine を含まず、末尾で先頭にラップアラウンドする
   * @returns マッチした { line: 0-based, col: 0-based } または null
   */
  navigateNext: (
    lines: string[],
    currentLine: number,
    highlightId: string
  ) => { line: number; col: number } | null;
  /**
   * 現在行から後方方向（上方向）の前のマッチを返す
   * currentLine を含まず、先頭で末尾にラップアラウンドする
   * @returns マッチした { line: 0-based, col: 0-based } または null
   */
  navigatePrev: (
    lines: string[],
    currentLine: number,
    highlightId: string
  ) => { line: number; col: number } | null;
}

/** ハイライトエントリの一意IDを生成する */
function generateId(): string {
  return `hl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 行テキスト内でハイライトテキストを検索し、先頭マッチの列を返す */
function findInLine(line: string, text: string, ignoreCase: boolean): number {
  const haystack = ignoreCase ? line.toLowerCase() : line;
  const needle = ignoreCase ? text.toLowerCase() : text;
  return haystack.indexOf(needle);
}

export const useHighlightStore = create<HighlightState>((set, get) => ({
  highlights: [],
  nextColorIndex: 0,

  add: (text, ignoreCase = false) => {
    const { highlights, nextColorIndex } = get();

    // 同一テキストの重複を防ぐ
    if (highlights.some((h) => h.text === text && h.ignoreCase === ignoreCase)) {
      return;
    }

    const entry: HighlightEntry = {
      id: generateId(),
      text,
      ignoreCase,
      colorIndex: nextColorIndex,
    };

    set({
      highlights: [...highlights, entry],
      nextColorIndex: (nextColorIndex + 1) % HIGHLIGHT_COLORS.length,
    });
  },

  remove: (id) =>
    set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) })),

  clear: () => set({ highlights: [], nextColorIndex: 0 }),

  navigateNext: (lines, currentLine, highlightId) => {
    const entry = get().highlights.find((h) => h.id === highlightId);
    if (!entry) return null;

    const total = lines.length;

    // currentLine + 1 から末尾、次に先頭から currentLine（ラップアラウンド）
    for (let offset = 1; offset <= total; offset++) {
      const lineIdx = (currentLine + offset) % total;
      const col = findInLine(lines[lineIdx], entry.text, entry.ignoreCase);
      if (col !== -1) {
        return { line: lineIdx, col };
      }
    }

    return null;
  },

  navigatePrev: (lines, currentLine, highlightId) => {
    const entry = get().highlights.find((h) => h.id === highlightId);
    if (!entry) return null;

    const total = lines.length;

    // currentLine - 1 から先頭、次に末尾から currentLine（ラップアラウンド）
    for (let offset = 1; offset <= total; offset++) {
      const lineIdx = ((currentLine - offset) % total + total) % total;
      const col = findInLine(lines[lineIdx], entry.text, entry.ignoreCase);
      if (col !== -1) {
        return { line: lineIdx, col };
      }
    }

    return null;
  },
}));
