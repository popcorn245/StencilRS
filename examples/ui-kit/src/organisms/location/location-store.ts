/**
 * Shared location store + OSM provider response mappers for pop-location.
 * Pure + DOM-light so they can be unit-tested with a mocked fetch/localStorage.
 *
 * Persistence: a SINGLE shared localStorage key (`hub:location`) so every
 * pop-location instance (and any other consumer) reads/writes the same place.
 */

export interface ResolvedLocation {
  label: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  updatedAt?: number;
}

export const LOCATION_KEY = 'hub:location';
/** Same-page event so live instances update without a real `storage` event. */
export const LOCATION_EVENT = 'hub:location-changed';

/** Read the shared location, or null when unset / unparseable. */
export function readLocation(): ResolvedLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as ResolvedLocation;
    if (!v || typeof v.label !== 'string') return null;
    return v;
  } catch {
    return null;
  }
}

/** Write the shared location + dispatch a same-page event. Best-effort. */
export function writeLocation(loc: ResolvedLocation): void {
  const value: ResolvedLocation = { ...loc, updatedAt: Date.now() };
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(value));
  } catch {
    /* quota / disabled — still notify in-page listeners below */
  }
  try {
    window.dispatchEvent(new CustomEvent(LOCATION_EVENT, { detail: value }));
  } catch {
    /* no window (SSR/test) */
  }
}

// ── OSM provider response mappers ────────────────────────────────────────────

/** A short, readable place label from a set of parts (deduped, comma-joined). */
function joinParts(parts: (string | undefined | null)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const s = (p || '').trim();
    if (s && !seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out.join(', ');
}

/** One Photon autocomplete suggestion → a normalized place. */
export interface Suggestion extends ResolvedLocation {
  /** A stable-ish key for list rendering. */
  id: string;
}

/**
 * Map a Photon `/api` GeoJSON FeatureCollection → suggestions. Each feature has
 * `properties` (name/city/state/country/postcode/osm_id) + `geometry.coordinates`
 * ([lng, lat]). We build a readable label + carry zip + lat/lng.
 */
export function mapPhoton(json: unknown): Suggestion[] {
  const features = (json as { features?: unknown[] })?.features;
  if (!Array.isArray(features)) return [];
  const out: Suggestion[] = [];
  for (const f of features) {
    const ff = f as { properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } };
    const p = ff.properties || {};
    const coords = ff.geometry?.coordinates;
    const name = (p.name as string) || (p.city as string) || (p.postcode as string) || '';
    const label = joinParts([
      p.name as string,
      // Avoid repeating name when it's already the city.
      (p.city as string) !== (p.name as string) ? (p.city as string) : undefined,
      p.state as string,
      p.postcode as string,
      p.country as string,
    ]);
    if (!label && !name) continue;
    const lat = Array.isArray(coords) && typeof coords[1] === 'number' ? coords[1] : null;
    const lng = Array.isArray(coords) && typeof coords[0] === 'number' ? coords[0] : null;
    out.push({
      id: String(p.osm_id ?? `${lat},${lng},${out.length}`),
      label: label || name,
      zip: typeof p.postcode === 'string' ? p.postcode : '',
      lat,
      lng,
    });
  }
  return out;
}

/**
 * Map a Nominatim `/reverse?format=jsonv2` response → a resolved place. Carries
 * `address.postcode` + a readable label (town/city, state, country) + lat/lon.
 */
export function mapNominatimReverse(json: unknown): ResolvedLocation | null {
  const j = json as { lat?: string; lon?: string; address?: Record<string, string>; display_name?: string };
  if (!j) return null;
  const a = j.address || {};
  const city = a.city || a.town || a.village || a.hamlet || a.county || '';
  const label = joinParts([city, a.state, a.postcode, a.country_code ? a.country_code.toUpperCase() : a.country]) || j.display_name || '';
  if (!label) return null;
  const lat = j.lat != null ? Number(j.lat) : null;
  const lng = j.lon != null ? Number(j.lon) : null;
  return { label, zip: a.postcode || '', lat: Number.isNaN(lat as number) ? null : lat, lng: Number.isNaN(lng as number) ? null : lng };
}

/** Map an ipapi.co JSON → a resolved place (IP fallback). */
export function mapIpapi(json: unknown): ResolvedLocation | null {
  const j = json as { postal?: string; city?: string; region_code?: string; region?: string; country_code?: string };
  if (!j) return null;
  const label = joinParts([j.city, j.region_code || j.region, j.postal, j.country_code]);
  if (!label && !j.postal) return null;
  return { label: label || j.postal || '', zip: j.postal || '', lat: null, lng: null };
}
