import { Component, Prop, h, Event, EventEmitter, State, Element } from '@stencil/core';

export interface KanbanColumn {
  id: string;
  label: string;
  color?: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  // PR/code tracking fields
  repo?: string;
  prUrl?: string;
  prNumber?: number;
  createdAt?: number;
  badge?: string;
  // Family task management fields
  assignees?: string[];
  dueDate?: number;
  xp?: number;
  questId?: string;
  questTitle?: string;
  priority?: 'low' | 'medium' | 'high';
}

@Component({
  tag: 'pop-kanban',
  encapsulation: { type: 'scoped' },
  styleUrl: 'kanban.css',
})
export class PopKanban {
  @Element() el: HTMLElement;

  /**
   * JSON string of KanbanColumn[]. Each column has { id, label, color? }.
   */
  @Prop() columns: string = '[]';

  /**
   * JSON string of KanbanCard[]. Each card has { id, title, description?, columnId, repo?, prUrl?, prNumber?, createdAt?, badge? }.
   */
  @Prop() cards: string = '[]';

  /**
   * Whether the board is in a loading state
   */
  @Prop() loading: boolean = false;

  /**
   * JSON string of column IDs that are terminal (no drops allowed). Defaults to ["merged","closed"].
   */
  @Prop() terminalColumnIds: string = '["merged","closed"]';

  /**
   * Filter cards to only show those assigned to this name. Empty string shows all.
   */
  @Prop() filterAssignee: string = '';

  /**
   * Emitted when a card is dragged to a new column. Detail: { cardId, fromColumnId, toColumnId }
   */
  @Event() popCardMoved: EventEmitter<{ cardId: string; fromColumnId: string; toColumnId: string }>;

  /**
   * Emitted when a card is clicked. Detail: { cardId }
   */
  @Event() popCardClicked: EventEmitter<{ cardId: string }>;

  /**
   * Emitted when the "New task" button is clicked. Detail: { columnId }
   */
  @Event() popCreateTask: EventEmitter<{ columnId: string }>;

  @State() draggingCardId: string | null = null;
  @State() dragOverColumnId: string | null = null;

  private parsedColumns(): KanbanColumn[] {
    try {
      return typeof this.columns === 'string' ? JSON.parse(this.columns) : this.columns;
    } catch {
      return [];
    }
  }

  private parsedCards(): KanbanCard[] {
    try {
      return typeof this.cards === 'string' ? JSON.parse(this.cards) : this.cards;
    } catch {
      return [];
    }
  }

  private getTerminalColumns(): Set<string> {
    try {
      const ids = typeof this.terminalColumnIds === 'string'
        ? JSON.parse(this.terminalColumnIds)
        : this.terminalColumnIds;
      return new Set(Array.isArray(ids) ? ids : []);
    } catch {
      return new Set(['merged', 'closed']);
    }
  }

  private cardsForColumn(columnId: string, allCards: KanbanCard[]): KanbanCard[] {
    return allCards.filter(c => {
      if (c.columnId !== columnId) return false;
      if (this.filterAssignee && c.assignees) {
        return c.assignees.includes(this.filterAssignee);
      }
      return true;
    });
  }

  private isOverdue(dueDate: number): boolean {
    return dueDate < Date.now();
  }

