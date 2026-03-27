// i18n モジュール
// t() 関数で翻訳キーを日英テキストに変換する

import jaMessages from "./ja.json";
import enMessages from "./en.json";

type Messages = Record<string, unknown>;

/** サポートする言語コード */
export type Language = "ja" | "en";

const messages: Record<Language, Messages> = {
  ja: jaMessages as Messages,
  en: enMessages as Messages,
};

/** 現在の言語（モジュールレベルで保持） */
let currentLanguage: Language = "ja";

/** 言語を切り替える */
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

/** 現在の言語コードを返す */
export function getCurrentLanguage(): Language {
  return currentLanguage;
}

/**
 * ドット区切りキーで翻訳テキストを返す
 *
 * キーが存在しない場合はキー自体を返す
 * 例: t("search.placeholder") → "検索キーワードを入力..."
 */
export function t(key: string): string {
  const parts = key.split(".");
  let current: unknown = messages[currentLanguage];

  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current === "string") {
    return current;
  }
  return key;
}
