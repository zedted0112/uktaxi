import { useState, useEffect, useCallback } from 'react';
import { api, AppNotification } from '../api';

export function useNotifications(phone: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const [items, badge] = await Promise.all([
        api.listNotifications(phone),
        api.unreadCount(phone),
      ]);
      setNotifications(items);
      setUnreadCount(badge.count);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [phone]);

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
    const interval = setInterval(refresh, 30_000); // poll every 30 s
    return () => clearInterval(interval);
  }, [refresh]);

  return { notifications, unreadCount, loading, refresh, markRead, markAllRead };
}
