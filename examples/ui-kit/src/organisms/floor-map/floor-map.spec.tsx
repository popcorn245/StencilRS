import { newSpecPage } from '../../test-utils/spec-page';
import { PopFloorMap } from './floor-map';

/**
 * pop-floor-map — House-Layout geometry mode (docs bucket-bot/house-layout):
 * rooms carrying `geometry` are DRAWN by the overlay (visible rect + label +
 * dimension caption) with no base SVG, the basement floor renders in the
 * switcher, the default floor prefers ground level (0) over the basement (-1),
 * and legacy rooms without geometry keep the base-SVG hit-zone behavior (no
 * overlay rect until the base boxes are mirrored).
 */

const plan = {
  id: 'home',
  homeOwnerId: 'home',
  floors: [
    { id: 'main', name: 'Main Floor', level: 0, svgAsset: 'main.svg' },
    { id: 'basement', name: 'Basement', level: -1, svgAsset: 'basement.svg' },
  ],
  rooms: [
    {
      id: 'master-bedroom',
      name: 'Master Bedroom',
      floorId: 'main',
      svgGroupId: 'room-master-bedroom',
      aliases: ['master bedroom'],
      dims: { width: 150, length: 158.5, height: 96 },
      geometry: { x: 40, y: 300, w: 135, h: 143 },
    },
    {
      id: 'tiny-nook',
      name: 'Nook',
      floorId: 'main',
      svgGroupId: 'room-tiny-nook',
      aliases: ['nook'],
      geometry: { x: 300, y: 390, w: 117, h: 17 },
    },
    // Legacy room: NO geometry → depends on the base-SVG group box.
    { id: 'legacy', name: 'Legacy', floorId: 'main', svgGroupId: 'room-legacy', aliases: [] },
    {
      id: 'art-studio',
      name: 'Art Studio',
      floorId: 'basement',
      svgGroupId: 'room-art-studio',
      aliases: ['art studio'],
      dims: { width: 145, length: 130, height: 92.5 },
      geometry: { x: 40, y: 210, w: 130, h: 117 },
    },
  ],
  devices: [],
  edges: [],
  updatedAt: 1,
};

const mk = (attrs = '') =>
  `<pop-floor-map plan='${JSON.stringify(plan)}' ${attrs}></pop-floor-map>`;

describe('pop-floor-map — geometry-driven rooms', () => {
  it('defaults to the GROUND floor (level 0), not the basement (level -1)', async () => {
    const page = await newSpecPage({ components: [PopFloorMap], html: mk() });
    const select = page.root.querySelector('.fm__floor-select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    const selected = select.querySelector('option[selected]') as HTMLOptionElement;
    expect(selected.value).toBe('main');
  });

  it('renders the basement in the floor switcher', async () => {
    const page = await newSpecPage({ components: [PopFloorMap], html: mk() });
    const options = Array.from(page.root.querySelectorAll('.fm__floor-select option')).map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(options).toContain('basement');
    expect(options).toContain('main');
  });

  it('draws geometry rooms directly (rect + name label + dimension caption)', async () => {
    const page = await newSpecPage({ components: [PopFloorMap], html: mk() });
    const geoZones = page.root.querySelectorAll('.fm__zone--geo');
    // master-bedroom + tiny-nook on the main floor (legacy room has no box yet).
    expect(geoZones.length).toBe(2);
    const rect = page.root.querySelector('.fm__zone-rect--geo') as SVGRectElement;
    expect(rect.getAttribute('x')).toBe('40');
    expect(rect.getAttribute('width')).toBe('135');
    const names = Array.from(page.root.querySelectorAll('.fm__geo-name')).map((t) => t.textContent);
    expect(names).toContain('Master Bedroom');
    const caption = page.root.querySelector('.fm__geo-dims');
    expect(caption?.textContent).toBe("12'6″ × 13'2½″");
  });

  it('suppresses the label + caption on boxes too small to fit them', async () => {
    const page = await newSpecPage({ components: [PopFloorMap], html: mk() });
    // The 117×17 nook: h < 26 → no name, h < 52 → no caption.
    const names = Array.from(page.root.querySelectorAll('.fm__geo-name')).map((t) => t.textContent);
    expect(names).not.toContain('Nook');
    expect(page.root.querySelectorAll('.fm__geo-dims').length).toBe(1);
  });

  it('keeps legacy rooms on the base-SVG path (no overlay rect without boxes)', async () => {
    const page = await newSpecPage({ components: [PopFloorMap], html: mk() });
    // 3 main-floor rooms, but only the 2 geometry rooms rendered zones.
    expect(page.root.querySelectorAll('.fm__zone').length).toBe(2);
  });

  it('renders geometry rooms on the basement floor with NO base SVG', async () => {
    const page = await newSpecPage({ components: [PopFloorMap], html: mk('active-floor-id="basement"') });
    const names = Array.from(page.root.querySelectorAll('.fm__geo-name')).map((t) => t.textContent);
    expect(names).toContain('Art Studio');
    // Geometry-driven floor → the base layer is OMITTED entirely; the overlay
    // carries the whole floor (code-review finding #1: a stale base SVG would
    // double-render old rooms underneath the cards).
    expect(page.root.querySelector('.fm__base')).toBeNull();
  });

  it('never injects a base SVG under a geometry-driven floor', async () => {
    // Fully-geometry plan (no legacy room) on the MAIN floor — even if built-in
    // artwork existed for the floor id, the base layer must not render.
    const geoOnly = {
      ...plan,
      rooms: plan.rooms.filter((r) => r.id !== 'legacy'),
    };
    const page = await newSpecPage({
      components: [PopFloorMap],
      html: `<pop-floor-map plan='${JSON.stringify(geoOnly)}'></pop-floor-map>`,
    });
    expect(page.root.querySelector('.fm__base')).toBeNull();
    // The real rooms still render as overlay cards.
    expect(page.root.querySelectorAll('.fm__zone--geo').length).toBe(2);
  });

  it('read-only surface emits roomSelect on a geometry-room click', async () => {
    const page = await newSpecPage({ components: [PopFloorMap], html: mk() });
    const selected: string[] = [];
    page.root.addEventListener('roomSelect', (e: Event) =>
      selected.push((e as CustomEvent<{ roomId: string }>).detail.roomId),
    );
    (page.root.querySelector('.fm__zone--geo') as SVGGElement).dispatchEvent(
      new Event('click', { bubbles: true }),
    );
    await page.waitForChanges();
    expect(selected).toEqual(['master-bedroom']);
  });
});
