import { Component, Prop, h, Event, EventEmitter } from '@stencil/core';

export interface BudgetDebt {
  id: string;
  name: string;
  amount: number;
  creditLimit?: number;
  interestRate?: number;
  billDue: string;
  frequency: 'monthly' | 'yearly' | 'one_time';
  status: 'pending' | 'active' | 'paid' | 'cancelled';
  person: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#34d399',
  paid: '#818cf8',
  pending: '#fbbf24',
  cancelled: '#6b7280',
};

@Component({
  tag: 'pop-budget-debt-list',
  encapsulation: { type: 'scoped' },
  styleUrl: 'budget-debt-list.css',
})
export class PopBudgetDebtList {
  /** Debts to render — an array (property binding) OR a JSON string (attribute,
   *  how Storybook / plain HTML pass them), parsed defensively. */
  @Prop() debts: BudgetDebt[] | string = [];
  @Prop() loading: boolean = false;
  /** Suppress the built-in toolbar (the Total Owed line + Add Debt). Set when a
   *  host renders its own debt summary so the total isn't shown twice. Default
   *  false → self-sufficient. */
  @Prop() hideToolbar: boolean = false;

  @Event({ composed: true, bubbles: true }) popDebtEdit!: EventEmitter<BudgetDebt>;
  @Event({ composed: true, bubbles: true }) popDebtAdd!: EventEmitter<void>;

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

  private get parsed(): BudgetDebt[] {
    return this.parse<BudgetDebt[]>(this.debts, []);
  }

  private get activeDebts(): BudgetDebt[] {
    return this.parsed.filter((d) => d.status === 'active');
  }

  private get totalOwed(): number {
    return this.activeDebts.reduce((sum, d) => sum + d.amount, 0);
  }

  private formatAmount(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  private utilizationPercent(debt: BudgetDebt): number {
    if (!debt.creditLimit || debt.creditLimit <= 0) return 0;
    return Math.min(100, (debt.amount / debt.creditLimit) * 100);
  }

  private utilizationColor(pct: number): string {
    if (pct < 30) return '#34d399';
    if (pct < 70) return '#fbbf24';
    return '#f87171';
  }

  render() {
    const items = this.activeDebts;

    return (
      <div class="debt-list">
        {!this.hideToolbar && (
          <div class="toolbar">
            <div class="total-owed">
              Total Owed: <strong>{this.formatAmount(this.totalOwed)}</strong>
            </div>
            <button class="add-btn" onClick={() => this.popDebtAdd.emit()}>+ Add Debt</button>
          </div>
        )}

        {this.loading ? (
          <div class="loading">Loading debts...</div>
        ) : items.length === 0 ? (
          <div class="empty">No active debts.</div>
        ) : (
          <div class="debt-cards">
            {items.map((d) => {
              const pct = this.utilizationPercent(d);
              const barColor = this.utilizationColor(pct);
              return (
                <div class="debt-card">
                  <div class="card-header">
                    <span class="card-name">{d.name}</span>
                    <span class="status-badge" style={{ background: STATUS_COLORS[d.status] }}>
                      {d.status}
                    </span>
                  </div>
                  <div class="card-amount">{this.formatAmount(d.amount)}</div>
                  {d.creditLimit ? (
                    <div class="utilization">
                      <div class="util-bar">
                        <div class="util-fill" style={{ width: `${pct}%`, background: barColor }}></div>
                      </div>
                      <div class="util-label">
                        {pct.toFixed(0)}% of {this.formatAmount(d.creditLimit)}
                      </div>
                    </div>
                  ) : null}
                  <div class="card-meta">
                    {d.interestRate != null && <span>{(d.interestRate * 100).toFixed(1)}% APR</span>}
                    {d.billDue && <span>Due: {d.billDue}</span>}
                    <span>{d.frequency}</span>
                  </div>
                  <button class="action-btn" onClick={() => this.popDebtEdit.emit(d)}>Edit</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
