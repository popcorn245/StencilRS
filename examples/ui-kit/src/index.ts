/**
 * @fileoverview entry point for your component library
 *
 * This is the entry point for your component library. Use this file to export utilities,
 * constants or data structure that accompany your components.
 *
 * DO NOT use this file to export your components. Instead, use the recommended approaches
 * to consume components of this package as outlined in the `README.md`.
 */

export { format } from '../../ui-kit/src/helpers/utils';
export type * from './components';
export * from './types/plan';

// pop-card-scanner public contract (type-only — no runtime import of the
// component/decorators/qr-scanner into the barrel).
export type {
  CardScannerMode,
  CardDetectDetail,
  CardCaptureDetail,
} from './organisms/card-scanner/card-scanner';
export type { Draw2Detection } from './helpers/draw2';
// The plain-TS draw2 I/O helpers (fetch + navigator.permissions, zero Stencil
// deps) — consumers that show a scan-lane status (yugioh-app profile) reuse the
// SAME warm+probe the scanner runs, rather than re-duplicating the client.
export { draw2Health, warmDraw2Permission } from './helpers/draw2';

// Feature-surface helpers (plain TS, zero Firebase/Stencil deps).
export * from './helpers/async-data';
export * from './molecules/field/field-logic';
export * from './organisms/presenter/presenter-logic';
// pop-feedback-button's payload/page-context contract — hosts (and the bot's
// feedback tool) share these types instead of re-declaring the wire shape.
export * from './organisms/feedback-button/feedback-button-logic';
