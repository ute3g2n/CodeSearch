// 通知ストア（Zustand）
// トースト通知の追加・更新・削除・自動消去を管理する
// 基本設計書セクション4.2.7 に対応
import { create } from "zustand";

// 通知の種別
export type NotificationKind =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "progress";

// 通知エンティティ
export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  message?: string;
  // 0-100（progress 種別のみ使用）
  progress?: number;
  // 指定ミリ秒後に自動削除（undefined = 手動のみ）
  autoCloseMs?: number;
  // アクションボタン（「再試行」など）
  action?: {
    label: string;
    onClick: () => void;
  };
}

// 通知ストアの状態
interface NotificationState {
  notifications: Notification[];
  // 新規通知を追加して ID を返す
  add: (n: Omit<Notification, "id">) => string;
  // 指定IDの通知を部分更新する
  update: (id: string, patch: Partial<Omit<Notification, "id">>) => void;
  // 指定IDの通知を削除する
  remove: (id: string) => void;
  // 全通知をクリアする
  clear: () => void;
}

// 自動削除タイマーの管理（ID → タイマーID）
const autoCloseTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  add: (n) => {
    const id = crypto.randomUUID();
    const notification: Notification = { ...n, id };

    set((s) => ({
      notifications: [...s.notifications, notification],
    }));

    // autoCloseMs が指定されている場合はタイマーを設定
    if (n.autoCloseMs !== undefined && n.autoCloseMs > 0) {
      const timer = setTimeout(() => {
        get().remove(id);
        autoCloseTimers.delete(id);
      }, n.autoCloseMs);
      autoCloseTimers.set(id, timer);
    }

    return id;
  },

  update: (id, patch) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, ...patch } : n
      ),
    }));
  },

  remove: (id) => {
    // タイマーが残っていればキャンセル
    const timer = autoCloseTimers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      autoCloseTimers.delete(id);
    }

    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    }));
  },

  clear: () => {
    // 全タイマーをキャンセル
    for (const [id, timer] of autoCloseTimers) {
      clearTimeout(timer);
      autoCloseTimers.delete(id);
    }
    set({ notifications: [] });
  },
}));
