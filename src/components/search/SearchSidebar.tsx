// 検索サイドバーコンポーネント
// 3セクション構成: 検索 / ブックマーク / ハイライト
// 各セクションは開閉可能
import React, { useState } from "react";
import SearchSection from "./SearchSection";

// セクション種別
type SectionKind = "search" | "bookmark" | "highlight";

// セクションヘッダーボタン
const SectionToggle: React.FC<{
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ label, isOpen, onToggle }) => (
  <button
    onClick={onToggle}
    style={{
      display: "flex",
      alignItems: "center",
      width: "100%",
      background: "var(--color-sidebar-section-header, #3c3c3c)",
      border: "none",
      borderBottom: "1px solid var(--color-border, #3c3c3c)",
      color: "var(--color-sidebar-fg, #cccccc)",
      cursor: "pointer",
      padding: "5px 8px",
      fontSize: "11px",
      fontWeight: "bold",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      gap: "4px",
      userSelect: "none",
    }}
  >
    <span style={{ fontSize: "9px" }}>{isOpen ? "▼" : "▶"}</span>
    <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
  </button>
);

// 検索サイドバー本体
const SearchSidebar: React.FC = () => {
  const [openSections, setOpenSections] = useState<Set<SectionKind>>(
    new Set(["search"])
  );

  const toggle = (section: SectionKind) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "var(--color-sidebar-bg, #252526)",
      }}
    >
      {/* ===== 検索セクション ===== */}
      <SectionToggle
        label="検索"
        isOpen={openSections.has("search")}
        onToggle={() => toggle("search")}
      />
      {openSections.has("search") && (
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: "120px",
          }}
        >
          <SearchSection />
        </div>
      )}

      {/* ===== ブックマークセクション（スタブ） ===== */}
      <SectionToggle
        label="ブックマーク"
        isOpen={openSections.has("bookmark")}
        onToggle={() => toggle("bookmark")}
      />
      {openSections.has("bookmark") && (
        <div
          style={{
            padding: "8px",
            fontSize: "12px",
            color: "var(--color-sidebar-fg, #cccccc)",
            opacity: 0.5,
          }}
        >
          ブックマーク機能は後続フェーズで実装
        </div>
      )}

      {/* ===== ハイライトセクション（スタブ） ===== */}
      <SectionToggle
        label="ハイライト"
        isOpen={openSections.has("highlight")}
        onToggle={() => toggle("highlight")}
      />
      {openSections.has("highlight") && (
        <div
          style={{
            padding: "8px",
            fontSize: "12px",
            color: "var(--color-sidebar-fg, #cccccc)",
            opacity: 0.5,
          }}
        >
          ハイライト機能は後続フェーズで実装
        </div>
      )}
    </div>
  );
};

export default SearchSidebar;
