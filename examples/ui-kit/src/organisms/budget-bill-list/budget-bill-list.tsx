import { Component, Prop, h, Event, EventEmitter, State } from '@stencil/core';

export interface BudgetBill {
  id: string;
  name: string;
  amountTotal: number;
  billDue: string;
  frequency: 'monthly' | 'yearly' | 'once' | 'asap';
  status: 'pending' | 'active' | 'paid' | 'cancelled';
  billee: string;
  tags: string[];
}

const STATUS_COLORS: Record<string, string> = {
  active: '#34d399',
  paid: '#818cf8',
  pending: '#fbbf24',
  cancelled: '#6b7280',
};

@Component({
  tag: 'pop-budget-bill-list',
  encapsulation: { type: 'scoped' },
  styleUrl: 'budget-bill-list.css',
})
export class PopBudgetBillList {
  /** Bills to render — an array (property binding) OR a JSON string (attribute,
   *  how Storybook / plain HTML pass them), parsed defensively. */
  @Prop() bills: BudgetBill[] | string = [];
  @Prop() loading: boolean = false;
  /** Suppress the built-in toolbar (view tabs + Add Bill). Set when a host owns
   *  those controls so they don't stack. Default false → self-sufficient. */
  @Prop() hideToolbar: boolean = false;

  @State() activeView: 'active' | 'monthly' | 'yearly' | 'all' = 'active';

  @Event({ composed: true, bubbles: true }) popBillEdit!: EventEmitter<BudgetBill>;
  @Event({ composed: true, bubbles: true }) popBillAdd!: EventEmitter<void>;

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

  private get parsed(): BudgetBill[] {
    return this.parse<BudgetBill[]>(this.bills, []);
  }

  private get filtered(): BudgetBill[] {
    const items = this.parsed;
    switch (this.activeView) {
      case 'active':
        return items.filter((b) => b.status === 'active');
      case 'monthly':
        return items.filter((b) => b.frequency === 'monthly');
      case 'yearly':
        return items.filter((b) => b.frequency === 'yearly');
      default:
        return items;
    }
  }

  private formatAmount(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  render() {
    const items = this.filtered;
    const views = ['active', 'monthly', 'yearly', 'all'] as const;

    return (
      <div class="bill-list">
        {!this.hideToolbar && (
          <div class="toolbar">
            <div class="view-tabs">
              {views.map((v) => (
                <button
                  class={{ 'tab-btn': true, active: this.activeView === v }}
                  onClick={() => (this.activeView = v)}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <button class="add-btn" onClick={() => this.popBillAdd.emit()}>+ Add Bill</button>
          </div>
        )}

        {this.loading ? (
          <div class="loading">Loading bills...</div>
        ) : items.length === 0 ? (
          <div class="empty">No bills found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Amount</th>
                <th>Due</th>
                <th>Frequency</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr>
                  <td class="name">{b.name}</td>
                  <td class="amount">{this.formatAmount(b.amountTotal)}</td>
                  <td class="due">{b.billDue}</td>
                  <td class="freq">{b.frequency}</td>
                  <td>
                    <span class="status-badge" style={{ background: STATUS_COLORS[b.status] || '#6b7280' }}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    <button class="action-btn" onClick={() => this.popBillEdit.emit(b)}>Edit</button>
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
