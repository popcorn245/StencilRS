import { newSpecPage } from '../../test-utils/spec-page';
import { ProgressBar } from './progress-bar';

describe('pop-progress-bar', () => {
  it('renders with default values', async () => {
    const page = await newSpecPage({
      components: [ProgressBar],
      html: `<pop-progress-bar value="50"></pop-progress-bar>`,
    });
    expect(page.root.querySelector('.pb-track')).not.toBeNull();
    expect(page.root.querySelector('.pb-fill')).not.toBeNull();
  });

  it('sets correct width percentage', async () => {
    const page = await newSpecPage({
      components: [ProgressBar],
      html: `<pop-progress-bar value="75" max="100"></pop-progress-bar>`,
    });
    const fill = page.root.querySelector('.pb-fill') as HTMLElement;
    expect(fill.style.width).toBe('75%');
  });

  it('applies size class', async () => {
    const page = await newSpecPage({
      components: [ProgressBar],
      html: `<pop-progress-bar value="50" size="sm"></pop-progress-bar>`,
    });
    expect(page.root.querySelector('.pb-track--sm')).not.toBeNull();
  });

  it('has correct aria attributes', async () => {
    const page = await newSpecPage({
      components: [ProgressBar],
      html: `<pop-progress-bar value="30" max="50" label="Loading"></pop-progress-bar>`,
    });
    const track = page.root.querySelector('[role="progressbar"]');
    expect(track).not.toBeNull();
    expect(track.getAttribute('aria-valuenow')).toBe('30');
    expect(track.getAttribute('aria-valuemax')).toBe('50');
  });
});
