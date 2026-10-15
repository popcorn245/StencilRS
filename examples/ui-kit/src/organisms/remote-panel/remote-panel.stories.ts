import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * pop-remote-panel — the unified AV control surface. The host (the Bucket Hub)
 * owns the network (hubApi), optimistic mutations and the PanelShell chrome; the
 * panel just renders the data it is handed and emits `pop*` events. Object props
 * (`activities`, `current`, `rooms`) are passed here as JSON-stringified
 * attributes so they render in static Storybook builds (in an app you'd set them
 * as properties).
 */
const meta: Meta = {
  title: 'Components/Organisms/Remote Panel',
  argTypes: {
    harmonyEnabled: { control: 'boolean' },
    transportEnabled: { control: 'boolean' },
    muted: { control: 'boolean' },
    playState: { control: { type: 'select' }, options: ['playing', 'paused', 'stopped', 'unknown'] },
    nowPlaying: { control: 'text' },
    statusNote: { control: 'text' },
  },
  parameters: {
    actions: {
      handles: [
        'popActivityStart',
        'popPowerOff',
        'popVolumeStep',
        'popMuteToggle',
        'popCalibrate',
        'popTransport',
        'popAppLaunch',
        'popRoomChange',
        'popRetry',
        'popClose',
      ],
    },
    docs: {
      description: {
        component:
          'pop-remote-panel — a presentation-only AV control surface (organism). Renders the room switcher, Harmony status line + activities + volume, and the Shield transport row + app launcher, and emits `pop*` events. The host owns the network + optimistic mutations. The volume slider is honest to the IR-RELATIVE Harmony receiver: it emits `popVolumeStep` as it crosses each unit (no fake absolute-set); the ± buttons press-and-hold to repeat. Mute is an optimistic local toggle (no server truth); play/pause reflects the host-derived `playState`.',
      },
    },
  },
};

export default meta;

// ── mock data ────────────────────────────────────────────────────────────────
const activities = [
  { id: '1', label: 'SHIELD TV' },
  { id: '2', label: 'Switch' },
  { id: '3', label: 'Music' },
];

const current = { activityId: '1', activityLabel: 'SHIELD TV', level: 34, known: true };

const rooms = [
  {
    area: 'Family Room',
    emoji: '📺',
    primary: true,
    devices: [
      { label: 'Shield Pro', state: 'playing', app: 'Netflix' },
      { label: 'Receiver', state: 'playing', receiver: true, input: 'SHIELD' },
    ],
  },
  {
    area: 'Bedroom',
    emoji: '🛏️',
    primary: false,
    devices: [{ label: 'Roku TV', state: 'off' }],
  },
];

const attr = (o: unknown) => JSON.stringify(o).replace(/'/g, '&#39;');

interface PanelOpts {
  harmony?: boolean;
  transport?: boolean;
  muted?: boolean;
  playState?: string;
  nowPlaying?: string;
  selectedArea?: string;
  statusNote?: string;
  error?: string;
  width?: number;
}

function panel(o: PanelOpts) {
  return `
    <div style="max-width: ${o.width ?? 420}px; padding: 16px; background: var(--surface-canvas, #eef3fb); border-radius: 16px;">
      <pop-remote-panel
        ${o.harmony === false ? '' : 'harmony-enabled="true"'}
        ${o.transport === false ? '' : 'transport-enabled="true"'}
        ${o.muted ? 'muted="true"' : ''}
        play-state="${o.playState ?? 'playing'}"
        now-playing="${o.nowPlaying ?? 'Netflix'}"
        ${o.selectedArea ? `selected-area="${o.selectedArea}"` : ''}
        ${o.statusNote ? `status-note="${o.statusNote}"` : ''}
        ${o.error ? `error="${o.error}"` : ''}
        activities='${attr(activities)}'
        current='${attr(current)}'
        rooms='${attr(rooms)}'
      ></pop-remote-panel>
    </div>
  `;
}

/** Full panel — Harmony + transport, playing. Drag the slider / hold ± / tap mute. */
export const Default: StoryObj = {
  name: 'Default — full panel',
  render: () => panel({}),
};

/** Muted — amber mute button + "Muted" badge + dimmed level. */
export const Muted: StoryObj = {
  name: 'Muted',
  render: () => panel({ muted: true }),
};

/** Paused — the center transport button shows ▶ (tap to resume) + status shows ⏸. */
export const Paused: StoryObj = {
  name: 'Paused (play button shows ▶)',
  render: () => panel({ playState: 'paused' }),
};

/** Harmony only — a home with no Shield transport (activities + volume, no playback/apps). */
export const HarmonyOnly: StoryObj = {
  name: 'Harmony only',
  render: () => panel({ transport: false, nowPlaying: '' }),
};

/** A non-primary room selected → the read-only device status view. */
export const OtherRoom: StoryObj = {
  name: 'Non-primary room (read-only)',
  render: () => panel({ selectedArea: 'Bedroom' }),
};

/** Error state → the Retry banner. */
export const Error: StoryObj = {
  name: 'Error',
  render: () => panel({ error: 'Could not reach the Remote.' }),
};
