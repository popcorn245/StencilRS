import { newSpecPage } from '../../test-utils/spec-page';
import { PopMetricCard } from './metric-card';

describe('pop-metric-card', () => {
  it('renders glyph, label, value and sub', async () => {
    const page = await newSpecPage({
      components: [PopMetricCard],
      html: `<pop-metric-card glyph="⚖️" label="Weight" value="150.7 lbs" sub="Jul 15"></pop-metric-card>`,
    });
    expect(page.root.querySelector('.mc__glyph')?.textContent).toBe('⚖️');
    expect(page.root.querySelector('.mc__label')?.textContent).toBe('Weight');
    expect(page.root.querySelector('.mc__value')?.textContent).toBe('150.7 lbs');
    expect(page.root.querySelector('.mc__sub')?.textContent).toBe('Jul 15');
  });

  it('omits the sub line when empty', async () => {
    const page = await newSpecPage({
      components: [PopMetricCard],
      html: `<pop-metric-card label="BMI" value="21"></pop-metric-card>`,
    });
    expect(page.root.querySelector('.mc__sub')).toBeNull();
  });

  it('shows the tap-to-log affordance only when loggable', async () => {
    const off = await newSpecPage({
      components: [PopMetricCard],
      html: `<pop-metric-card label="BMI" value="21"></pop-metric-card>`,
    });
    expect(off.root.querySelector('.mc__plus')).toBeNull();
    expect(off.root.querySelector('.mc__hint')).toBeNull();

    const on = await newSpecPage({
      components: [PopMetricCard],
      html: `<pop-metric-card label="Weight" value="150" loggable="true"></pop-metric-card>`,
    });
    expect(on.root.querySelector('.mc__plus')).not.toBeNull();
    expect(on.root.querySelector('.mc__hint')?.textContent).toBe('Tap to log');
    expect(on.root.querySelector('.mc--loggable')).not.toBeNull();
  });

  it('reflects the active state on the button', async () => {
    const page = await newSpecPage({
      components: [PopMetricCard],
      html: `<pop-metric-card label="Weight" value="150" loggable="true" active="true"></pop-metric-card>`,
    });
    const btn = page.root.querySelector('.mc') as HTMLButtonElement;
    expect(btn.classList.contains('mc--on')).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('emits popCardTap with the cardKey on tap', async () => {
    const page = await newSpecPage({
      components: [PopMetricCard],
      html: `<pop-metric-card label="Weight" value="150" card-key="weight" loggable="true"></pop-metric-card>`,
    });
    const events: string[] = [];
    page.root.addEventListener('popCardTap', (e: any) => events.push(e.detail));
    (page.root.querySelector('.mc') as HTMLButtonElement).click();
    expect(events).toEqual(['weight']);
  });

  it('falls back to the label as the tap detail when no cardKey is set', async () => {
    const page = await newSpecPage({
      components: [PopMetricCard],
      html: `<pop-metric-card label="Popcoin" value="120" loggable="true"></pop-metric-card>`,
    });
    let detail = '';
    page.root.addEventListener('popCardTap', (e: any) => (detail = e.detail));
    (page.root.querySelector('.mc') as HTMLButtonElement).click();
    expect(detail).toBe('Popcoin');
  });
});
