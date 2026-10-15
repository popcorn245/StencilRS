/**
 * `ydke://` URL codec — reimplemented from the public wire format (docs
 * planned/yugioh-playtest/deck-model-and-storage §ydke, decision P6):
 *
 *   ydke://<base64(main)>!<base64(extra)>!<base64(side)>!
 *
 * Each segment is standard base64 of the bytes of a little-endian Uint32Array
 * holding one passcode PER COPY, in deck order. Segments may be empty;
 * the trailing `!` is emitted on encode and tolerated-if-missing on decode.
 *
 * Format reference: the `ydke` npm package (DawnbrandBots, LGPL-3.0) — cited
 * as the format spec; this is an independent ~30-line reimplementation so no
 * LGPL code is bundled into the PWA.
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** bytes → standard base64 (portable — no btoa/Buffer dependency). */
function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 63];
  }
  return out;
}

/** standard base64 → bytes. Throws on non-base64 input. */
function base64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(clean)) throw new Error('invalid base64');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].map((k) => (i + k < clean.length ? B64.indexOf(clean[i + k]) : -1));
    out.push((n[0] << 2) | (n[1] >> 4));
    if (n[2] >= 0) out.push(((n[1] & 15) << 4) | (n[2] >> 2));
    if (n[3] >= 0) out.push(((n[2] & 3) << 6) | n[3]);
  }
  return Uint8Array.from(out);
}

/** passcodes (one per copy, deck order) → base64 of the LE-Uint32 bytes. */
function encodeSegment(passcodes: string[]): string {
  const bytes = new Uint8Array(passcodes.length * 4);
  const view = new DataView(bytes.buffer);
  passcodes.forEach((p, i) => view.setUint32(i * 4, Number(p) >>> 0, true));
  return bytesToBase64(bytes);
}

function decodeSegment(segment: string): string[] {
  const bytes = base64ToBytes(segment);
  if (bytes.length % 4 !== 0) throw new Error('ydke segment is not a whole number of uint32s');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i += 4) out.push(String(view.getUint32(i, true)));
  return out;
}

export interface YdkeDeck {
  /** One passcode per COPY, in deck order (expandPart shape). */
  main: string[];
  extra: string[];
  side: string[];
}

/** Encode expanded passcode lists → a `ydke://` URL. */
export function encodeYdke(deck: YdkeDeck): string {
  return `ydke://${encodeSegment(deck.main)}!${encodeSegment(deck.extra)}!${encodeSegment(deck.side)}!`;
}

/** Decode a `ydke://` URL. Throws on a malformed URL (callers surface it). */
export function decodeYdke(url: string): YdkeDeck {
  const raw = String(url ?? '').trim();
  if (!raw.toLowerCase().startsWith('ydke://')) throw new Error('not a ydke:// URL');
  const segments = raw.slice('ydke://'.length).split('!');
  // main!extra!side! → 4 pieces with a trailing empty; tolerate a missing
  // trailing `!` (3 pieces). Fewer than 3 is malformed.
  if (segments.length < 3) throw new Error('ydke:// URL must have main!extra!side segments');
  const [main, extra, side] = segments;
  return { main: decodeSegment(main), extra: decodeSegment(extra), side: decodeSegment(side) };
}
