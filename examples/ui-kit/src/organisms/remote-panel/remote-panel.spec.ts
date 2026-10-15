import { newSpecPage } from '../../test-utils/spec-page';
import { PopRemotePanel } from './remote-panel';

const activities = [
  { id: '1', label: 'SHIELD TV' },
  { id: '2', label: 'Switch' },
  { id: '3', label: 'Music' },
];
const current = { activityId: '1', activityLabel: 'SHIELD TV', level: 34, known: true };
const rooms = [
  { area: 'Family Room', emoji: '📺', primary: true, devices: [{ label: 'Shield Pro', state: 'playing', app: 'Netflix' }] },
  { area: 'Bedroom', emoji: '🛏️', primary: false, devices: [{ label: 'Roku TV', state: 'off' }] },
];

const asAttr = (o: unknown) => JSON.stringify(o).replace(/"/g, '&quot;');

function mount(extra = '', playState = 'playing') {
  return `<pop-remote-panel
    harmony-enabled="true"
    transport-enabled="true"
    now-playing="Netflix"
    play-state="${playState}"
    activities="${asAttr(activities)}"
    current="${asAttr(current)}"
    rooms="${asAttr(rooms)}"
    ${extra}
  ></pop-remote-panel>`;
}

describe('pop-remote-panel', () => {
  it('renders the room header, activities, volume, transport and apps', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount() });
    expect(page.root.querySelector('.rp-room')?.textContent).toBe('Family Room');
    // Off is not a grid card; the 3 non-off activities render.
    expect(page.root.querySelectorAll('.rp-act').length).toBe(3);
    expect(page.root.querySelector('.rp-vol-card')).not.toBeNull();
    // 5-button transport row (rewind, previous, play/pause, next, forward).
    expect(page.root.querySelectorAll('.rp-tbtn').length).toBe(5);
    expect(page.root.querySelectorAll('.rp-app-tile').length).toBe(8);
  });

  it('shows the live volume level in the readout and status line', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount() });
    expect(page.root.querySelector('.rp-vol-num')?.textContent).toBe('34');
    expect(page.root.querySelector('.rp-status-vol')?.textContent).toContain('Vol 34');
  });

  it('emits popActivityStart with the activity id', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount() });
    const events: string[] = [];
    page.root.addEventListener('popActivityStart', (e: any) => events.push(e.detail));
    (page.root.querySelectorAll('.rp-act')[1] as HTMLButtonElement).click();
    expect(events).toEqual(['2']);
  });

  it('emits popPowerOff when the power button is pressed', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount() });
    let fired = 0;
    page.root.addEventListener('popPowerOff', () => fired++);
    (page.root.querySelector('.rp-power') as HTMLButtonElement).click();
    expect(fired).toBe(1);
  });

  it('emits popVolumeStep on a ± tap and previews the level optimistically', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount() });
    const steps: { dir: string }[] = [];
    page.root.addEventListener('popVolumeStep', (e: any) => steps.push(e.detail));
    const up = page.root.querySelectorAll('.rp-volbtn')[2] as HTMLButtonElement;
    up.dispatchEvent(new Event('pointerdown'));
    up.dispatchEvent(new Event('pointerup')); // stop the hold-to-repeat timer
    await page.waitForChanges();
    expect(steps).toEqual([{ dir: 'up' }]);
    // Optimistic +1 preview (34 → 35).
    expect(page.root.querySelector('.rp-vol-num')?.textContent).toBe('35');
  });

  it('emits popMuteToggle when the mute button is tapped', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount() });
    let fired = 0;
    page.root.addEventListener('popMuteToggle', () => fired++);
    (page.root.querySelector('.rp-volbtn--mute') as HTMLButtonElement).click();
    expect(fired).toBe(1);
  });

  it('reflects the muted prop: amber mute button + muted volume card', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount('muted="true"') });
    expect(page.root.querySelector('.rp-vol-card--muted')).not.toBeNull();
    expect(page.root.querySelector('.rp-volbtn--muted')).not.toBeNull();
    expect(page.root.querySelector('.rp-status-vol')?.textContent).toContain('Muted');
  });

  it('shows the state-aware play glyph: ⏸ when playing, ▶ when paused', async () => {
    const playing = await newSpecPage({ components: [PopRemotePanel], html: mount() });
    const playIcon = playing.root.querySelector('.rp-tbtn--play pop-icon');
    expect(playIcon?.getAttribute('name')).toBe('pause');

    const paused = await newSpecPage({ components: [PopRemotePanel], html: mount('', 'paused') });
    const pausedIcon = paused.root.querySelector('.rp-tbtn--play pop-icon');
    expect(pausedIcon?.getAttribute('name')).toBe('play');
  });

  it('emits popTransport with the action when a transport button is tapped', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount() });
    const actions: string[] = [];
    page.root.addEventListener('popTransport', (e: any) => actions.push(e.detail));
    (page.root.querySelector('.rp-tbtn--play') as HTMLButtonElement).click();
    expect(actions).toEqual(['toggle']);
  });

  it('emits popAppLaunch with the app key', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount() });
    const keys: string[] = [];
    page.root.addEventListener('popAppLaunch', (e: any) => keys.push(e.detail));
    (page.root.querySelector('.rp-app-tile') as HTMLButtonElement).click();
    expect(keys).toEqual(['netflix']);
  });

  it('opens the room menu and emits popRoomChange on a pick', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount() });
    const areas: string[] = [];
    page.root.addEventListener('popRoomChange', (e: any) => areas.push(e.detail));
    (page.root.querySelector('.rp-roomtrigger') as HTMLButtonElement).click();
    await page.waitForChanges();
    const items = page.root.querySelectorAll('.rp-roomitem');
    expect(items.length).toBe(2);
    (items[1] as HTMLButtonElement).click();
    expect(areas).toEqual(['Bedroom']);
  });

  it('renders the read-only device view for a non-primary room', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount('selected-area="Bedroom"') });
    expect(page.root.querySelector('.rp-otherroom')).not.toBeNull();
    expect(page.root.querySelector('.rp-readonly-badge')).not.toBeNull();
    expect(page.root.querySelector('.rp-act')).toBeNull(); // no live controls
  });

  it('renders the error banner + emits popRetry', async () => {
    const page = await newSpecPage({ components: [PopRemotePanel], html: mount('error="Could not reach the Remote."') });
    let fired = 0;
    page.root.addEventListener('popRetry', () => fired++);
    expect(page.root.querySelector('.rp-error')?.textContent).toContain('Could not reach the Remote.');
    (page.root.querySelector('.rp-error .rp-btn') as HTMLButtonElement).click();
    expect(fired).toBe(1);
  });
});
