/**
 * Uttarakhand union-style taxi corridors (shared / full-hire).
 * Each entry is one undirected hub ↔ place pair; we expand to both directions in ROUTES.
 * Edit UNDIRECTED_PAIRS only — keep names consistent with publish / API city strings.
 */

export type RouteLeg = { from: string; to: string };

/** One row = one corridor (both directions added automatically). */
const UNDIRECTED_PAIRS: [string, string][] = [
  // Existing app corridors
  ['Uttarkashi', 'Dehradun'],
  ['Uttarkashi', 'Rishikesh'],
  // Dehradun (Doon Valley)
  ['Dehradun', 'Srinagar'],
  ['Dehradun', 'Mussoorie'],
  ['Dehradun', 'Tehri & Chamba'],
  ['Dehradun', 'Chakrata'],
  ['Dehradun', 'Rishikesh'],
  ['Dehradun', 'Haridwar'],
  ['Dehradun', 'Barkot'],
  ['Dehradun', 'Purola'],
  ['Dehradun', 'Mori'],
  ['Dehradun', 'Vikasnagar'],
  // Rishikesh & Haridwar
  ['Rishikesh', 'Srinagar'],
  ['Rishikesh', 'Rudraprayag'],
  ['Rishikesh', 'Karnaprayag'],
  ['Rishikesh', 'Joshimath'],
  ['Rishikesh', 'Gaurikund'],
  ['Rishikesh', 'Badrinath'],
  ['Rishikesh', 'Devprayag'],
  ['Haridwar', 'Lansdowne'],
  ['Haridwar', 'Kotdwar'],
  // Kumaon — Haldwani only (Kathgodam treated as same hub for this list)
  ['Haldwani', 'Nainital'],
  ['Haldwani', 'Bhimtal'],
  ['Haldwani', 'Sattal'],
  ['Haldwani', 'Almora'],
  ['Haldwani', 'Ranikhet'],
  ['Haldwani', 'Pithoragarh'],
  ['Haldwani', 'Kausani'],
  ['Haldwani', 'Bageshwar'],
  ['Haldwani', 'Munsyari'],
  ['Haldwani', 'Lohaghat'],
  ['Haldwani', 'Champawat'],
  // Feeder / inter-district
  ['Srinagar', 'Pauri'],
  ['Srinagar', 'Rudraprayag'],
  ['Uttarkashi', 'Gangotri'],
  ['Uttarkashi', 'Barkot'],
  ['Joshimath', 'Govindghat'],
  ['Rudraprayag', 'Ukhimath'],
  ['Almora', 'Jageshwar'],
  ['Almora', 'Kausani'],
];

function expandBidirectional(pairs: [string, string][]): RouteLeg[] {
  const seen = new Set<string>();
  const out: RouteLeg[] = [];
  for (const [a, b] of pairs) {
    if (a === b) continue;
    for (const leg of [{ from: a, to: b }, { from: b, to: a }]) {
      const key = `${leg.from}\0${leg.to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(leg);
    }
  }
  return out;
}

/** All directed legs for chips, search, and API query validation on the home screen. */
export const ROUTES: RouteLeg[] = expandBidirectional(UNDIRECTED_PAIRS);

export function hasRouteLeg(from: string, to: string): boolean {
  return ROUTES.some((r) => r.from === from && r.to === to);
}

/** Default stand copy for publish / booking when no curated label exists. */
const KNOWN_STANDS: Record<string, string> = {
  Uttarkashi: 'Uttarkashi Bus Stand',
  Dehradun: 'Dehradun ISBT',
  Rishikesh: 'Rishikesh Tapovan',
  Mussoorie: 'Mussoorie Library Bus Stand',
  Haridwar: 'Haridwar ISBT',
  Haldwani: 'Haldwani Taxi Stand',
  Joshimath: 'Joshimath Taxi Stand',
  Rudraprayag: 'Rudraprayag Bus Stand',
  Srinagar: 'Srinagar (Garhwal) Taxi Stand',
  Pauri: 'Pauri Bus Stand',
  Karnaprayag: 'Karnaprayag Bus Stand',
  Gaurikund: 'Gaurikund Taxi Stand',
  Badrinath: 'Badrinath Bus Yard',
  Devprayag: 'Devprayag Bus Stand',
  Lansdowne: 'Lansdowne Taxi Stand',
  Kotdwar: 'Kotdwar Bus Stand',
  Nainital: 'Nainital Tallital Bus Stand',
  Bhimtal: 'Bhimtal Bus Stand',
  Sattal: 'Sattal Junction',
  Almora: 'Almora ISBT',
  Ranikhet: 'Ranikhet Sadar Bus Stand',
  Pithoragarh: 'Pithoragarh Bus Stand',
  Kausani: 'Kausani Taxi Stand',
  Bageshwar: 'Bageshwar Bus Stand',
  Munsyari: 'Munsyari Bus Stand',
  Lohaghat: 'Lohaghat Bus Stand',
  Champawat: 'Champawat Bus Stand',
  Gangotri: 'Gangotri Taxi Stand',
  Barkot: 'Barkot Bus Stand',
  Govindghat: 'Govindghat Taxi Stand',
  Ukhimath: 'Ukhimath Bus Stand',
  Jageshwar: 'Jageshwar Dham Stand',
  Chakrata: 'Chakrata Bus Stand',
  Vikasnagar: 'Vikasnagar Bus Stand',
  Mori: 'Mori Bus Stand',
  Purola: 'Purola Bus Stand',
  'Tehri & Chamba': 'Tehri / Chamba taxi stand',
};

export function defaultStandForCity(city: string): string {
  return KNOWN_STANDS[city] ?? `${city} — main taxi stand`;
}
