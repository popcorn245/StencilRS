import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { Host, h } from "@stencil/core/runtime/server";
import PopFileMentionStyle0 from "./ui-kit/organisms/file-mention/file-mention.css?tag=pop-file-mention&encapsulation=shadow";
/** Extract all @path references from a string. */
function extractMentioned(text) {
    const matches = [...text.matchAll(/@([\w./\-]+)/g)];
    return [...new Set(matches.map(m => m[1]))];
}
/** Fuzzy-match: does `path` contain all characters of `query` in order? */
function fuzzyMatch(path, query) {
    const lp = path.toLowerCase();
    const lq = query.toLowerCase();
    let qi = 0;
    for (let i = 0; i < lp.length && qi < lq.length; i++) {
        if (lp[i] === lq[qi])
            qi++;
    }
    return qi === lq.length;
}
/** Return the last 2 path segments as a label. */
function shortLabel(path) {
    const parts = path.split('/');
    return parts.slice(-2).join('/');
}
export class PopFileMention {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.mentionChange = __stencil_createEvent(this, "mentionChange", 7);
        this.mentionSubmit = __stencil_createEvent(this, "mentionSubmit", 7);
        this.filesReferenced = __stencil_createEvent(this, "filesReferenced", 7);
    }
    get el() { return __stencil_getElement(this); }
    textareaEl;
    /** JSON-encoded string array OR raw string array of file paths */
    files = '[]';
    value = '';
    placeholder = 'Type @ to mention a file…';
    disabled = false;
    mentionChange;
    mentionSubmit;
    /** Fires whenever the set of @-mentioned files in the current value changes */
    filesReferenced;
    dropdownOpen = false;
    query = '';
    filteredPaths = [];
    focusedIndex = 0;
    /** Cursor position where the current @ mention started */
    mentionStart = -1;
    get parsedFiles() {
        if (Array.isArray(this.files))
            return this.files;
        try {
            return JSON.parse(this.files);
        }
        catch {
            return [];
        }
    }
    filesChanged() {
        // Re-filter if dropdown is open
        if (this.dropdownOpen)
            this.updateFilter(this.query);
    }
    updateFilter(q) {
        const all = this.parsedFiles;
        this.filteredPaths = all.filter(p => fuzzyMatch(p, q)).slice(0, 20);
        this.focusedIndex = 0;
    }
    handleInput = (e) => {
        const ta = e.target;
        this.value = ta.value;
        this.mentionChange.emit({ value: this.value });
        this.filesReferenced.emit(extractMentioned(this.value));
        // Detect if we're inside an @... token
        const cursor = ta.selectionStart ?? 0;
        const before = this.value.slice(0, cursor);
        const atIdx = before.lastIndexOf('@');
        if (atIdx !== -1) {
            const fragment = before.slice(atIdx + 1);
            // Only activate if no space/newline since @
            if (!/[\s]/.test(fragment)) {
                this.mentionStart = atIdx;
                this.query = fragment;
                this.updateFilter(fragment);
                this.dropdownOpen = this.filteredPaths.length > 0;
                return;
            }
        }
        this.dropdownOpen = false;
        this.mentionStart = -1;
    };
    handleKeydown = (e) => {
        if (e.key === 'Shift')
            return; // don't interfere with Shift+Enter
        if (this.dropdownOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.focusedIndex = Math.min(this.focusedIndex + 1, this.filteredPaths.length - 1);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                this.selectPath(this.filteredPaths[this.focusedIndex]);
                return;
            }
            if (e.key === 'Escape') {
                this.dropdownOpen = false;
                return;
            }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.mentionSubmit.emit({ value: this.value, mentionedFiles: extractMentioned(this.value) });
        }
        // Shift+Enter → let browser insert newline (default behavior)
    };
    selectPath(path) {
        if (!path)
            return;
        const ta = this.textareaEl;
        if (!ta)
            return;
        const before = this.value.slice(0, this.mentionStart);
        const after = this.value.slice(ta.selectionStart ?? 0);
        this.value = `${before}@${path} ${after}`;
        this.dropdownOpen = false;
        this.mentionStart = -1;
        this.mentionChange.emit({ value: this.value });
        this.filesReferenced.emit(extractMentioned(this.value));
        // Restore focus + cursor after path
        requestAnimationFrame(() => {
            if (!ta)
                return;
            ta.value = this.value;
            const pos = before.length + path.length + 2; // @ + path + space
            ta.setSelectionRange(pos, pos);
            ta.focus();
        });
    }
    render() {
        return (h(Host, { key: '0' },
            h("div", { key: '1', class: "wrap" },
                h("textarea", { key: '2', class: "textarea", part: "textarea", value: this.value, placeholder: this.placeholder, disabled: this.disabled, onInput: this.handleInput, onKeyDown: this.handleKeydown, ref: el => (this.textareaEl = el), rows: 2 }),
                this.dropdownOpen && this.filteredPaths.length > 0 && (h("div", { key: '3', class: "dropdown", role: "listbox" }, this.filteredPaths.map((path, i) => (h("div", { key: path, class: { 'dropdown-item': true, 'is-focused': i === this.focusedIndex }, role: "option", "aria-selected": String(i === this.focusedIndex), title: path, onMouseDown: (e) => { e.preventDefault(); this.selectPath(path); }, onMouseEnter: () => { this.focusedIndex = i; } },
                    h("span", { class: "item-label" }, shortLabel(path)),
                    h("span", { class: "item-full" }, path)))))))));
    }
    static get watchers() { return {
        "files": [{
                "filesChanged": 0
            }]
    }; }
    static get style() { return PopFileMentionStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 513,
        "$tagName$": "pop-file-mention",
        "$members$": {
            "files": [1],
            "value": [1025],
            "placeholder": [1],
            "disabled": [4],
            "dropdownOpen": [32],
            "query": [32],
            "filteredPaths": [32],
            "focusedIndex": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=file-mention.js.map