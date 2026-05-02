import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = process.env.EXPO_PUBLIC_BACKEND_PORT || '8000';

/**
 * App demo / local dev: when true, API uses only localhost / Metro LAN bases (no cloud).
 * When false or unset, API uses only EXPO_PUBLIC_BACKEND_URL (cloud; no local fallbacks).
 */
export const IS_APP_DEMO_MODE =
  String(process.env.EXPO_PUBLIC_DEMO_MODE || '').toLowerCase() === 'true';

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function getHostIpBase(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  if (!host || !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  return `http://${host}:${BACKEND_PORT}`;
}

function localBaseCandidates(): string[] {
  const locals: string[] = [];
  const hostIpBase = getHostIpBase();
  if (hostIpBase) locals.push(hostIpBase);
  if (Platform.OS === 'android') {
    locals.push(`http://10.0.2.2:${BACKEND_PORT}`);
    locals.push(`http://localhost:${BACKEND_PORT}`);
  } else {
    locals.push(`http://localhost:${BACKEND_PORT}`);
  }
  return [...new Set(locals)];
}

function buildBaseCandidates(): string[] {
  const envRaw = process.env.EXPO_PUBLIC_BACKEND_URL;
  const envBase = envRaw ? normalizeBase(envRaw) : null;
  const locals = localBaseCandidates();

  if (IS_APP_DEMO_MODE) {
    return locals;
  }

  return envBase ? [envBase] : [];
}

export type Role = 'user' | 'driver';

export type User = {
  id: string;
  phone: string;
  name: string;
  role: Role;
  vehicle_preset?: string | null;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  driving_license?: string | null;
  preferred_taxi_stand?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  default_pickup_note?: string | null;
  preferred_language?: 'en' | 'hi' | null;
  notify_booking_updates?: boolean | null;
  notify_promotions?: boolean | null;
  total_seats?: number | null;
  seat_layout?: number[][] | null;
};

export type AppNotification = {
  id: string;
  recipient_phone: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, string>;
  read: boolean;
  created_at: string;
};

export type ApiRootResponse = {
  message: string;
  schema: number;
  demo_mode: boolean;
};

export type Vehicle = {
  id: string;
  name: string;
  type: string;
  total_seats: number;
  seat_layout: number[][];
  image: string;
};

export type Ride = {
  id: string;
  driver_id: string;
  driver_phone: string;
  driver_name: string;
  vehicle_type: string;
  vehicle_number: string;
  seat_layout: number[][];
  from_city: string;
  to_city: string;
  from_stand: string;
  to_stand: string;
  date: string;
  depart_time: string;
  arrive_time: string;
  duration: string;
  price: number;
  total_seats: number;
  booked_seats: number[];
  offline_seats: number[];
  seats_left: number;
  status: 'published' | 'departed' | 'cancelled' | 'completed';
  created_at: string;
};

export type BookingRequest = {
  id: string;
  booking_ref?: string | null;
  ride_id: string;
  user_phone: string;
  user_name: string;
  seat_numbers: number[];
  total_price: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  created_at: string;
  guest_passengers?: Array<{
    seat_number: number;
    name: string;
    phone: string;
  }>;
  from_city: string;
  to_city: string;
  from_stand: string;
  to_stand: string;
  date: string;
  depart_time: string;
  arrive_time: string;
  duration: string;
  vehicle_type: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
};

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const candidates = buildBaseCandidates();
  let res: Response | null = null;
  let lastError: unknown = null;

  for (const base of candidates) {
    const url = `${base}/api${path}`;
    try {
      res = await fetch(url, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      });
      break;
    } catch (error: unknown) {
      lastError = error;
    }
  }

  if (!res) {
    throw lastError instanceof Error ? lastError : new Error('Network request failed');
  }

  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const err = await res.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  /** Health + flags (`demo_mode` mirrors backend `ENABLE_DEMO_MODE`). */
  getApiRoot: () => req<ApiRootResponse>('/'),

  // auth
  requestOtp: (phone: string) => req<{ ok: boolean; message: string }>(`/auth/request-otp`, {
    method: 'POST', body: JSON.stringify({ phone }),
  }),
  verifyOtp: (phone: string, otp: string) => req<{ ok: boolean; user: User | null }>(`/auth/verify-otp`, {
    method: 'POST', body: JSON.stringify({ phone, otp }),
  }),
  register: (payload: {
    phone: string;
    name: string;
    role: Role;
    vehicle_preset?: string;
    vehicle_number?: string;
    driving_license?: string;
  }) =>
    req<User>(`/auth/register`, { method: 'POST', body: JSON.stringify(payload) }),
  me: (phone: string) => req<User>(`/auth/me?phone=${encodeURIComponent(phone)}`),
  updateMe: (
    phone: string,
    payload: {
      name?: string;
      preferred_taxi_stand?: string;
      emergency_contact_name?: string;
      emergency_contact_phone?: string;
      default_pickup_note?: string;
      preferred_language?: 'en' | 'hi';
      notify_booking_updates?: boolean;
      notify_promotions?: boolean;
    },
  ) => req<User>(`/auth/me?phone=${encodeURIComponent(phone)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  demoAccounts: () => req<User[]>(`/demo/accounts`),
  listVehicles: () => req<Vehicle[]>(`/vehicles`),
  updateDriverVehicle: (phone: string, payload: { vehicle_preset: string; vehicle_number: string }) =>
    req<User>(`/drivers/${encodeURIComponent(phone)}/vehicle`, { method: 'POST', body: JSON.stringify(payload) }),
  setOfflineSeats: (rideId: string, offline_seats: number[]) =>
    req<Ride>(`/rides/${rideId}/offline-seats`, { method: 'POST', body: JSON.stringify({ offline_seats }) }),

  // rides
  publishRide: (payload: any) => req<Ride>(`/rides`, { method: 'POST', body: JSON.stringify(payload) }),
  listRides: (params: { from_city?: string; to_city?: string; date?: string; driver_phone?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && q.append(k, String(v)));
    return req<Ride[]>(`/rides${q.toString() ? `?${q.toString()}` : ''}`);
  },
  getRide: (id: string) => req<Ride>(`/rides/${id}`),
  cancelRide: (id: string) => req<{ ok: boolean }>(`/rides/${id}/cancel`, { method: 'POST' }),

  // requests
  createRequest: (payload: {
    ride_id: string;
    user_phone: string;
    seat_numbers: number[];
    guest_name?: string;
    guest_phone?: string;
  }) =>
    req<BookingRequest>(`/requests`, { method: 'POST', body: JSON.stringify(payload) }),
  listRequests: (params: { user_phone?: string; driver_phone?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && q.append(k, String(v)));
    return req<BookingRequest[]>(`/requests${q.toString() ? `?${q.toString()}` : ''}`);
  },
  getRequest: (id: string) => req<BookingRequest>(`/requests/${id}`),
  confirmRequest: (id: string, driver_phone: string) =>
    req<BookingRequest>(
      `/requests/${id}/confirm?driver_phone=${encodeURIComponent(driver_phone)}`,
      { method: 'POST' },
    ),
  rejectRequest: (id: string) => req<BookingRequest>(`/requests/${id}/reject`, { method: 'POST' }),
  cancelRequest: (id: string) => req<BookingRequest>(`/requests/${id}/cancel`, { method: 'POST' }),

  // notifications
  listNotifications: (phone: string) =>
    req<AppNotification[]>(`/notifications?phone=${encodeURIComponent(phone)}`),
  unreadCount: (phone: string) =>
    req<{ count: number }>(`/notifications/unread-count?phone=${encodeURIComponent(phone)}`),
  markRead: (id: string) => req<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: (phone: string) =>
    req<{ ok: boolean }>(`/notifications/read-all?phone=${encodeURIComponent(phone)}`, { method: 'POST' }),
};
