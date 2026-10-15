import { newSpecPage } from '../../test-utils/spec-page';
import { PopWeatherPanel } from './weather-panel';

const forecast = {
  place: 'St. Charles, MO',
  current: { temp: 78, conditions: 'Partly cloudy', icon: 'partly', feelsLike: 82, wind: 9 },
  hourly: [
    { time: '2026-07-09T13:00', label: 'Now', temp: 78, humidity: 42, precipProb: 5, isDay: true, code: 0, icon: 'partly' },
    { time: '2026-07-09T14:00', label: '2p', temp: 82, humidity: 38, precipProb: 20, isDay: true, code: 0, icon: 'rainy' },
  ],
  days: [
    { date: '2026-07-09', label: 'Today', code: 0, conditions: 'Rain showers', icon: 'rainy', hi: 84, lo: 66, precip: 45, wind: 8, humidity: 58, sunrise: '06:04', sunset: '20:22' },
    { date: '2026-07-10', label: 'Tomorrow', code: 0, conditions: 'Sunny', icon: 'sunny', hi: 88, lo: 68, precip: 10, wind: 9, humidity: 46 },
  ],
};

const asAttr = (o: unknown) => JSON.stringify(o).replace(/"/g, '&quot;');

describe('pop-weather-panel', () => {
  it('renders the empty state when no data and not loading', async () => {
    const page = await newSpecPage({
      components: [PopWeatherPanel],
      html: `<pop-weather-panel></pop-weather-panel>`,
    });
    expect(page.root.querySelector('.wx-empty')).not.toBeNull();
    expect(page.root.querySelector('.wx-now')).toBeNull();
  });

  it('renders the loading skeleton when loading and no data', async () => {
    const page = await newSpecPage({
      components: [PopWeatherPanel],
      html: `<pop-weather-panel loading="true"></pop-weather-panel>`,
    });
    expect(page.root.querySelector('.wx-skeleton')).not.toBeNull();
    expect(page.root.querySelector('.wx-empty')).toBeNull();
  });

  it('renders header, place, and current conditions from `data`', async () => {
    const page = await newSpecPage({
      components: [PopWeatherPanel],
      html: `<pop-weather-panel data="${asAttr(forecast)}"></pop-weather-panel>`,
    });
    expect(page.root.querySelector('.wx-title')?.textContent).toBe('Weather');
    expect(page.root.querySelector('.wx-place')?.textContent).toBe('St. Charles, MO');
    expect(page.root.querySelector('.wx-now-temp')?.textContent).toBe('78°');
    expect(page.root.querySelector('.wx-now-cond')?.textContent).toBe('Partly cloudy');
  });

  it('renders the enriched current-conditions meta: feels-like, wind, sunrise + sunset', async () => {
    const page = await newSpecPage({
      components: [PopWeatherPanel],
      html: `<pop-weather-panel data="${asAttr(forecast)}"></pop-weather-panel>`,
    });
    const meta = page.root.querySelector('.wx-now-meta');
    expect(meta).not.toBeNull();
    const text = meta!.textContent!.replace(/\s+/g, ' ');
    expect(text).toContain('Feels 82°');
    expect(text).toContain('9 mph');
    // Sun times carry an explicit label (never a bare "06:04 20:22").
    expect(text).toContain('Sunrise 06:04'); // today's sunrise (from days[0])
    expect(text).toContain('Sunset 20:22'); // today's sunset
  });

  it('slots a host-supplied place control into the current-conditions card', async () => {
    const page = await newSpecPage({
      components: [PopWeatherPanel],
      html: `<pop-weather-panel show-header="false" data="${asAttr(forecast)}"><span slot="place" class="probe-place">St. Charles</span></pop-weather-panel>`,
    });
    // The place slot wrapper renders inside the current-conditions card…
    const place = page.root.querySelector('.wx-now');
    expect(place?.querySelector('.wx-now-place')).not.toBeNull();
    expect(place?.querySelector('slot[name="place"]')).not.toBeNull();
    // …and the host-slotted control is accepted (projected into the panel).
    expect(page.root.querySelector('.probe-place')?.textContent).toBe('St. Charles');
  });

  it('omits the meta row when current has no feels-like / wind and no sun times', async () => {
    const bare = { place: 'X', current: { temp: 70, conditions: 'clear', icon: 'sunny' }, days: [], hourly: [{ time: '2026-07-09T13:00', label: 'Now', temp: 70, humidity: 40, precipProb: 0, isDay: true, code: 0, icon: 'sunny' }] };
    const page = await newSpecPage({
      components: [PopWeatherPanel],
      html: `<pop-weather-panel data="${asAttr(bare)}"></pop-weather-panel>`,
    });
    expect(page.root.querySelector('.wx-now')).not.toBeNull();
    expect(page.root.querySelector('.wx-now-meta')).toBeNull();
  });

  it('defaults to the Hourly tab and renders one row per hour', async () => {
    const page = await newSpecPage({
      components: [PopWeatherPanel],
      html: `<pop-weather-panel data="${asAttr(forecast)}"></pop-weather-panel>`,
    });
    expect(page.root.querySelectorAll('.wx-hour').length).toBe(2);
    expect(page.root.querySelector('.wx-day')).toBeNull();
  });

  it('honors a custom `heading`', async () => {
    const page = await newSpecPage({
      components: [PopWeatherPanel],
      html: `<pop-weather-panel heading="Forecast" data="${asAttr(forecast)}"></pop-weather-panel>`,
    });
    expect(page.root.querySelector('.wx-title')?.textContent).toBe('Forecast');
  });

  it('switches to the Daily tab on click and emits popTabChange', async () => {
    const page = await newSpecPage({
      components: [PopWeatherPanel],
      html: `<pop-weather-panel data="${asAttr(forecast)}"></pop-weather-panel>`,
    });
    const events: string[] = [];
    page.root.addEventListener('popTabChange', (e: any) => events.push(e.detail));

    const dailyBtn = page.root.querySelectorAll('.wx-tab')[1] as HTMLButtonElement;
    dailyBtn.click();
    await page.waitForChanges();

    expect(events).toEqual(['daily']);
    expect(page.root.querySelectorAll('.wx-day').length).toBe(2);
    expect(page.root.querySelector('.wx-hour')).toBeNull();
  });

  it('hides its own header when showHeader is false (host supplies chrome)', async () => {
    const page = await newSpecPage({
      components: [PopWeatherPanel],
      html: `<pop-weather-panel show-header="false" data="${asAttr(forecast)}"></pop-weather-panel>`,
    });
    expect(page.root.querySelector('.wx-header')).toBeNull();
    // Body still renders (current + tabs + rows).
    expect(page.root.querySelector('.wx-now')).not.toBeNull();
    expect(page.root.querySelectorAll('.wx-hour').length).toBe(2);
  });

  it('emits popRefresh when the header refresh button is pressed', async () => {
    const page = await newSpecPage({
      components: [PopWeatherPanel],
      html: `<pop-weather-panel data="${asAttr(forecast)}"></pop-weather-panel>`,
    });
    let fired = 0;
    page.root.addEventListener('popRefresh', () => fired++);
    (page.root.querySelector('.wx-refresh') as HTMLButtonElement).click();
    expect(fired).toBe(1);
  });
});
