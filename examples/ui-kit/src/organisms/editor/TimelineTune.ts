/**
 * TimelineTune – EditorJS Block Tune
 * 
 * Adds a calendar button to every block's settings menu.
 * Allows setting a start/end date timeline per block.
 * Data is saved per-block and flows into task sync.
 */

interface TimelineData {
  startDate: string | null;
  endDate: string | null;
}

export default class TimelineTune {
  private data: TimelineData;

  static get isTune() {
    return true;
  }

  constructor({ data, block }: any) {
    this.data = {
      startDate: data?.startDate || null,
      endDate: data?.endDate || null
    };

    if (!(window as any).__timelineTunes) (window as any).__timelineTunes = {};
    if (block?.id) {
      (window as any).__timelineTunes[block.id] = this;
    }
  }

  public getData(): TimelineData {
    return { ...this.data };
  }

  public setDates(startDate: string | null, endDate: string | null) {
    this.data.startDate = startDate;
    this.data.endDate = endDate;
    document.dispatchEvent(new CustomEvent('editorJS_tuneChanged'));
  }

  private readonly calendarIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

  private buildSummary(): string {
    if (this.data.startDate || this.data.endDate) {
      const fmt = (d: string) => {
        try {
          // Detect if it has a time component (contains 'T')
          const isDateTime = d.includes('T');
          const dateObj = isDateTime ? new Date(d) : new Date(d + 'T00:00:00');
          const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
          if (isDateTime) {
             opts.hour = 'numeric';
             opts.minute = '2-digit';
          }
          return dateObj.toLocaleDateString('en-US', opts);
        } catch { return d; }
      };
      if (this.data.startDate && this.data.endDate) {
        return `${fmt(this.data.startDate)} – ${fmt(this.data.endDate)}`;
      } else if (this.data.startDate) {
        return `From ${fmt(this.data.startDate)}`;
      } else if (this.data.endDate) {
        return `Due ${fmt(this.data.endDate)}`;
      }
    }
    return 'Set Timeline';
  }

  render() {
    const items: any[] = [];

    items.push({
      icon: this.calendarIcon,
      title: 'Open Date Picker',
      closeOnActivate: false,
      onActivate: (_item: any, e: Event) => {
        if (e) e.preventDefault();
        this.openDatePicker();
      }
    });
    
    // Add "Clear" option if dates are set
    if (this.data.startDate || this.data.endDate) {
      items.push({
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        title: 'Clear Timeline',
        closeOnActivate: false,
        onActivate: (_item: any, e: Event) => {
            if (e) e.preventDefault();
            this.setDates(null, null);
        }
      });
    }

    return {
      icon: this.calendarIcon,
      name: 'timelineTune',
      title: this.buildSummary(),
      children: {
        items,
        searchable: false
      }
    };
  }

  private openDatePicker() {
    const existing = document.querySelector('.timeline-tune-datepicker');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.classList.add('timeline-tune-datepicker');
    overlay.style.cssText = `
      position: fixed;
      z-index: 10001;
      background: var(--pico-background-color, #fff);
      border: 1px solid var(--pico-muted-border-color, #ddd);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      padding: 16px;
      min-width: 260px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: inherit;
    `;

    overlay.innerHTML = `
      <div style="margin-bottom:12px;font-weight:600;font-size:14px;">Set Timeline</div>
      <label style="display:block;margin-bottom:8px;font-size:13px;color:var(--pico-muted-color,#666);">Start</label>
      <input type="datetime-local" id="tt-start" value="${this.data.startDate || ''}" style="
        width:100%;padding:8px 10px;border:1px solid var(--pico-muted-border-color,#ddd);border-radius:6px;
        font-size:14px;background:var(--pico-form-element-background-color,#fff);color:inherit;margin-bottom:12px;
      " />
      <label style="display:block;margin-bottom:8px;font-size:13px;color:var(--pico-muted-color,#666);">End</label>
      <input type="datetime-local" id="tt-end" value="${this.data.endDate || ''}" style="
        width:100%;padding:8px 10px;border:1px solid var(--pico-muted-border-color,#ddd);border-radius:6px;
        font-size:14px;background:var(--pico-form-element-background-color,#fff);color:inherit;margin-bottom:16px;
      " />
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" id="tt-clear" style="
          padding:6px 14px;border:1px solid var(--pico-muted-border-color,#ddd);border-radius:6px;
          background:transparent;cursor:pointer;font-size:13px;color:inherit;
        ">Clear</button>
        <button type="button" id="tt-save" style="
          padding:6px 14px;border:none;border-radius:6px;
          background:var(--pico-primary,#1976d2);color:#fff;cursor:pointer;font-size:13px;font-weight:600;
        ">Save</button>
      </div>
    `;

    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed; top:0; left:0; right:0; bottom:0;
      background: rgba(0,0,0,0.3); z-index: 10000;
    `;
    backdrop.addEventListener('click', () => {
      overlay.remove();
      backdrop.remove();
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(overlay);

    const startInput = overlay.querySelector('#tt-start') as HTMLInputElement;
    const endInput = overlay.querySelector('#tt-end') as HTMLInputElement;

    overlay.querySelector('#tt-save')!.addEventListener('click', () => {
      this.setDates(
        startInput.value || null,
        endInput.value || null
      );
      overlay.remove();
      backdrop.remove();
    });

    overlay.querySelector('#tt-clear')!.addEventListener('click', () => {
      this.setDates(null, null);
      overlay.remove();
      backdrop.remove();
    });
  }

  save() {
    return {
      startDate: this.data.startDate,
      endDate: this.data.endDate
    };
  }
}
