import { newSpecPage } from '../../test-utils/spec-page';
import { PopModelSelector } from './model-selector';

const sampleModels = JSON.stringify([
  {
    group: 'Anthropic',
    models: [
      { value: 'claude-sonnet-4', label: 'Claude Sonnet 4', icon: '🟣' },
      { value: 'claude-haiku-3', label: 'Claude Haiku 3', icon: '🔵' },
    ],
  },
]);

describe('pop-model-selector', () => {
  it('renders the pill button', async () => {
    const page = await newSpecPage({
      components: [PopModelSelector],
      html: `<pop-model-selector models='${sampleModels}' selected-model="claude-sonnet-4"></pop-model-selector>`,
    });
    const pill = page.root.querySelector('.ms-pill');
    expect(pill).toBeTruthy();
  });

  it('does not show dropdown initially', async () => {
    const page = await newSpecPage({
      components: [PopModelSelector],
      html: `<pop-model-selector models='${sampleModels}'></pop-model-selector>`,
    });
    expect(page.root.querySelector('.ms-dropdown-panel')).toBeNull();
  });

  it('shows dropdown when pill is clicked', async () => {
    const page = await newSpecPage({
      components: [PopModelSelector],
      html: `<pop-model-selector models='${sampleModels}'></pop-model-selector>`,
    });
    (page.root.querySelector('.ms-pill') as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(page.root.querySelector('.ms-dropdown-panel')).toBeTruthy();
  });

  it('emits popModelChanged when a model is selected', async () => {
    const page = await newSpecPage({
      components: [PopModelSelector],
      html: `<pop-model-selector models='${sampleModels}' selected-model="claude-sonnet-4"></pop-model-selector>`,
    });
    const events: CustomEvent[] = [];
    page.root.addEventListener('popModelChanged', (e: Event) => events.push(e as CustomEvent));

    (page.root.querySelector('.ms-pill') as HTMLButtonElement).click();
    await page.waitForChanges();

    const options = page.root.querySelectorAll('.ms-option');
    // Click 'Claude Haiku 3' (2nd model option, after the mode buttons section is not yet rendered when models section comes first)
    (options[1] as HTMLButtonElement).click();
    await page.waitForChanges();

    expect(events.length).toBe(1);
    expect(events[0].detail).toBe('claude-haiku-3');
  });

  it('emits popModeChanged when a mode is selected', async () => {
    const page = await newSpecPage({
      components: [PopModelSelector],
      html: `<pop-model-selector models='${sampleModels}' selected-mode="chat"></pop-model-selector>`,
    });
    const events: CustomEvent[] = [];
    page.root.addEventListener('popModeChanged', (e: Event) => events.push(e as CustomEvent));

    (page.root.querySelector('.ms-pill') as HTMLButtonElement).click();
    await page.waitForChanges();

    // Mode options are after model options
    const options = page.root.querySelectorAll('.ms-option');
    // Models: 2, then Modes: chat, plan, code (index 2=chat, 3=plan, 4=code)
    (options[3] as HTMLButtonElement).click();
    await page.waitForChanges();

    expect(events.length).toBe(1);
    expect(events[0].detail).toBe('plan');
  });
});