  private handleDragStart = (e: DragEvent, card: KanbanCard) => {
    this.draggingCardId = card.id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.id);
    }
  };

  private handleDragEnd = () => {
    this.draggingCardId = null;
    this.dragOverColumnId = null;
  };

  private handleDragOver = (e: DragEvent, columnId: string) => {
    if (this.getTerminalColumns().has(columnId)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    this.dragOverColumnId = columnId;
  };

  private handleDragLeave = (e: DragEvent) => {
    // Only clear if leaving the column entirely (not entering a child)
    const related = e.relatedTarget as HTMLElement;
    const column = (e.currentTarget as HTMLElement);
    if (!column.contains(related)) {
      this.dragOverColumnId = null;
    }
  };

  private handleDrop = (e: DragEvent, toColumnId: string) => {
    e.preventDefault();
    if (this.getTerminalColumns().has(toColumnId)) return;
    const cardId = e.dataTransfer?.getData('text/plain') || this.draggingCardId;
    if (!cardId) return;

    const allCards = this.parsedCards();
    const card = allCards.find(c => c.id === cardId);
    if (!card || card.columnId === toColumnId) {
      this.draggingCardId = null;
      this.dragOverColumnId = null;
      return;
    }

    this.popCardMoved.emit({ cardId, fromColumnId: card.columnId, toColumnId });
    this.draggingCardId = null;
    this.dragOverColumnId = null;
  };

  private formatDate(ts?: number): string {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private renderCard(card: KanbanCard) {
    const isDragging = this.draggingCardId === card.id;
    return (
      <article
        key={card.id}
        class={{ 'kanban-card': true, 'is-dragging': isDragging }}
        draggable={true}
        onDragStart={e => this.handleDragStart(e, card)}
        onDragEnd={this.handleDragEnd}
        onClick={() => this.popCardClicked.emit({ cardId: card.id })}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && this.popCardClicked.emit({ cardId: card.id })}
      >
        <header class="kanban-card__header">
          <span class="kanban-card__title">{card.title}</span>
          {card.badge && <mark class={`kanban-card__badge kanban-card__badge--${card.badge}`}>{card.badge}</mark>}
        </header>

        {card.description && (
          <p class="kanban-card__description">{card.description}</p>
        )}

        {(card.questTitle || card.dueDate || card.xp !== undefined) && (
          <div class="kanban-card__chips">
            {card.questTitle && (
              <span class="kanban-card__chip kanban-card__chip--quest">⚔ {card.questTitle}</span>
            )}
            {card.dueDate && (
              <span class={`kanban-card__chip kanban-card__chip--due${this.isOverdue(card.dueDate) ? ' is-overdue' : ''}`}>
                📅 {this.formatDate(card.dueDate)}
              </span>
            )}
            {card.xp !== undefined && (
              <span class="kanban-card__chip kanban-card__chip--xp">⚡ {card.xp} XP</span>
            )}
          </div>
        )}

        {card.assignees?.length > 0 && (
          <div class="kanban-card__assignees">
            {card.assignees.map(a => (
              <span class="kanban-card__avatar" title={a}>{a.slice(0, 1).toUpperCase()}</span>
            ))}
          </div>
        )}

        <footer class="kanban-card__footer">
          {card.repo && <small class="kanban-card__repo">{card.repo}</small>}
          <div class="kanban-card__meta">
            {card.prNumber && (
              <a
                class="kanban-card__pr-link"
                href={card.prUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                title={`Open PR #${card.prNumber}`}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
                </svg>
                #{card.prNumber}
              </a>
            )}
            {card.createdAt && <small class="kanban-card__date">{this.formatDate(card.createdAt)}</small>}
          </div>
        </footer>
      </article>
    );
  }

  private renderColumn(column: KanbanColumn, cards: KanbanCard[], terminalCols: Set<string>) {
    const isDragOver = this.dragOverColumnId === column.id;
    const isTerminal = terminalCols.has(column.id);
    const columnCards = this.cardsForColumn(column.id, cards);

    return (
      <section
        key={column.id}
        class={{ 'kanban-column': true, 'is-drag-over': isDragOver }}
        style={column.color ? { '--column-accent': column.color } as any : {}}
        onDragOver={e => this.handleDragOver(e, column.id)}
        onDragLeave={this.handleDragLeave}
        onDrop={e => this.handleDrop(e, column.id)}
      >
        <header class="kanban-column__header">
          <span class="kanban-column__label">{column.label}</span>
          <div class="kanban-column__header-meta">
            <span class="kanban-column__count">{columnCards.length}</span>
            {!isTerminal && (
              <button
                class="kanban-column__add-btn"
                title="Add task"
                onClick={() => this.popCreateTask.emit({ columnId: column.id })}
              >+</button>
            )}
          </div>
        </header>

        <div class="kanban-column__cards">
          {columnCards.length === 0 && !isDragOver && (
            <div class="kanban-column__empty">
              {isTerminal ? 'No tasks' : 'Drop here'}
            </div>
          )}
          {columnCards.map(card => this.renderCard(card))}
          {isDragOver && <div class="kanban-column__drop-indicator" />}
        </div>

      </section>
    );
  }

  render() {
    if (this.loading) {
      return (
        <div class="kanban-loading" aria-busy="true">
          <slot name="loading">Loading board…</slot>
        </div>
      );
    }

    const columns = this.parsedColumns();
    const cards = this.parsedCards();
    const terminalCols = this.getTerminalColumns();

    return (
      <div class="kanban-board">
        {columns.map(col => this.renderColumn(col, cards, terminalCols))}
      </div>
    );
  }
}
