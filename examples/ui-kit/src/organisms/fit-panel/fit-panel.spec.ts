import { newSpecPage } from '../../test-utils/spec-page';
import { PopFitPanel } from './fit-panel';
import { PopMetricCard } from '../../molecules/metric-card/metric-card';

const today = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = iso(today);

const latest = {
  weightLbs: 150.7,
  weightAt: today.getTime(),
  bodyFatPct: 14.7,
  bmi: 21,
  glucose: 101,
  glucoseAt: today.getTime(),
  glucoseContext: 'random',
  caloriesToday: 0,
  workoutsInWindow: 2,
};
const goals = { glucoseMin: 70, glucoseMax: 99, goalWeightLbs: 148, dailyCalorieGoal: 2000, glucoseBandSource: 'personal' };
const weightSeries = [155, 153, 150.7].map((v, i) => ({ t: today.getTime() - i * 86400000, v }));
const glucoseSeries = [96, 110, 101].map((v, i) => ({ t: today.getTime() - i * 86400000, v, context: 'random', verdict: 'in_range' }));
const caloriesSeries = [1850, 2100, 1720].map((v, i) => ({ day: iso(new Date(today.getTime() - i * 86400000)), v }));
const readings = { glucose: [], body: [], food: [], workouts: [] };

const asAttr = (o: unknown) => JSON.stringify(o).replace(/"/g, '&quot;');

function html(extra = '', rd: unknown = readings) {
  return `<pop-fit-panel show-header="false" days="${TODAY}" latest="${asAttr(latest)}" goals="${asAttr(goals)}" weight-series="${asAttr(weightSeries)}" glucose-series="${asAttr(glucoseSeries)}" calories-series="${asAttr(caloriesSeries)}" readings="${asAttr(rd)}" ${extra}></pop-fit-panel>`;
}

const rowBtn = (root: Element, title: string) =>
  Array.from(root.querySelectorAll('.fitp-dayrow-actions .fitp-rowbtn')).find((b) => b.getAttribute('title') === title) as HTMLButtonElement;

describe('pop-fit-panel', () => {
  it('renders the six metric cards from latest + goals (day-aware)', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html() });
    const cards = Array.from(page.root.querySelectorAll('pop-metric-card')) as any[];
    expect(cards.length).toBe(6);
    // Card values come through (weight on one line, first card).
    expect(cards[0].value).toBe('150.7 lbs');
    // Cards are loggable (tap-to-log) with their key.
    expect(cards[0].loggable).toBe(true);
    expect(cards.map((c) => c.cardKey)).toEqual(['weight', 'bodyfat', 'bmi', 'bg', 'calories', 'workout']);
    // "Calories today" label when the day is today.
    expect(cards.map((c) => c.label)).toContain('Calories today');
  });

  it('shows the loading state when no data', async () => {
    const page = await newSpecPage({
      components: [PopFitPanel, PopMetricCard],
      html: `<pop-fit-panel show-header="false" loading="true"></pop-fit-panel>`,
    });
    expect(page.root.querySelector('.fitp-state')?.textContent).toContain('Loading');
    expect(page.root.querySelector('pop-metric-card')).toBeNull();
  });

  it('shows the error state with a Retry that emits popRefresh', async () => {
    const page = await newSpecPage({
      components: [PopFitPanel, PopMetricCard],
      html: `<pop-fit-panel show-header="false" error="boom"></pop-fit-panel>`,
    });
    expect(page.root.querySelector('.fitp-state--err')?.textContent).toContain('boom');
    let fired = 0;
    page.root.addEventListener('popRefresh', () => fired++);
    (page.root.querySelector('.fitp-btn') as HTMLButtonElement).click();
    expect(fired).toBe(1);
  });

  it('opens the log form in the action zone when activeCard is set (pop-field)', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html('active-card="weight"') });
    expect(page.root.querySelector('.fitp-actionzone')).not.toBeNull();
    expect(page.root.querySelector('.fitp-cardform')).not.toBeNull();
    expect(page.root.querySelector('pop-field')).not.toBeNull();
    // The tapped card (weight, first) reads as active.
    expect((page.root.querySelector('pop-metric-card') as any).active).toBe(true);
  });

  it('blood-sugar form keeps a context field (select)', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html('active-card="bg"') });
    const specs = Array.from(page.root.querySelectorAll('pop-field'));
    expect(specs.length).toBe(2);
  });

  it('emits popCancelLog from the form Cancel button', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html('active-card="weight"') });
    let fired = 0;
    page.root.addEventListener('popCancelLog', () => fired++);
    const cancel = Array.from(page.root.querySelectorAll('.fitp-cardform-actions .fitp-btn')).find((b) => b.textContent === 'Cancel') as HTMLButtonElement;
    cancel.click();
    expect(fired).toBe(1);
  });

  it('re-emits popCardTap from a metric card up to the host', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html() });
    const taps: string[] = [];
    page.root.addEventListener('popCardTap', (e: any) => taps.push(e.detail));
    // The inner pop-metric-card emits popCardTap(cardKey); the panel re-emits it.
    (page.rootInstance as any).onCardTap({ detail: 'bg', stopPropagation() {} });
    await page.waitForChanges();
    expect(taps).toEqual(['bg']);
  });

  it('renders the readings-by-day empty state and the disclaimer', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html() });
    expect(page.root.querySelector('.fitp-empty')?.textContent).toContain('No readings logged');
    expect(page.root.querySelector('.fitp-disclaimer')).not.toBeNull();
  });

  it('renders three consolidated charts via pop-line-chart', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html() });
    // weight (line), glucose (line), calories (bars) → three pop-line-chart hosts.
    expect(page.root.querySelectorAll('pop-line-chart').length).toBe(3);
  });

  it('has no user/child switcher', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html() });
    expect(page.root.querySelector('.fitp-kids')).toBeNull();
    expect(page.root.textContent).not.toContain('Whose data');
  });
});

