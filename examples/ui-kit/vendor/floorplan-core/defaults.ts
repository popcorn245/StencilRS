/**
 * The canonical default house plan — the REAL, measured house (docs
 * bucket-bot/house-layout), replacing the original placeholder registry.
 *
 * Two floors: `main` (level 0) + `basement` (level -1). Every measured space is
 * its own room; sub-areas carry a `group` label so lookups roll up (Master Bath
 * → Main + Shower + His/Her Closet; Living Room → Main + TV Nook; Kitchen →
 * Dining + Prep). Dimensions are INCHES, captured faithfully from the user's
 * hand measurements — ambiguous readings are seeded anyway and flagged
 * "(verify)" in `note`; rooms from the sketch without measurements yet are
 * seeded "dims TBD". The editable House hub panel is the reconciliation
 * surface (admin drags boxes / fixes values there).
 *
 * Initial `geometry` (floor-SVG viewBox units, 800×600) is derived from the
 * dims (inches × SCALE, keeping aspect) and laid out approximately per the
 * sketch orientation: Street Front at top, Side Street on the right, Garage
 * top-right, Master suite bottom-left. It only needs to be LEGIBLE on first
 * render — the admin fine-tunes by dragging.
 *
 * Room ids are the kebab of the name; aliases seed the display string plus
 * lowercase/spoken variants so existing free-text `Space.room` values resolve.
 */

import type { Floor, FloorPlan, Room, RoomDimensions } from './types.js';

