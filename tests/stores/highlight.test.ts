import { describe, it, expect, beforeEach } from "vitest";

// HighlightStore のテスト
// add / remove / clear / 20色ローテーション / navigateNext wrap / navigatePrev wrap を検証

import { useHighlightStore, HIGHLIGHT_COLORS } from "../../src/stores/highlight";

function resetStore() {
  useHighlightStore.setState({ highlights: [], nextColorIndex: 0 });
}

describe("useHighlightStore", () => {
  beforeEach(() => {
    resetStore();
  });

  // ===== add =====

  it("ハイライトを追加できること", () => {
    useHighlightStore.getState().add("TODO");

    const { highlights } = useHighlightStore.getState();
    expect(highlights).toHaveLength(1);
    expect(highlights[0].text).toBe("TODO");
    expect(highlights[0].ignoreCase).toBe(false);
  });

  it("ignoreCase フラグを指定できること", () => {
    useHighlightStore.getState().add("fixme", true);

    const h = useHighlightStore.getState().highlights[0];
    expect(h.ignoreCase).toBe(true);
  });

  it("同じテキストを重複追加しないこと", () => {
    useHighlightStore.getState().add("TODO");
    useHighlightStore.getState().add("TODO");

    expect(useHighlightStore.getState().highlights).toHaveLength(1);
  });

  // ===== 20色ローテーション =====

  it("20色をローテーションしてカラーインデックスが割り当てられること", () => {
    for (let i = 0; i < 22; i++) {
      useHighlightStore.getState().add(`word${i}`);
    }

    const { highlights } = useHighlightStore.getState();
    expect(highlights[0].colorIndex).toBe(0);
    expect(highlights[19].colorIndex).toBe(19);
    expect(highlights[20].colorIndex).toBe(0); // ラップアラウンド
    expect(highlights[21].colorIndex).toBe(1);
  });

  // ===== remove =====

  it("IDを指定してハイライトを削除できること", () => {
    useHighlightStore.getState().add("TODO");
    const id = useHighlightStore.getState().highlights[0].id;

    useHighlightStore.getState().remove(id);
    expect(useHighlightStore.getState().highlights).toHaveLength(0);
  });

  // ===== clear =====

  it("全ハイライトをクリアできること", () => {
    useHighlightStore.getState().add("TODO");
    useHighlightStore.getState().add("FIXME");
    useHighlightStore.getState().add("HACK");

    useHighlightStore.getState().clear();

    expect(useHighlightStore.getState().highlights).toHaveLength(0);
  });

  // ===== navigateNext =====

  it("navigateNext で次のマッチにジャンプできること", () => {
    useHighlightStore.getState().add("TODO");
    const id = useHighlightStore.getState().highlights[0].id;

    const lines = [
      "// TODO: fix this",   // 行 0
      "const x = 1;",        // 行 1
      "// TODO: also this",  // 行 2
    ];

    const result = useHighlightStore.getState().navigateNext(lines, 0, id);
    // 行 0 から前方検索 → 行 2 が次のマッチ
    expect(result).toEqual({ line: 2, col: 3 });
  });

  it("navigateNext が末尾から先頭にラップアラウンドすること", () => {
    useHighlightStore.getState().add("TODO");
    const id = useHighlightStore.getState().highlights[0].id;

    const lines = [
      "// TODO: first",  // 行 0
      "const x = 1;",   // 行 1
    ];

    // 行 0 にいて次を検索 → 末尾まで見つからず先頭（行 0）にラップ
    const result = useHighlightStore.getState().navigateNext(lines, 0, id);
    // 行 0 の次 → ない → ラップ → 行 0
    expect(result).toEqual({ line: 0, col: 3 });
  });

  // ===== navigatePrev =====

  it("navigatePrev で前のマッチにジャンプできること", () => {
    useHighlightStore.getState().add("TODO");
    const id = useHighlightStore.getState().highlights[0].id;

    const lines = [
      "// TODO: first",   // 行 0
      "const x = 1;",     // 行 1
      "// TODO: second",  // 行 2
    ];

    // 行 2 から後方検索 → 行 0 が前のマッチ
    const result = useHighlightStore.getState().navigatePrev(lines, 2, id);
    expect(result).toEqual({ line: 0, col: 3 });
  });

  it("navigatePrev が先頭から末尾にラップアラウンドすること", () => {
    useHighlightStore.getState().add("TODO");
    const id = useHighlightStore.getState().highlights[0].id;

    const lines = [
      "const x = 1;",     // 行 0
      "// TODO: last",    // 行 1
    ];

    // 行 0 から後方検索 → 見つからず末尾（行 1）にラップ
    const result = useHighlightStore.getState().navigatePrev(lines, 0, id);
    expect(result).toEqual({ line: 1, col: 3 });
  });

  it("HIGHLIGHT_COLORS が20色あること", () => {
    expect(HIGHLIGHT_COLORS).toHaveLength(20);
  });
});