describe('pop-fit-panel — readings inline edit / delete', () => {
  const glucoseR = { id: 'g1', value: 101, context: 'random', takenAt: today.getTime(), note: null };
  const foodR = { id: 'f1', description: 'toast', calories: 120, mealType: 'snack', loggedAt: today.getTime() };
  const withGlucose = { glucose: [glucoseR], body: [], food: [], workouts: [] };
  const withFood = { glucose: [], body: [], food: [foodR], workouts: [] };

  it('renders a reading row with edit + delete affordances', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html('', withGlucose) });
    expect(page.root.querySelectorAll('.fitp-dayrow').length).toBe(1);
    expect(rowBtn(page.root, 'Edit')).toBeTruthy();
    expect(rowBtn(page.root, 'Delete')).toBeTruthy();
  });

  it('opens the inline edit form (glucose: value + context + note pop-fields) and Save emits popEditReading with the patch', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html('', withGlucose) });
    rowBtn(page.root, 'Edit').click();
    await page.waitForChanges();
    expect(page.root.querySelector('.fitp-dayrow--edit')).not.toBeNull();
    // glucose → three fields (value, context select, note).
    expect(page.root.querySelectorAll('.fitp-dayrow-fields pop-field').length).toBe(3);

    const events: any[] = [];
    page.root.addEventListener('popEditReading', (e: any) => events.push(e.detail));
    const save = Array.from(page.root.querySelectorAll('.fitp-dayrow--edit .fitp-btn')).find((b) => b.textContent === 'Save') as HTMLButtonElement;
    save.click();
    await page.waitForChanges();
    // Patch is seeded from the reading's current values (numbers parsed, note ''→ from null).
    expect(events).toEqual([{ domain: 'glucose', id: 'g1', patch: { value: 101, context: 'random', note: '' } }]);
  });

  it('edits a food reading with its own fields (description + calories)', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html('', withFood) });
    rowBtn(page.root, 'Edit').click();
    await page.waitForChanges();
    expect(page.root.querySelectorAll('.fitp-dayrow-fields pop-field').length).toBe(2);
    const events: any[] = [];
    page.root.addEventListener('popEditReading', (e: any) => events.push(e.detail));
    (Array.from(page.root.querySelectorAll('.fitp-dayrow--edit .fitp-btn')).find((b) => b.textContent === 'Save') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(events).toEqual([{ domain: 'food', id: 'f1', patch: { description: 'toast', calories: 120 } }]);
  });

  it('deletes via a two-step confirm and emits popDeleteReading', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html('', withGlucose) });
    const events: any[] = [];
    page.root.addEventListener('popDeleteReading', (e: any) => events.push(e.detail));

    rowBtn(page.root, 'Delete').click();
    await page.waitForChanges();
    // First tap only reveals the confirm — no delete yet.
    const confirm = page.root.querySelector('.fitp-rowbtn--danger') as HTMLButtonElement;
    expect(confirm.textContent).toContain('Delete?');
    expect(events.length).toBe(0);

    confirm.click();
    await page.waitForChanges();
    expect(events).toEqual([{ domain: 'glucose', id: 'g1' }]);
  });

  it('clears transient row state when the readings prop changes (host refresh landed)', async () => {
    const page = await newSpecPage({ components: [PopFitPanel, PopMetricCard], html: html('', withGlucose) });
    rowBtn(page.root, 'Edit').click();
    await page.waitForChanges();
    expect(page.root.querySelector('.fitp-dayrow--edit')).not.toBeNull();
    // Host revalidates → readings prop changes → the @Watch resets transient row state.
    (page.rootInstance as any).onReadingsChange();
    await page.waitForChanges();
    expect(page.root.querySelector('.fitp-dayrow--edit')).toBeNull();
    expect((page.rootInstance as any).rowBusy).toBe(false);
  });
});