/** kebab-case an arbitrary room name: "Kat's Room" → "kats-room". */
export function kebabRoom(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const DEFAULT_FLOORS: Floor[] = [
  { id: 'main', name: 'Main Floor', level: 0, svgAsset: 'main.svg' },
  { id: 'basement', name: 'Basement', level: -1, svgAsset: 'basement.svg' },
];

/** Inches → viewBox units for the seeded geometry (keeps every floor inside
 *  the 800×600 viewBox with room to drag). */
const SCALE = 0.9;

/** Room box size from dims (aspect-true), or a legible fallback for rooms
 *  still "dims TBD". */
function boxFor(dims: RoomDimensions | undefined, fallbackW = 110, fallbackH = 90): { w: number; h: number } {
  const w = dims?.width ? Math.round(dims.width * SCALE) : fallbackW;
  const h = dims?.length ? Math.round(dims.length * SCALE) : fallbackH;
  return { w, h };
}

interface RoomDef {
  name: string;
  floorId: string;
  extraAliases?: string[];
  dims?: RoomDimensions;
  group?: string;
  note?: string;
  /** Top-left corner of the seeded box (viewBox units). */
  at: { x: number; y: number };
  /** Fallback box size when dims are TBD. */
  fallback?: { w: number; h: number };
}

/**
 * The measured house. `at` positions follow the sketch orientation described
 * above; box sizes derive from dims via boxFor().
 */
const ROOM_DEFS: RoomDef[] = [
  // ── Main floor ────────────────────────────────────────────────────────────
  { name: 'Office', floorId: 'main', extraAliases: ['study'], note: 'from sketch — dims TBD', at: { x: 40, y: 40 } },
  { name: 'Laundry', floorId: 'main', extraAliases: ['laundry room'], note: 'from sketch — dims TBD', at: { x: 160, y: 40 } },
  { name: 'Guest Bathroom', floorId: 'main', extraAliases: ['guest bath', 'bathroom', 'main bath', 'bath'], note: 'from sketch — dims TBD', at: { x: 280, y: 40 }, fallback: { w: 100, h: 90 } },
  { name: 'Kitchen — Prep', floorId: 'main', group: 'Kitchen', extraAliases: ['prep kitchen', 'kitchen prep', 'prep'], dims: { width: 99, length: 150, height: 111 }, at: { x: 400, y: 40 } },
  { name: 'Garage', floorId: 'main', note: 'from sketch — dims TBD', at: { x: 560, y: 40 }, fallback: { w: 150, h: 120 } },
  { name: "Kat's Room", floorId: 'main', extraAliases: ['kats room', 'kat room', 'kids room'], note: 'from sketch — dims TBD (has closet)', at: { x: 40, y: 150 }, fallback: { w: 120, h: 100 } },
  { name: 'Family Room', floorId: 'main', note: 'from sketch — dims TBD; may be the measured Living Room (verify)', at: { x: 170, y: 150 }, fallback: { w: 130, h: 100 } },
  { name: 'Kitchen — Dining', floorId: 'main', group: 'Kitchen', extraAliases: ['dining', 'dining room', 'kitchen dining'], dims: { width: 152, length: 122, height: 96 }, at: { x: 510, y: 190 } },
  { name: 'Pantry', floorId: 'main', dims: { width: 84, length: 70, height: 96 }, note: '16″ shelves', at: { x: 660, y: 190 } },
  { name: 'Living Room', floorId: 'main', group: 'Living Room', extraAliases: ['living', 'lounge'], dims: { width: 208, length: 128.5, height: 111 }, at: { x: 300, y: 270 } },
  { name: 'TV Nook', floorId: 'main', group: 'Living Room', extraAliases: ['tv nook', 'nook'], dims: { width: 130, length: 18.5, height: 111 }, at: { x: 300, y: 390 } },
  { name: 'Master Bedroom', floorId: 'main', extraAliases: ['master', 'bedroom', 'main bedroom'], dims: { width: 150, length: 158.5, height: 96 }, at: { x: 40, y: 300 } },
  { name: 'His Closet', floorId: 'main', group: 'Master Bath', dims: { width: 24, length: 164, height: 96 }, at: { x: 185, y: 300 } },
  { name: 'Master Bath', floorId: 'main', group: 'Master Bath', extraAliases: ['master bathroom', 'ensuite'], dims: { width: 49.375, length: 59, height: 96 }, at: { x: 40, y: 460 } },
  { name: 'Shower', floorId: 'main', group: 'Master Bath', extraAliases: ['master shower'], dims: { width: 32, length: 46, height: 74 }, at: { x: 95, y: 460 } },
  { name: 'Her Closet', floorId: 'main', group: 'Master Bath', dims: { width: 63, length: 65, height: 96 }, note: '13″ offset', at: { x: 135, y: 460 } },
  { name: 'Covered Porch', floorId: 'main', extraAliases: ['porch'], note: 'from sketch — dims TBD', at: { x: 600, y: 480 }, fallback: { w: 140, h: 80 } },
  // ── Basement ──────────────────────────────────────────────────────────────
  { name: 'Green Screen / Set', floorId: 'basement', extraAliases: ['green screen', 'green screen room', 'studio set'], dims: { width: 125, length: 156, height: 121 }, note: 'tall ~21ft ceiling area (verify)', at: { x: 40, y: 40 } },
  { name: 'Music Studio', floorId: 'basement', extraAliases: ['music room', 'recording studio'], dims: { width: 115, length: 156, height: 92.5 }, at: { x: 170, y: 40 } },
  { name: 'Sitting Area', floorId: 'basement', extraAliases: ['sitting room'], dims: { width: 25, length: 56, height: 92.5 }, note: '(verify — width could be 125)', at: { x: 290, y: 40 } },
  { name: 'Sump / Dump', floorId: 'basement', extraAliases: ['sump', 'sump pump'], dims: { width: 35, length: 35 }, at: { x: 330, y: 40 } },
  { name: 'Storage / Closet', floorId: 'basement', extraAliases: ['storage', 'basement closet'], note: 'dims TBD', at: { x: 620, y: 40 }, fallback: { w: 90, h: 70 } },
  { name: 'Art Studio', floorId: 'basement', extraAliases: ['art room', 'craft room'], dims: { width: 145, length: 130, height: 92.5 }, at: { x: 40, y: 210 } },
  { name: 'Utility', floorId: 'basement', extraAliases: ['utility room', 'mechanical room'], dims: { width: 145, length: 176, height: 92.5 }, at: { x: 190, y: 210 } },
  { name: 'Seasonal', floorId: 'basement', extraAliases: ['seasonal storage'], dims: { width: 130, length: 244 }, at: { x: 340, y: 210 } },
  { name: 'Patio', floorId: 'basement', extraAliases: ['back patio'], dims: { width: 152, length: 120 }, at: { x: 480, y: 210 } },
];

export const DEFAULT_ROOMS: Room[] = ROOM_DEFS.map((def) => {
  const { name, floorId, extraAliases, dims, group, note, at, fallback } = def;
  const id = kebabRoom(name);
  const aliases = Array.from(
    new Set([
      name,
      name.toLowerCase(),
      id,
      id.replace(/-/g, ' '),
      ...(extraAliases ?? []),
    ]),
  );
  const { w, h } = boxFor(dims, fallback?.w, fallback?.h);
  const room: Room = {
    id,
    name,
    floorId,
    svgGroupId: `room-${id}`,
    aliases,
    geometry: { x: at.x, y: at.y, w, h },
  };
  // Only attach optional fields that exist — Firestore rejects `undefined`.
  if (dims) room.dims = dims;
  if (group) room.group = group;
  if (note) room.note = note;
  return room;
});

/** Build a fresh default plan for the given owner (empty devices/edges). */
export function defaultFloorPlan(homeOwnerId = 'home'): FloorPlan {
  return {
    id: 'home',
    homeOwnerId,
    floors: DEFAULT_FLOORS.map((f) => ({ ...f })),
    rooms: DEFAULT_ROOMS.map((r) => ({ ...r, aliases: [...r.aliases] })),
    devices: [],
    edges: [],
    updatedAt: Date.now(),
  };
}
