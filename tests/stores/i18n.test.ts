import { describe, it, expect } from "vitest";

// i18n モジュールのテスト
// t() 関数・useT() フック・言語切替を検証

import { t, setLanguage, getCurrentLanguage } from "../../src/i18n";

describe("i18n", () => {
  it("デフォルト言語（ja）でキーを翻訳できること", () => {
    setLanguage("ja");
    expect(t("search.placeholder")).toBe("検索キーワードを入力...");
  });

  it("en に切り替えると英語テキストが返ること", () => {
    setLanguage("en");
    expect(t("search.placeholder")).toBe("Enter search keyword...");
    setLanguage("ja"); // 後片付け
  });

  it("存在しないキーはキー自体を返すこと", () => {
    setLanguage("ja");
    const key = "nonexistent.key";
    expect(t(key)).toBe(key);
  });

  it("getCurrentLanguage が現在の言語を返すこと", () => {
    setLanguage("ja");
    expect(getCurrentLanguage()).toBe("ja");
    setLanguage("en");
    expect(getCurrentLanguage()).toBe("en");
    setLanguage("ja");
  });
});
