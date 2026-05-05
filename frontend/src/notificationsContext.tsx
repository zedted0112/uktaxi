import React, { createContext, useContext } from 'react';
import { useNotifications } from './hooks/useNotifications';

type NotificationsCtx = ReturnType<typeof useNotifications>;

const Ctx = createContext<NotificationsCtx | null>(null);

/** Single shared poll + unread count for tab badge and Notifications screen. */
export function NotificationsProvider({
  phone,
  children,
}: {
  phone: string | undefined;
  children: React.ReactNode;
}) {
  const value = useNotifications(phone, { includeList: true, pollMs: 45_000 });
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSharedNotifications(): NotificationsCtx {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useSharedNotifications must be used inside NotificationsProvider');
  }
  return v;
}
