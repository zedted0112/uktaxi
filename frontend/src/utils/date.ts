/**
 * Format a ISO date string like "2026-04-23" → "23 Apr"
 */
export function formatDate(isoDate: string): string {
  const dt = new Date(isoDate);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Format a ISO date string → "Thu, 23 Apr 2026"
 */
export function formatDateLong(isoDate: string): string {
  const dt = new Date(isoDate);
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Returns next N days as ISO "YYYY-MM-DD" strings starting from today.
 */
export function next7Days(n = 7): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Returns today as ISO "YYYY-MM-DD"
 */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
