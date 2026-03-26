// シンタックスハイライト WebWorker
// vscode-textmate + vscode-oniguruma を使い、非同期でトークナイズを行う
// 100行ごとにチャンクとしてメインスレッドへ返却する

import * as vscodeTextmate from "vscode-textmate";
import * as oniguruma from "vscode-oniguruma";
import darkPlusTheme from "./themes/dark-plus.json";
import { buildThemeColorMap, convertTokensToSpans, chunkLines } from "./tokenizer";
import type { TokenSpan } from "./tokenizer";

/// メインスレッドからワーカーへのリクエスト型
export interface WorkerRequest {
  type: "tokenize" | "cancel";
  /// リクエスト識別子
  id: string;
  /// トークナイズ対象の全行テキスト（tokenize 時のみ）
  lines?: string[];
  /// ファイル拡張子（tokenize 時のみ）
  extension?: string;
}

/// ワーカーからメインスレッドへのレスポンス型
export interface WorkerResponse {
  type: "chunk" | "done" | "error";
  id: string;
  /// チャンク開始行インデックス（chunk 時のみ）
  startLine?: number;
  /// トークナイズ済みの TokenSpan チャンク（chunk 時のみ）
  spans?: TokenSpan[][];
  /// エラーメッセージ（error 時のみ）
  message?: string;
}

const CHUNK_SIZE = 100;

// 処理中のリクエストIDセット（キャンセル対応）
const activeRequests = new Set<string>();

// テーマのカラーマップを事前構築
const themeColorMap = buildThemeColorMap(darkPlusTheme.tokenColors);

// 言語マップキャッシュ
let languageMap: Record<string, string> | null = null;

// Grammar キャッシュ（scopeName → Grammar）
const grammarCache = new Map<string, vscodeTextmate.IGrammar | null>();

// Registry（初期化後に設定）
let registry: vscodeTextmate.Registry | null = null;

/// oniguruma WASM を初期化し、Registry を生成する
async function initRegistry(): Promise<vscodeTextmate.Registry> {
  if (registry) return registry;

  // oniguruma WASM をロード
  const wasmResponse = await fetch("/onig.wasm");
  await oniguruma.loadWASM(wasmResponse);

  registry = new vscodeTextmate.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => oniguruma.createOnigScanner(patterns),
      createOnigString: (str) => oniguruma.createOnigString(str),
    }),
    loadGrammar: async (scopeName) => {
      try {
        const res = await fetch(`/grammars/${scopeName}.tmLanguage.json`);
        if (!res.ok) return null;
        const grammar = await res.json();
        return grammar;
      } catch {
        return null;
      }
    },
  });

  return registry;
}

/// 言語マップを取得する（キャッシュあり）
async function getLanguageMap(): Promise<Record<string, string>> {
  if (languageMap) return languageMap;
  const res = await fetch("/grammars/language-map.json");
  languageMap = await res.json();
  return languageMap!;
}

/// 拡張子から Grammar を取得する
async function getGrammar(
  reg: vscodeTextmate.Registry,
  extension: string
): Promise<vscodeTextmate.IGrammar | null> {
  const langMap = await getLanguageMap();
  const scopeName = langMap[extension.toLowerCase()];
  if (!scopeName) return null;

  if (grammarCache.has(scopeName)) {
    return grammarCache.get(scopeName) ?? null;
  }

  const grammar = await reg.loadGrammar(scopeName);
  grammarCache.set(scopeName, grammar);
  return grammar;
}

/// 全行をトークナイズし、チャンクごとにメインスレッドへ送信する
async function tokenizeLines(
  id: string,
  lines: string[],
  extension: string
): Promise<void> {
  let reg: vscodeTextmate.Registry;
  try {
    reg = await initRegistry();
  } catch (err) {
    postMessage({
      type: "error",
      id,
      message: `Registry の初期化に失敗しました: ${err}`,
    } satisfies WorkerResponse);
    return;
  }

  const grammar = await getGrammar(reg, extension);

  // Grammar が取得できない場合はプレーンテキストとして返す
  if (!grammar) {
    const plainSpans: TokenSpan[][] = lines.map((line) => [
      { text: line, color: "#D4D4D4" },
    ]);
    const chunks = chunkLines(plainSpans, CHUNK_SIZE);
    for (let i = 0; i < chunks.length; i++) {
      if (!activeRequests.has(id)) return;
      postMessage({
        type: "chunk",
        id,
        startLine: i * CHUNK_SIZE,
        spans: chunks[i],
      } satisfies WorkerResponse);
    }
    postMessage({ type: "done", id } satisfies WorkerResponse);
    return;
  }

  // テキストメイトでトークナイズ
  let ruleStack = vscodeTextmate.INITIAL;
  const allSpans: TokenSpan[][] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    if (!activeRequests.has(id)) return;

    const lineTokens = grammar.tokenizeLine(lines[lineIdx], ruleStack);
    ruleStack = lineTokens.ruleStack;

    const spans = convertTokensToSpans(
      lines[lineIdx],
      lineTokens.tokens,
      themeColorMap
    );
    allSpans.push(spans);

    // 100行ごとにチャンクを送信（可視範囲を優先するため先頭チャンクを先に返す）
    if ((lineIdx + 1) % CHUNK_SIZE === 0) {
      if (!activeRequests.has(id)) return;
      const chunkStart = lineIdx + 1 - CHUNK_SIZE;
      postMessage({
        type: "chunk",
        id,
        startLine: chunkStart,
        spans: allSpans.slice(chunkStart, lineIdx + 1),
      } satisfies WorkerResponse);
    }
  }

  // 残余行を送信
  const remaining = lines.length % CHUNK_SIZE;
  if (remaining > 0) {
    const chunkStart = lines.length - remaining;
    postMessage({
      type: "chunk",
      id,
      startLine: chunkStart,
      spans: allSpans.slice(chunkStart),
    } satisfies WorkerResponse);
  }

  if (activeRequests.has(id)) {
    postMessage({ type: "done", id } satisfies WorkerResponse);
  }
}

// メッセージハンドラ
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type, id, lines, extension } = event.data;

  if (type === "cancel") {
    activeRequests.delete(id);
    return;
  }

  if (type === "tokenize" && lines && extension !== undefined) {
    activeRequests.add(id);
    tokenizeLines(id, lines, extension).catch((err) => {
      postMessage({
        type: "error",
        id,
        message: String(err),
      } satisfies WorkerResponse);
    });
  }
};
