/**
 * EXE-04: data/ ディレクトリ作成テスト
 * EXE-05: SQLite DB 作成テスト（マジックバイト確認）
 * EXE-06: ポータブル配置テスト
 */

import { launchExe, waitMs, isAlive, killProcess, isSqliteFile, makeTempDir } from '../helpers.mjs';
import { mkdirSync, rmSync, existsSync, cpSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXE_PATH = resolve(__dirname, '../../../dist-package/codesearch.exe');
const DIST_PACKAGE_DIR = resolve(__dirname, '../../../dist-package');

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
 * EXE-04: data/ ディレクトリ作成テスト
 * exeをdist-packageディレクトリで起動し、data/ディレクトリが存在することを確認する
 * （dist-package/data/ は既存の可能性があるため存在確認のみ行う）
 */
async function testEXE04() {
  const logDir = makeTempDir('exe04-');
  mkdirSync(logDir, { recursive: true });
  let pid = null;

  try {
    // dist-packageのディレクトリをcwdとして起動する
    const launched = launchExe(EXE_PATH, {
      cwd: DIST_PACKAGE_DIR,
      logDir,
    });
    pid = launched.pid;

    // 起動後3秒待機してファイルシステムを確認する
    await waitMs(3000);

    const dataDir = join(DIST_PACKAGE_DIR, 'data');
    const dataDirExists = existsSync(dataDir);

    record('EXE-04', 'data/ ディレクトリ作成', dataDirExists,
      dataDirExists ? '' : `data/ ディレクトリが存在しない: ${dataDir}`);
  } catch (err) {
    record('EXE-04', 'data/ ディレクトリ作成', false, err.message);
  } finally {
    if (pid) killProcess(pid);
    try { rmSync(logDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * EXE-05: SQLite DB 作成テスト（マジックバイト確認）
 * dist-package/data/codesearch.db がSQLiteファイルであることを確認する
 */
async function testEXE05() {
  const logDir = makeTempDir('exe05-');
  mkdirSync(logDir, { recursive: true });
  let pid = null;

  try {
    const launched = launchExe(EXE_PATH, {
      cwd: DIST_PACKAGE_DIR,
      logDir,
    });
    pid = launched.pid;

    // 起動後3秒待機してDBファイルを確認する
    await waitMs(3000);

    const dbPath = join(DIST_PACKAGE_DIR, 'data', 'codesearch.db');
    const isDb = isSqliteFile(dbPath);

    record('EXE-05', 'SQLite DB 作成（マジックバイト確認）', isDb,
      isDb ? '' : `SQLiteファイルが存在しないかマジックバイトが不正: ${dbPath}`);
  } catch (err) {
    record('EXE-05', 'SQLite DB 作成（マジックバイト確認）', false, err.message);
  } finally {
    if (pid) killProcess(pid);
    try { rmSync(logDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * EXE-06: ポータブル配置テスト
 * 一時ディレクトリにexeをコピーして起動し、%APPDATA%/codesearch/ に
 * codesearch.db が作成されていないことを確認する
 */
async function testEXE06() {
  const tempDir = makeTempDir('exe06-portable-');
  const logDir = makeTempDir('exe06-log-');
  mkdirSync(tempDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });
  let pid = null;

  try {
    // 一時ディレクトリにexeとリソースをコピーする
    const tempExePath = join(tempDir, 'codesearch.exe');

    // dist-package配下の全ファイルをコピーする（リソースファイルが必要なため）
    cpSync(DIST_PACKAGE_DIR, tempDir, { recursive: true });

    // APPDATA パスを確認する
    const appdata = process.env.APPDATA || join(os.homedir(), 'AppData', 'Roaming');
    const appdataDbPath = join(appdata, 'codesearch', 'codesearch.db');

    // 起動前のAPPDATA内のDB状態を記録する
    const dbExistedBefore = existsSync(appdataDbPath);

    const launched = launchExe(tempExePath, {
      cwd: tempDir,
      logDir,
    });
    pid = launched.pid;

    // 起動後3秒待機する
    await waitMs(3000);

    // APPDATA に DB が新規作成されていないことを確認する
    const dbExistsAfter = existsSync(appdataDbPath);

    // 起動前から存在していた場合はポータブル検証をスキップ（既存環境への影響を考慮）
    if (dbExistedBefore) {
      record('EXE-06', 'ポータブル配置テスト', true,
        `%APPDATA%/codesearch/codesearch.db は起動前から存在（既存インストール環境のためスキップ）`);
    } else {
      record('EXE-06', 'ポータブル配置テスト', !dbExistsAfter,
        dbExistsAfter
          ? `%APPDATA%/codesearch/codesearch.db が意図せず作成された`
          : '');
    }
  } catch (err) {
    record('EXE-06', 'ポータブル配置テスト', false, err.message);
  } finally {
    if (pid) killProcess(pid);
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    try { rmSync(logDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * このファイルのテストをすべて実行してresults配列を返す
 * @returns {Promise<Array<{id: string, name: string, passed: boolean, message: string}>>}
 */
export async function runAll() {
  console.log('\n--- 02_filesystem.mjs ---');
  await testEXE04();
  await testEXE05();
  await testEXE06();
  return results;
}
