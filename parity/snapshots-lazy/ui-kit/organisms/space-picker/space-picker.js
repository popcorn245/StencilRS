import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopSpacePickerStyle0 from "./ui-kit/organisms/space-picker/space-picker.css?tag=pop-space-picker&encapsulation=scoped";
export const PopSpacePicker = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.valueChanged = __stencil_createEvent(this, "valueChanged", 7);
        this.spaceCreateRequested = __stencil_createEvent(this, "spaceCreateRequested", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Currently picked space IDs. */
    value = [];
    /** Available spaces — caller provides; component is presentational. */
    spaces = [];
    /** Placeholder shown when no spaces are selected. */
    placeholder = 'Select spaces…';
    /** Whether to show the "+ New space" entry at popover bottom. */
    allowCreate = true;
    /** Emitted when the picked set changes. Detail = new ID list. */
    valueChanged;
    /** Emitted when user submits the "+ New space" mini-form. */
    spaceCreateRequested;
    open = false;
    query = '';
    showCreateForm = false;
    createName = '';
    createIcon = '📦';
    createRoom = '';
    onChipRemove(id, e) {
        e.stopPropagation();
        const next = (this.value ?? []).filter(v => v !== id);
        this.value = next;
        this.valueChanged.emit(next);
    }
    toggleSpace(id) {
        const current = this.value ?? [];
        const next = current.includes(id)
            ? current.filter(v => v !== id)
            : [...current, id];
        this.value = next;
        this.valueChanged.emit(next);
    }
    openPopover = () => {
        this.open = true;
    };
    closePopover = () => {
        this.open = false;
        this.showCreateForm = false;
        this.query = '';
    };
    onOuterClick = (e) => {
        if (!this.el.contains(e.target)) {
            this.closePopover();
        }
    };
    connectedCallback() {
        document.addEventListener('mousedown', this.onOuterClick);
    }
    disconnectedCallback() {
        document.removeEventListener('mousedown', this.onOuterClick);
    }
    submitCreate = (e) => {
        e.preventDefault();
        const name = this.createName.trim();
        if (!name)
            return;
        this.spaceCreateRequested.emit({
            name,
            icon: this.createIcon || '📦',
            room: this.createRoom.trim() || undefined,
        });
        this.createName = '';
        this.createIcon = '📦';
        this.createRoom = '';
        this.showCreateForm = false;
    };
    filteredSpaces() {
        const q = this.query.trim().toLowerCase();
        if (!q)
            return this.spaces;
        return this.spaces.filter(s => s.name.toLowerCase().includes(q) || (s.room?.toLowerCase().includes(q) ?? false));
    }
    render() {
        const picked = this.value ?? [];
        const byId = new Map(this.spaces.map(s => [s.id, s]));
        const chips = picked.map(id => byId.get(id)).filter(Boolean);
        return (h("div", { key: '0', class: "psp" },
            h("button", { key: '1', type: "button", class: "psp__field", "aria-haspopup": "listbox", "aria-expanded": this.open ? 'true' : 'false', onClick: this.openPopover },
                chips.length === 0 && (h("span", { key: '2', class: "psp__placeholder" }, this.placeholder)),
                chips.map(s => (h("span", { class: "psp__chip", key: s.id },
                    h("span", { class: "psp__chip-icon" }, s.icon),
                    h("span", { class: "psp__chip-label" }, s.name),
                    h("button", { type: "button", class: "psp__chip-remove", "aria-label": `Remove ${s.name}`, onClick: (e) => this.onChipRemove(s.id, e) }, "\u00D7"))))),
            this.open && (h("div", { key: '3', class: "psp__popover", role: "dialog" },
                h("input", { key: '4', type: "text", class: "psp__search", placeholder: "Search spaces\u2026", value: this.query, onInput: (e) => this.query = e.target.value }),
                h("ul", { key: '5', class: "psp__list", role: "listbox" },
                    this.filteredSpaces().map(s => {
                        const isPicked = picked.includes(s.id);
                        return (h("li", { class: { 'psp__opt': true, 'psp__opt--picked': isPicked }, role: "option", "aria-selected": isPicked ? 'true' : 'false', key: s.id, onClick: () => this.toggleSpace(s.id) },
                            h("span", { class: "psp__opt-icon" }, s.icon),
                            h("span", { class: "psp__opt-name" }, s.name),
                            s.room && h("span", { class: "psp__opt-room" }, s.room),
                            isPicked && h("span", { class: "psp__opt-check" }, "\u2713")));
                    }),
                    this.filteredSpaces().length === 0 && (h("li", { key: '6', class: "psp__empty" }, "No matching spaces."))),
                this.allowCreate && !this.showCreateForm && (h("button", { key: '7', type: "button", class: "psp__new", onClick: () => { this.showCreateForm = true; } }, "+ New space")),
                this.allowCreate && this.showCreateForm && (h("form", { key: '8', class: "psp__create", onSubmit: this.submitCreate },
                    h("div", { key: '9', class: "psp__create-row" },
                        h("input", { key: 'a', type: "text", class: "psp__create-icon", "aria-label": "Icon", maxLength: 4, value: this.createIcon, onInput: (e) => this.createIcon = e.target.value }),
                        h("input", { key: 'b', type: "text", class: "psp__create-name", "aria-label": "Space name", placeholder: "Name (e.g. Kitchen)", value: this.createName, onInput: (e) => this.createName = e.target.value })),
                    h("input", { key: 'c', type: "text", class: "psp__create-room", "aria-label": "Room category (optional)", placeholder: "Room category (optional)", value: this.createRoom, onInput: (e) => this.createRoom = e.target.value }),
                    h("div", { key: 'd', class: "psp__create-actions" },
                        h("button", { key: 'e', type: "button", onClick: () => { this.showCreateForm = false; } }, "Cancel"),
                        h("button", { key: 'f', type: "submit", disabled: !this.createName.trim() }, "Create"))))))));
    }
};
PopSpacePicker.style = PopSpacePickerStyle0();
//# sourceMappingURL=space-picker.js.map