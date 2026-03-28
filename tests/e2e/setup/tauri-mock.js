/**
 * Tauri v2 IPC モックスクリプト
 * Playwright の addInitScript で注入して、ブラウザ環境で Tauri API を模倣する
 *
 * @tauri-apps/api は window.__TAURI_INTERNALS__.invoke / listen を使う
 */

// デフォルト設定値
const DEFAULT_CONFIG = {
  editorFontFamily: "Consolas, 'Courier New', monospace",
  editorFontSize: 14,
  uiFontFamily: "Segoe UI, sans-serif",
  uiFontSize: 13,
  minimapEnabled: true,
  language: "ja",
  excludePatterns: [".git", "node_modules"],
  lastWorkspaceId: null,
};

// イベントハンドラーを格納するマップ（イベント名 → ハンドラーリスト）
const eventHandlers = {};
// イベントID → ハンドラー情報のマップ（unlisten 用）
let nextEventId = 1;
const eventIdMap = {};

/**
 * モックイベントを発火するグローバル関数
 * テストコードから page.evaluate(() => window.__MOCK_EMIT__("event", payload)) で呼べる
 */
window.__MOCK_EMIT__ = function (eventName, payload) {
  const handlers = eventHandlers[eventName] || [];
  handlers.forEach(function (handler) {
    handler({ event: eventName, payload: payload, id: Date.now() });
  });
};

// コマンドごとのモックレスポンス
function mockInvoke(cmd, args) {
  switch (cmd) {
    case "get_config":
      return Promise.resolve({ ...DEFAULT_CONFIG });
    case "save_config":
      // 呼ばれた設定をメモリに保存（同セッション内で get_config に反映）
      if (args && args.config) Object.assign(DEFAULT_CONFIG, args.config);
      return Promise.resolve(null);
    case "list_recent_workspaces":
      return Promise.resolve([]);
    case "open_workspace":
      return Promise.resolve({
        workspace: {
          id: "mock-ws-id",
          path: args && args.path ? args.path : "/mock/workspace",
          name: "mock-workspace",
          lastOpenedAt: new Date().toISOString(),
        },
        indexStatus: "empty",
        fileCount: 0,
        hasIndexWriteLock: true,
      });
    case "close_workspace":
      return Promise.resolve(null);
    case "select_directory":
      return Promise.resolve("/mock/selected/path");
    case "get_file_tree":
      return Promise.resolve([]);
    case "read_file":
      return Promise.resolve({
        path: (args && args.path) || "/mock/file.ts",
        content: "// mock file content\nconst x = 1;\n",
        encoding: "UTF-8",
        lineCount: 2,
        size: 36,
      });
    case "search_fulltext":
      return Promise.resolve({
        groups: [],
        totalMatches: 0,
        elapsedMs: 1,
      });
    case "build_index":
      return Promise.resolve(null);
    case "start_file_watcher":
      return Promise.resolve(null);
    case "get_index_status":
      return Promise.resolve({
        state: "idle",
        documentCount: 0,
        lastBuiltAt: null,
        errorMessage: null,
      });
    case "get_search_history":
      return Promise.resolve([]);
    case "clear_search_history":
      return Promise.resolve(null);
    case "add_bookmark":
      return Promise.resolve({
        id: 1,
        workspaceId: (args && args.workspaceId) || "mock-ws",
        filePath: (args && args.filePath) || "/mock/file.ts",
        lineNumber: (args && args.lineNumber) || 1,
        colorIndex: (args && args.colorIndex) || 0,
        previewText: (args && args.previewText) || null,
        createdAt: new Date().toISOString(),
      });
    case "remove_bookmark":
      return Promise.resolve(null);
    case "get_bookmarks":
      return Promise.resolve([]);
    case "clear_bookmarks_by_color":
      return Promise.resolve(null);
    case "reveal_in_os_explorer":
      return Promise.resolve(null);
    case "get_relative_path":
      return Promise.resolve((args && args.path) || "mock/path");
    case "search_files":
      return Promise.resolve([]);
    // Tauri v2 内部イベント登録コマンドを処理する
    case "plugin:event|listen": {
      const eventName = args && args.event;
      const handlerId = args && args.handler; // transformCallback で変換された数値ID
      const eventId = nextEventId++;
      if (eventName && handlerId !== undefined) {
        if (!eventHandlers[eventName]) eventHandlers[eventName] = [];
        // window.__TAURI_CALLBACKS__ から実際のハンドラー関数を取得して登録する
        const actualHandler = window.__TAURI_CALLBACKS__ && window.__TAURI_CALLBACKS__[handlerId];
        if (actualHandler) {
          actualHandler.__handlerId = handlerId;
          actualHandler.__eventId = eventId;
          eventHandlers[eventName].push(actualHandler);
        }
        eventIdMap[eventId] = { eventName, handlerId };
      }
      return Promise.resolve(eventId);
    }
    case "plugin:event|unlisten": {
      const eventId = args && args.eventId;
      if (eventId && eventIdMap[eventId]) {
        const { eventName, handlerId } = eventIdMap[eventId];
        if (eventHandlers[eventName]) {
          eventHandlers[eventName] = eventHandlers[eventName].filter(
            (h) => h.__handlerId !== handlerId
          );
        }
        delete eventIdMap[eventId];
      }
      return Promise.resolve(null);
    }
    case "plugin:event|emit":
    case "plugin:event|emit_to":
      return Promise.resolve(null);
    default:
      console.warn("[tauri-mock] Unknown command:", cmd, args);
      return Promise.resolve(null);
  }
}

// Tauri v2 内部オブジェクトをモックとして注入
window.__TAURI_INTERNALS__ = {
  invoke: mockInvoke,
  // listen は @tauri-apps/api が直接呼ぶ場合に対応する
  listen: function (eventName, handler, _opts) {
    if (!eventHandlers[eventName]) eventHandlers[eventName] = [];
    eventHandlers[eventName].push(handler);
    // アンリッスン関数を返す
    return Promise.resolve(function () {
      if (eventHandlers[eventName]) {
        const idx = eventHandlers[eventName].indexOf(handler);
        if (idx >= 0) eventHandlers[eventName].splice(idx, 1);
      }
    });
  },
  once: function (eventName, handler, _opts) {
    const wrapper = function (event) {
      if (eventHandlers[eventName]) {
        const idx = eventHandlers[eventName].indexOf(wrapper);
        if (idx >= 0) eventHandlers[eventName].splice(idx, 1);
      }
      handler(event);
    };
    if (!eventHandlers[eventName]) eventHandlers[eventName] = [];
    eventHandlers[eventName].push(wrapper);
    return Promise.resolve(function () {
      if (eventHandlers[eventName]) {
        const idx = eventHandlers[eventName].indexOf(wrapper);
        if (idx >= 0) eventHandlers[eventName].splice(idx, 1);
      }
    });
  },
  transformCallback: function (callback, _once) {
    // コールバックを ID に変換して登録する
    const id = nextEventId++;
    // グローバルコールバックストアに保存（Tauri 内部互換）
    if (!window.__TAURI_CALLBACKS__) window.__TAURI_CALLBACKS__ = {};
    window.__TAURI_CALLBACKS__[id] = callback;
    return id;
  },
  metadata: {
    currentWindow: { label: "main" },
    windows: [{ label: "main" }],
  },
};

// @tauri-apps/api/event の _unlisten が呼ぶ window.__TAURI_EVENT_PLUGIN_INTERNALS__ をモック
window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
  unregisterListener: function (event, eventId) {
    // イベントリスナーの登録解除（ノーオペレーション）
  },
};
