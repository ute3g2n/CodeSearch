import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// NotificationStore のテスト
// add / update / remove / autoClose の動作を検証する

import { useNotificationStore } from "../../src/stores/notification";

// ストアをリセットするヘルパー
function resetStore() {
  useNotificationStore.setState({ notifications: [] });
}

describe("useNotificationStore", () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===== add =====

  it("通知を追加できること", () => {
    const id = useNotificationStore.getState().add({
      kind: "info",
      title: "テスト通知",
    });

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe(id);
    expect(notifications[0].title).toBe("テスト通知");
    expect(notifications[0].kind).toBe("info");
  });

  it("複数の通知を追加できること", () => {
    useNotificationStore.getState().add({ kind: "info", title: "通知1" });
    useNotificationStore.getState().add({ kind: "success", title: "通知2" });
    useNotificationStore.getState().add({ kind: "error", title: "通知3" });

    expect(useNotificationStore.getState().notifications).toHaveLength(3);
  });

  it("add が一意のIDを返すこと", () => {
    const id1 = useNotificationStore.getState().add({ kind: "info", title: "1" });
    const id2 = useNotificationStore.getState().add({ kind: "info", title: "2" });
    expect(id1).not.toBe(id2);
  });

  it("progress 通知を追加できること", () => {
    const id = useNotificationStore.getState().add({
      kind: "progress",
      title: "構築中",
      progress: 0,
    });

    const n = useNotificationStore.getState().notifications.find((n) => n.id === id);
    expect(n?.kind).toBe("progress");
    expect(n?.progress).toBe(0);
  });

  // ===== update =====

  it("通知を部分更新できること", () => {
    const id = useNotificationStore.getState().add({
      kind: "progress",
      title: "構築中",
      progress: 0,
    });

    useNotificationStore.getState().update(id, { progress: 50 });

    const n = useNotificationStore.getState().notifications.find((n) => n.id === id);
    expect(n?.progress).toBe(50);
    expect(n?.title).toBe("構築中"); // title は変わらない
  });

  it("存在しないIDへの update は何もしないこと", () => {
    useNotificationStore.getState().add({ kind: "info", title: "テスト" });
    useNotificationStore.getState().update("non-existent-id", { title: "変更" });

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications[0].title).toBe("テスト"); // 変更されない
  });

  // ===== remove =====

  it("指定IDの通知を削除できること", () => {
    const id = useNotificationStore.getState().add({ kind: "info", title: "削除対象" });
    useNotificationStore.getState().add({ kind: "info", title: "残す" });

    useNotificationStore.getState().remove(id);

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe("残す");
  });

  it("存在しないIDの削除は何もしないこと", () => {
    useNotificationStore.getState().add({ kind: "info", title: "テスト" });
    useNotificationStore.getState().remove("non-existent-id");

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });

  // ===== clear =====

  it("全通知をクリアできること", () => {
    useNotificationStore.getState().add({ kind: "info", title: "1" });
    useNotificationStore.getState().add({ kind: "info", title: "2" });
    useNotificationStore.getState().add({ kind: "info", title: "3" });

    useNotificationStore.getState().clear();

    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  // ===== autoClose =====

  it("autoCloseMs が設定された通知は自動削除されること", () => {
    const id = useNotificationStore.getState().add({
      kind: "success",
      title: "自動消去",
      autoCloseMs: 3000,
    });

    expect(useNotificationStore.getState().notifications).toHaveLength(1);

    vi.advanceTimersByTime(3000);

    expect(
      useNotificationStore.getState().notifications.find((n) => n.id === id)
    ).toBeUndefined();
  });

  it("autoCloseMs 前は削除されないこと", () => {
    const id = useNotificationStore.getState().add({
      kind: "success",
      title: "自動消去",
      autoCloseMs: 3000,
    });

    vi.advanceTimersByTime(2999);

    expect(
      useNotificationStore.getState().notifications.find((n) => n.id === id)
    ).toBeDefined();
  });

  it("autoCloseMs なしの通知は自動削除されないこと", () => {
    const id = useNotificationStore.getState().add({
      kind: "error",
      title: "手動削除のみ",
      // autoCloseMs なし
    });

    vi.advanceTimersByTime(10000);

    expect(
      useNotificationStore.getState().notifications.find((n) => n.id === id)
    ).toBeDefined();
  });

  // ===== アクション付き通知 =====

  it("action 付き通知を追加できること", () => {
    const onRetry = vi.fn();
    const id = useNotificationStore.getState().add({
      kind: "error",
      title: "インデックスエラー",
      message: "再試行してください",
      action: { label: "再試行", onClick: onRetry },
    });

    const n = useNotificationStore.getState().notifications.find((n) => n.id === id);
    expect(n?.action?.label).toBe("再試行");

    n?.action?.onClick();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
