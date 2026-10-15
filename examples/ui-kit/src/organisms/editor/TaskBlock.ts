import type { BlockTool } from '@editorjs/editorjs';

interface TaskBlockData {
  taskId: string;
  title: string;
  status: 'open' | 'in_progress' | 'review' | 'done' | 'blocked' | 'skipped' | 'cancelled';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string | null;
  assignedTo: string[];
  checked: boolean;
}

/** Host-supplied task persistence. tasks-app wires this to its Firestore/Dexie
 *  adapter; when absent the block is self-contained (stores its own data in the
 *  editor block) instead of POSTing to a non-existent `/api/tasks` backend. */
export interface TaskBlockApi {
  create(input: { title: string; questId?: string | null; status: string; priority: string }): Promise<{ id: string }>;
  patch(taskId: string, patch: Record<string, any>): Promise<void>;
  remove(taskId: string): Promise<void>;
}

interface TaskBlockConfig {
  questId?: string;
  currentUser?: string;
  users?: { id: string; displayName: string; photoURL?: string }[];
  taskApi?: TaskBlockApi;
}

/**
 * TaskBlock — EditorJS Block Tool wrapping the `pop-task-item` StencilJS component.
 *
 * Each block represents a single Firestore task. Creating a new block immediately
 * POSTs to /api/tasks to create the task document.
 *
 * Includes custom block tunes for Priority, Due Date, and Assignee editing.
 */
export default class TaskBlock implements BlockTool {
  private data: TaskBlockData;
  private config: TaskBlockConfig;
  private readOnly: boolean;
  private blockAPI: any;
  private wrapper: HTMLElement;
  private creating: boolean = false;

  static get toolbox() {
    return {
      icon: '<svg width="15" height="15" viewBox="0 0 15 15"><path d="M2 3.5l2.5 2.5L9 2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="0" y1="7.5" x2="15" y2="7.5" stroke="currentColor" stroke-width="1"/><line x1="0" y1="11" x2="15" y2="11" stroke="currentColor" stroke-width="1"/></svg>',
      title: 'Task',
    };
  }

  static get isReadOnlySupported() { return true; }
  static get enableLineBreaks() { return false; }

  static get conversionConfig() {
    return {
      import: 'title',
      export: (data: TaskBlockData) => data.title,
    };
  }

  constructor({ data, config, readOnly, block }: any) {
    this.config = config || {};
    this.readOnly = readOnly || false;
    this.blockAPI = block;
    this.wrapper = document.createElement('div');

    this.data = {
      taskId: data.taskId || '',
      title: data.title || '',
      status: data.status || 'open',
      priority: data.priority || 'medium',
      dueDate: data.dueDate || null,
      assignedTo: data.assignedTo || [],
      checked: data.checked || (data.status === 'done'),
    };

    // If no taskId, create a Firestore task immediately
    if (!this.data.taskId && !this.readOnly) {
      this.createFirestoreTask();
    }
  }

  /**
   * Render block tunes for Priority, Due Date, and Assignee.
   */
  renderSettings(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'task-block-tunes';

    // ── Priority tune ──
    const prioritySection = document.createElement('div');
    prioritySection.className = 'task-tune-section';
    const priorityLabel = document.createElement('div');
    priorityLabel.className = 'task-tune-label';
    priorityLabel.textContent = 'Priority';
    prioritySection.appendChild(priorityLabel);

    const priorities: { value: string; label: string; color: string }[] = [
      { value: 'urgent', label: '!!!', color: 'var(--pico-del-color, #ef4444)' },
      { value: 'high', label: '!!', color: '#f97316' },
      { value: 'medium', label: '~', color: '#f59e0b' },
      { value: 'low', label: '!', color: 'var(--pico-ins-color, #22c55e)' },
    ];

    const priorityRow = document.createElement('div');
    priorityRow.className = 'task-tune-row';
    for (const p of priorities) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `task-tune-btn ${this.data.priority === p.value ? 'task-tune-btn--active' : ''}`;
      btn.style.color = p.color;
      btn.textContent = `${p.label} ${p.value}`;
      btn.addEventListener('click', () => {
        this.data.priority = p.value as any;
        this.updateComponentProp('priority', p.value);
        this.patchFirestoreTask('priority', p.value);
        this.notifyChange();
        // Update active state
        priorityRow.querySelectorAll('.task-tune-btn').forEach(b => b.classList.remove('task-tune-btn--active'));
        btn.classList.add('task-tune-btn--active');
      });
      priorityRow.appendChild(btn);
    }
    prioritySection.appendChild(priorityRow);
    wrapper.appendChild(prioritySection);

