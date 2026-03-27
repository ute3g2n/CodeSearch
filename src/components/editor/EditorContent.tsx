import React from "react";
import { useEditorStore } from "../../stores/editor";
import CodeView from "./CodeView";
import WelcomeTab from "./WelcomeTab";
import PlainTextView from "./PlainTextView";
import SearchEditor from "../search/SearchEditor";
import type { Tab } from "../../stores/editor";

interface EditorContentProps {
  tab: Tab | null;
}

/// エディタコンテンツコンポーネント
/// タブの kind に応じて表示するコンポーネントを切り替える
///   file          → CodeView
///   search-editor → SearchEditor（スタブ）
///   plain-text    → PlainTextView
///   welcome       → WelcomeTab
const EditorContent: React.FC<EditorContentProps> = ({ tab }) => {
  const fileContentCache = useEditorStore((s) => s.fileContentCache);

  if (!tab) {
    return (
      <div
        data-testid="editor-placeholder"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          backgroundColor: "var(--color-editor-bg, #1e1e1e)",
          color: "var(--color-editor-fg, #d4d4d4)",
          opacity: 0.4,
          fontSize: "14px",
        }}
      >
        ファイルを選択してください
      </div>
    );
  }

  switch (tab.kind) {
    case "file": {
      const fileContent = tab.filePath
        ? fileContentCache.get(tab.filePath)
        : undefined;
      const ext = tab.filePath?.split(".").pop() ?? null;
      return (
        <CodeView
          content={fileContent?.content ?? null}
          extension={ext}
        />
      );
    }

    case "search-editor":
      return (
        <SearchEditor initialQuery={tab.searchQuery} />
      );

    case "plain-text":
      return (
        <PlainTextView
          content={tab.plainText ?? ""}
          title={tab.title}
        />
      );

    case "welcome":
      return <WelcomeTab />;
  }
};

export default EditorContent;
