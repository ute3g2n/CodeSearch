/// 日本語/英数字混在テキスト向けカスタムトークナイザ
///
/// lindera IPADIC は依存関係が複雑なため、Unicode 文字境界ベースの
/// シンプルな実装を採用する:
///   - ASCII英数字: スペース・記号境界で分割、小文字化
///   - CJK文字（U+3000-U+9FFF等）: 1文字ずつ分割（uni-gram）
///
/// これにより日本語の部分一致検索が機能する。

use tantivy::tokenizer::{Token, TokenStream, Tokenizer};

/// トークナイザ登録名（スキーマ側で参照する）
pub const JA_TOKENIZER_NAME: &str = "ja_tokenizer";

/// CJK Unified Ideographs + Hiragana + Katakana + CJK Extension A
fn is_cjk(c: char) -> bool {
    matches!(c,
        '\u{3000}'..='\u{303F}'  // CJK記号・句読点
        | '\u{3040}'..='\u{309F}'  // Hiragana
        | '\u{30A0}'..='\u{30FF}'  // Katakana
        | '\u{4E00}'..='\u{9FFF}'  // CJK Unified Ideographs
        | '\u{3400}'..='\u{4DBF}'  // CJK Extension A
        | '\u{20000}'..='\u{2A6DF}' // CJK Extension B
        | '\u{F900}'..='\u{FAFF}'  // CJK Compatibility Ideographs
        | '\u{FF00}'..='\u{FFEF}'  // 全角英数字・記号
    )
}

/// 日本語を含むテキストを uni-gram + ASCII ワード分割するトークナイザ
#[derive(Clone)]
pub struct JaTokenizer;

impl Tokenizer for JaTokenizer {
    type TokenStream<'a> = JaTokenStream<'a>;

    fn token_stream<'a>(&'a mut self, text: &'a str) -> Self::TokenStream<'a> {
        JaTokenStream {
            text,
            tokens: tokenize(text),
            offset: 0,
        }
    }
}

/// JaTokenizer のトークンストリーム
pub struct JaTokenStream<'a> {
    #[allow(dead_code)]
    text: &'a str,
    tokens: Vec<Token>,
    offset: usize,
}

impl<'a> TokenStream for JaTokenStream<'a> {
    fn advance(&mut self) -> bool {
        if self.offset < self.tokens.len() {
            self.offset += 1;
            true
        } else {
            false
        }
    }

    fn token(&self) -> &Token {
        &self.tokens[self.offset - 1]
    }

    fn token_mut(&mut self) -> &mut Token {
        &mut self.tokens[self.offset - 1]
    }
}

/// テキストをトークン列に変換する（内部実装）
fn tokenize(text: &str) -> Vec<Token> {
    let mut tokens: Vec<Token> = Vec::new();
    let lower = text.to_lowercase();
    let chars: Vec<(usize, char)> = lower.char_indices().collect();

    let mut i = 0;
    while i < chars.len() {
        let (byte_start, c) = chars[i];

        if is_cjk(c) {
            // CJK文字は1文字ずつ
            let byte_end = byte_start + c.len_utf8();
            let text_slice = &lower[byte_start..byte_end];
            if !text_slice.trim().is_empty() {
                tokens.push(Token {
                    offset_from: byte_start,
                    offset_to: byte_end,
                    position: tokens.len(),
                    text: text_slice.to_string(),
                    position_length: 1,
                });
            }
            i += 1;
        } else if c.is_alphanumeric() || c == '_' {
            // ASCII英数字・アンダースコア: 連続するものをひとまとめに
            let byte_start2 = byte_start;
            let mut j = i;
            while j < chars.len() {
                let (_, c2) = chars[j];
                if c2.is_alphanumeric() || c2 == '_' {
                    j += 1;
                } else {
                    break;
                }
            }
            let byte_end = if j < chars.len() {
                chars[j].0
            } else {
                lower.len()
            };
            let word = &lower[byte_start2..byte_end];
            if word.len() >= 1 {
                tokens.push(Token {
                    offset_from: byte_start2,
                    offset_to: byte_end,
                    position: tokens.len(),
                    text: word.to_string(),
                    position_length: 1,
                });
            }
            i = j;
        } else {
            // 区切り文字（スペース・記号）はスキップ
            i += 1;
        }
    }

    tokens
}

/// JaTokenizer を Tantivy の Registry に登録するユーティリティ
pub fn register_tokenizer(index: &tantivy::Index) {
    let tokenizer = JaTokenizer;
    index
        .tokenizers()
        .register(JA_TOKENIZER_NAME, tokenizer);
}

#[cfg(test)]
mod tests {
    use super::*;
    use tantivy::tokenizer::Tokenizer;

    #[test]
    fn ascii_テキストをトークン分割できること() {
        let mut tokenizer = JaTokenizer;
        let mut stream = tokenizer.token_stream("fn main() {}");
        let mut tokens = Vec::new();
        while stream.advance() {
            tokens.push(stream.token().text.clone());
        }
        assert!(tokens.contains(&"fn".to_string()));
        assert!(tokens.contains(&"main".to_string()));
    }

    #[test]
    fn 日本語テキストを1文字ずつ分割できること() {
        let mut tokenizer = JaTokenizer;
        let mut stream = tokenizer.token_stream("検索ツール");
        let mut tokens = Vec::new();
        while stream.advance() {
            tokens.push(stream.token().text.clone());
        }
        assert!(tokens.contains(&"検".to_string()));
        assert!(tokens.contains(&"索".to_string()));
        assert!(tokens.contains(&"ツ".to_string()));
    }

    #[test]
    fn 小文字変換が行われること() {
        let mut tokenizer = JaTokenizer;
        let mut stream = tokenizer.token_stream("Hello World");
        let mut tokens = Vec::new();
        while stream.advance() {
            tokens.push(stream.token().text.clone());
        }
        assert!(tokens.contains(&"hello".to_string()));
        assert!(tokens.contains(&"world".to_string()));
    }
}
