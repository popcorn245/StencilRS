import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';

export interface BudgetTransaction {
  id: string;
  name: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  tags: string[];
  companyId?: string;
  source: string;
}

@Component({
  tag: 'pop-budget-transaction-list',
  encapsulation: { type: 'scoped' },
  styleUrl: 'budget-transaction-list.css',
})
export class PopBudgetTransactionList {
  /** Rows to render — an array (property binding) OR a JSON string (attribute,
   *  how Storybook / plain HTML pass them), parsed defensively. */
  @Prop() transactions: BudgetTransaction[] | string = [];
  @Prop() loading: boolean = false;
  /** Suppress the built-in toolbar (filter pills + search + Add). Set when a
   *  host already owns filtering/search/add (e.g. the Bucket Hub) so the two
   *  don't stack. Default false → the organism stays self-sufficient. */
  @Prop() hideToolbar: boolean = false;

  @State() sortField: 'date' | 'amount' | 'name' = 'date';
  @State() sortDir: 'asc' | 'desc' = 'desc';
  @State() filterType: 'all' | 'income' | 'expense' = 'all';
  @State() searchQuery: string = '';

  @Event({ composed: true, bubbles: true }) popTransactionEdit!: EventEmitter<BudgetTransaction>;
  @Event({ composed: true, bubbles: true }) popTransactionDelete!: EventEmitter<string>;
  @Event({ composed: true, bubbles: true }) popAddTransaction!: EventEmitter<void>;

  private parse<T>(v: T | string, fallback: T): T {
    if (typeof v === 'string') {
      if (v === '') return fallback;
      try {
        return (JSON.parse(v) as T) ?? fallback;
      } catch {
        return fallback;
      }
    }
    return v ?? fallback;
  }

  private get parsed(): BudgetTransaction[] {
    return this.parse<BudgetTransaction[]>(this.transactions, []);
  }

  private get filtered(): BudgetTransaction[] {
    let items = this.parsed;

    if (this.filterType !== 'all') {
      items = items.filter((t) => t.type === this.filterType);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    items.sort((a, b) => {
      let cmp = 0;
      if (this.sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (this.sortField === 'amount') cmp = a.amount - b.amount;
      else cmp = a.name.localeCompare(b.name);
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }

  private toggleSort(field: 'date' | 'amount' | 'name') {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = field === 'date' ? 'desc' : 'asc';
    }
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(amount));
  }

  private sortIndicator(field: string) {
    if (this.sortField !== field) return '';
    return this.sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  render() {
    const items = this.filtered;

    return (
      <div class="transaction-list">
        {!this.hideToolbar && (
          <div class="toolbar">
            <div class="filter-buttons">
              {(['all', 'income', 'expense'] as const).map((t) => (
                <button
                  class={{ 'filter-btn': true, active: this.filterType === t }}
                  onClick={() => (this.filterType = t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <input
              type="text"
              class="search-input"
              placeholder="Search transactions..."
              value={this.searchQuery}
              onInput={(e) => (this.searchQuery = (e.target as HTMLInputElement).value)}
            />
            <button class="add-btn" onClick={() => this.popAddTransaction.emit()}>
              + Add
            </button>
          </div>
        )}

        {this.loading ? (
          <div class="loading">Loading transactions...</div>
        ) : items.length === 0 ? (
          <div class="empty">No transactions found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th onClick={() => this.toggleSort('date')}>Date{this.sortIndicator('date')}</th>
                <th onClick={() => this.toggleSort('name')}>Name{this.sortIndicator('name')}</th>
                <th onClick={() => this.toggleSort('amount')}>Amount{this.sortIndicator('amount')}</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr>
                  <td class="date">{this.formatDate(t.date)}</td>
                  <td class="name">{t.name}</td>
                  <td class={`amount ${t.type}`}>
                    {t.type === 'expense' ? '-' : '+'}{this.formatAmount(t.amount)}
                  </td>
                  <td class="tags">
                    {t.tags.map((tag) => (
                      <span class="tag">{tag}</span>
                    ))}
                  </td>
                  <td class="actions">
                    <button class="action-btn" onClick={() => this.popTransactionEdit.emit(t)}>Edit</button>
                    <button class="action-btn delete" onClick={() => this.popTransactionDelete.emit(t.id)}>Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }
}
