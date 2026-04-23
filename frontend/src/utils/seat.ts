/**
 * Flatten a seat layout (row-of-rows) into a flat set of all seat numbers.
 */
export function allSeats(layout: number[][]): Set<number> {
  return new Set(layout.flat().filter(Boolean));
}

/**
 * Count seats remaining given total and booked seat list.
 */
export function seatsLeft(totalSeats: number, bookedSeats: number[]): number {
  return totalSeats - bookedSeats.length;
}

/**
 * Human-readable label for a seat status.
 */
export function seatStatusLabel(
  seat: number,
  bookedSeats: number[],
  offlineSeats: number[],
  selectedSeats: number[],
): 'available' | 'booked' | 'offline' | 'selected' {
  if (selectedSeats.includes(seat)) return 'selected';
  if (offlineSeats.includes(seat)) return 'offline';
  if (bookedSeats.includes(seat)) return 'booked';
  return 'available';
}
