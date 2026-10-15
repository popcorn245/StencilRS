/**
 * MentionTune – EditorJS Block Tune
 * 
 * Adds an `@` button to every block's settings menu.
 * Allows assigning users and setting a start/end date timeline per block.
 * Data is saved per-block and flows into task sync for checklist blocks.
 */

interface MentionUser {
  id: string;
  displayName: string;
  photoURL?: string;
  icon?: string;
}

interface MentionData {
  assignedTo: string[];
}

interface MentionConfig {
  users?: MentionUser[];
  currentUser?: string;
}

export default class MentionTune {
  private config: MentionConfig;
  private data: MentionData;

  static get isTune() {
    return true;
  }

  constructor({ data, config, block }: any) {
    this.config = config || {};
    this.data = {
      assignedTo: data?.assignedTo || []
    };

    // Register globally so Editor.astro can read assignment data
    if (!(window as any).__mentionTunes) (window as any).__mentionTunes = {};
    if (block?.id) {
      (window as any).__mentionTunes[block.id] = this;
    }
  }

  /** Public accessor for external code (Editor.astro) */
  public getData(): MentionData {
    return { ...this.data };
  }

  private readonly userIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
  private readonly checkedIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  private toggleUser(userId: string) {
    const idx = this.data.assignedTo.indexOf(userId);
    if (idx >= 0) {
      this.data.assignedTo.splice(idx, 1);
    } else {
      this.data.assignedTo.push(userId);
    }
    document.dispatchEvent(new CustomEvent('editorJS_tuneChanged'));
  }

  public removeUser(userId: string) {
    const idx = this.data.assignedTo.indexOf(userId);
    if (idx >= 0) {
      this.data.assignedTo.splice(idx, 1);
      document.dispatchEvent(new CustomEvent('editorJS_tuneChanged'));
    }
  }

  private buildSummary(): string {
    if (this.data.assignedTo.length > 0) {
      const users = this.config.users || [];
      const names = this.data.assignedTo
        .map(uid => users.find(u => u.id === uid)?.displayName || uid)
        .slice(0, 2);
      return names.join(', ') + (this.data.assignedTo.length > 2 ? ` +${this.data.assignedTo.length - 2}` : '');
    }
    return 'Assign Users';
  }

  render() {
    const users = this.config.users || [];
    const items: any[] = [];

    // ── User List ───────────────────────────────────────────
    users.forEach(user => {
      const isAssigned = this.data.assignedTo.includes(user.id);
      let avatarHtml: string;
      if (user.photoURL) {
        avatarHtml = `<img src="${user.photoURL}" alt="${user.displayName}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" />`;
      } else if (user.icon) {
        avatarHtml = `<span style="font-size:16px;">${user.icon}</span>`;
      } else {
        const initials = user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        avatarHtml = `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--pico-primary-background,#e3f2fd);color:var(--pico-primary,#1976d2);font-size:10px;font-weight:600;">${initials}</span>`;
      }

      items.push({
        icon: isAssigned ? this.checkedIcon : avatarHtml,
        title: user.displayName,
        isActive: isAssigned,
        closeOnActivate: false,
        onActivate: (item: any, e: Event) => {
          if (e) e.preventDefault();
          this.toggleUser(user.id);
          const nowAssigned = this.data.assignedTo.includes(user.id);
          item.isActive = nowAssigned;
          item.icon = nowAssigned ? this.checkedIcon : avatarHtml;
        }
      });
    });

    return {
      icon: this.userIcon,
      name: 'mentionTune',
      title: this.buildSummary(),
      children: {
        items: items.length > 0 ? items : [{
          icon: `<div style="width: 20px;"></div>`,
          title: 'No users configured',
          closeOnActivate: false,
          onActivate: () => {}
        }],
        searchable: users.length > 5
      }
    };
  }

  save() {
    return {
      assignedTo: this.data.assignedTo
    };
  }
}
