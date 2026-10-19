import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { Host, h } from "@stencil/core/runtime/server";
import PopPollStyle0 from "./ui-kit/organisms/poll/pop-poll.css?tag=pop-poll";
/**
 * @name pop-poll
 * @description A Twitter-style poll widget that displays a poll question with options,
 * shows real-time vote counts and percentages, and allows users to vote.
 * Emits a `pollVote` event when the user votes, so the host can persist to Firestore.
 */
export class PopPoll {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.pollVote = __stencil_createEvent(this, "pollVote", 7);
    }
    /** The poll question text */
    question = '';
    /** JSON-stringified array of PollOption objects */
    options = '[]';
    /** Total number of votes cast */
    totalVotes = 0;
    /** The current user's voted option value(s), comma-separated for multiple */
    userVote = '';
    /** Poll type: 'single' for one choice, 'multiple' for many */
    pollType = 'single';
    /** ISO date string when poll ends */
    endDate = '';
    /** The Firestore document ID for this poll */
    pollId = '';
    /** When true, disables voting interaction */
    readonly = false;
    /** When true, always shows results even if user hasn't voted */
    showResults = false;
    /** Accent color (CSS custom property value) */
    accentColor = '#7c3aed';
    parsedOptions = [];
    selectedValues = [];
    hasVoted = false;
    timeLeft = '';
    isExpired = false;
    timer;
    /**
     * Emitted when the user clicks "Vote" - detail contains selected values and pollId.
     */
    pollVote;
    /**
     * Programmatically set the user's current vote.
     */
    async setUserVote(value) {
        this.selectedValues = value ? value.split(',').filter(Boolean) : [];
        this.hasVoted = this.selectedValues.length > 0;
    }
    componentWillLoad() {
        this.parseOptions();
        this.parseUserVote();
        this.updateTimeLeft();
        this.injectStyles();
    }
    componentDidLoad() {
        if (this.endDate) {
            this.timer = setInterval(() => this.updateTimeLeft(), 60_000);
        }
    }
    disconnectedCallback() {
        clearInterval(this.timer);
    }
    onOptionsChange() {
        this.parseOptions();
    }
    onUserVoteChange() {
        this.parseUserVote();
    }
    onEndDateChange() {
        this.updateTimeLeft();
    }
    parseOptions() {
        try {
            this.parsedOptions = JSON.parse(this.options || '[]');
        }
        catch {
            this.parsedOptions = [];
        }
    }
    parseUserVote() {
        const votes = this.userVote ? this.userVote.split(',').filter(Boolean) : [];
        this.selectedValues = votes;
        this.hasVoted = votes.length > 0;
    }
    updateTimeLeft() {
        if (!this.endDate)
            return;
        const end = new Date(this.endDate).getTime();
        const now = Date.now();
        const diff = end - now;
        if (diff <= 0) {
            this.isExpired = true;
            this.timeLeft = 'Final results';
            clearInterval(this.timer);
            return;
        }
        this.isExpired = false;
        const days = Math.floor(diff / 86_400_000);
        const hours = Math.floor((diff % 86_400_000) / 3_600_000);
        const mins = Math.floor((diff % 3_600_000) / 60_000);
        if (days > 0) {
            this.timeLeft = `${days}d ${hours}h left`;
        }
        else if (hours > 0) {
            this.timeLeft = `${hours}h ${mins}m left`;
        }
        else {
            this.timeLeft = `${mins}m left`;
        }
    }
    injectStyles() {
        if (document.getElementById('pop-poll-styles'))
            return;
        const s = document.createElement('style');
        s.id = 'pop-poll-styles';
        s.textContent = `
pop-poll { display: block; font-family: var(--pico-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif); }
.pp-wrap { max-width: 500px; }
.pp-question { font-size: 1rem; font-weight: 600; margin: 0 0 0.85rem; line-height: 1.4; color: inherit; }
.pp-options { display: flex; flex-direction: column; gap: 0.5rem; }
.pp-option { position: relative; border-radius: 9999px; border: 2px solid var(--pico-muted-border-color, #e2e8f0); overflow: hidden;
  cursor: pointer; transition: border-color 0.15s; user-select: none; }
.pp-option:hover:not(.pp-option--voted):not(.pp-option--disabled) { border-color: var(--pp-accent, var(--pico-primary, #7c3aed)); }
.pp-option--selected { border-color: var(--pp-accent, var(--pico-primary, #7c3aed)) !important; }
.pp-option--winner { border-color: var(--pp-accent, var(--pico-primary, #7c3aed)); }
.pp-option--disabled { cursor: default; }
.pp-option-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 9999px;
  background: var(--pp-fill-color, rgba(124,58,237,0.15)); transition: width 0.4s ease; pointer-events: none; }
.pp-option-inner { position: relative; display: flex; align-items: center; gap: 0.5rem;
  padding: 0.65rem 1rem; z-index: 1; }
.pp-option-radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--pico-muted-border-color, #cbd5e1);
  flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.pp-option--selected .pp-option-radio { border-color: var(--pp-accent, var(--pico-primary, #7c3aed)); background: var(--pp-accent, var(--pico-primary, #7c3aed)); }
.pp-option-radio-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pico-primary-inverse, #fff); opacity: 0; transition: opacity 0.15s; }
.pp-option--selected .pp-option-radio-dot { opacity: 1; }
.pp-option-check { width: 8px; height: 8px; }
.pp-option-label { flex: 1; font-size: 0.9375rem; font-weight: 500; line-height: 1.3; }
.pp-option-pct { font-size: 0.875rem; font-weight: 600; color: var(--pp-accent, var(--pico-primary, #7c3aed)); margin-left: auto; flex-shrink: 0; }
.pp-option-pct--muted { color: var(--pico-muted-color, #94a3b8); }
.pp-winner-badge { font-size: 11px; color: var(--pp-accent, var(--pico-primary, #7c3aed)); font-weight: 700; margin-left: 4px; }
.pp-footer { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.85rem; font-size: 0.8125rem; color: var(--pico-muted-color, #64748b); }
.pp-footer-dot { opacity: 0.4; }
.pp-vote-btn { margin-top: 0.75rem; padding: 0.5rem 1.25rem; background: var(--pp-accent, var(--pico-primary, #7c3aed));
  color: var(--pico-primary-inverse, #fff); border: none; border-radius: 9999px; font-size: 0.9rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s; }
.pp-vote-btn:hover { opacity: 0.9; }
.pp-vote-btn:disabled { opacity: 0.4; cursor: default; }
.pp-empty { color: var(--pico-muted-color, #94a3b8); font-style: italic; font-size: 0.875rem; }
.pp-poll-link { color: inherit; text-decoration: underline; font-size: inherit; }
.pp-poll-link:hover { color: var(--pp-accent, var(--pico-primary, #7c3aed)); }
`;
        document.head.appendChild(s);
    }
    handleOptionClick(value) {
        if (this.readonly || this.hasVoted || this.isExpired)
            return;
        if (this.pollType === 'multiple') {
            if (this.selectedValues.includes(value)) {
                this.selectedValues = this.selectedValues.filter(v => v !== value);
            }
            else {
                this.selectedValues = [...this.selectedValues, value];
            }
        }
        else {
            this.selectedValues = [value];
        }
    }
    handleVote() {
        if (!this.selectedValues.length)
            return;
        this.hasVoted = true;
        this.pollVote.emit({ values: this.selectedValues, pollId: this.pollId });
    }
    getWinnerValue() {
        if (!this.parsedOptions.length || !this.totalVotes)
            return null;
        let max = -1;
        let winner = '';
        for (const opt of this.parsedOptions) {
            if ((opt.votes || 0) > max) {
                max = opt.votes || 0;
                winner = opt.value;
            }
        }
        return max > 0 ? winner : null;
    }
    getFillColor(color) {
        const colorMap = {
            blue: 'rgba(59,130,246,0.18)',
            red: 'rgba(239,68,68,0.18)',
            green: 'rgba(34,197,94,0.18)',
            yellow: 'rgba(234,179,8,0.18)',
            purple: 'rgba(124,58,237,0.18)',
            pink: 'rgba(236,72,153,0.18)',
            orange: 'rgba(249,115,22,0.18)',
        };
        return colorMap[color || ''] || 'rgba(124,58,237,0.18)';
    }
    renderOption(opt, showVotes, winnerValue) {
        const isSelected = this.selectedValues.includes(opt.value);
        const isWinner = showVotes && opt.value === winnerValue;
        const pct = showVotes ? Math.round((opt.percentage || 0) * 100) : 0;
        const fillColor = this.getFillColor(opt.color);
        const classes = [
            'pp-option',
            isSelected ? 'pp-option--selected' : '',
            showVotes ? 'pp-option--voted pp-option--disabled' : '',
            isWinner && showVotes ? 'pp-option--winner' : '',
        ].filter(Boolean).join(' ');
        return (h("div", { class: classes, style: { '--pp-fill-color': fillColor }, onClick: () => this.handleOptionClick(opt.value), role: "radio", "aria-checked": isSelected ? 'true' : 'false', tabIndex: 0, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleOptionClick(opt.value);
            } } },
            showVotes && (h("div", { class: "pp-option-fill", style: { width: `${pct}%` } })),
            h("div", { class: "pp-option-inner" },
                !showVotes && (h("div", { class: "pp-option-radio" },
                    h("div", { class: "pp-option-radio-dot" }))),
                showVotes && isSelected && (h("svg", { class: "pp-option-check", viewBox: "0 0 16 16", fill: "none" },
                    h("path", { d: "M3 8l4 4 6-6", stroke: "var(--pp-accent,#7c3aed)", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }))),
                h("span", { class: "pp-option-label" }, opt.label || opt.value),
                showVotes && (h("span", { class: `pp-option-pct${isWinner ? '' : ' pp-option-pct--muted'}` },
                    pct,
                    "%",
                    isWinner && h("span", { class: "pp-winner-badge" }, "\u2713"))))));
    }
    render() {
        const showVotes = this.hasVoted || this.showResults || this.isExpired || this.readonly;
        const winnerValue = this.getWinnerValue();
        const canVote = !this.readonly && !this.hasVoted && !this.isExpired;
        return (h(Host, { key: '0', style: { '--pp-accent': this.accentColor } },
            h("div", { key: '1', class: "pp-wrap" },
                this.question && h("p", { key: '2', class: "pp-question" }, this.question),
                this.parsedOptions.length === 0 ? (h("p", { class: "pp-empty" }, "No options available.")) : (h("div", { class: "pp-options", role: "radiogroup", "aria-label": this.question }, this.parsedOptions.map(opt => this.renderOption(opt, showVotes, winnerValue)))),
                canVote && this.selectedValues.length > 0 && (h("button", { key: '3', class: "pp-vote-btn", onClick: () => this.handleVote() }, "Vote")),
                h("div", { key: '4', class: "pp-footer" },
                    h("span", { key: '5' },
                        this.totalVotes,
                        " vote",
                        this.totalVotes !== 1 ? 's' : ''),
                    this.timeLeft && (h("span", { key: '6', class: "pp-footer-dot" }, "\u00B7")),
                    this.timeLeft && (h("span", { key: '7' }, this.timeLeft)),
                    this.pollId && (h("span", { key: '8', class: "pp-footer-dot" }, "\u00B7")),
                    this.pollId && (h("a", { key: '9', href: `/polls/${this.pollId}`, class: "pp-poll-link" }, "View poll"))))));
    }
    static get watchers() { return {
        "options": [{
                "onOptionsChange": 0
            }],
        "userVote": [{
                "onUserVoteChange": 0
            }],
        "endDate": [{
                "onEndDateChange": 0
            }]
    }; }
    static get style() { return PopPollStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "pop-poll",
        "$members$": {
            "question": [1],
            "options": [1],
            "totalVotes": [2, "total-votes"],
            "userVote": [1, "user-vote"],
            "pollType": [1, "poll-type"],
            "endDate": [1, "end-date"],
            "pollId": [1, "poll-id"],
            "readonly": [4],
            "showResults": [4, "show-results"],
            "accentColor": [1, "accent-color"],
            "parsedOptions": [32],
            "selectedValues": [32],
            "hasVoted": [32],
            "timeLeft": [32],
            "isExpired": [32],
            "setUserVote": [64]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=pop-poll.js.map