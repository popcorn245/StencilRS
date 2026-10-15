# pop-card-scanner



<!-- Auto Generated Below -->


## Properties

| Property            | Attribute             | Description                                                                                                                                                                                                                                                                                                                                                                                                               | Type                  | Default         |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------- |
| `authToken`         | `auth-token`          | Bearer token for the bot-PROXY draw2 mode (off-tailnet): when set, every draw2 health/detect call rides `Authorization: Bearer …` and the Local-Network-Access warm is skipped (the proxy is a normal PUBLIC origin, not a tailnet IP). Omitted (hub / direct-tailnet) → today's behavior.                                                                                                                                | `string`              | `undefined`     |
| `autoCapture`       | `auto-capture`        | Capture mode: auto-ingest a steady, NEW (identity-changed) card.                                                                                                                                                                                                                                                                                                                                                          | `boolean`             | `true`          |
| `busy`              | `busy`                | Consumer is mid round-trip (classify / recognize) — pause detect + capture.                                                                                                                                                                                                                                                                                                                                               | `boolean`             | `false`         |
| `cropMaxEdge`       | `crop-max-edge`       | Longest edge (px) cap on the uploaded crop — keeps the ingest body 413-safe.                                                                                                                                                                                                                                                                                                                                              | `number`              | `1000`          |
| `detectMaxEdge`     | `detect-max-edge`     | Longest edge (px) of the frame POSTed to draw2 /detect (~1–2s vs ~6s).                                                                                                                                                                                                                                                                                                                                                    | `number`              | `640`           |
| `draw2Url`          | `draw-2-url`          | Mac draw2 service URL. '' → streaming disabled (barcode/QR + Phase-1 only). May be the tailnet draw2 host directly (hub) OR the bucket-bot draw2 PROXY base (`.../api/hub/cards/draw2`) when `authToken` is set (off-tailnet).                                                                                                                                                                                            | `string`              | `''`            |
| `draw2UrlFallback`  | `draw-2-url-fallback` | Optional SECONDARY draw2 proxy origin. When set, the scanner probes both `draw2Url` and `draw2UrlFallback` in parallel and uses whichever's `/health` is reachable — for YGO 245's complementary on/off-tailnet origins (the public Tailscale Funnel works only OFF the tailnet, `bot.popcorn245.com` only ON it), re-selecting live if connectivity flips. Hub omits it → unchanged single-origin (`draw2Url`) behavior. | `string`              | `undefined`     |
| `facingMode`        | `facing-mode`         |                                                                                                                                                                                                                                                                                                                                                                                                                           | `string`              | `'environment'` |
| `idealHeight`       | `ideal-height`        |                                                                                                                                                                                                                                                                                                                                                                                                                           | `number`              | `1440`          |
| `idealWidth`        | `ideal-width`         |                                                                                                                                                                                                                                                                                                                                                                                                                           | `number`              | `2560`          |
| `mode`              | `mode`                | Controlled mode — switching never restarts the camera or blanks the video.                                                                                                                                                                                                                                                                                                                                                | `"capture" \| "scan"` | `'scan'`        |
| `scanMinConfidence` | `scan-min-confidence` | Anti-hallucination floor (0–1) for the PASSIVE Scan-mode card detector.                                                                                                                                                                                                                                                                                                                                                   | `number`              | `0.6`           |
| `streamingEnabled`  | `streaming-enabled`   | Allow streaming + passive detect at all (hub's barcode-only form → false).                                                                                                                                                                                                                                                                                                                                                | `boolean`             | `true`          |


## Events

| Event             | Description | Type                                |
| ----------------- | ----------- | ----------------------------------- |
| `barcodeDecode`   |             | `CustomEvent<{ value: string; }>`   |
| `cameraError`     |             | `CustomEvent<{ message: string; }>` |
| `capture`         |             | `CustomEvent<CardCaptureDetail>`    |
| `cardDetect`      |             | `CustomEvent<CardDetectDetail>`     |
| `modeChange`      |             | `CustomEvent<"capture" \| "scan">`  |
| `scannerClose`    |             | `CustomEvent<void>`                 |
| `streamingChange` |             | `CustomEvent<boolean>`              |


## Methods

### `captureNow() => Promise<void>`

Force a capture NOW, bypassing the steadiness/interval/identity gates — the
manual "add another copy" / shutter override.

#### Returns

Type: `Promise<void>`



### `cropFromBbox(source: HTMLCanvasElement, bbox: number[]) => Promise<string | null>`

Crop a SOURCE-space bbox `[x,y,w,h]` out of `source` → a JPEG data URL.

#### Parameters

| Name     | Type                | Description |
| -------- | ------------------- | ----------- |
| `source` | `HTMLCanvasElement` |             |
| `bbox`   | `number[]`          |             |

#### Returns

Type: `Promise<string>`



### `decodeFrame(canvas?: HTMLCanvasElement) => Promise<string | null>`

Run the barcode/QR decoder on a canvas (default: the current video frame).

#### Parameters

| Name     | Type                | Description |
| -------- | ------------------- | ----------- |
| `canvas` | `HTMLCanvasElement` |             |

#### Returns

Type: `Promise<string>`



### `detectAndCrop(source: HTMLCanvasElement, minConfidence?: number) => Promise<{ detection: Draw2Detection | null; crop: string | null; }>`

One draw2 detect on `source` PLUS the bbox crop mapped back to source pixels
— the tap-to-add path (a confirmed still → identity + upload-ready crop).

#### Parameters

| Name            | Type                | Description |
| --------------- | ------------------- | ----------- |
| `source`        | `HTMLCanvasElement` |             |
| `minConfidence` | `number`            |             |

#### Returns

Type: `Promise<{ detection: Draw2Detection; crop: string; }>`



### `detectFrame(source: HTMLCanvasElement, minConfidence?: number) => Promise<Draw2Detection | null>`

One draw2 detect on `source` → best pick above `minConfidence` (or null).

#### Parameters

| Name            | Type                | Description |
| --------------- | ------------------- | ----------- |
| `source`        | `HTMLCanvasElement` |             |
| `minConfidence` | `number`            |             |

#### Returns

Type: `Promise<Draw2Detection>`



### `frameJpeg(source: HTMLCanvasElement, maxEdge: number, quality: number) => Promise<string | null>`

Downscale `source` to `maxEdge` → a JPEG data URL (or null).

#### Parameters

| Name      | Type                | Description |
| --------- | ------------------- | ----------- |
| `source`  | `HTMLCanvasElement` |             |
| `maxEdge` | `number`            |             |
| `quality` | `number`            |             |

#### Returns

Type: `Promise<string>`



### `getAttachCount() => Promise<number>`

Test/diagnostic hook: how many times the ref reattached the stream.

#### Returns

Type: `Promise<number>`



### `grabFrame() => Promise<HTMLCanvasElement | null>`

Grab the current full-res frame → canvas (or null).

#### Returns

Type: `Promise<HTMLCanvasElement>`



### `recordIngest(identity: string) => Promise<void>`

Latch the identity gate after a manual/tap ingest so the auto loop won't
immediately re-add the card the consumer just added.

#### Parameters

| Name       | Type     | Description |
| ---------- | -------- | ----------- |
| `identity` | `string` |             |

#### Returns

Type: `Promise<void>`



### `resetGate() => Promise<void>`

Forget the identity latch (destination changed / consumer reset).

#### Returns

Type: `Promise<void>`



### `scaleBboxToSource(bbox: number[], scale: number) => Promise<number[]>`

Map a detect-space bbox up to source pixels (source/detect scale).

#### Parameters

| Name    | Type       | Description |
| ------- | ---------- | ----------- |
| `bbox`  | `number[]` |             |
| `scale` | `number`   |             |

#### Returns

Type: `Promise<number[]>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
