// Public API for @popcorn245/floorplan-core.
//
// Pure types + helpers + inline SVG delivery for the house floor-plan system.
// No firebase / firebase-admin dependency — safe to import from the browser
// (tasks-app) and node (bucket-bot, seed script) alike.

export type {
  Floor,
  Room,
  RoomDimensions,
  DevicePin,
  NetworkEdge,
  FloorPlan,
  LinkType,
} from './types.js';

export {
  normalizeRoomText,
  resolveRoomId,
  roomsForFloor,
  roomsForGroup,
  devicesForRoom,
  roomById,
  summarizeForBot,
  formatInches,
  inchesToFeetInches,
  roomDimsSummary,
  roomDimsCaption,
} from './helpers.js';

export { floorSvg, builtinFloorIds, FLOOR_VIEWBOX } from './svg.js';

export {
  kebabRoom,
  defaultFloorPlan,
  DEFAULT_FLOORS,
  DEFAULT_ROOMS,
} from './defaults.js';
