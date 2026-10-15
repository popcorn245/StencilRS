/**
 * House-Layout contract tests (docs bucket-bot/house-layout): the dimension
 * formatters, the group rollup helper, and the REAL-house seed's integrity
 * (floors, measured rooms, groups, geometry legibility).
 */
import { describe, it, expect } from 'vitest';
import {
  formatInches,
  inchesToFeetInches,
  roomDimsSummary,
  roomDimsCaption,
  roomsForGroup,
  roomById,
  resolveRoomId,
  defaultFloorPlan,
  DEFAULT_FLOORS,
  DEFAULT_ROOMS,
  type FloorPlan,
} from '../index.js';

const plan: FloorPlan = defaultFloorPlan('home');

describe('formatInches / inchesToFeetInches', () => {
  it('formats whole and fractional inches with unicode fractions', () => {
    expect(formatInches(150)).toBe('150″');
    expect(formatInches(158.5)).toBe('158½″');
    expect(formatInches(49.375)).toBe('49⅜″');
    expect(formatInches(92.5)).toBe('92½″');
  });

  it('converts to feet-and-inches', () => {
    expect(inchesToFeetInches(150)).toBe("12'6″");
    expect(inchesToFeetInches(158.5)).toBe("13'2½″");
    expect(inchesToFeetInches(96)).toBe("8'0″");
  });

  it('carries a foot-boundary rounding into feet (never 11\'12″)', () => {
    // 143.95 rounds to 144 eighth-wise — the carry must land in FEET.
    expect(inchesToFeetInches(143.95)).toBe("12'0″");
    expect(inchesToFeetInches(143.99)).toBe("12'0″");
    // Just under the carry threshold stays in inches.
    expect(inchesToFeetInches(143.9)).toBe("11'11⅞″");
  });
});

describe('roomDimsSummary / roomDimsCaption', () => {
  it('matches the spec example exactly for the master bedroom', () => {
    const room = roomById(plan, 'master-bedroom')!;
    expect(roomDimsSummary(room)).toBe("150″ × 158½″ × 96″ (≈ 12'6″ × 13'2½″ × 8'0″)");
  });

  it('summarizes partially-measured rooms (width × length only)', () => {
    const seasonal = roomById(plan, 'seasonal')!;
    expect(roomDimsSummary(seasonal)).toBe("130″ × 244″ (≈ 10'10″ × 20'4″)");
  });

  it('returns empty for a room without dims', () => {
    const garage = roomById(plan, 'garage')!;
    expect(roomDimsSummary(garage)).toBe('');
    expect(roomDimsSummary(null)).toBe('');
  });

  it('captions the footprint in feet only', () => {
    expect(roomDimsCaption(roomById(plan, 'master-bedroom'))).toBe("12'6″ × 13'2½″");
    expect(roomDimsCaption(roomById(plan, 'garage'))).toBe('');
  });
});

describe('roomsForGroup', () => {
  it('rolls up the Master Bath sub-areas', () => {
    const ids = roomsForGroup(plan, 'Master Bath').map((r) => r.id).sort();
    expect(ids).toEqual(['her-closet', 'his-closet', 'master-bath', 'shower']);
  });

  it('is case/space-insensitive and empty for unknown groups', () => {
    expect(roomsForGroup(plan, '  master  bath ').length).toBe(4);
    expect(roomsForGroup(plan, 'Living Room').map((r) => r.id).sort()).toEqual(['living-room', 'tv-nook']);
    expect(roomsForGroup(plan, 'Kitchen').map((r) => r.id).sort()).toEqual(['kitchen-dining', 'kitchen-prep']);
    expect(roomsForGroup(plan, 'Attic')).toEqual([]);
    expect(roomsForGroup(null, 'Kitchen')).toEqual([]);
  });
});

describe('the real-house seed', () => {
  it('has exactly the main + basement floors', () => {
    expect(DEFAULT_FLOORS.map((f) => f.id).sort()).toEqual(['basement', 'main']);
    expect(DEFAULT_FLOORS.find((f) => f.id === 'basement')!.level).toBe(-1);
    expect(DEFAULT_FLOORS.find((f) => f.id === 'main')!.level).toBe(0);
  });

  it('seeds every room with geometry inside the 800×600 viewBox', () => {
    for (const r of DEFAULT_ROOMS) {
      expect(r.geometry, r.id).toBeDefined();
      const g = r.geometry!;
      expect(g.w).toBeGreaterThan(0);
      expect(g.h).toBeGreaterThan(0);
      expect(g.x + g.w).toBeLessThanOrEqual(800);
      expect(g.y + g.h).toBeLessThanOrEqual(600);
    }
  });

  it('keeps ambiguous measurements flagged (verify) instead of dropping them', () => {
    expect(roomById(plan, 'sitting-area')!.note).toContain('verify');
    expect(roomById(plan, 'green-screen-set')!.note).toContain('verify');
    // Family Room seeded ALONGSIDE the measured Living Room (sketch vs list).
    expect(roomById(plan, 'family-room')).not.toBeNull();
    expect(roomById(plan, 'living-room')!.dims?.width).toBe(208);
  });

  it('resolves the acceptance-example phrasings', () => {
    expect(resolveRoomId(plan, 'art studio')).toBe('art-studio');
    expect(resolveRoomId(plan, 'green screen room')).toBe('green-screen-set');
    expect(resolveRoomId(plan, 'master bath')).toBe('master-bath');
  });

  it('never seeds undefined optional fields (Firestore rejects undefined)', () => {
    for (const r of DEFAULT_ROOMS) {
      for (const [k, v] of Object.entries(r)) {
        expect(v, `${r.id}.${k}`).not.toBeUndefined();
      }
    }
  });
});
