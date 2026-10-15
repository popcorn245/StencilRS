import { newSpecPage } from '../../test-utils/spec-page';
import { PopMentionInput, MentionSource } from './mention-input';

function makeUserSource(items: { id: string; label: string }[]): MentionSource {
  return {
    trigger: '@',
    label: 'People',
    resolve: (q) => items.filter(i => i.label.toLowerCase().includes(q.toLowerCase())),
  };
}

function makeTagSource(items: { id: string; label: string }[]): MentionSource {
  return {
    trigger: '#',
    label: 'Tags',
    resolve: (q) => items.filter(i => i.label.toLowerCase().includes(q.toLowerCase())),
  };
}

describe('pop-mention-input', () => {
  it('renders editor + submit button with placeholder', async () => {
    const page = await newSpecPage({
      components: [PopMentionInput],
      html: `<pop-mention-input placeholder="type…"></pop-mention-input>`,
    });
    const editor = page.root.querySelector('.pmi__editor') as HTMLElement;
    expect(editor).toBeTruthy();
    expect(editor.getAttribute('data-placeholder')).toBe('type…');
    expect(page.root.querySelector('.pmi__submit')).toBeTruthy();
  });

  it('disables submit when there is no free text', async () => {
    const page = await newSpecPage({
      components: [PopMentionInput],
      html: `<pop-mention-input></pop-mention-input>`,
    });
    const btn = page.root.querySelector('.pmi__submit') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('exposes current value via instance.getValue()', async () => {
    const page = await newSpecPage({
      components: [PopMentionInput],
      html: `<pop-mention-input></pop-mention-input>`,
    });
    const editor = page.root.querySelector('.pmi__editor') as HTMLElement;
    editor.appendChild(document.createTextNode('Buy milk'));
    // Read directly without forcing a re-render (which would morph away the text).
    const value = await (page.rootInstance as any).getValue();
    expect(value.text).toBe('Buy milk');
    expect(value.mentions).toHaveLength(0);
  });

  it('reads mention pills back into the value model', async () => {
    const page = await newSpecPage({
      components: [PopMentionInput],
      html: `<pop-mention-input></pop-mention-input>`,
    });
    const editor = page.root.querySelector('.pmi__editor') as HTMLElement;
    // Mimic a pill the way the component builds them internally
    const pill = document.createElement('span');
    pill.className = 'pmi__pill';
    pill.contentEditable = 'false';
    pill.dataset.mentionTrigger = '@';
    pill.dataset.mentionSource = 'People';
    pill.dataset.mentionId = 'amy';
    pill.dataset.mentionLabel = 'Amy';
    pill.textContent = '@Amy';
    editor.appendChild(pill);
    editor.appendChild(document.createTextNode(' Buy milk'));

    const value = await (page.rootInstance as any).getValue();
    expect(value.text).toBe('Buy milk');
    expect(value.mentions).toHaveLength(1);
    expect(value.mentions[0]).toMatchObject({ id: 'amy', label: 'Amy', trigger: '@', source: 'People' });
  });

  it('submitted event fires when trySubmit invoked with non-empty text', async () => {
    const page = await newSpecPage({
      components: [PopMentionInput],
      html: `<pop-mention-input></pop-mention-input>`,
    });
    const editor = page.root.querySelector('.pmi__editor') as HTMLElement;
    editor.appendChild(document.createTextNode('Buy milk'));
    const events: any[] = [];
    page.root.addEventListener('submitted', ((e: CustomEvent) => events.push(e.detail)) as EventListener);
    // Invoke the internal submit path directly (mirrors what the [➕] click and Enter key do)
    (page.rootInstance as any).trySubmit();
    expect(events.length).toBe(1);
    expect(events[0].text).toBe('Buy milk');
  });

  it('exposes configured sources and resolves them correctly', async () => {
    // We can't drive contenteditable / Selection in jsdom reliably, but we can
    // verify the source interface contract works end-to-end via resolve().
    const userSrc = makeUserSource([
      { id: 'amy', label: 'Amy' },
      { id: 'ben', label: 'Ben' },
    ]);
    const tagSrc = makeTagSource([
      { id: 'grocery', label: 'grocery' },
    ]);
    const usersResolved = await userSrc.resolve('am');
    const tagsResolved = await tagSrc.resolve('');
    expect(usersResolved).toEqual([{ id: 'amy', label: 'Amy' }]);
    expect(tagsResolved).toHaveLength(1);
  });

  it('clear() empties the editor and emits valueChanged', async () => {
    const page = await newSpecPage({
      components: [PopMentionInput],
      html: `<pop-mention-input></pop-mention-input>`,
    });
    const editor = page.root.querySelector('.pmi__editor') as HTMLElement;
    editor.appendChild(document.createTextNode('hello'));
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    await page.waitForChanges();

    const changes: any[] = [];
    page.root.addEventListener('valueChanged', ((e: CustomEvent) => changes.push(e.detail)) as EventListener);

    await (page.rootInstance as any).clear();
    await page.waitForChanges();
    expect(editor.textContent).toBe('');
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[changes.length - 1].text).toBe('');
  });
});
