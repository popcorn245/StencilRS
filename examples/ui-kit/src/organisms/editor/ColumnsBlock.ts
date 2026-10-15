import type { BlockTool } from '@editorjs/editorjs';

interface ListItem {
  content?: string;
  text?: string;
  items?: ListItem[];
}

interface InnerBlock {
  id?: string;
  type: string;
  data: Record<string, unknown>;
}

interface ColumnData {
  width: string;
  blocks: InnerBlock[];
}

interface ColumnsBlockData {
  columns: ColumnData[];
}

/**
 * ColumnsBlock — EditorJS Block Tool for multi-column email layouts.
 *
 * Provides a visual multi-column editor experience. Each column holds an
 * array of inner blocks (`{ type, data }`) — the SAME shape popmail's
 * `columns` converter recursively renders (header / paragraph / list, etc.)
 * via the block-converter registry. The data round-trips:
 *
 *   save() → { columns: [{ width, blocks: [{type,data}, ...] }, ...] }
 *
 * Editability: rather than embed a full nested EditorJS per column (hard to
 * stabilise), each inner block is rendered as an in-place contenteditable
 * element that preserves its `{type,data}` shape on edit:
 *   - header     → editable heading, writes back `data.text` (level kept)
 *   - paragraph  → editable line, writes back `data.text`
 *   - list       → editable <ul>/<ol>, each <li> writes back into
 *                  `data.items[i].content` (popmail reads content||text)
 * Any other inner block type is rendered read-only (its data is preserved
 * untouched on save) so unusual hydrated content is never destroyed.
 *
 * LIMITATION: you cannot add/remove/reorder inner blocks or change their
 * type from inside a column via this UI — the structure that hydrates is the
 * structure that saves (with edited text). Arbitrary nested-block authoring
 * is out of scope; for that, use the raw "MJML / HTML" block. The common
 * header + list/paragraph case (e.g. the bot-generated "7 Vices / 7 Virtues"
 * template) is fully editable and round-trips correctly.
 */
export default class ColumnsBlock implements BlockTool {
  private data: ColumnsBlockData;
  private readOnly: boolean;
  private blockAPI: any;
  private wrapper: HTMLElement;

  static get toolbox() {
    return {
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="2" width="5" height="12" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <rect x="10" y="2" width="5" height="12" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
      title: 'Columns',
    };
  }

  static get isReadOnlySupported() { return true; }
  static get enableLineBreaks() { return true; }

  constructor({ data, readOnly, block }: any) {
    this.readOnly = readOnly || false;
    this.blockAPI = block;
    this.wrapper = document.createElement('div');

    this.data = {
      columns: data?.columns?.length
        ? this.normalizeColumns(data.columns)
        : [
            { width: '50%', blocks: [{ type: 'paragraph', data: { text: 'Column 1' } }] },
            { width: '50%', blocks: [{ type: 'paragraph', data: { text: 'Column 2' } }] },
          ],
    };
  }

  /** Ensure each column has a width + a blocks array. */
  private normalizeColumns(columns: any[]): ColumnData[] {
    return columns.map((col) => ({
      width: typeof col?.width === 'string' ? col.width : '50%',
      blocks: Array.isArray(col?.blocks) ? col.blocks : [],
    }));
  }

  renderSettings(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '4px 0';

    const layouts: Array<{ label: string; columns: string[] }> = [
      { label: '2 Equal', columns: ['50%', '50%'] },
      { label: '3 Equal', columns: ['33.3%', '33.3%', '33.3%'] },
      { label: '1/3 + 2/3', columns: ['33.3%', '66.6%'] },
      { label: '2/3 + 1/3', columns: ['66.6%', '33.3%'] },
    ];

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.gap = '4px';

    for (const layout of layouts) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = layout.label;
      btn.style.cssText = 'padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid var(--pico-muted-border-color,#e2e8f0);background:transparent;font-family:inherit;';
      btn.addEventListener('click', () => {
        // Preserve existing content (blocks) where possible; new columns get
        // an empty editable paragraph.
        const newColumns: ColumnData[] = layout.columns.map((width, i) => {
          const existing = this.data.columns[i];
          return {
            width,
            blocks: existing?.blocks?.length
              ? existing.blocks
              : [{ type: 'paragraph', data: { text: '' } }],
          };
        });
        this.data.columns = newColumns;
        this.renderColumns();
        this.notifyChange();
      });
      row.appendChild(btn);
    }

