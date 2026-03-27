// BookmarkStore
// ブックマークの一覧管理・CRUD・ファイル別フィルタリングを担う
import { create } from "zustand";
import type { Bookmark } from "../ipc/types";
import {
  addBookmark as ipcAddBookmark,
  removeBookmark as ipcRemoveBookmark,
  getBookmarks,
  clearBookmarksByColor,
} from "../ipc/commands";

interface BookmarkState {
  /** ワークスペース内の全ブックマーク */
  bookmarks: Bookmark[];
  /** ブックマーク追加時に使用する色インデックス（0〜14） */
  selectedColorIndex: number;

  /** ワークスペースのブックマーク一覧を読み込む */
  loadBookmarks: (workspaceId: string) => Promise<void>;
  /** ブックマークを追加する */
  addBookmark: (
    workspaceId: string,
    filePath: string,
    lineNumber: number,
    previewText?: string
  ) => Promise<void>;
  /** 指定IDのブックマークを削除する */
  removeBookmark: (id: number) => Promise<void>;
  /** 指定色のブックマークを全削除する */
  clearByColor: (workspaceId: string, colorIndex: number) => Promise<void>;
  /** 選択中の色インデックスを変更する */
  setSelectedColor: (index: number) => void;
  /** 指定ファイルのブックマーク一覧を返す */
  getBookmarksForFile: (filePath: string) => Bookmark[];
  /** 指定ファイル・行のブックマークを返す（存在しない場合は undefined） */
  getBookmarkAtLine: (filePath: string, lineNumber: number) => Bookmark | undefined;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  selectedColorIndex: 0,

  loadBookmarks: async (workspaceId) => {
    const bookmarks = await getBookmarks(workspaceId);
    set({ bookmarks });
  },

  addBookmark: async (workspaceId, filePath, lineNumber, previewText) => {
    const { selectedColorIndex } = get();
    const newBookmark = await ipcAddBookmark(
      workspaceId,
      filePath,
      lineNumber,
      selectedColorIndex,
      previewText
    );
    set((s) => ({
      // 既存の同一行エントリを置換して重複を防ぐ
      bookmarks: [
        ...s.bookmarks.filter(
          (b) => !(b.filePath === filePath && b.lineNumber === lineNumber)
        ),
        newBookmark,
      ],
    }));
  },

  removeBookmark: async (id) => {
    await ipcRemoveBookmark(id);
    set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) }));
  },

  clearByColor: async (workspaceId, colorIndex) => {
    await clearBookmarksByColor(workspaceId, colorIndex);
    set((s) => ({
      bookmarks: s.bookmarks.filter((b) => b.colorIndex !== colorIndex),
    }));
  },

  setSelectedColor: (index) => set({ selectedColorIndex: index }),

  getBookmarksForFile: (filePath) =>
    get().bookmarks.filter((b) => b.filePath === filePath),

  getBookmarkAtLine: (filePath, lineNumber) =>
    get().bookmarks.find(
      (b) => b.filePath === filePath && b.lineNumber === lineNumber
    ),
}));
