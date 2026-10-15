import { newSpecPage } from '../../test-utils/spec-page';
import { PopThreadCardShowtimes } from './thread-card-showtimes';

/** Mount the card and assign the OBJECT payload as a property, then re-render. */
async function mount(payload: unknown, attrs = '') {
  const page = await newSpecPage<PopThreadCardShowtimes>({
    components: [PopThreadCardShowtimes],
    html: `<pop-thread-card-showtimes ${attrs}></pop-thread-card-showtimes>`,
  });
  page.rootInstance.payload = payload as any;
  await page.waitForChanges();
  return page;
}

const showtimes = {
  title: 'Showtimes',
  data: {
    date: '2026-08-02',
    movie: 'Dune: Part Three',
    theaters: [
      { name: 'Alamo Drafthouse — Lakeline', address: '14028 US-183', times: ['1:15 PM', '4:40 PM'] },
      { name: 'AMC Barton Creek 14', times: ['12:30 PM', '3:50 PM', '7:10 PM'] },
    ],
  },
};

describe('pop-thread-card-showtimes', () => {
  it('is THEATER-FIRST: each theater is a heading with its times under it', async () => {
    const page = await mount(showtimes);
    const headings = Array.from(page.root.querySelectorAll('.tcs__theater-name')).map((h) => h.textContent);
    expect(headings).toEqual(['Alamo Drafthouse — Lakeline', 'AMC Barton Creek 14']);
    const firstGroup = page.root.querySelectorAll('.tcs__theater')[0];
    const times = Array.from(firstGroup.querySelectorAll('.tcs__time')).map((t) => t.textContent);
    expect(times).toEqual(['1:15 PM', '4:40 PM']);
  });

  it('never renders ticket links', async () => {
    const page = await mount(showtimes);
    expect(page.root.querySelectorAll('a')).toHaveLength(0);
    expect(page.root.innerHTML).not.toContain('http');
  });

  it('emits open_theater with the theater name + address', async () => {
    const page = await mount(showtimes);
    const seen: any[] = [];
    page.root.addEventListener('popCardAction', (e) => seen.push((e as CustomEvent).detail));
    (page.root.querySelector('.tcs__theater button') as HTMLButtonElement).click();
    expect(seen).toEqual([
      { actionId: 'open_theater', params: { theater: 'Alamo Drafthouse — Lakeline', address: '14028 US-183' } },
    ]);
  });

  it('frozen: both actions are navigational, so they survive the freeze', async () => {
    const page = await mount(showtimes, 'liveness="frozen"');
    expect(page.root.querySelector('.tcs--frozen')).toBeTruthy();
    const labels = Array.from(page.root.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
    expect(labels).toContain('Open Alamo Drafthouse — Lakeline');
    expect(labels).toContain('Add to calendar');
  });

  it('readonly: renders no action buttons at all', async () => {
    const page = await mount(showtimes, 'readonly');
    expect(page.root.querySelectorAll('button')).toHaveLength(0);
  });

  it('renders an empty message when no theaters were found', async () => {
    const page = await mount({ title: 'Showtimes', data: { date: '2026-08-02', movie: 'Indie', theaters: [] } });
    expect(page.root.textContent).toContain('No showtimes found.');
  });

  it('falls back instead of throwing on a garbage payload', async () => {
    const page = await mount(null);
    expect(page.root.textContent).toContain("couldn't render this card");
  });
});