    // ── Due Date tune ──
    const dateSection = document.createElement('div');
    dateSection.className = 'task-tune-section';
    const dateLabel = document.createElement('div');
    dateLabel.className = 'task-tune-label';
    dateLabel.textContent = 'Due Date';
    dateSection.appendChild(dateLabel);

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'task-tune-date';
    dateInput.value = this.data.dueDate || '';
    dateInput.addEventListener('change', () => {
      const val = dateInput.value || null;
      this.data.dueDate = val;
      this.updateComponentProp('dueDate', val || '');
      this.patchFirestoreTask('dueDate', val);
      this.notifyChange();
    });
    dateSection.appendChild(dateInput);

    const clearDateBtn = document.createElement('button');
    clearDateBtn.type = 'button';
    clearDateBtn.className = 'task-tune-btn task-tune-btn--small';
    clearDateBtn.textContent = 'Clear';
    clearDateBtn.addEventListener('click', () => {
      dateInput.value = '';
      this.data.dueDate = null;
      this.updateComponentProp('dueDate', '');
      this.patchFirestoreTask('dueDate', null);
      this.notifyChange();
    });
    dateSection.appendChild(clearDateBtn);
    wrapper.appendChild(dateSection);

    // ── Assignee tune ──
    const users = this.config.users || [];
    if (users.length > 0) {
      const assignSection = document.createElement('div');
      assignSection.className = 'task-tune-section';
      const assignLabel = document.createElement('div');
      assignLabel.className = 'task-tune-label';
      assignLabel.textContent = 'Assignee';
      assignSection.appendChild(assignLabel);

      for (const u of users) {
        const isAssigned = this.data.assignedTo.includes(u.id);
        const row = document.createElement('label');
        row.className = 'task-tune-assignee-row';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = isAssigned;
        cb.className = 'task-tune-checkbox';
        cb.addEventListener('change', () => {
          if (cb.checked) {
            if (!this.data.assignedTo.includes(u.id)) {
              this.data.assignedTo = [...this.data.assignedTo, u.id];
            }
          } else {
            this.data.assignedTo = this.data.assignedTo.filter(id => id !== u.id);
          }
          this.updateComponentProp('assignedTo', JSON.stringify(this.data.assignedTo));
          this.patchFirestoreTask('assignedTo', this.data.assignedTo);
          this.notifyChange();
        });

        const name = document.createElement('span');
        name.className = 'task-tune-assignee-name';
        name.textContent = u.displayName;

        row.appendChild(cb);
        row.appendChild(name);
        assignSection.appendChild(row);
      }
      wrapper.appendChild(assignSection);
    }

    // Inject tune styles if not already present
    if (!document.getElementById('task-tune-styles')) {
      const style = document.createElement('style');
      style.id = 'task-tune-styles';
      style.textContent = `
.task-block-tunes { padding: 4px 0; }
.task-tune-section { margin-bottom: 8px; }
.task-tune-section:last-child { margin-bottom: 0; }
.task-tune-label { font-size: 11px; font-weight: 600; color: var(--pico-muted-color, #64748b); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.task-tune-row { display: flex; flex-wrap: wrap; gap: 4px; }
.task-tune-btn { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--pico-muted-border-color, #e2e8f0); background: transparent; font-family: inherit; transition: background 0.1s; }
.task-tune-btn:hover { background: var(--pico-muted-border-color, rgba(0,0,0,0.05)); }
.task-tune-btn--active { background: color-mix(in srgb, currentColor 12%, transparent) !important; border-color: currentColor; }
.task-tune-btn--small { font-size: 11px; padding: 2px 8px; margin-top: 4px; color: var(--pico-muted-color, #64748b); }
.task-tune-date { width: 100%; padding: 4px 8px; border: 1px solid var(--pico-muted-border-color, #e2e8f0); border-radius: 6px; font-size: 13px; font-family: inherit; background: var(--pico-form-element-background-color, transparent); color: inherit; margin: 0; }
.task-tune-assignee-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer; font-size: 13px; }
.task-tune-checkbox { width: 16px; height: 16px; accent-color: var(--pico-primary, #7c3aed); margin: 0; }
.task-tune-assignee-name { color: var(--pico-color, inherit); }
`;
      document.head.appendChild(style);
    }

