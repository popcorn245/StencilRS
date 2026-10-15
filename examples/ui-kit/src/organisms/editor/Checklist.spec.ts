import Checklist from './Checklist';

/**
 * Checklist block tool — WS3 registers this in pop-editor so proposed checklist
 * blocks render instead of "can not be displayed correctly". These tests lock
 * the data round-trip ({ text, checked } in → same shape out) the editor relies
 * on, independent of a live Editor.js instance.
 */
describe('Checklist block tool', () => {
  const make = (data: any) =>
    new Checklist({ data, api: {}, config: {}, readOnly: false, block: { id: 'blk1' } });

  it('exposes a toolbox entry so it appears in the "+"/slash menu', () => {
    expect(Checklist.toolbox.title).toBe('Checklist');
    expect(typeof Checklist.toolbox.icon).toBe('string');
  });

  it('round-trips { text, checked } items through render + save', () => {
    const tool = make({
      items: [
        { text: 'Buy milk', checked: true },
        { text: 'Walk dog', checked: false },
      ],
    });
    const el = tool.render();
    expect(el).toBeInstanceOf(HTMLElement);
    const out = tool.save(el);
    expect(out.items).toHaveLength(2);
    expect(out.items[0]).toMatchObject({ text: 'Buy milk', checked: true });
    expect(out.items[1]).toMatchObject({ text: 'Walk dog', checked: false });
  });

  it('normalizes @editorjs/list-style string items into checklist items', () => {
    const tool = make({ items: ['Plain one', 'Plain two'] });
    tool.render();
    const out = tool.save(document.createElement('div'));
    expect(out.items[0].text).toBe('Plain one');
    expect(out.items[0].checked).toBe(false);
  });

  it('seeds one empty item when given no data (editable placeholder)', () => {
    const tool = make({});
    tool.render();
    const out = tool.save(document.createElement('div'));
    expect(out.items).toHaveLength(1);
    expect(out.items[0].checked).toBe(false);
  });
});
