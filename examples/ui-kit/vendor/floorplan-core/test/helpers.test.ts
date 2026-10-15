import { describe, it, expect } from 'vitest';
import {
  resolveRoomId,
  roomsForFloor,
  devicesForRoom,
  summarizeForBot,
  defaultFloorPlan,
  type FloorPlan,
} from '../index.js';

const plan: FloorPlan = defaultFloorPlan('home');

describe('resolveRoomId', () => {
  it('matches the canonical id directly', () => {
    expect(resolveRoomId(plan, 'living-room')).toBe('living-room');
  });

  it('matches the exact display name, case-insensitively', () => {
    expect(resolveRoomId(plan, 'Living Room')).toBe('living-room');
    expect(resolveRoomId(plan, 'living room')).toBe('living-room');
    expect(resolveRoomId(plan, '  PANTRY  ')).toBe('pantry');
  });

  it('matches a seeded alias', () => {
    expect(resolveRoomId(plan, 'lounge')).toBe('living-room');
    expect(resolveRoomId(plan, 'master')).toBe('master-bedroom');
    expect(resolveRoomId(plan, 'study')).toBe('office');
    expect(resolveRoomId(plan, 'green screen')).toBe('green-screen-set');
  });

  it("resolves the apostrophe room via id + alias", () => {
    expect(resolveRoomId(plan, "Kat's Room")).toBe('kats-room');
    expect(resolveRoomId(plan, 'kats room')).toBe('kats-room');
  });

  it('falls back to substring matching for natural phrasing', () => {
    expect(resolveRoomId(plan, 'the living room')).toBe('living-room');
  });

  it('returns null for an unknown room', () => {
    expect(resolveRoomId(plan, 'attic')).toBeNull();
    expect(resolveRoomId(plan, '')).toBeNull();
    expect(resolveRoomId(null, 'kitchen')).toBeNull();
  });
});

describe('roomsForFloor / devicesForRoom', () => {
  it('partitions rooms by floor', () => {
    const main = roomsForFloor(plan, 'main').map((r) => r.id);
    const basement = roomsForFloor(plan, 'basement').map((r) => r.id);
    expect(main).toContain('living-room');
    expect(main).toContain('garage');
    expect(main).toContain('master-bedroom');
    expect(basement).toContain('art-studio');
    expect(basement).toContain('green-screen-set');
    expect(basement).not.toContain('garage');
  });

  it('filters device pins by room', () => {
    const withDevice: FloorPlan = {
      ...plan,
      devices: [
        { id: 'd1', label: 'Hue Hub', type: 'hub', roomId: 'living-room', floorId: 'main', x: 100, y: 100 },
        { id: 'd2', label: 'Router', type: 'router', roomId: 'office', floorId: 'main', x: 200, y: 350 },
      ],
    };
    expect(devicesForRoom(withDevice, 'living-room').map((d) => d.id)).toEqual(['d1']);
    expect(devicesForRoom(withDevice, 'kitchen')).toEqual([]);
  });
});

describe('summarizeForBot', () => {
  it('lists floors → rooms and devices per room', () => {
    const withDevice: FloorPlan = {
      ...plan,
      devices: [
        { id: 'd1', label: 'Hue Hub', type: 'hub', roomId: 'living-room', floorId: 'main', x: 100, y: 100 },
      ],
    };
    const text = summarizeForBot(withDevice);
    expect(text).toContain('Main Floor:');
    expect(text).toContain('Living Room');
    expect(text).toContain('Hue Hub');
    expect(text).toContain('Basement:');
    expect(text).toContain('Music Studio');
  });

  it('returns empty string for an empty plan', () => {
    expect(summarizeForBot(null)).toBe('');
    expect(summarizeForBot({ ...plan, rooms: [] })).toBe('');
  });
});
