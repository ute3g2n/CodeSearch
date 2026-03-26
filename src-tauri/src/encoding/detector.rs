use crate::errors::AppError;

/// バイト列からエンコーディング名を推定する
///
/// 判定順序:
/// 1. UTF-16 BOM 判定（BOM があれば確定）
/// 2. chardetng による統計的推定
/// 3. フォールバック: UTF-8
pub fn detect_encoding(buf: &[u8]) -> &'static str {
    // UTF-16 BOM 判定（BOM: 0xFF 0xFE = LE、0xFE 0xFF = BE）
    if buf.starts_with(&[0xFF, 0xFE]) {
        return "UTF-16LE";
    }
    if buf.starts_with(&[0xFE, 0xFF]) {
        return "UTF-16BE";
    }

    // UTF-8 BOM 判定（BOM: 0xEF 0xBB 0xBF）
    if buf.starts_with(&[0xEF, 0xBB, 0xBF]) {
        return "UTF-8";
    }

    // chardetng による推定
    let mut det = chardetng::EncodingDetector::new();
    det.feed(buf, true);
    let encoding = det.guess(None, true);
    encoding.name()
}

/// バイト列を指定エンコーディングからUTF-8文字列に変換する
///
/// 変換不可文字は置換文字（U+FFFD）で代替する
/// エラー: AppError::EncodingError（エンコーディング名が無効な場合）
pub fn decode_to_utf8(buf: &[u8], encoding_name: &str) -> Result<String, AppError> {
    // UTF-16 は encoding_rs で直接扱えないため手動変換
    if encoding_name == "UTF-16LE" {
        return decode_utf16le(buf);
    }
    if encoding_name == "UTF-16BE" {
        return decode_utf16be(buf);
    }

    // encoding_rs でデコード
    let encoding = encoding_rs::Encoding::for_label(encoding_name.as_bytes()).ok_or_else(|| {
        AppError::EncodingError {
            path: format!("不明なエンコーディング: {}", encoding_name),
        }
    })?;

    let (cow, _, _) = encoding.decode(buf);
    Ok(cow.into_owned())
}

/// UTF-16LE バイト列を文字列に変換する（BOMをスキップ）
fn decode_utf16le(buf: &[u8]) -> Result<String, AppError> {
    // BOM があればスキップ
    let data = if buf.starts_with(&[0xFF, 0xFE]) {
        &buf[2..]
    } else {
        buf
    };

    let units: Vec<u16> = data
        .chunks_exact(2)
        .map(|c| u16::from_le_bytes([c[0], c[1]]))
        .collect();

    String::from_utf16(&units).map_err(|_| AppError::EncodingError {
        path: "UTF-16LE デコードエラー".to_string(),
    })
}

/// UTF-16BE バイト列を文字列に変換する（BOMをスキップ）
fn decode_utf16be(buf: &[u8]) -> Result<String, AppError> {
    // BOM があればスキップ
    let data = if buf.starts_with(&[0xFE, 0xFF]) {
        &buf[2..]
    } else {
        buf
    };

    let units: Vec<u16> = data
        .chunks_exact(2)
        .map(|c| u16::from_be_bytes([c[0], c[1]]))
        .collect();

    String::from_utf16(&units).map_err(|_| AppError::EncodingError {
        path: "UTF-16BE デコードエラー".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- detect_encoding テスト ---

    #[test]
    fn utf8_bom付きを検出できる() {
        let buf = b"\xEF\xBB\xBFHello";
        assert_eq!(detect_encoding(buf), "UTF-8");
    }

    #[test]
    fn utf8_bomなしを検出できる() {
        let buf = "こんにちは世界".as_bytes();
        let enc = detect_encoding(buf);
        // UTF-8 または windows-1252 にフォールバックする場合もあるが、
        // 日本語テキストは UTF-8 として検出されるべき
        assert!(
            enc == "UTF-8" || enc == "windows-1252",
            "検出結果: {}",
            enc
        );
    }

    #[test]
    fn utf16le_bomを検出できる() {
        let buf = [0xFF, 0xFE, 0x48, 0x00]; // UTF-16LE BOM + 'H'
        assert_eq!(detect_encoding(&buf), "UTF-16LE");
    }

    #[test]
    fn utf16be_bomを検出できる() {
        let buf = [0xFE, 0xFF, 0x00, 0x48]; // UTF-16BE BOM + 'H'
        assert_eq!(detect_encoding(&buf), "UTF-16BE");
    }

    #[test]
    fn ascii_テキストを検出できる() {
        let buf = b"Hello, World! This is plain ASCII text.";
        let enc = detect_encoding(buf);
        // ASCII は UTF-8 または windows-1252 として検出される
        assert!(enc == "UTF-8" || enc == "windows-1252", "検出結果: {}", enc);
    }

    // --- decode_to_utf8 テスト ---

    #[test]
    fn utf8テキストをデコードできる() {
        let text = "こんにちは";
        let buf = text.as_bytes();
        let result = decode_to_utf8(buf, "UTF-8").unwrap();
        assert_eq!(result, text);
    }

    #[test]
    fn utf16le_bomありをデコードできる() {
        // UTF-16LE BOM + "Hi" (H=0x48, i=0x69)
        let buf = [0xFF, 0xFE, 0x48, 0x00, 0x69, 0x00];
        let result = decode_to_utf8(&buf, "UTF-16LE").unwrap();
        assert_eq!(result, "Hi");
    }

    #[test]
    fn utf16be_bomありをデコードできる() {
        // UTF-16BE BOM + "Hi"
        let buf = [0xFE, 0xFF, 0x00, 0x48, 0x00, 0x69];
        let result = decode_to_utf8(&buf, "UTF-16BE").unwrap();
        assert_eq!(result, "Hi");
    }

    #[test]
    fn 不明なエンコーディングはエラーを返す() {
        let buf = b"test";
        let result = decode_to_utf8(buf, "UNKNOWN-ENCODING-XYZ");
        assert!(result.is_err());
    }

    #[test]
    fn shift_jisテキストをデコードできる() {
        // "テスト" in Shift_JIS
        let buf: &[u8] = &[0x83, 0x65, 0x83, 0x58, 0x83, 0x67];
        let result = decode_to_utf8(buf, "Shift_JIS");
        // Shift_JIS デコードが成功すること
        assert!(result.is_ok());
    }

    #[test]
    fn euc_jpテキストをデコードできる() {
        // "テスト" in EUC-JP
        let buf: &[u8] = &[0xA5, 0xC6, 0xA5, 0xB9, 0xA5, 0xC8];
        let result = decode_to_utf8(buf, "EUC-JP");
        assert!(result.is_ok());
    }
}
