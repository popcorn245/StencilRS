import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import type { PopCardScanner } from './card-scanner';

/**
 * pop-card-scanner stories. The real component talks to a camera + the Mac draw2
 * GPU service — neither exists in Storybook — so we stub `getUserMedia` with a
 * canvas.captureStream() (an animated placeholder "card") and stub `fetch` so the
 * draw2 /health + /detect calls resolve to a canned detection. This exercises the
 * single stable <video>, the slots, and the event surface without a device.
 */

// A synthetic camera: an animated canvas streamed as a MediaStream.
function installMocks() {
  const w = 480;
  const h = 640;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  let t = 0;
  const draw = () => {
    t += 0.02;
    ctx.fillStyle = '#1b1b1f';
    ctx.fillRect(0, 0, w, h);
    const cardW = 220;
    const cardH = 320;
    const x = (w - cardW) / 2 + Math.sin(t) * 8;
    const y = (h - cardH) / 2 + Math.cos(t) * 8;
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(x, y, cardW, cardH);
    ctx.fillStyle = '#111';
    ctx.font = '16px system-ui';
    ctx.fillText('Blue-Eyes White Dragon', x + 12, y + 40);
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);

  const stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: async () => stream },
  });

  const realFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.endsWith('/health')) return new Response('ok', { status: 200 });
    if (url.endsWith('/detect')) {
      return new Response(
        JSON.stringify({ detections: [{ name: 'Blue-Eyes White Dragon', confidence: 0.94, bbox: [130, 160, 220, 320] }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return realFetch(input as RequestInfo, init);
  }) as typeof window.fetch;
}

installMocks();

const meta: Meta = {
  title: 'Components/Organisms/Cards/pop-card-scanner',
  component: 'pop-card-scanner',
  tags: ['autodocs'],
  argTypes: {
    mode: { control: 'select', options: ['scan', 'capture'] },
    autoCapture: { control: 'boolean' },
    draw2Url: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Shared camera/detect core for the Yu-Gi-Oh scanners. Owns the camera lifecycle, the Local-Network-Access permission warm, the draw2 health monitor, mode switching (without blanking the video), the detect loop, and barcode/QR decode. Consumers wire ingest/routing to the emitted events.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<PopCardScanner>;

/** Hub-style use: a capture-destination in the `extras` slot, overlays in the
 *  `overlay` slot, controls in the footer. Mode toggling keeps the same video. */
export const HubStyle: Story = {
  render: (args: Partial<PopCardScanner>) => html`
    <div style="max-width: 420px;">
      <pop-card-scanner
        draw2-url=${args.draw2Url ?? 'https://draw2.example.test'}
        mode=${args.mode ?? 'scan'}
        ?auto-capture=${args.autoCapture ?? true}
        @streamingChange=${(e: CustomEvent) => console.log('streamingChange', e.detail)}
        @cardDetect=${(e: CustomEvent) => console.log('cardDetect', e.detail?.detection?.name ?? null)}
        @capture=${(e: CustomEvent) => {
          console.log('capture', e.detail?.kind, e.detail?.detection?.name);
          e.detail?.settle?.(true);
        }}
      >
        <label slot="extras" style="font-size:0.85rem;">
          Scan into:
          <select><option>Loose</option><option>Blue-Eyes binder</option></select>
        </label>
        <div slot="overlay" style="pointer-events:none;">
          <span style="position:absolute;top:8px;left:8px;padding:2px 8px;border-radius:999px;background:rgba(0,0,0,.6);color:#fff;font-size:.75rem;">
            ● live overlay (slotted by the app)
          </span>
        </div>
        <div slot="caption" style="font-size:.8rem;color:#666;">
          Hold a card in frame — cards are detected automatically.
        </div>
        <button style="margin-top:.5rem;">Capture</button>
      </pop-card-scanner>
    </div>
  `,
};

/** yugioh-app-style subset: no destination, a simple overlay + a close button. */
export const SimpleStyle: Story = {
  render: () => html`
    <div style="max-width: 380px;">
      <pop-card-scanner draw2-url="https://draw2.example.test" mode="capture">
        <div slot="overlay" style="pointer-events:none;">
          <span style="position:absolute;bottom:8px;left:0;right:0;text-align:center;color:#fff;font-size:.8rem;">
            Hold a card in frame — it adds automatically.
          </span>
        </div>
      </pop-card-scanner>
    </div>
  `,
};