    wrapper.appendChild(row);
    return wrapper;
  }

  render(): HTMLElement {
    this.wrapper.innerHTML = '';
    this.wrapper.className = 'columns-block-root';
    this.renderColumns();
    return this.wrapper;
  }

  private renderColumns() {
    this.wrapper.innerHTML = '';

    const container = document.createElement('div');
    container.style.cssText = 'display:flex;gap:8px;min-height:60px;align-items:flex-start;';

    this.data.columns.forEach((col, colIndex) => {
      const colEl = document.createElement('div');
      colEl.style.cssText = `flex:0 0 ${col.width};max-width:${col.width};box-sizing:border-box;border:1px dashed var(--pico-muted-border-color,#e2e8f0);border-radius:4px;padding:8px;min-height:40px;`;

      col.blocks.forEach((block, blockIndex) => {
        const blockEl = this.renderInnerBlock(colIndex, block, blockIndex);
        if (blockEl) colEl.appendChild(blockEl);
      });

      container.appendChild(colEl);
    });

    this.wrapper.appendChild(container);
  }

  /**
   * Render a single inner block as an in-place editable element while
   * preserving its `{type,data}` shape. Returns null only for empty input.
   */
  private renderInnerBlock(
    colIndex: number,
    block: InnerBlock,
    blockIndex: number
  ): HTMLElement | null {
    const editable = this.readOnly ? 'false' : 'true';

    if (block.type === 'header') {
      const level = Math.min(Math.max(Number(block.data?.level) || 2, 1), 6);
      const el = document.createElement(`h${level}`);
      el.contentEditable = editable;
      el.innerHTML = (block.data?.text as string) || '';
      el.style.cssText = 'margin:0 0 6px;outline:none;font-size:16px;font-weight:700;';
      el.addEventListener('blur', () => {
        this.data.columns[colIndex].blocks[blockIndex] = {
          ...block,
          type: 'header',
          data: { ...block.data, level, text: el.innerHTML },
        };
        this.notifyChange();
      });
      return el;
    }

    if (block.type === 'list') {
      const style = (block.data?.style as string) || 'unordered';
      const items = (block.data?.items as ListItem[]) || [];
      const listEl = document.createElement(style === 'ordered' ? 'ol' : 'ul');
      listEl.style.cssText = 'margin:0 0 6px;padding-left:18px;font-size:14px;';

      const writeBack = () => {
        const lis = Array.from(listEl.querySelectorAll(':scope > li'));
        const newItems: ListItem[] = lis.map((li, i) => ({
          ...(items[i] || {}),
          content: (li as HTMLElement).innerHTML,
        }));
        this.data.columns[colIndex].blocks[blockIndex] = {
          ...block,
          type: 'list',
          data: { ...block.data, style, items: newItems },
        };
        this.notifyChange();
      };

      (items.length ? items : [{ content: '' }]).forEach((item) => {
        const li = document.createElement('li');
        li.contentEditable = editable;
        li.innerHTML = item.content || item.text || '';
        li.style.cssText = 'outline:none;margin-bottom:2px;';
        li.addEventListener('blur', writeBack);
        listEl.appendChild(li);
      });
      return listEl;
    }

    if (block.type === 'paragraph') {
      const el = document.createElement('div');
      el.contentEditable = editable;
      el.innerHTML = (block.data?.text as string) || '';
      el.style.cssText = 'min-height:20px;outline:none;font-size:14px;margin-bottom:6px;';
      el.addEventListener('blur', () => {
        this.data.columns[colIndex].blocks[blockIndex] = {
          ...block,
          type: 'paragraph',
          data: { ...block.data, text: el.innerHTML },
        };
        this.notifyChange();
      });
      return el;
    }

    // Unknown/unsupported inner block — render a read-only placeholder so
    // its data is preserved untouched on save() (we never mutate it).
    const el = document.createElement('div');
    el.style.cssText = 'font-size:12px;opacity:0.6;font-style:italic;margin-bottom:6px;';
    el.textContent = `[${block.type} block — not editable here]`;
    return el;
  }

  private notifyChange() {
    if (this.blockAPI && typeof this.blockAPI.dispatchChange === 'function') {
      this.blockAPI.dispatchChange();
    }
  }

  save(): ColumnsBlockData {
    return {
      columns: this.data.columns,
    };
  }
}
