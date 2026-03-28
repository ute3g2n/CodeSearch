// 検索入力コンポーネント
// オプショントグル（Aa, \b, .*）付きのテキスト入力欄
import React, { useRef, useEffect } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  isRegex: boolean;
  onToggleCaseSensitive: () => void;
  onToggleWholeWord: () => void;
  onToggleRegex: () => void;
  autoFocus?: boolean;
}

// オプショントグルボタン
const ToggleButton: React.FC<{
  active: boolean;
  onClick: () => void;
  title: string;
  label: string;
  testId?: string;
}> = ({ active, onClick, title, label, testId }) => (
  <button
    data-testid={testId}
    title={title}
    aria-pressed={active}
    onClick={onClick}
    style={{
      background: active
        ? "var(--color-accent, #007acc)"
        : "transparent",
      border: "none",
      color: active ? "#ffffff" : "var(--color-sidebar-fg, #cccccc)",
      cursor: "pointer",
      padding: "2px 5px",
      borderRadius: "3px",
      fontSize: "11px",
      fontWeight: "bold",
      lineHeight: 1.4,
      opacity: active ? 1 : 0.7,
    }}
  >
    {label}
  </button>
);

// 検索入力コンポーネント本体
const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "検索",
  caseSensitive,
  wholeWord,
  isRegex,
  onToggleCaseSensitive,
  onToggleWholeWord,
  onToggleRegex,
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "var(--color-input-bg, #3c3c3c)",
        border: "1px solid var(--color-input-border, #555555)",
        borderRadius: "3px",
        padding: "2px 4px",
        gap: "2px",
      }}
    >
      <input
        ref={inputRef}
        data-testid="search-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--color-input-fg, #cccccc)",
          fontSize: "13px",
          padding: "2px 0",
          minWidth: 0,
        }}
      />
      <div style={{ display: "flex", gap: "1px", flexShrink: 0 }}>
        <ToggleButton
          active={caseSensitive}
          onClick={onToggleCaseSensitive}
          title="大文字と小文字を区別 (Alt+C)"
          label="Aa"
          testId="toggle-case-sensitive"
        />
        <ToggleButton
          active={wholeWord}
          onClick={onToggleWholeWord}
          title="単語単位で検索 (Alt+W)"
          label="\b"
          testId="toggle-whole-word"
        />
        <ToggleButton
          active={isRegex}
          onClick={onToggleRegex}
          title="正規表現を使用 (Alt+R)"
          label=".*"
          testId="toggle-regex"
        />
      </div>
    </div>
  );
};

export default SearchInput;
