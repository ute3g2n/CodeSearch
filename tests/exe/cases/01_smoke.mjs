/**
 * EXE-01: 起動スモークテスト
 * EXE-02: 正常終了テスト
 * EXE-03: 再起動テスト
 */

import { launchExe, waitMs, isAlive, killProcess, makeTempDir } from '../helpers.mjs';
import { mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXE_PATH = resolve(__dirname, '../../../dist-package/codesearch.exe');

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
 * EXE-01: 起動スモークテスト
 * exeを起動して3秒後にプロセスが生存していることを確認する
 */
async function testEXE01() {
  const logDir = makeTempDir('exe01-');
  mkdirSync(logDir, { recursive: true });
  let pid = null;

  try {
    const launched = launchExe(EXE_PATH, { logDir });
    pid = launched.pid;

    // 起動後3秒待機してプロセス生存を確認する
    await waitMs(3000);

    const alive = isAlive(pid);
    record('EXE-01', '起動スモークテスト', alive, alive ? '' : 'プロセスが起動直後に終了した');
  } catch (err) {
    record('EXE-01', '起動スモークテスト', false, err.message);
  } finally {
    if (pid) killProcess(pid);
    try { rmSync(logDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * EXE-02: 正常終了テスト
 * exeを起動後にtaskkillで終了させ、プロセスが消えることを確認する
 */
async function testEXE02() {
  const logDir = makeTempDir('exe02-');
  mkdirSync(logDir, { recursive: true });
  let pid = null;

  try {
    const launched = launchExe(EXE_PATH, { logDir });
    pid = launched.pid;

    // 起動を待機する
    await waitMs(3000);

    const aliveBeforeKill = isAlive(pid);
    if (!aliveBeforeKill) {
      record('EXE-02', '正常終了テスト', false, '終了前にプロセスが存在しない');
      return;
    }

    // プロセスを終了させる
    killProcess(pid);

    // 終了後1秒待機して確認する
    await waitMs(1000);

    const aliveAfterKill = isAlive(pid);
    record(
      'EXE-02',
      '正常終了テスト',
      !aliveAfterKill,
      aliveAfterKill ? 'taskkill後もプロセスが残存している' : ''
    );
    pid = null; // killProcess済みなのでfinallyで再killしない
  } catch (err) {
    record('EXE-02', '正常終了テスト', false, err.message);
  } finally {
    if (pid) killProcess(pid);
    try { rmSync(logDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * EXE-03: 再起動テスト
 * exeを起動→終了→再起動の流れでそれぞれプロセス生存を確認する
 */
async function testEXE03() {
  const logDir1 = makeTempDir('exe03a-');
  const logDir2 = makeTempDir('exe03b-');
  mkdirSync(logDir1, { recursive: true });
  mkdirSync(logDir2, { recursive: true });

  let pid1 = null;
  let pid2 = null;

  try {
    // 1回目の起動
    const launched1 = launchExe(EXE_PATH, { logDir: logDir1 });
    pid1 = launched1.pid;
    await waitMs(3000);

    const alive1 = isAlive(pid1);
    if (!alive1) {
      record('EXE-03', '再起動テスト', false, '1回目の起動でプロセスが存在しない');
      return;
    }

    // 1回目を終了する
    killProcess(pid1);
    await waitMs(1000);
    pid1 = null;

    // 2回目の起動（再起動）
    const launched2 = launchExe(EXE_PATH, { logDir: logDir2 });
    pid2 = launched2.pid;
    await waitMs(3000);

    const alive2 = isAlive(pid2);
    record('EXE-03', '再起動テスト', alive2, alive2 ? '' : '再起動後のプロセスが存在しない');
  } catch (err) {
    record('EXE-03', '再起動テスト', false, err.message);
  } finally {
    if (pid1) killProcess(pid1);
    if (pid2) killProcess(pid2);
    try { rmSync(logDir1, { recursive: true, force: true }); } catch { /* ignore */ }
    try { rmSync(logDir2, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * このファイルのテストをすべて実行してresults配列を返す
 * @returns {Promise<Array<{id: string, name: string, passed: boolean, message: string}>>}
 */
export async function runAll() {
  console.log('\n--- 01_smoke.mjs ---');
  await testEXE01();
  await testEXE02();
  await testEXE03();
  return results;
}
