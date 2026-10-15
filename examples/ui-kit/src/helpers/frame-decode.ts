/**
 * Frame decoder for `pop-card-scanner`'s barcode/QR layer — decode against the
 * live camera <video>, running inside the scanner's own tick loop (ONE camera
 * stack; the decoder attaches to the same stream the draw2 detector reads).
 *
 * Decode layer (unified-scanner spec R1): prefer the NATIVE `BarcodeDetector`
 * where available (Chrome Android decodes EAN-13/UPC-A/QR natively), falling
 * back to the `qr-scanner` lib's single-image decode (QR always works; 1D
 * coverage reduced — the documented risk). Both paths are graceful: a
 * failed/empty decode resolves null and the next tick tries again.
 *
 * CONSOLIDATION: moved verbatim from bucket-hub/src/scan/frame-decode.ts so the
 * shared scanner owns barcode/QR decode. `qr-scanner` is loaded via a DYNAMIC
 * import inside `createFrameDecoder()` so simply importing the scanner (e.g. in a
 * jsdom unit test) never pulls the DOM-heavy lib.
 */

/** Minimal typings — BarcodeDetector isn't in the TS dom lib yet. */
interface DetectedBarcode {
  rawValue: string;
  format: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

/** The formats Scan mode cares about: retail 1D barcodes + QR. */
const WANTED_FORMATS = ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

export interface FrameDecoder {
  /** Which engine is live — surfaced for diagnostics/copy. */
  engine: 'native' | 'qr-scanner';
  /** Decode the current video frame → trimmed value, or null (no code / busy /
   *  failed). Never throws. */
  decode(video: HTMLVideoElement): Promise<string | null>;
}

function grabCanvas(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (!video.videoWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return canvas;
}

/**
 * Build the decoder for this browser. Native `BarcodeDetector` (with whatever
 * subset of the wanted formats it supports) when present; else the qr-scanner
 * single-image fallback. Resolution is async because native support is only
 * knowable via `getSupportedFormats()` and qr-scanner is dynamically imported.
 */
export async function createFrameDecoder(): Promise<FrameDecoder> {
  const Ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (Ctor) {
    try {
      const supported = await Ctor.getSupportedFormats();
      const formats = WANTED_FORMATS.filter((f) => supported.includes(f));
      if (formats.length) {
        const detector = new Ctor({ formats });
        let busy = false;
        return {
          engine: 'native',
          async decode(video) {
            if (busy || !video.videoWidth) return null;
            busy = true;
            try {
              const found = await detector.detect(video);
              const hit = found.find((b) => (b.rawValue ?? '').trim());
              return hit ? hit.rawValue.trim() : null;
            } catch {
              return null;
            } finally {
              busy = false;
            }
          },
        };
      }
    } catch {
      /* fall through to qr-scanner */
    }
  }

  // Dynamic import: keeps qr-scanner (and its Worker/DOM refs) out of the module
  // graph until a decoder is actually built at runtime in a real browser.
  const QrScanner = (await import('qr-scanner')).default;
  let busy = false;
  return {
    engine: 'qr-scanner',
    async decode(video) {
      if (busy) return null;
      const canvas = grabCanvas(video);
      if (!canvas) return null;
      busy = true;
      try {
        const res = await QrScanner.scanImage(canvas, { returnDetailedScanResult: true });
        const value = (res?.data ?? '').trim();
        return value || null;
      } catch {
        // qr-scanner throws when no code is found — that's the common case.
        return null;
      } finally {
        busy = false;
      }
    },
  };
}
