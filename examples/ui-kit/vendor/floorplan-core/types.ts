/**
 * Canonical floor-plan types for @popcorn245/floorplan-core.
 *
 * This is the single source of truth for the house's spatial model: floors,
 * the canonical room registry, IoT/network device pins, and the connectivity
 * edges between them. It is consumed in three places:
 *
 *   - tasks-app (browser/Stencil)  → Room grouping chip + interactive map
 *   - bucket-bot (node)            → spatial awareness + a floorplan tool
 *   - the seed script (node+admin) → upsert the canonical `floorplans/home` doc
 *
 * To stay importable from BOTH the browser bundle and node, this module has NO
 * firebase / firebase-admin dependency — timestamps are plain epoch millis.
 * Firestore I/O lives in consumers (the seed script, FirestoreDB, the bot).
 */

/** A physical level of the house (e.g. main floor, upper floor). */
export interface Floor {
  /** Stable id, kebab-case (e.g. "main", "upper"). Matches the SVG asset name. */
  id: string;
  /** Human label, e.g. "Main Floor". */
  name: string;
  /** Sort order, lowest = ground (0 = main, 1 = upper, -1 = basement). */
  level: number;
  /** Asset key for the floor SVG — see `floorSvg(svgAsset)`. Usually `<id>.svg`. */
  svgAsset: string;
}

/** Physical dimensions of a room, in INCHES. Width × length are the floor
 *  footprint; height is the ceiling. All optional — partially-measured rooms
 *  (and rooms still "dims TBD") simply omit what isn't known yet. */
export interface RoomDimensions {
  /** Inches. Floor footprint width. */
  width?: number;
  /** Inches. Floor footprint length. */
  length?: number;
  /** Inches. Ceiling height. */
  height?: number;
}

/**
 * A canonical room. The `id` is the join key the whole system pivots on:
 * tasks-app Spaces carry `roomId`, device pins carry `roomId`, and free-text
 * room strings resolve here via `resolveRoomId`.
 */
export interface Room {
  /** Stable id, kebab of the name (e.g. "living-room", "kats-room"). */
  id: string;
  /** Display name, e.g. "Living Room". */
  name: string;
  /** Which floor this room sits on (Floor.id). */
  floorId: string;
  /** The `<g id="…">` in the floor SVG that draws this room's hit-zone. */
  svgGroupId: string;
  /** Free-text aliases that should resolve to this room (lowercased on match). */
  aliases: string[];
  // ── House-Layout extensions (all OPTIONAL — additive, existing consumers
  //    keep working when absent; see docs bucket-bot/house-layout) ──────────
  /** Physical dimensions in inches. */
  dims?: RoomDimensions;
  /** Placement + size in the floor SVG viewBox (the draggable box the map
   *  draws directly when present — no base-SVG `<g>` needed). */
  geometry?: { x: number; y: number; w: number; h: number };
  /** Grouping label so sub-areas roll up in lookups (e.g. "Master Bath" over
   *  Main + Shower + His/Her Closet). */
  group?: string;
  /** Free-text note (e.g. `13″ offset`, `16″ shelves`, `dims TBD (verify)`). */
  note?: string;
}

/** Physical placement of an IoT/network device on a floor plan. */
export interface DevicePin {
  /** Stable id (nanoid or kebab label). */
  id: string;
  /** Display label, e.g. "Living Room Hue Hub". */
  label: string;
  /** Free-form device class, e.g. "light" | "router" | "ap" | "sensor" | "hub". */
  type: string;
  /** Canonical room this device lives in (Room.id). */
  roomId: string;
  /** Floor the pin is drawn on (Floor.id) — denormalized for fast rendering. */
  floorId: string;
  /** Pin position in the floor SVG's viewBox units. */
  x: number;
  y: number;
  /** Linked Home Assistant entity id, when this pin maps to an HA entity. */
  haEntityId?: string;
  /** Network identity, when known. */
  mac?: string;
  ip?: string;
  /** Upstream device this pin connects to (DevicePin.id) — drives an edge. */
  uplinkId?: string;
  /** How this pin reaches its uplink. */
  linkType?: 'wired' | 'wireless';
}

/** A connectivity edge between two device pins (router→AP, AP→client, …). */
export interface NetworkEdge {
  id: string;
  /** Source DevicePin.id. */
  fromId: string;
  /** Destination DevicePin.id. */
  toId: string;
  linkType: 'wired' | 'wireless';
}

/** The whole house plan — one Firestore doc, id `home`. */
export interface FloorPlan {
  /** Doc id (always "home" for the single-house deployment). */
  id: string;
  /** Owning family/home id (UID or "home"); mirrors the spaces ownership model. */
  homeOwnerId: string;
  floors: Floor[];
  rooms: Room[];
  devices: DevicePin[];
  edges: NetworkEdge[];
  /** Epoch millis of the last write. Plain number → no firebase dep in core. */
  updatedAt: number;
}

/** Link-type literal, exported for consumers building pins/edges. */
export type LinkType = 'wired' | 'wireless';
