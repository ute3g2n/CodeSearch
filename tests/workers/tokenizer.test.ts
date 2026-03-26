import { describe, it, expect, vi } from "vitest";

// vscode-textmate / vscode-oniguruma をモック化（ファイルシステム不要）
vi.mock("vscode-textmate", () => {
  class MockStateStack {
    static INITIAL = new MockStateStack();
    _scopes = ["source.ts"];
  }

  return {
    INITIAL_STACK_ELEMENT: MockStateStack.INITIAL,
    Registry: vi.fn().mockImplementation(() => ({
      loadGrammar: vi.fn(),
    })),
  };
});

vi.mock("vscode-oniguruma", () => ({
  loadWASM: vi.fn().mockResolvedValue(undefined),
  createOnigScanner: vi.fn(),
  createOnigString: vi.fn(),
}));

import {
  mapScopeToColor,
  convertTokensToSpans,
  chunkLines,
  buildThemeColorMap,
} from "../../src/workers/tokenizer";
import type { ThemeColorMap } from "../../src/workers/tokenizer";

// --- buildThemeColorMap テスト ---
describe("buildThemeColorMap", () => {
  it("tokenColors 配列からスコープ→カラーマップを構築できること", () => {
    const tokenColors = [
      { scope: "comment", settings: { foreground: "#6A9955" } },
      { scope: ["keyword", "keyword.control"], settings: { foreground: "#C586C0" } },
      { scope: "string", settings: { foreground: "#CE9178" } },
    ];
    const map = buildThemeColorMap(tokenColors);
    expect(map["comment"]).toBe("#6A9955");
    expect(map["keyword"]).toBe("#C586C0");
    expect(map["keyword.control"]).toBe("#C586C0");
    expect(map["string"]).toBe("#CE9178");
  });

  it("settings.foreground がないエントリは無視されること", () => {
    const tokenColors = [
      { scope: "invalid", settings: {} },
      { scope: "comment", settings: { foreground: "#6A9955" } },
    ];
    const map = buildThemeColorMap(tokenColors);
    expect(map["invalid"]).toBeUndefined();
    expect(map["comment"]).toBe("#6A9955");
  });

  it("空配列を渡すと空マップになること", () => {
    const map = buildThemeColorMap([]);
    expect(Object.keys(map).length).toBe(0);
  });
});

// --- mapScopeToColor テスト ---
describe("mapScopeToColor", () => {
  const colorMap: ThemeColorMap = {
    "comment": "#6A9955",
    "comment.line": "#6A9955",
    "keyword.control": "#C586C0",
    "keyword": "#569CD6",
    "string.quoted": "#CE9178",
    "string": "#CE9178",
    "variable": "#9CDCFE",
  };

  it("完全一致するスコープの色を返すこと", () => {
    expect(mapScopeToColor(["comment"], colorMap)).toBe("#6A9955");
  });

  it("より具体的なスコープを優先して返すこと", () => {
    // "comment.line" は "comment" より具体的
    expect(mapScopeToColor(["comment.line", "comment"], colorMap)).toBe("#6A9955");
  });

  it("完全一致がない場合はプレフィックスマッチを使用すること", () => {
    // "keyword.operator" → "keyword" にプレフィックスマッチ
    expect(mapScopeToColor(["keyword.operator"], colorMap)).toBe("#569CD6");
  });

  it("マッチするスコープがない場合はデフォルト色を返すこと", () => {
    expect(mapScopeToColor(["unknown.scope"], colorMap)).toBe("#D4D4D4");
  });

  it("スコープ配列が空の場合はデフォルト色を返すこと", () => {
    expect(mapScopeToColor([], colorMap)).toBe("#D4D4D4");
  });
});

// --- convertTokensToSpans テスト ---
describe("convertTokensToSpans", () => {
  it("IToken配列を TokenSpan 配列に変換できること", () => {
    const lineText = "let x = 1;";
    // vscode-textmate の IToken 形式（startIndex/endIndex/scopes）
    const tokens = [
      { startIndex: 0, endIndex: 3, scopes: ["source.ts", "keyword.declaration.ts"] },
      { startIndex: 3, endIndex: 4, scopes: ["source.ts"] },
      { startIndex: 4, endIndex: 5, scopes: ["source.ts", "variable.other.ts"] },
      { startIndex: 5, endIndex: 10, scopes: ["source.ts"] },
    ];
    const colorMap: ThemeColorMap = {
      "keyword.declaration": "#569CD6",
      "variable.other": "#9CDCFE",
    };

    const spans = convertTokensToSpans(lineText, tokens, colorMap);

    expect(spans).toHaveLength(4);
    expect(spans[0]).toEqual({ text: "let", color: "#569CD6" });
    expect(spans[1]).toEqual({ text: " ", color: "#D4D4D4" });
    expect(spans[2]).toEqual({ text: "x", color: "#9CDCFE" });
    expect(spans[3]).toEqual({ text: " = 1;", color: "#D4D4D4" });
  });

  it("空のトークン配列は空の TokenSpan 配列を返すこと", () => {
    const spans = convertTokensToSpans("", [], {});
    expect(spans).toHaveLength(0);
  });

  it("テキストが空の場合は空スパンを返すこと", () => {
    const tokens = [{ startIndex: 0, endIndex: 0, scopes: ["source.ts"] }];
    const spans = convertTokensToSpans("", tokens, {});
    expect(spans).toHaveLength(0);
  });
});

// --- chunkLines テスト ---
describe("chunkLines", () => {
  it("100行ごとにチャンクに分割できること", () => {
    const lines = Array.from({ length: 250 }, (_, i) => [
      { text: `line ${i}`, color: "#D4D4D4" },
    ]);
    const chunks = chunkLines(lines, 100);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[1]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
  });

  it("チャンクサイズより少ない行数は1チャンクになること", () => {
    const lines = Array.from({ length: 50 }, () => [{ text: "x", color: "#D4D4D4" }]);
    const chunks = chunkLines(lines, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(50);
  });

  it("空配列は空チャンク配列を返すこと", () => {
    const chunks = chunkLines([], 100);
    expect(chunks).toHaveLength(0);
  });

  it("ちょうど100行は1チャンクになること", () => {
    const lines = Array.from({ length: 100 }, () => [{ text: "x", color: "#D4D4D4" }]);
    const chunks = chunkLines(lines, 100);
    expect(chunks).toHaveLength(1);
  });

  it("101行は2チャンクになること", () => {
    const lines = Array.from({ length: 101 }, () => [{ text: "x", color: "#D4D4D4" }]);
    const chunks = chunkLines(lines, 100);
    expect(chunks).toHaveLength(2);
    expect(chunks[1]).toHaveLength(1);
  });
});
