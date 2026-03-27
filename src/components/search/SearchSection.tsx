// 検索セクションコンポーネント
// 検索入力 + オプション + ファイルフィルタ + 結果表示をまとめた区画
import React, { useState } from "react";
import SearchInput from "./SearchInput";
import SearchResultList from "./SearchResultList";
import { useSearchStore } from "../../stores/search";
import { useEditorStore } from "../../stores/editor";

// ファイルフィルタ入力（include/exclude glob）
const FileFilterInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
    <label
      style={{
        fontSize: "10px",
        color: "var(--color-sidebar-fg, #cccccc)",
        opacity: 0.7,
      }}
    >
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: "var(--color-input-bg, #3c3c3c)",
        border: "1px solid var(--color-input-border, #555555)",
        borderRadius: "3px",
        color: "var(--color-input-fg, #cccccc)",
        fontSize: "12px",
        padding: "3px 6px",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
      }}
    />
  </div>
);

// 検索セクション本体
const SearchSection: React.FC = () => {
  const {
    query,
    options,
    result,
    isSearching,
    error,
    setQuery,
    setOptions,
    executeSearch,
  } = useSearchStore();

  const { openFile } = useEditorStore();

  const [showFilters, setShowFilters] = useState(false);
  const [includeValue, setIncludeValue] = useState("");
  const [excludeValue, setExcludeValue] = useState("");

  // includeGlob / excludeGlob の変更をストアに反映
  const handleIncludeChange = (value: string) => {
    setIncludeValue(value);
    setOptions({ includeGlob: value.trim() || null });
  };
  const handleExcludeChange = (value: string) => {
    setExcludeValue(value);
    setOptions({ excludeGlob: value.trim() || null });
  };

  // マッチ行クリック: ファイルを開いてカーソルを該当行へ
  const handleMatchClick = (filePath: string, lineNumber: number) => {
    openFile(filePath, { lineNumber });
  };

  const totalMatches = result?.totalMatches ?? 0;
  const fileCount = result?.groups.length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 検索入力エリア */}
      <div style={{ padding: "8px" }}>
        <SearchInput
          value={query}
          onChange={setQuery}
          onSubmit={executeSearch}
          caseSensitive={options.caseSensitive}
          wholeWord={options.wholeWord}
          isRegex={options.isRegex}
          onToggleCaseSensitive={() =>
            setOptions({ caseSensitive: !options.caseSensitive })
          }
          onToggleWholeWord={() =>
            setOptions({ wholeWord: !options.wholeWord })
          }
          onToggleRegex={() =>
            setOptions({ isRegex: !options.isRegex })
          }
          autoFocus
        />

        {/* ファイルフィルタ展開ボタン */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          style={{
            marginTop: "4px",
            background: "transparent",
            border: "none",
            color: "var(--color-sidebar-fg, #cccccc)",
            cursor: "pointer",
            fontSize: "11px",
            padding: "2px 0",
            opacity: 0.7,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>{showFilters ? "▼" : "▶"}</span>
          <span>ファイルフィルタ</span>
        </button>

        {/* ファイルフィルタ */}
        {showFilters && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
            <FileFilterInput
              label="含めるファイル"
              value={includeValue}
              onChange={handleIncludeChange}
              placeholder="例: *.ts, src/**"
            />
            <FileFilterInput
              label="除外するファイル"
              value={excludeValue}
              onChange={handleExcludeChange}
              placeholder="例: *.test.ts, node_modules"
            />
          </div>
        )}
      </div>

      {/* 結果サマリー */}
      {result && (
        <div
          style={{
            padding: "4px 8px",
            fontSize: "11px",
            color: "var(--color-sidebar-fg, #cccccc)",
            opacity: 0.7,
            borderBottom: "1px solid var(--color-border, #3c3c3c)",
          }}
        >
          {totalMatches.toLocaleString()} 件 （{fileCount} ファイル）
          {result.elapsedMs > 0 && ` · ${result.elapsedMs}ms`}
        </div>
      )}

      {/* 検索中インジケータ */}
      {isSearching && (
        <div
          style={{
            padding: "8px",
            fontSize: "12px",
            color: "var(--color-sidebar-fg, #cccccc)",
            opacity: 0.7,
          }}
        >
          検索中...
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div
          style={{
            padding: "8px",
            fontSize: "12px",
            color: "#f48771",
            background: "rgba(244,135,113,0.1)",
            margin: "4px 8px",
            borderRadius: "3px",
          }}
        >
          {error}
        </div>
      )}

      {/* 検索結果リスト */}
      {result && !isSearching && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <SearchResultList
            groups={result.groups}
            onMatchClick={handleMatchClick}
          />
        </div>
      )}
    </div>
  );
};

export default SearchSection;