    return wrapper;
  }

  /** Update a prop on the pop-task-item element inside this block */
  private updateComponentProp(prop: string, value: any) {
    const el = this.wrapper.querySelector('pop-task-item') as any;
    if (el) el[prop] = value;
  }

  /** Patch a single field on the linked task (no-op if the host didn't wire a
   *  task API — the block then just holds the value in its own data). */
  private patchFirestoreTask(field: string, value: any) {
    if (!this.data.taskId || !this.config.taskApi) return;
    this.config.taskApi
      .patch(this.data.taskId, { [field]: value })
      .catch(err => console.error('[TaskBlock] Tune patch failed:', err));
  }

  private async createFirestoreTask() {
    if (this.creating || !this.config.taskApi) return; // self-contained without an API
    this.creating = true;
    try {
      const { id } = await this.config.taskApi.create({
        title: this.data.title || '',
        questId: this.config.questId || null,
        status: 'open',
        priority: 'medium',
      });
      this.data.taskId = id;
      this.notifyChange();
    } catch (e) {
      console.error('[TaskBlock] Failed to create task:', e);
    } finally {
      this.creating = false;
    }
  }

  render(): HTMLElement {
    this.wrapper.innerHTML = '';
    this.wrapper.classList.add('task-block');

    const el = document.createElement('pop-task-item') as any;
    el.taskId = this.data.taskId;
    el.title = this.data.title;
    el.status = this.data.status;
    el.priority = this.data.priority;
    el.dueDate = this.data.dueDate || '';
    el.assignedTo = JSON.stringify(this.data.assignedTo);
    el.checked = this.data.checked;
    el.readonly = this.readOnly;
    // In a read-only editor the row is a static render — lock the checkbox too.
    el.checkable = !this.readOnly;
    el.users = JSON.stringify(this.config.users || []);

    // Listen for events from the component
    el.addEventListener('taskChanged', (e: CustomEvent) => {
      const { field, value } = e.detail;
      (this.data as any)[field] = value;
      if (field === 'status') {
        this.data.checked = value === 'done';
      }
      this.notifyChange();

      // Persist the field change through the host task API (if wired).
      if (this.data.taskId && this.config.taskApi) {
        this.config.taskApi
          .patch(this.data.taskId, { [field]: value })
          .catch(err => console.error('[TaskBlock] Patch failed:', err));
      }
    });

    el.addEventListener('taskChecked', (e: CustomEvent) => {
      const { checked } = e.detail;
      this.data.checked = checked;
      this.data.status = checked ? 'done' : 'open';
      this.notifyChange();

      if (this.data.taskId && this.config.taskApi) {
        this.config.taskApi
          .patch(this.data.taskId, { status: this.data.status })
          .catch(err => console.error('[TaskBlock] Status patch failed:', err));
      }
    });

    el.addEventListener('taskDeleted', async (e: CustomEvent) => {
      const { taskId } = e.detail;
      if (taskId && this.config.taskApi) {
        try {
          await this.config.taskApi.remove(taskId);
        } catch (err) {
          console.error('[TaskBlock] Delete failed:', err);
        }
      }
      // Remove this block from EditorJS
      if (this.blockAPI) {
        const index = this.blockAPI.id
          ? (() => {
              // Find the block index by its id
              const blocks = document.querySelectorAll('.ce-block');
              for (let i = 0; i < blocks.length; i++) {
                if (blocks[i].getAttribute('data-id') === this.blockAPI.id) return i;
              }
              return -1;
            })()
          : -1;
        if (index >= 0) {
          // Use a timeout to avoid EditorJS internal state issues
          setTimeout(() => {
            try {
              (window as any).__editorInstance?.blocks?.delete(index);
            } catch { /* best effort */ }
          }, 0);
        }
      }
    });

    this.wrapper.appendChild(el);
    return this.wrapper;
  }

  private notifyChange() {
    if (this.blockAPI && typeof this.blockAPI.dispatchChange === 'function') {
      this.blockAPI.dispatchChange();
    }
  }

  save(): TaskBlockData {
    return {
      taskId: this.data.taskId,
      title: this.data.title,
      status: this.data.status,
      priority: this.data.priority,
      dueDate: this.data.dueDate,
      assignedTo: this.data.assignedTo,
      checked: this.data.checked,
    };
  }

  validate(data: TaskBlockData): boolean {
    return typeof data.taskId === 'string';
  }
}
