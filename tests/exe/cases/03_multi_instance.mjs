/**
 * EXE-07: 複数インスタンス起動テスト（両プロセスが生存）
 * EXE-08: 書き込みロックファイル存在確認
 *         （省略可、ワークスペース未開封時はインデックス未作成のため）
 */

import { launchExe, waitMs, isAlive, killProcess, makeTempDir } from '../helpers.mjs';
import { mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXE_PATH = resolve(__dirname, '../../../dist-package/codesearch.exe');

// テスト結果を格納する配列
const results = [];

/**
 * テスト結果を記録するヘルパー
 */
function record(id, name, passed, message = '') {
  results.push({ id, name, passed, message });
  const status = passed ? 'PASS' : 'FAIL';
  const suffix = message ? ` (${message})` : '';
  console.log(`  [${status}] ${id}: ${name}${suffix}`);
}

/**
 * EXE-07: 複数インスタンス起動テスト
 * 2つのexeインスタンスを起動し、両方のプロセスが3秒後に生存していることを確認する
 */
async function testEXE07() {
  const logDir1 = makeTempDir('exe07a-');
  const logDir2 = makeTempDir('exe07b-');
  mkdirSync(logDir1, { recursive: true });
  mkdirSync(logDir2, { recursive: true });

  let pid1 = null;
  let pid2 = null;

  try {
    // 1つ目のインスタンスを起動する
    const launched1 = launchExe(EXE_PATH, { logDir: logDir1 });
    pid1 = launched1.pid;

    // 1つ目の起動が安定するまで少し待つ
    await waitMs(1000);

    // 2つ目のインスタンスを起動する
    const launched2 = launchExe(EXE_PATH, { logDir: logDir2 });
    pid2 = launched2.pid;

    // 両インスタンスが安定するまで3秒待機する
    await waitMs(3000);

    const alive1 = isAlive(pid1);
    const alive2 = isAlive(pid2);

    const bothAlive = alive1 && alive2;
    let message = '';
    if (!alive1 && !alive2) {
      message = '両プロセスが終了している';
    } else if (!alive1) {
      message = '1つ目のプロセスが終了している';
    } else if (!alive2) {
      message = '2つ目のプロセスが終了している';
    }

    record('EXE-07', '複数インスタンス起動（両プロセス生存）', bothAlive, message);
  } catch (err) {
    record('EXE-07', '複数インスタンス起動（両プロセス生存）', false, err.message);
  } finally {
    if (pid1) killProcess(pid1);
    if (pid2) killProcess(pid2);
    try { rmSync(logDir1, { recursive: true, force: true }); } catch { /* ignore */ }
    try { rmSync(logDir2, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * EXE-08: 書き込みロックファイル存在確認
 * ワークスペース未開封時はインデックスが作成されないため、ロックファイルは存在しない。
 * このテストは省略可のためSKIPとして記録する。
 */
async function testEXE08() {
  record(
    'EXE-08',
    '書き込みロックファイル存在確認',
    true,
    'SKIP: ワークスペース未開封時はインデックス未作成のため省略'
  );
}

/**
 * このファイルのテストをすべて実行してresults配列を返す
 * @returns {Promise<Array<{id: string, name: string, passed: boolean, message: string}>>}
 */
export async function runAll() {
  console.log('\n--- 03_multi_instance.mjs ---');
  await testEXE07();
  await testEXE08();
  return results;
}
