// トークナイザー純粋ロジックモジュール
// vscode-textmate のトークン結果を TokenSpan 配列に変換する処理を担う

/// 1トークンのテキストと表示色
export interface TokenSpan {
  text: string;
  color: string;
}

/// スコープ名 → 色文字列のマッピング
export type ThemeColorMap = Record<string, string>;

/// Dark+ テーマのデフォルト前景色
const DEFAULT_FOREGROUND = "#D4D4D4";

/// テーマの tokenColors 配列からスコープ→カラーマップを構築する
export function buildThemeColorMap(
  tokenColors: Array<{
    scope?: string | string[];
    settings: { foreground?: string };
  }>
): ThemeColorMap {
  const map: ThemeColorMap = {};

  for (const entry of tokenColors) {
    const { scope, settings } = entry;
    if (!settings.foreground) continue;
    const color = settings.foreground;

    if (typeof scope === "string") {
      map[scope] = color;
    } else if (Array.isArray(scope)) {
      for (const s of scope) {
        map[s] = color;
      }
    }
  }

  return map;
}

/// スコープ配列からテーマカラーを解決する
/// より具体的な（長い）スコープを優先し、完全一致→プレフィックスマッチの順で検索する
export function mapScopeToColor(
  scopes: string[],
  colorMap: ThemeColorMap
): string {
  if (scopes.length === 0) return DEFAULT_FOREGROUND;

  // 最も具体的なスコープから順に完全一致を探す
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    if (colorMap[scope]) return colorMap[scope];
  }

  // 完全一致なし → プレフィックスマッチ（最も具体的なスコープから）
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    // ドット区切りで短いプレフィックスを順に試す
    const parts = scope.split(".");
    for (let len = parts.length - 1; len >= 1; len--) {
      const prefix = parts.slice(0, len).join(".");
      if (colorMap[prefix]) return colorMap[prefix];
    }
  }

  return DEFAULT_FOREGROUND;
}

/// vscode-textmate の IToken 配列を TokenSpan 配列に変換する
export function convertTokensToSpans(
  lineText: string,
  tokens: Array<{ startIndex: number; endIndex: number; scopes: string[] }>,
  colorMap: ThemeColorMap
): TokenSpan[] {
  const spans: TokenSpan[] = [];

  for (const token of tokens) {
    const text = lineText.slice(token.startIndex, token.endIndex);
    if (text.length === 0) continue;

    const color = mapScopeToColor(token.scopes, colorMap);
    spans.push({ text, color });
  }

  return spans;
}

/// TokenSpan[][] をチャンクサイズごとに分割する
export function chunkLines(
  lines: TokenSpan[][],
  chunkSize: number
): TokenSpan[][][] {
  const chunks: TokenSpan[][][] = [];

  for (let i = 0; i < lines.length; i += chunkSize) {
    chunks.push(lines.slice(i, i + chunkSize));
  }

  return chunks;
}
