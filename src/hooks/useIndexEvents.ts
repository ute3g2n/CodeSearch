// インデックス関連イベントを listen して NotificationStore に通知するフック
// App.tsx でマウント時に1回だけ登録する
import { useEffect, useRef } from "react";
import {
  onIndexProgress,
  onIndexReady,
  onIndexError,
  onWatcherError,
  onIndexUpdated,
  onIndexLockFailed,
} from "../ipc/events";
import { useNotificationStore } from "../stores/notification";
import { useSearchStore } from "../stores/search";

export function useIndexEvents(): void {
  const { add, update, remove } = useNotificationStore();
  const { loadIndexStatus } = useSearchStore();

  // 進捗トーストIDを ref で管理（コンポーネントをまたいで参照するため）
  const progressToastId = useRef<string | null>(null);

  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    // index://progress — 進捗バー付きトーストを更新する
    onIndexProgress((payload) => {
      const pct = payload.total > 0
        ? Math.round((payload.current / payload.total) * 100)
        : 0;

      if (progressToastId.current === null) {
        // 初回: 新規トーストを追加
        const id = add({
          kind: "progress",
          title: "インデックス構築中",
          message: payload.message,
          progress: pct,
        });
        progressToastId.current = id;
      } else {
        // 2回目以降: 進捗を更新
        update(progressToastId.current, {
          message: payload.message,
          progress: pct,
        });
      }
    }).then((fn) => unlisteners.push(fn));

    // index://ready — 完了通知
    onIndexReady((payload) => {
      // 進捗トーストを削除
      if (progressToastId.current) {
        remove(progressToastId.current);
        progressToastId.current = null;
      }
      add({
        kind: "success",
        title: "インデックス構築完了",
        message: `${payload.docCount.toLocaleString()} ドキュメント（${payload.elapsedMs}ms）`,
        autoCloseMs: 4000,
      });
      loadIndexStatus();
    }).then((fn) => unlisteners.push(fn));

    // index://updated — ファイル単位の更新（サイレント: ステータス更新のみ）
    onIndexUpdated((_payload) => {
      loadIndexStatus();
    }).then((fn) => unlisteners.push(fn));

    // index://error — エラー通知
    onIndexError((payload) => {
      if (progressToastId.current) {
        remove(progressToastId.current);
        progressToastId.current = null;
      }
      add({
        kind: "error",
        title: "インデックスエラー",
        message: payload.message,
      });
    }).then((fn) => unlisteners.push(fn));

    // watcher://error — ファイル監視エラー通知
    onWatcherError((payload) => {
      add({
        kind: "warning",
        title: "ファイル監視エラー",
        message: payload.message,
        autoCloseMs: 6000,
      });
    }).then((fn) => unlisteners.push(fn));

    // index://lock-failed — 他インスタンスがインデックスを使用中
    onIndexLockFailed(() => {
      add({
        kind: "warning",
        title: "読み取り専用モード",
        message: "別のインスタンスがインデックスを使用中です。検索のみ利用できます。",
        autoCloseMs: 6000,
      });
    }).then((fn) => unlisteners.push(fn));

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, [add, update, remove, loadIndexStatus]);
}
