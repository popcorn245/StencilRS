import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopCountdownStyle0 from "./ui-kit/atoms/countdown/countdown.css?tag=pop-countdown&encapsulation=scoped";
const PopCountdown = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popCountdownDone = __stencil_createEvent(this, "popCountdownDone", 7);
    }
    /** Target instant — epoch MILLISECONDS on the local clock. null/0 = idle. */
    deadline;
    /** Optional label rendered before the time ("Call mom — 1h 02m 05s"). */
    label;
    /** Text when there is no deadline ("No upcoming reminders"). */
    idleText = '';
    /** Text prefix once the deadline passes (the time keeps counting UP). */
    overdueText = 'now';
    /** Re-render tick (1 Hz while a deadline is set). */
    nowMs = Date.now();
    /** Fired ONCE when the deadline crosses ≤0 while mounted (re-armed when the
     *  deadline changes — e.g. after a snooze). */
    popCountdownDone;
    timer;
    fired = false;
    connectedCallback() {
        this.start();
    }
    disconnectedCallback() {
        this.stop();
    }
    onDeadlineChange() {
        this.fired = false; // a new/pushed-out deadline arms the latch again
        this.nowMs = Date.now();
        this.start();
    }
    start() {
        this.stop();
        if (!this.deadline)
            return;
        this.timer = setInterval(() => {
            this.nowMs = Date.now();
            if (!this.fired && this.deadline && this.nowMs >= this.deadline) {
                this.fired = true;
                this.popCountdownDone.emit({ deadline: this.deadline });
            }
        }, 1000);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    /** "1h 02m 05s" / "4m 09s" / "32s" — compact, zero-padded after the first unit. */
    static face(ms) {
        const total = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        if (h > 0)
            return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
        if (m > 0)
            return `${m}m ${String(s).padStart(2, '0')}s`;
        return `${s}s`;
    }
    render() {
        if (!this.deadline) {
            return this.idleText ? h("span", { class: "cd cd--idle" }, this.idleText) : null;
        }
        const remaining = this.deadline - this.nowMs;
        const overdue = remaining < 0;
        const time = PopCountdown.face(Math.abs(remaining));
        return (h("span", { class: { cd: true, 'cd--overdue': overdue }, role: "timer", "aria-live": "off" },
            this.label && h("span", { class: "cd__label" }, this.label),
            h("span", { class: "cd__time" }, overdue ? `${this.overdueText} · ${time} ago` : `in ${time}`)));
    }
    static get watchers() { return {
        "deadline": [{
                "onDeadlineChange": 0
            }]
    }; }
    static get style() { return PopCountdownStyle0(); }
};
__stencil_defineCustomElement(PopCountdown, [514, "pop-countdown", {
        "deadline": [2],
        "label": [1],
        "idleText": [1, "idle-text"],
        "overdueText": [1, "overdue-text"],
        "nowMs": [32]
    }, undefined, {
        "deadline": [{
                "onDeadlineChange": 0
            }]
    }]);
//# sourceMappingURL=countdown.js.map