import { newSpecPage } from '../../test-utils/spec-page';
import { PopKanban } from './kanban';

const COLS = JSON.stringify([
  { id: 'todo', label: 'To Do' },
  { id: 'done', label: 'Done' },
]);

const CARDS = JSON.stringify([
  { id: 'c1', title: 'Task A', columnId: 'todo', assignees: ['Alice', 'Bob'] },
  { id: 'c2', title: 'Task B', columnId: 'todo', assignees: ['Bob'] },
  { id: 'c3', title: 'Task C', columnId: 'done' },
]);

describe('pop-kanban', () => {
  describe('parsedColumns', () => {
    it('parses valid JSON columns', () => {
      const inst = new PopKanban();
      inst.columns = COLS;
      const cols = (inst as any).parsedColumns();
      expect(cols).toHaveLength(2);
      expect(cols[0].id).toBe('todo');
    });

    it('returns empty array for invalid JSON', () => {
      const inst = new PopKanban();
      inst.columns = 'not-json';
      expect((inst as any).parsedColumns()).toEqual([]);
    });
  });

  describe('parsedCards', () => {
    it('parses valid JSON cards', () => {
      const inst = new PopKanban();
      inst.cards = CARDS;
      const cards = (inst as any).parsedCards();
      expect(cards).toHaveLength(3);
      expect(cards[0].id).toBe('c1');
    });

    it('returns empty array for invalid JSON', () => {
      const inst = new PopKanban();
      inst.cards = 'bad';
      expect((inst as any).parsedCards()).toEqual([]);
    });
  });

  describe('cardsForColumn', () => {
    it('filters cards by columnId', () => {
      const inst = new PopKanban();
      inst.filterAssignee = '';
      const result = (inst as any).cardsForColumn('todo', JSON.parse(CARDS));
      expect(result).toHaveLength(2);
      expect(result.every((c: any) => c.columnId === 'todo')).toBe(true);
    });

    it('filters by filterAssignee when set', () => {
      const inst = new PopKanban();
      inst.filterAssignee = 'Alice';
      const result = (inst as any).cardsForColumn('todo', JSON.parse(CARDS));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
    });

    it('shows all cards when filterAssignee is empty', () => {
      const inst = new PopKanban();
      inst.filterAssignee = '';
      const result = (inst as any).cardsForColumn('todo', JSON.parse(CARDS));
      expect(result).toHaveLength(2);
    });
  });

  describe('getTerminalColumns', () => {
    it('defaults to merged and closed', () => {
      const inst = new PopKanban();
      const set = (inst as any).getTerminalColumns();
      expect(set.has('merged')).toBe(true);
      expect(set.has('closed')).toBe(true);
      expect(set.has('done')).toBe(false);
    });

    it('uses custom terminalColumnIds', () => {
      const inst = new PopKanban();
      inst.terminalColumnIds = '["done"]';
      const set = (inst as any).getTerminalColumns();
      expect(set.has('done')).toBe(true);
      expect(set.has('merged')).toBe(false);
    });

    it('falls back to default on invalid JSON', () => {
      const inst = new PopKanban();
      inst.terminalColumnIds = 'invalid';
      const set = (inst as any).getTerminalColumns();
      expect(set.has('merged')).toBe(true);
      expect(set.has('closed')).toBe(true);
    });
  });

  describe('isOverdue', () => {
    it('returns true for past timestamps', () => {
      const inst = new PopKanban();
      expect((inst as any).isOverdue(Date.now() - 1000)).toBe(true);
    });

    it('returns false for future timestamps', () => {
      const inst = new PopKanban();
      expect((inst as any).isOverdue(Date.now() + 86400000)).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('returns empty string for undefined', () => {
      const inst = new PopKanban();
      expect((inst as any).formatDate(undefined)).toBe('');
    });

    it('returns a formatted date string for a valid timestamp', () => {
      const inst = new PopKanban();
      const result = (inst as any).formatDate(new Date('2025-06-15').getTime());
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('rendering', () => {
    it('renders columns and cards', async () => {
      const page = await newSpecPage({
        components: [PopKanban],
        html: `<pop-kanban columns='${COLS}' cards='${CARDS}'></pop-kanban>`,
      });
      expect(page.root.querySelectorAll('.kanban-column').length).toBe(2);
      expect(page.root.querySelectorAll('.kanban-card').length).toBe(3);
    });

    it('shows loading slot when loading is true', async () => {
      const page = await newSpecPage({
        components: [PopKanban],
        html: `<pop-kanban columns='${COLS}' cards='[]' loading="true"></pop-kanban>`,
      });
      expect(page.root.querySelector('.kanban-loading')).not.toBeNull();
      expect(page.root.querySelector('.kanban-board')).toBeNull();
    });

    it('renders assignee avatars when assignees are present', async () => {
      const cards = JSON.stringify([{ id: 'c1', title: 'T', columnId: 'todo', assignees: ['Alice', 'Bob'] }]);
      const page = await newSpecPage({
        components: [PopKanban],
        html: `<pop-kanban columns='${COLS}' cards='${cards}'></pop-kanban>`,
      });
      const avatars = page.root.querySelectorAll('.kanban-card__avatar');
      expect(avatars.length).toBe(2);
      expect(avatars[0].textContent).toBe('A');
    });

    it('renders overdue chip with is-overdue class', async () => {
      const cards = JSON.stringify([{ id: 'c1', title: 'T', columnId: 'todo', dueDate: Date.now() - 1000 }]);
      const page = await newSpecPage({
        components: [PopKanban],
        html: `<pop-kanban columns='${COLS}' cards='${cards}'></pop-kanban>`,
      });
      const duechip = page.root.querySelector('.kanban-card__chip--due');
      expect(duechip).not.toBeNull();
      expect(duechip!.className).toContain('is-overdue');
    });

    it('renders add button only on non-terminal columns', async () => {
      const page = await newSpecPage({
        components: [PopKanban],
        html: `<pop-kanban columns='${COLS}' cards='[]' terminal-column-ids='["done"]'></pop-kanban>`,
      });
      const addBtns = page.root.querySelectorAll('.kanban-column__add-btn');
      expect(addBtns.length).toBe(1);
    });
  });
});
