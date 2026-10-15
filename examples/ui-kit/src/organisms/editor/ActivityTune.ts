/**
 * ActivityTune – EditorJS Block Tune
 *
 * Adds a "View Activity" button to every block's settings menu.
 * When a checklist item is linked to an activity (via autocomplete),
 * the ActivityTune stores the linked activity and provides a shortcut
 * to open it in a new tab.
 */

interface ActivityTuneData {
  activityId: string | null;
  activityTitle: string | null;
}

interface ActivityOption {
  id: string;
  title: string;
  type?: string;
  icon?: string;
}

interface ActivityTuneConfig {
  activities?: ActivityOption[];
  baseUrl?: string;
}

export default class ActivityTune {
  public data: ActivityTuneData;
  private config: ActivityTuneConfig;
  private blockId: string;

  static get isTune() {
    return true;
  }

  constructor({ data, config, block }: any) {
    this.config = config || {};
    this.data = {
      activityId: data?.activityId || null,
      activityTitle: data?.activityTitle || null,
    };
    this.blockId = block?.id;

    // Register globally so Checklist can update this tune when an activity is selected
    if (!(window as any).__activityTunes) (window as any).__activityTunes = {};
    if (this.blockId) {
      (window as any).__activityTunes[this.blockId] = this;
    }
  }

  /** Called by Checklist when user selects an activity from the autocomplete */
  public setActivity(activityId: string | null, activityTitle: string | null) {
    this.data.activityId = activityId;
    this.data.activityTitle = activityTitle;
    document.dispatchEvent(new CustomEvent('editorJS_tuneChanged'));
  }

  private readonly activityIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
  private readonly externalIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
  private readonly unlinkIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;

  render() {
    const { activityId, activityTitle } = this.data;

    if (activityId) {
      const baseUrl = this.config.baseUrl || '/activities';
      const activityUrl = `${baseUrl}/${activityId}`;
      const displayTitle = activityTitle || activityId;

      return {
        icon: this.activityIcon,
        name: 'activityTune',
        title: `Activity: ${displayTitle}`,
        children: {
          items: [
            {
              icon: this.externalIcon,
              title: `View "${displayTitle}" in new tab`,
              closeOnActivate: true,
              onActivate: (_item: any, e: Event) => {
                if (e) e.preventDefault();
                window.open(activityUrl, '_blank', 'noopener,noreferrer');
              }
            },
            {
              icon: this.unlinkIcon,
              title: 'Unlink activity',
              closeOnActivate: true,
              onActivate: (_item: any, e: Event) => {
                if (e) e.preventDefault();
                this.setActivity(null, null);
              }
            }
          ]
        }
      };
    }

    // No activity linked – show a disabled placeholder
    return {
      icon: this.activityIcon,
      name: 'activityTune',
      title: 'No activity linked',
      children: {
        items: [
          {
            icon: `<div style="width:20px;opacity:0.4;">⦸</div>`,
            title: 'Link by typing in a checklist item',
            closeOnActivate: true,
            onActivate: () => {}
          }
        ]
      }
    };
  }

  save() {
    return {
      activityId: this.data.activityId,
      activityTitle: this.data.activityTitle,
    };
  }
}
