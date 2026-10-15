import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readLocation, writeLocation, LOCATION_KEY, mapPhoton, mapNominatimReverse, mapIpapi } from './location-store';

function installStorage(): Record<string, string> {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
  });
  return store;
}

describe('location store', () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = installStorage();
    vi.stubGlobal('window', { dispatchEvent: vi.fn(), CustomEvent });
  });

  it('writes to the shared key + stamps updatedAt + dispatches an event', () => {
    writeLocation({ label: 'Austin, TX', zip: '78701', lat: 30.2, lng: -97.7 });
    expect(store[LOCATION_KEY]).toBeTruthy();
    const got = readLocation();
    expect(got).toMatchObject({ label: 'Austin, TX', zip: '78701', lat: 30.2, lng: -97.7 });
    expect(typeof got!.updatedAt).toBe('number');
    expect((window as any).dispatchEvent).toHaveBeenCalled();
  });

  it('readLocation returns null when unset / malformed', () => {
    expect(readLocation()).toBeNull();
    store[LOCATION_KEY] = '{bad';
    expect(readLocation()).toBeNull();
    store[LOCATION_KEY] = JSON.stringify({ zip: 'x' }); // no label
    expect(readLocation()).toBeNull();
  });
});

describe('mapPhoton', () => {
  const fc = {
    features: [
      {
        properties: { osm_id: 1, name: 'Wentzville', city: 'Wentzville', state: 'Missouri', postcode: '63385', country: 'United States' },
        geometry: { coordinates: [-90.85, 38.81] },
      },
      {
        properties: { osm_id: 2, name: 'Austin', state: 'Texas', country: 'United States' },
        geometry: { coordinates: [-97.74, 30.27] },
      },
    ],
  };
  it('maps features → {id,label,zip,lat,lng}', () => {
    const s = mapPhoton(fc);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ id: '1', zip: '63385', lat: 38.81, lng: -90.85 });
    expect(s[0].label).toBe('Wentzville, Missouri, 63385, United States'); // name===city deduped
    expect(s[1]).toMatchObject({ zip: '', lat: 30.27, lng: -97.74 });
    expect(s[1].label).toBe('Austin, Texas, United States');
  });
  it('tolerates a non-collection input', () => {
    expect(mapPhoton(null)).toEqual([]);
    expect(mapPhoton({})).toEqual([]);
  });
});

describe('mapNominatimReverse', () => {
  it('maps reverse-geocode → {label,zip,lat,lng}', () => {
    const r = mapNominatimReverse({
      lat: '38.81', lon: '-90.85',
      address: { town: 'Wentzville', state: 'Missouri', postcode: '63385', country_code: 'us' },
    });
    expect(r).toMatchObject({ zip: '63385', lat: 38.81, lng: -90.85 });
    expect(r!.label).toBe('Wentzville, Missouri, 63385, US');
  });
  it('falls back to display_name when no address parts', () => {
    const r = mapNominatimReverse({ lat: '1', lon: '2', display_name: 'Somewhere' });
    expect(r!.label).toBe('Somewhere');
  });
  it('returns null for empty', () => {
    expect(mapNominatimReverse(null)).toBeNull();
  });
});

describe('mapIpapi', () => {
  it('maps ip-geo → {label,zip}', () => {
    const r = mapIpapi({ city: 'Austin', region_code: 'TX', postal: '78701', country_code: 'US' });
    expect(r).toMatchObject({ zip: '78701', lat: null, lng: null });
    expect(r!.label).toBe('Austin, TX, 78701, US');
  });
  it('returns null when nothing usable', () => {
    expect(mapIpapi({})).toBeNull();
  });
});
