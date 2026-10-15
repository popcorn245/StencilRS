import type { BlockTool } from '@editorjs/editorjs';

interface PollOption {
  label: string;
  value: string;
  color: string;
  votes: number;
  percentage: number;
}

interface PollBlockData {
  pollId?: string;
  question: string;
  options: PollOption[];
  type: 'single' | 'multiple';
  duration: number; // days
  totalVotes: number;
  endDate?: string;
  published: boolean;
}

/**
 * PollBlock — EditorJS Block Tool wrapping the `pop-poll` StencilJS component.
 *
 * Same Twitter-style poll UI as before, but now rendered via a StencilJS
 * custom element following the props-down/events-up pattern.
 *
 * Saved data is backwards-compatible with the previous vanilla DOM version.
 */
export default class PollBlock implements BlockTool {
  private data: PollBlockData;
  private readOnly: boolean;
  private blockAPI: any;
  private wrapper: HTMLElement;
  private unwatch: (() => void) | null = null;

  static get toolbox() {
    return {
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor"/>
        <rect x="6" y="5" width="3" height="10" rx="1" fill="currentColor"/>
        <rect x="11" y="1" width="3" height="14" rx="1" fill="currentColor"/>
      </svg>`,
      title: 'Poll',
    };
  }

  static get isReadOnlySupported() { return true; }
  static get enableLineBreaks() { return false; }

  constructor({ data, readOnly, block }: any) {
    this.readOnly = readOnly || false;
    this.blockAPI = block;
    this.wrapper = document.createElement('div');

    this.data = {
      pollId: data.pollId || '',
      question: data.question || '',
      options: data.options?.length
        ? data.options
        : [
            { label: '', value: 'option-1', color: 'purple', votes: 0, percentage: 0 },
            { label: '', value: 'option-2', color: 'blue', votes: 0, percentage: 0 },
          ],
      type: data.type || 'single',
      duration: data.duration || 1,
      totalVotes: data.totalVotes || 0,
      endDate: data.endDate || '',
      published: data.published || false,
    };
  }

  render(): HTMLElement {
    this.wrapper.innerHTML = '';
    this.wrapper.className = 'poll-block-root';

    const el = document.createElement('pop-poll') as any;
    el.pollId = this.data.pollId || '';
    el.question = this.data.question;
    el.options = JSON.stringify(this.data.options);
    el.type = this.data.type;
    el.duration = this.data.duration;
    el.totalVotes = this.data.totalVotes;
    el.endDate = this.data.endDate || '';
    el.published = this.data.published;
    el.readonly = this.readOnly;

    // Load user vote from sessionStorage
    if (this.data.pollId) {
      try {
        const vote = sessionStorage.getItem(`poll-vote-${this.data.pollId}`);
        if (vote) el.userVote = vote;
      } catch { /* ignore */ }
    }

    // Listen for events from the component
    el.addEventListener('pollChange', (e: CustomEvent) => {
      const d = e.detail;
      this.data.pollId = d.pollId || this.data.pollId;
      this.data.question = d.question;
      this.data.options = d.options;
      this.data.type = d.type;
      this.data.duration = d.duration;
      this.data.totalVotes = d.totalVotes;
      this.data.endDate = d.endDate || '';
      this.data.published = d.published;
      this.notifyChange();
    });

    el.addEventListener('pollPublish', async (e: CustomEvent) => {
      const { question, options, type, duration } = e.detail;
      try {
        const db = (window as any).popcorn?.db;
        if (!db) throw new Error('Database not available.');

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + duration);

        const pollPayload = {
          question,
          options: options.map((o: PollOption) => ({
            label: o.label, value: o.value, color: o.color, votes: 0, percentage: 0,
          })),
          type,
          duration,
          totalVotes: 0,
          endDate: endDate.toISOString(),
          startedAt: new Date().toISOString(),
        };

        const docRef = await db.add('polls', pollPayload);
        const pollId = docRef?.id || docRef;

        this.data.pollId = pollId;
        this.data.endDate = endDate.toISOString();
        this.data.published = true;
        this.data.totalVotes = 0;
        this.notifyChange();

        // Re-render with updated poll ID
        el.pollId = pollId;
        el.endDate = endDate.toISOString();
        el.published = true;

        // Start watching for real-time updates
        this.watchPoll();
      } catch (err: any) {
        console.error('[PollBlock] Publish failed:', err);
      }
    });

    el.addEventListener('pollVote', async (e: CustomEvent) => {
      const { pollId, values } = e.detail;
      try {
        const db = (window as any).popcorn?.db;
        if (!db) throw new Error('Database not available.');

        const auth = (window as any).popcorn?.auth;
        if (typeof auth?.authStateReady === 'function') await auth.authStateReady();
        const uid = auth?.currentUser?.uid ?? (window as any).popcorn?.session?.uid;
        if (!uid) throw Object.assign(new Error('Sign in to vote.'), { code: 'permission-denied' });

        await db.add(`polls/${pollId}/votes`, { value: values.join(','), createdAt: new Date().toISOString() }, uid);

        // Recalculate totals
        const votesSnap = await db.getCollection(`polls/${pollId}/votes`);
        const votes = votesSnap.docs?.map((d: any) => d.data()) || [];
        const totalVotes = votes.length;
        const newOptions = this.data.options.map(opt => {
          const optVotes = votes.filter((v: any) => (v.value || '').split(',').includes(opt.value));
          return { ...opt, votes: optVotes.length, percentage: totalVotes > 0 ? optVotes.length / totalVotes : 0 };
        });

        await db.update('polls', pollId, { totalVotes, options: newOptions });

        this.data.totalVotes = totalVotes;
        this.data.options = newOptions;

        try { sessionStorage.setItem(`poll-vote-${pollId}`, values.join(',')); } catch { /* ignore */ }

        // Update component
        el.totalVotes = totalVotes;
        el.options = JSON.stringify(newOptions);
        el.userVote = values.join(',');
        this.notifyChange();
      } catch (err: any) {
        console.error('[PollBlock] Vote failed:', err);
      }
    });

    // Watch for real-time updates if published
    if (this.data.published && this.data.pollId) {
      this.watchPoll();
    }

    this.wrapper.appendChild(el);
    return this.wrapper;
  }

  private watchPoll() {
    if (this.unwatch) { this.unwatch(); this.unwatch = null; }
    const db = (window as any).popcorn?.db;
    if (!db || !this.data.pollId) return;

    db.watchDocument('polls', this.data.pollId, (res: any) => {
      const d = res?.data;
      if (!d) return;
      let changed = false;
      if (d.totalVotes !== this.data.totalVotes) { this.data.totalVotes = d.totalVotes; changed = true; }
      if (d.options && JSON.stringify(d.options) !== JSON.stringify(this.data.options)) {
        this.data.options = d.options;
        changed = true;
      }
      if (changed) {
        const el = this.wrapper.querySelector('pop-poll') as any;
        if (el) {
          el.totalVotes = this.data.totalVotes;
          el.options = JSON.stringify(this.data.options);
        }
      }
    });

    this.unwatch = () => {
      db.unwatchDocument?.('polls', this.data.pollId);
    };
  }

  private notifyChange() {
    if (this.blockAPI && typeof this.blockAPI.dispatchChange === 'function') {
      this.blockAPI.dispatchChange();
    }
  }

  save(): PollBlockData {
    return {
      pollId: this.data.pollId || '',
      question: this.data.question,
      options: this.data.options,
      type: this.data.type,
      duration: this.data.duration,
      totalVotes: this.data.totalVotes,
      endDate: this.data.endDate || '',
      published: this.data.published,
    };
  }

  destroy() {
    if (this.unwatch) { this.unwatch(); this.unwatch = null; }
  }
}
