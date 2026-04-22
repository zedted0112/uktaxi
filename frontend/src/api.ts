const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://uttarkashi-taxi.preview.emergentagent.com';

export type Role = 'user' | 'driver';

export type User = {
  id: string;
  phone: string;
  name: string;
  role: Role;
  vehicle_preset?: string | null;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  total_seats?: number | null;
  seat_layout?: number[][] | null;
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
  status: 'published' | 'cancelled' | 'completed';
  created_at: string;
};

export type BookingRequest = {
  id: string;
  booking_ref: string;
  ride_id: string;
  user_phone: string;
  user_name: string;
  seat_numbers: number[];
  total_price: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  created_at: string;
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
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
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
  // auth
  requestOtp: (phone: string) => req<{ ok: boolean; message: string }>(`/auth/request-otp`, {
    method: 'POST', body: JSON.stringify({ phone }),
  }),
  verifyOtp: (phone: string, otp: string) => req<{ ok: boolean; user: User | null }>(`/auth/verify-otp`, {
    method: 'POST', body: JSON.stringify({ phone, otp }),
  }),
  register: (payload: { phone: string; name: string; role: Role; vehicle_preset?: string; vehicle_number?: string }) =>
    req<User>(`/auth/register`, { method: 'POST', body: JSON.stringify(payload) }),
  me: (phone: string) => req<User>(`/auth/me?phone=${encodeURIComponent(phone)}`),
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
  createRequest: (payload: { ride_id: string; user_phone: string; seat_numbers: number[] }) =>
    req<BookingRequest>(`/requests`, { method: 'POST', body: JSON.stringify(payload) }),
  listRequests: (params: { user_phone?: string; driver_phone?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && q.append(k, String(v)));
    return req<BookingRequest[]>(`/requests${q.toString() ? `?${q.toString()}` : ''}`);
  },
  getRequest: (id: string) => req<BookingRequest>(`/requests/${id}`),
  confirmRequest: (id: string) => req<BookingRequest>(`/requests/${id}/confirm`, { method: 'POST' }),
  rejectRequest: (id: string) => req<BookingRequest>(`/requests/${id}/reject`, { method: 'POST' }),
  cancelRequest: (id: string) => req<BookingRequest>(`/requests/${id}/cancel`, { method: 'POST' }),
};
