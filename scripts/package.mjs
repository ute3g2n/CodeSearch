/**
 * CodeSearch リリースパッケージ作成スクリプト
 *
 * 使い方:
 *   node scripts/package.mjs [version]
 *
 * 例:
 *   node scripts/package.mjs 0.1.0
 *
 * 出力:
 *   dist-package/
 *     codesearch.exe         (Tauri ビルド成果物)
 *   release/
 *     codesearch-<version>-windows-x86_64.zip
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, writeFileSync, createWriteStream, readdirSync, statSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// バージョンを引数または package.json から取得
const args = process.argv.slice(2);
const pkgJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
const VERSION = args[0] || pkgJson.version || '0.1.0';

const DIST_PACKAGE_DIR = join(ROOT, 'dist-package');
const RELEASE_DIR = join(ROOT, 'release');
const ARCHIVE_NAME = `codesearch-${VERSION}-windows-x86_64.zip`;
const ARCHIVE_PATH = join(RELEASE_DIR, ARCHIVE_NAME);

console.log('='.repeat(60));
console.log(`  CodeSearch パッケージ作成 v${VERSION}`);
console.log('='.repeat(60));

// リリースディレクトリを作成
mkdirSync(RELEASE_DIR, { recursive: true });
mkdirSync(DIST_PACKAGE_DIR, { recursive: true });

// Tauri リリースビルドが存在するか確認
const tauriReleaseBin = join(ROOT, 'src-tauri', 'target', 'release', 'codesearch.exe');
if (!existsSync(tauriReleaseBin)) {
  console.error('\nERROR: リリースビルドが見つかりません。');
  console.error('先に以下のコマンドを実行してください:');
  console.error('  npm run tauri build');
  process.exit(1);
}

// dist-package に exe をコピー
console.log('\n[1/3] exe をコピー中...');
const destExe = join(DIST_PACKAGE_DIR, 'codesearch.exe');
cpSync(tauriReleaseBin, destExe);
console.log(`  → ${destExe}`);

// THIRD_PARTY_LICENSES と README.md をコピー
console.log('\n[2/3] ドキュメントをコピー中...');
const filesToBundle = ['THIRD_PARTY_LICENSES', 'README.md'];
for (const file of filesToBundle) {
  const src = join(ROOT, file);
  if (existsSync(src)) {
    cpSync(src, join(DIST_PACKAGE_DIR, file));
    console.log(`  → ${file}`);
  } else {
    console.warn(`  WARNING: ${file} が見つかりません`);
  }
}

// zip アーカイブを作成
console.log(`\n[3/3] zip アーカイブ作成中: ${ARCHIVE_NAME}`);
try {
  // Windows の PowerShell を使って zip を作成
  const psCommand = [
    `Compress-Archive`,
    `-Path "${DIST_PACKAGE_DIR}\\*"`,
    `-DestinationPath "${ARCHIVE_PATH}"`,
    `-Force`,
  ].join(' ');
  execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
  console.log(`  → ${ARCHIVE_PATH}`);
} catch (err) {
  console.error('  zip 作成失敗:', err.message);
  process.exit(1);
}

// サイズを表示
const stats = statSync(ARCHIVE_PATH);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
console.log(`\n完了: ${ARCHIVE_NAME} (${sizeMB} MB)`);
console.log('='.repeat(60));
