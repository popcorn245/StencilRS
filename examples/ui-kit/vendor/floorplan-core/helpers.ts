/**
 * Pure helpers over a FloorPlan. No I/O — every function is a deterministic
 * transform of the plan + inputs, so they're trivially unit-testable and safe
 * to call from the browser, node, and the bot alike.
 */

import type { DevicePin, FloorPlan, Room } from './types.js';

/** Normalize a free-text room string for matching: lowercase + collapse space. */
export function normalizeRoomText(text: string): string {
  return (text || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Resolve a free-text room string to a canonical Room.id, or null when nothing
 * matches. Match order: exact id → exact name → alias → name/alias substring.
 * Case- and whitespace-insensitive throughout.
 */
export function resolveRoomId(plan: FloorPlan | null | undefined, freeText: string): string | null {
  if (!plan || !Array.isArray(plan.rooms)) return null;
  const q = normalizeRoomText(freeText);
  if (!q) return null;

  // 1. Exact id (kebab) match.
  const byId = plan.rooms.find((r) => r.id === q || r.id === q.replace(/\s+/g, '-'));
  if (byId) return byId.id;

  // 2. Exact name match.
  const byName = plan.rooms.find((r) => normalizeRoomText(r.name) === q);
  if (byName) return byName.id;

  // 3. Exact alias match.
  const byAlias = plan.rooms.find((r) =>
    (r.aliases ?? []).some((a) => normalizeRoomText(a) === q),
  );
  if (byAlias) return byAlias.id;

  // 4. Substring (the query contains, or is contained by, a name/alias). This
  //    catches "the living room" / "kitchen sink" style phrasing.
  const bySubstr = plan.rooms.find((r) => {
    const candidates = [r.name, ...(r.aliases ?? [])].map(normalizeRoomText);
    return candidates.some((c) => c.length > 1 && (q.includes(c) || c.includes(q)));
  });
  return bySubstr ? bySubstr.id : null;
}

/** All rooms on a given floor, in declaration order. */
export function roomsForFloor(plan: FloorPlan | null | undefined, floorId: string): Room[] {
  if (!plan) return [];
  return (plan.rooms ?? []).filter((r) => r.floorId === floorId);
}

/** All device pins assigned to a canonical room. */
export function devicesForRoom(plan: FloorPlan | null | undefined, roomId: string): DevicePin[] {
  if (!plan) return [];
  return (plan.devices ?? []).filter((d) => d.roomId === roomId);
}

/** Look up a room by id (helper used by summaries + the bot tool). */
export function roomById(plan: FloorPlan | null | undefined, roomId: string): Room | null {
  if (!plan) return null;
  return (plan.rooms ?? []).find((r) => r.id === roomId) ?? null;
}

/** All rooms sharing a `group` label (case/space-insensitive), in declaration
 *  order — e.g. roomsForGroup(plan, 'Master Bath') → Main + Shower + closets. */
export function roomsForGroup(plan: FloorPlan | null | undefined, group: string): Room[] {
  if (!plan) return [];
  const g = normalizeRoomText(group);
  if (!g) return [];
  return (plan.rooms ?? []).filter((r) => normalizeRoomText(r.group ?? '') === g);
}

// ── Dimension formatting (House Layout — docs bucket-bot/house-layout) ───────

/** Unicode eighth-fractions, indexed by eighths (0 = whole). */
const EIGHTHS = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'] as const;

/** Format inches with a unicode fraction: 158.5 → `158½″`, 49.375 → `49⅜″`. */
export function formatInches(n: number): string {
  let whole = Math.floor(n);
  let eighths = Math.round((n - whole) * 8);
  if (eighths === 8) {
    whole += 1;
    eighths = 0;
  }
  return eighths === 0 ? `${whole}″` : `${whole}${EIGHTHS[eighths]}″`;
}

/** Inches → feet-and-inches: 150 → `12'6″`, 158.5 → `13'2½″`, 96 → `8'0″`.
 *  The TOTAL is rounded to the nearest eighth BEFORE the feet split so a
 *  rounding carry propagates into feet (143.95 → `12'0″`, never `11'12″`). */
export function inchesToFeetInches(n: number): string {
  const total = Math.round(n * 8) / 8;
  const feet = Math.floor(total / 12);
  return `${feet}'${formatInches(total - feet * 12)}`;
}

/**
 * Human dimensions summary for a room, in inches with the ≈ feet conversion:
 * `150″ × 158½″ × 96″ (≈ 12'6″ × 13'2½″ × 8'0″)`. Partially-measured rooms
 * summarize what exists (e.g. `130″ × 244″ (≈ …)`); no dims → ''.
 */
export function roomDimsSummary(room: Pick<Room, 'dims'> | null | undefined): string {
  const d = room?.dims;
  if (!d) return '';
  const parts = [d.width, d.length, d.height].filter((v): v is number => typeof v === 'number');
  if (!parts.length) return '';
  return `${parts.map(formatInches).join(' × ')} (≈ ${parts.map(inchesToFeetInches).join(' × ')})`;
}

/** Short feet-only footprint caption for map labels: `12'6″ × 13'2½″`.
 *  Needs BOTH width and length; otherwise ''. */
export function roomDimsCaption(room: Pick<Room, 'dims'> | null | undefined): string {
  const d = room?.dims;
  if (!d || typeof d.width !== 'number' || typeof d.length !== 'number') return '';
  return `${inchesToFeetInches(d.width)} × ${inchesToFeetInches(d.length)}`;
}

/**
 * Compact, model-friendly text summary of the plan for bucket-bot's context:
 * floors → rooms, and the devices per room. Kept terse (one room per line) so
 * it's cheap to inject every turn.
 */
export function summarizeForBot(plan: FloorPlan | null | undefined): string {
  if (!plan || !(plan.rooms ?? []).length) return '';
  const floors = [...(plan.floors ?? [])].sort((a, b) => a.level - b.level);
  const lines: string[] = ['House layout:'];
  for (const floor of floors) {
    const rooms = roomsForFloor(plan, floor.id);
    if (!rooms.length) continue;
    lines.push(`${floor.name}:`);
    for (const room of rooms) {
      const devices = devicesForRoom(plan, room.id);
      const devStr = devices.length
        ? ` — devices: ${devices.map((d) => d.label).join(', ')}`
        : '';
      lines.push(`  - ${room.name}${devStr}`);
    }
  }
  // Rooms not attached to any listed floor (defensive — shouldn't happen).
  const placed = new Set(floors.flatMap((f) => roomsForFloor(plan, f.id).map((r) => r.id)));
  const orphans = (plan.rooms ?? []).filter((r) => !placed.has(r.id));
  if (orphans.length) {
    lines.push('Other rooms:');
    for (const room of orphans) lines.push(`  - ${room.name}`);
  }
  return lines.join('\n');
}
