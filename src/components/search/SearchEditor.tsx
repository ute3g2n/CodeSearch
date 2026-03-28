// 検索エディタコンポーネント
// タブ内検索ウインドウ（search-editor タブの内容）
// 独自の検索状態を持ち、「エディターで開く」で PlainTextView に結果テキストを送れる
import React, { useState, useCallback, useEffect } from "react";
import SearchInput from "./SearchInput";
import SearchResultList from "./SearchResultList";
import { useEditorStore } from "../../stores/editor";
import { searchFulltext } from "../../ipc/commands";
import type { SearchOptions, SearchResult } from "../../ipc/types";

interface SearchEditorProps {
  // 初期クエリ（サイドバーからの引き継ぎ）
  initialQuery?: string;
}

// 検索結果テキストをプレーンテキスト形式に変換する
function resultToPlainText(result: SearchResult, query: string): string {
  const lines: string[] = [
    `検索クエリ: "${query}"`,
    `${result.totalMatches} 件のマッチ（${result.groups.length} ファイル）`,
    `検索時間: ${result.elapsedMs}ms`,
    "",
  ];

  for (const group of result.groups) {
    lines.push(`--- ${group.relativePath} ---`);
    for (const match of group.matches) {
      lines.push(`  ${String(match.lineNumber).padStart(5)}: ${match.lineContent}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// 検索エディタ本体
const SearchEditor: React.FC<SearchEditorProps> = ({
  initialQuery = "",
}) => {
  const { openFile, openPlainText } = useEditorStore();

  const [query, setQuery] = useState(initialQuery);
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    isRegex: false,
    includeGlob: null,
    excludeGlob: null,
    maxResults: null,
  });
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeValue, setIncludeValue] = useState("");
  const [excludeValue, setExcludeValue] = useState("");

  // initialQuery が変わったらクエリを更新する
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // 検索を実行する
  const executeSearch = useCallback(async () => {
    if (!query.trim()) {
      setResult(null);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const res = await searchFulltext(query, options);
      setResult(res);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "検索に失敗しました";
      setError(msg);
      setResult(null);
    } finally {
      setIsSearching(false);
    }
  }, [query, options]);

  // マッチ行クリック: ファイルを開く
  const handleMatchClick = useCallback(
    (filePath: string, lineNumber: number) => {
      openFile(filePath, { lineNumber });
    },
    [openFile]
  );

  // 「エディターで開く」: 結果テキストを PlainTextView として開く
  const handleOpenInEditor = useCallback(() => {
    if (!result) return;
    const text = resultToPlainText(result, query);
    openPlainText(`検索結果: ${query}`, text);
  }, [result, query, openPlainText]);

  const setOptionField = (field: Partial<SearchOptions>) => {
    setOptions((prev) => ({ ...prev, ...field }));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--color-editor-bg, #1e1e1e)",
        color: "var(--color-editor-fg, #d4d4d4)",
      }}
    >
      {/* 検索バー */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid var(--color-border, #3c3c3c)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          onSubmit={executeSearch}
          placeholder="検索 (Enter で実行)"
          caseSensitive={options.caseSensitive}
          wholeWord={options.wholeWord}
          isRegex={options.isRegex}
          onToggleCaseSensitive={() =>
            setOptionField({ caseSensitive: !options.caseSensitive })
          }
          onToggleWholeWord={() =>
            setOptionField({ wholeWord: !options.wholeWord })
          }
          onToggleRegex={() =>
            setOptionField({ isRegex: !options.isRegex })
          }
          autoFocus
        />

        {/* ファイルフィルタ */}
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={includeValue}
            onChange={(e) => {
              setIncludeValue(e.target.value);
              setOptionField({ includeGlob: e.target.value.trim() || null });
            }}
            placeholder="含めるファイル (例: *.rs)"
            style={filterInputStyle}
          />
          <input
            type="text"
            value={excludeValue}
            onChange={(e) => {
              setExcludeValue(e.target.value);
              setOptionField({ excludeGlob: e.target.value.trim() || null });
            }}
            placeholder="除外するファイル (例: *.test.ts)"
            style={filterInputStyle}
          />
        </div>

        {/* 操作ボタン */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={executeSearch}
            disabled={isSearching || !query.trim()}
            style={primaryButtonStyle}
          >
            {isSearching ? "検索中..." : "検索"}
          </button>
          {result && (
            <button data-testid="open-in-editor-btn" onClick={handleOpenInEditor} style={secondaryButtonStyle}>
              エディターで開く
            </button>
          )}
        </div>
      </div>

      {/* 結果サマリー */}
      {result && (
        <div style={summaryStyle}>
          {result.totalMatches.toLocaleString()} 件 （{result.groups.length} ファイル）
          {result.elapsedMs > 0 && ` · ${result.elapsedMs}ms`}
        </div>
      )}

      {/* エラー */}
      {error && (
        <div style={errorStyle}>{error}</div>
      )}

      {/* 結果リスト */}
      {result && !isSearching && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <SearchResultList groups={result.groups} onMatchClick={handleMatchClick} />
        </div>
      )}

      {/* 未検索の初期状態 */}
      {!result && !isSearching && !error && (
        <div style={placeholderStyle}>
          検索クエリを入力して Enter を押してください
        </div>
      )}
    </div>
  );
};

// スタイル定数

const filterInputStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--color-input-bg, #3c3c3c)",
  border: "1px solid var(--color-input-border, #555555)",
  borderRadius: "3px",
  color: "var(--color-input-fg, #cccccc)",
  fontSize: "12px",
  padding: "3px 6px",
  outline: "none",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "var(--color-accent, #007acc)",
  border: "none",
  borderRadius: "3px",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "12px",
  padding: "4px 12px",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--color-border, #3c3c3c)",
  borderRadius: "3px",
  color: "var(--color-editor-fg, #d4d4d4)",
  cursor: "pointer",
  fontSize: "12px",
  padding: "4px 12px",
};

const summaryStyle: React.CSSProperties = {
  padding: "4px 12px",
  fontSize: "11px",
  color: "var(--color-editor-fg, #d4d4d4)",
  opacity: 0.6,
  borderBottom: "1px solid var(--color-border, #3c3c3c)",
};

const errorStyle: React.CSSProperties = {
  margin: "8px 12px",
  padding: "8px",
  fontSize: "12px",
  color: "#f48771",
  background: "rgba(244,135,113,0.1)",
  borderRadius: "3px",
};

const placeholderStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  color: "var(--color-editor-fg, #d4d4d4)",
  opacity: 0.4,
};

export default SearchEditor;
