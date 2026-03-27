import { describe, it, expect, beforeEach, vi } from "vitest";

// BookmarkStore のテスト
// load / add / remove / clearByColor / getBookmarksForFile / getBookmarkAtLine を検証

// Tauri IPC コマンドをモック
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { useBookmarkStore } from "../../src/stores/bookmark";
import type { Bookmark } from "../../src/ipc/types";

const mockedInvoke = vi.mocked(invoke);

function makeBookmark(id: number, filePath: string, lineNumber: number, colorIndex = 0): Bookmark {
  return {
    id,
    workspaceId: "ws1",
    filePath,
    lineNumber,
    colorIndex,
    previewText: `line ${lineNumber}`,
    createdAt: new Date().toISOString(),
  };
}

function resetStore() {
  useBookmarkStore.setState({ bookmarks: [], selectedColorIndex: 0 });
}

describe("useBookmarkStore", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  // ===== loadBookmarks =====

  it("loadBookmarks でブックマーク一覧を取得できること", async () => {
    const mockBookmarks = [
      makeBookmark(1, "/src/main.rs", 10),
      makeBookmark(2, "/src/lib.rs", 20),
    ];
    mockedInvoke.mockResolvedValueOnce(mockBookmarks);

    await useBookmarkStore.getState().loadBookmarks("ws1");

    expect(mockedInvoke).toHaveBeenCalledWith("get_bookmarks", { workspaceId: "ws1" });
    expect(useBookmarkStore.getState().bookmarks).toHaveLength(2);
  });

  // ===== addBookmark =====

  it("addBookmark でブックマークを追加できること", async () => {
    const newBookmark = makeBookmark(1, "/src/main.rs", 42, 3);
    mockedInvoke.mockResolvedValueOnce(newBookmark);

    await useBookmarkStore.getState().addBookmark("ws1", "/src/main.rs", 42, "fn main()");

    expect(mockedInvoke).toHaveBeenCalledWith("add_bookmark", {
      workspaceId: "ws1",
      filePath: "/src/main.rs",
      lineNumber: 42,
      colorIndex: 0, // selectedColorIndex の初期値
      previewText: "fn main()",
    });
    expect(useBookmarkStore.getState().bookmarks).toHaveLength(1);
  });

  // ===== removeBookmark =====

  it("removeBookmark でブックマークを削除できること", async () => {
    useBookmarkStore.setState({
      bookmarks: [makeBookmark(1, "/src/main.rs", 10)],
    });
    mockedInvoke.mockResolvedValueOnce(undefined);

    await useBookmarkStore.getState().removeBookmark(1);

    expect(mockedInvoke).toHaveBeenCalledWith("remove_bookmark", { id: 1 });
    expect(useBookmarkStore.getState().bookmarks).toHaveLength(0);
  });

  // ===== clearByColor =====

  it("clearByColor で色インデックスのブックマークを全削除できること", async () => {
    useBookmarkStore.setState({
      bookmarks: [
        makeBookmark(1, "/src/main.rs", 10, 0),
        makeBookmark(2, "/src/main.rs", 20, 1),
        makeBookmark(3, "/src/main.rs", 30, 0),
      ],
    });
    mockedInvoke.mockResolvedValueOnce(undefined);

    await useBookmarkStore.getState().clearByColor("ws1", 0);

    expect(mockedInvoke).toHaveBeenCalledWith("clear_bookmarks_by_color", {
      workspaceId: "ws1",
      colorIndex: 0,
    });
    const remaining = useBookmarkStore.getState().bookmarks;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].colorIndex).toBe(1);
  });

  // ===== getBookmarksForFile =====

  it("getBookmarksForFile でファイル別ブックマークを取得できること", () => {
    useBookmarkStore.setState({
      bookmarks: [
        makeBookmark(1, "/src/main.rs", 10),
        makeBookmark(2, "/src/lib.rs", 20),
        makeBookmark(3, "/src/main.rs", 30),
      ],
    });

    const result = useBookmarkStore.getState().getBookmarksForFile("/src/main.rs");
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.filePath === "/src/main.rs")).toBe(true);
  });

  // ===== getBookmarkAtLine =====

  it("getBookmarkAtLine で行のブックマークを取得できること", () => {
    useBookmarkStore.setState({
      bookmarks: [makeBookmark(1, "/src/main.rs", 42)],
    });

    const found = useBookmarkStore.getState().getBookmarkAtLine("/src/main.rs", 42);
    expect(found).toBeDefined();
    expect(found?.id).toBe(1);

    const notFound = useBookmarkStore.getState().getBookmarkAtLine("/src/main.rs", 99);
    expect(notFound).toBeUndefined();
  });

  // ===== setSelectedColor =====

  it("setSelectedColor で選択色が変わること", () => {
    useBookmarkStore.getState().setSelectedColor(7);
    expect(useBookmarkStore.getState().selectedColorIndex).toBe(7);
  });
});
