/**
 * EXE-13: 起動3秒以内テスト (T-01-13)
 * exeを起動してからdata/codesearch.dbが生成されるまでの時間を計測し、
 * 3秒以内であることを確認する
 */

import { launchExe, waitMs, killProcess, isSqliteFile, makeTempDir } from '../helpers.mjs';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { cpSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXE_PATH = resolve(__dirname, '../../../dist-package/codesearch.exe');
const DIST_PACKAGE_DIR = resolve(__dirname, '../../../dist-package');

// テスト結果を格納する配列
const results = [];

/**
 * テスト結果を記録するヘルパー
 * @param {string} id
 * @param {string} name
 * @param {boolean} passed
 * @param {string} [message]
 */
function record(id, name, passed, message = '') {
  results.push({ id, name, passed, message });
  const status = passed ? 'PASS' : 'FAIL';
  const suffix = message ? ` (${message})` : '';
  console.log(`  [${status}] ${id}: ${name}${suffix}`);
}

/**
 * EXE-13: 起動3秒以内テスト
 * 起動からdata/codesearch.dbが生成されるまでの時間を計測し、3秒以内を確認する
 * 独立した一時ディレクトリを使用してクリーンな環境で計測する
 */
async function testEXE13() {
  const tempDir = makeTempDir('exe13-perf-');
  const logDir = makeTempDir('exe13-log-');
  mkdirSync(tempDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });
  let pid = null;

  // 起動タイムアウト: 10秒（超えた場合はFAIL）
  const STARTUP_TIMEOUT_MS = 10000;
  // 合格基準: 3秒以内
  const TARGET_MS = 3000;
  // ポーリング間隔: 100ms
  const POLL_INTERVAL_MS = 100;

  try {
    // dist-package を一時ディレクトリにコピーしてクリーンな環境を作る
    cpSync(DIST_PACKAGE_DIR, tempDir, { recursive: true });

    // data/ ディレクトリを削除してDBファイルの新規作成を確実に計測する
    const dataDir = join(tempDir, 'data');
    try { rmSync(dataDir, { recursive: true, force: true }); } catch { /* ignore */ }

    const tempExePath = join(tempDir, 'codesearch.exe');
    const dbPath = join(tempDir, 'data', 'codesearch.db');

    // 起動開始時刻を記録する
    const startTime = Date.now();
    const launched = launchExe(tempExePath, { cwd: tempDir, logDir });
    pid = launched.pid;

    // data/codesearch.db が生成されるまでポーリングする
    let elapsedMs = -1;
    while (Date.now() - startTime < STARTUP_TIMEOUT_MS) {
      if (isSqliteFile(dbPath)) {
        elapsedMs = Date.now() - startTime;
        break;
      }
      await waitMs(POLL_INTERVAL_MS);
    }

    if (elapsedMs < 0) {
      record(
        'EXE-13',
        '起動3秒以内',
        false,
        `${STARTUP_TIMEOUT_MS / 1000}秒以内にcodesearch.dbが作成されなかった`
      );
    } else {
      const passed = elapsedMs <= TARGET_MS;
      record(
        'EXE-13',
        '起動3秒以内',
        passed,
        passed
          ? `起動時間: ${elapsedMs}ms (目標: ${TARGET_MS}ms以内)`
          : `起動時間: ${elapsedMs}ms (目標: ${TARGET_MS}ms以内 — タイムオーバー)`
      );
    }
  } catch (err) {
    record('EXE-13', '起動3秒以内', false, err.message);
  } finally {
    if (pid) killProcess(pid);
    // クリーンアップ（EXEが保持中のファイルがあるため少し待機する）
    await waitMs(500);
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    try { rmSync(logDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * このファイルのテストをすべて実行してresults配列を返す
 * @returns {Promise<Array<{id: string, name: string, passed: boolean, message: string}>>}
 */
export async function runAll() {
  console.log('\n--- 05_performance.mjs ---');
  await testEXE13();
  return results;
}
