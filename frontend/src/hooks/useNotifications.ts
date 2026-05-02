import { useState, useEffect, useCallback } from 'react';
import { api, AppNotification } from '../api';

type NotificationPollOptions = {
  includeList?: boolean;
  pollMs?: number;
};

export function useNotifications(phone: string | undefined, options: NotificationPollOptions = {}) {
  const { includeList = true, pollMs = 45_000 } = options;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const [items, badge] = await Promise.all([
        includeList ? api.listNotifications(phone) : Promise.resolve([]),
        api.unreadCount(phone),
      ]);
      if (includeList) {
        setNotifications(items);
      }
      setUnreadCount(badge.count);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [phone, includeList]);

  const markRead = useCallback(async (id: string) => {
    await api.markRead(id).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!phone) return;
    await api.markAllRead(phone).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [phone]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollMs);
    return () => clearInterval(interval);
  }, [refresh, pollMs]);

  return { notifications, unreadCount, loading, refresh, markRead, markAllRead };
}
