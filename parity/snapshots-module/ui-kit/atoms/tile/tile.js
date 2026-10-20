import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopTileStyle0 from "./ui-kit/atoms/tile/tile.css?tag=pop-tile&encapsulation=scoped";
export const PopTile = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popTap = __stencil_createEvent(this, "popTap", 7);
        this.popDelete = __stencil_createEvent(this, "popDelete", 7);
    }
    /** Emoji face (e.g. '🌤️') — mutually exclusive with `icon`. */
    emoji;
    /** Ionicon name, rendered via pop-icon (used when no `emoji`). */
    icon;
    /** The tile label. */
    label;
    /** Square card (default) or compact chip pill. */
    variant = 'square';
    /** Accent — any CSS color (drives the face background tint). */
    color;
    /** Active/pressed visual state (reflected as aria-pressed). */
    pressed = false;
    /** Edit mode: wiggle affordance + delete button. */
    editing = false;
    disabled = false;
    /** Whether the edit-mode delete button shows at all (hosts suppress it for
     *  tiles that must never be removed, e.g. a Settings tile). */
    deletable = true;
    /** Ionicon for the edit-mode delete button — hosts repurpose it for their own
     *  remove semantics (e.g. 'eye-off-outline' = hide, 'eye-outline' = restore,
     *  'trash-outline' = delete). */
    deleteIcon = 'close';
    /** Accessible name/tooltip for the delete button. */
    deleteLabel = 'Delete';
    /** Tooltip for the face button. Defaults to the label. */
    tileTitle;
    /** The face was activated (click / Enter / Space). Not emitted while disabled. */
    popTap;
    /** The edit-mode delete button was activated (only reachable when `editing`). */
    popDelete;
    onDelete = (e) => {
        e.stopPropagation();
        this.popDelete.emit();
    };
    render() {
        const chip = this.variant === 'chip';
        return (h(Host, { key: '0', class: {
                'pop-tile--chip': chip,
                'pop-tile--square': !chip,
                'pop-tile--editing': this.editing,
            } },
            h("button", { key: '1', type: "button", class: {
                    tile: true,
                    'tile--chip': chip,
                    'tile--square': !chip,
                    'tile--pressed': this.pressed,
                    'tile--editing': this.editing,
                }, style: this.color ? { '--pop-tile-accent': this.color, background: this.color } : undefined, disabled: this.disabled, "aria-pressed": this.pressed ? 'true' : 'false', title: this.tileTitle ?? this.label, onClick: () => this.popTap.emit() },
                this.emoji ? (h("span", { class: "tile__emoji", role: "img", "aria-label": this.label }, this.emoji)) : this.icon ? (h("pop-icon", { class: "tile__icon", name: this.icon })) : null,
                h("span", { key: '2', class: "tile__label" }, this.label),
                h("span", { key: '3', class: "tile__face" },
                    h("slot", { key: '4' })),
                h("span", { key: '5', class: "tile__badge" },
                    h("slot", { key: '6', name: "badge" }))),
            this.editing && this.deletable && (h("button", { key: '7', type: "button", class: "tile__delete", "aria-label": this.deleteLabel, title: this.deleteLabel, onClick: this.onDelete },
                h("pop-icon", { key: '8', name: this.deleteIcon })))));
    }
    static get style() { return PopTileStyle0(); }
};
__stencil_proxyCustomElement(PopTile, [774, "pop-tile", {
        "emoji": [1],
        "icon": [1],
        "label": [1],
        "variant": [1],
        "color": [1],
        "pressed": [4],
        "editing": [4],
        "disabled": [4],
        "deletable": [4],
        "deleteIcon": [1, "delete-icon"],
        "deleteLabel": [1, "delete-label"],
        "tileTitle": [1, "tile-title"]
    }]);
//# sourceMappingURL=tile.js.map