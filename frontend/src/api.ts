const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type Trip = {
  id: string;
  from_city: string;
  to_city: string;
  from_stand: string;
  to_stand: string;
  depart_time: string;
  arrive_time: string;
  duration: string;
  date: string;
  price: number;
  total_seats: number;
  booked_seats: number[];
  seats_left: number;
  vehicle_type: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
};

export type Booking = {
  id: string;
  booking_ref: string;
  trip_id: string;
  user_name: string;
  user_phone: string;
  seat_numbers: number[];
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  from_city: string;
  to_city: string;
  from_stand: string;
  to_stand: string;
  depart_time: string;
  arrive_time: string;
  duration: string;
  date: string;
  vehicle_type: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
};

export type DriverTripBundle = { trip: Trip; bookings: Booking[] };

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listTrips: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.append('from_city', from);
    if (to) q.append('to_city', to);
    const qs = q.toString();
    return req<Trip[]>(`/trips${qs ? `?${qs}` : ''}`);
  },
  getTrip: (id: string) => req<Trip>(`/trips/${id}`),
  createBooking: (payload: {
    trip_id: string;
    user_name: string;
    user_phone: string;
    seat_numbers: number[];
  }) => req<Booking>(`/bookings`, { method: 'POST', body: JSON.stringify(payload) }),
  listBookings: (user_phone?: string) =>
    req<Booking[]>(`/bookings${user_phone ? `?user_phone=${encodeURIComponent(user_phone)}` : ''}`),
  getBooking: (id: string) => req<Booking>(`/bookings/${id}`),
  driverAll: () => req<DriverTripBundle[]>(`/driver/all`),
  confirmBooking: (id: string) =>
    req<Booking>(`/bookings/${id}/confirm`, { method: 'POST' }),
};

// Demo user (skeleton - no auth)
export const DEMO_USER = {
  name: 'Aarav Sharma',
  phone: '+91 98765 00001',
};
