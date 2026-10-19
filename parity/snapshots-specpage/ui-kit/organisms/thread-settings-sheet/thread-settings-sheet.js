import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
/** Above this many posts in a week, binding a channel needs an explicit confirm. */
const NOISE_THRESHOLD = 20;
const NOTIFY_LEVELS = [
    { level: 'all', label: 'All' },
    { level: 'mentions', label: 'Mentions' },
    { level: 'muted', label: 'Muted' },
];
export const PopThreadSettingsSheet = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popNotifyChange = __stencil_createEvent(this, "popNotifyChange", 7);
        this.popChannelToggle = __stencil_createEvent(this, "popChannelToggle", 7);
        this.popClose = __stencil_createEvent(this, "popClose", 7);
        this.popAclChange = __stencil_createEvent(this, "popAclChange", 7);
    }
    get el() { return __stencil_getElement(this); }
    open = false;
    /** The thread being configured. Title only — no data is fetched here. */
    thread;
    notifyLevel = 'all';
    /** Channels this thread is already mirrored to. */
    channels = [];
    /** Channels the user could bind, with their addresses. */
    available = [];
    /** Posts in the last week — drives the noise warning. */
    recentPostCount = 0;
    /** False ⇒ the user may not bind or unbind channels. */
    canBind = false;
    // ── pass-throughs to the embedded generic share sheet ──
    acl = [];
    people = [];
    groups = [];
    canEdit = false;
    popNotifyChange;
    popChannelToggle;
    popClose;
    /** Re-emitted from the embedded `pop-share-sheet`. */
    popAclChange;
    /** Channel awaiting an explicit "enable anyway" past the noise warning. */
    pendingChannel = '';
    componentDidLoad() {
        // The bottom sheet and the share sheet emit from their own elements; catch
        // both once at the root, stop them there, and re-emit from THIS component so
        // consumers only ever bind to `pop-thread-settings-sheet`.
        this.el.addEventListener('popClose', this.onInnerClose);
        this.el.addEventListener('popAclChange', this.onInnerAcl);
        this.el.addEventListener('popChange', this.onSwitchChange);
    }
    disconnectedCallback() {
        this.el.removeEventListener('popClose', this.onInnerClose);
        this.el.removeEventListener('popAclChange', this.onInnerAcl);
        this.el.removeEventListener('popChange', this.onSwitchChange);
    }
    /**
     * Channel switches are caught at the root and mapped back to their row via
     * `data-channel`, so the Link switch inside the embedded share sheet (which has
     * no `data-channel` ancestor) is ignored rather than mistaken for a channel.
     */
    onSwitchChange = (ev) => {
        const row = ev.target?.closest?.('[data-channel]');
        const channel = row?.getAttribute('data-channel');
        if (!channel)
            return;
        const entry = (this.available || []).find((c) => c && c.channel === channel);
        if (!entry)
            return;
        ev.stopImmediatePropagation();
        this.onChannelToggle(entry, !!ev.detail);
    };
    // stopImmediatePropagation (not stopPropagation): consumers bind their
    // listeners to THIS element too, so the raw inner event has to be swallowed
    // before it reaches them or every close/acl change would fire twice.
    onInnerClose = (ev) => {
        if (ev.target === this.el)
            return; // our own re-emit — do not loop
        ev.stopImmediatePropagation();
        this.popClose.emit();
    };
    onInnerAcl = (ev) => {
        if (ev.target === this.el)
            return; // our own re-emit — do not loop
        ev.stopImmediatePropagation();
        this.popAclChange.emit(ev.detail);
    };
    isBound(channel) {
        return (this.channels || []).find((c) => c && c.channel === channel);
    }
    addressFor(entry) {
        return this.isBound(entry.channel)?.address || entry.addresses?.[0] || '';
    }
    noisy() {
        return this.recentPostCount > NOISE_THRESHOLD;
    }
    onChannelToggle(entry, enabling) {
        if (!this.canBind)
            return;
        // Enabling a channel on a firehose thread needs a deliberate second tap.
        if (enabling && this.noisy() && this.pendingChannel !== entry.channel) {
            this.pendingChannel = entry.channel;
            return;
        }
        const force = enabling && this.pendingChannel === entry.channel;
        this.pendingChannel = '';
        this.popChannelToggle.emit({
            channel: entry.channel,
            address: this.addressFor(entry),
            enabled: enabling,
            force,
        });
    }
    renderNotifications() {
        return (h("section", { class: "tss__section" },
            h("h3", { class: "tss__heading" }, "Notifications"),
            h("div", { class: "tss__seg", role: "group", "aria-label": "Notification level" }, NOTIFY_LEVELS.map(({ level, label }) => (h("button", { key: level, type: "button", class: { tss__segbtn: true, 'tss__segbtn--on': this.notifyLevel === level }, "aria-pressed": this.notifyLevel === level ? 'true' : 'false', onClick: () => this.popNotifyChange.emit({ level }) }, label)))),
            h("p", { class: "tss__note" }, "Muting stops notifications only \u2014 it does NOT stop channel mirroring. A bound channel keeps delivering every post.")));
    }
    renderChannels() {
        const entries = (this.available || []).filter((c) => c && c.channel);
        return (h("section", { class: "tss__section" },
            h("h3", { class: "tss__heading" }, "Channels"),
            entries.length === 0 && h("p", { class: "tss__empty" }, "No channels available to bind."),
            entries.map((entry) => {
                const bound = this.isBound(entry.channel);
                const address = this.addressFor(entry);
                const warn = this.noisy() && !bound;
                const pending = this.pendingChannel === entry.channel;
                return (h("div", { key: entry.channel, class: "tss__channel", "data-channel": entry.channel },
                    h("div", { class: "tss__rowline" },
                        h("div", { class: "tss__chan-labels" },
                            h("span", { class: "tss__chan" }, entry.channel),
                            h("span", { class: "tss__addr" }, address || 'no address')),
                        h("pop-switch", { checked: !!bound, disabled: !this.canBind, label: `Mirror to ${entry.channel}` })),
                    warn && this.canBind && (h("p", { class: "tss__warn" },
                        "This thread got ",
                        this.recentPostCount,
                        " posts this week. Enabling",
                        ' ',
                        entry.channel,
                        " means all of them go to your phone.")),
                    pending && (h("div", { class: "tss__confirm" },
                        h("button", { type: "button", class: "tss__confirm-btn", onClick: () => this.onChannelToggle(entry, true) }, "Enable anyway"),
                        h("button", { type: "button", class: "tss__cancel-btn", onClick: () => (this.pendingChannel = '') }, "Cancel")))));
            })));
    }
    render() {
        return (h("pop-bottom-sheet", { key: '0', open: this.open, sheetTitle: this.thread?.title ? `${this.thread.title} · settings` : 'Thread settings' },
            h("div", { key: '1', class: "tss" },
                this.renderNotifications(),
                this.renderChannels(),
                h("section", { key: '2', class: "tss__section" },
                    h("h3", { key: '3', class: "tss__heading" }, "Sharing"),
                    h("pop-share-sheet", { key: '4', subject: {
                            kind: 'thread',
                            id: this.thread?.id || '',
                            title: this.thread?.title || '',
                        }, acl: this.acl, people: this.people, groups: this.groups, canEdit: this.canEdit })))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-thread-settings-sheet",
        "componentClassName": "PopThreadSettingsSheet",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "open",
                "type": "boolean",
                "attribute": "open",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "thread",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": true,
                "optional": false,
                "defaultValue": undefined,
                "complexType": {
                    "original": "{ id: string; title: string }",
                    "resolved": "{ id: string; title: string; }",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "The thread being configured. Title only \u2014 no data is fetched here."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "notifyLevel",
                "type": "string",
                "attribute": "notify-level",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'all'",
                "complexType": {
                    "original": "NotifyLevel",
                    "resolved": "\"all\" | \"mentions\" | \"muted\"",
                    "references": {
                        "NotifyLevel": {
                            "location": "local",
                            "path": "ui-kit/organisms/thread-settings-sheet/thread-settings-sheet.tsx",
                            "id": "ui-kit/organisms/thread-settings-sheet/thread-settings-sheet.tsx::NotifyLevel"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "channels",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "BoundChannel[]",
                    "resolved": "BoundChannel[]",
                    "references": {
                        "BoundChannel": {
                            "location": "local",
                            "path": "ui-kit/organisms/thread-settings-sheet/thread-settings-sheet.tsx",
                            "id": "ui-kit/organisms/thread-settings-sheet/thread-settings-sheet.tsx::BoundChannel"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Channels this thread is already mirrored to."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "available",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "AvailableChannel[]",
                    "resolved": "AvailableChannel[]",
                    "references": {
                        "AvailableChannel": {
                            "location": "local",
                            "path": "ui-kit/organisms/thread-settings-sheet/thread-settings-sheet.tsx",
                            "id": "ui-kit/organisms/thread-settings-sheet/thread-settings-sheet.tsx::AvailableChannel"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": "Channels the user could bind, with their addresses."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "recentPostCount",
                "type": "number",
                "attribute": "recent-post-count",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Posts in the last week \u2014 drives the noise warning."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "canBind",
                "type": "boolean",
                "attribute": "can-bind",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "False \u21D2 the user may not bind or unbind channels."
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "acl",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "AclEntry[]",
                    "resolved": "AclEntry[]",
                    "references": {
                        "AclEntry": {
                            "location": "global",
                            "id": "global::AclEntry"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "people",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "Member[]",
                    "resolved": "Member[]",
                    "references": {
                        "Member": {
                            "location": "global",
                            "id": "global::Member"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "groups",
                "type": "unknown",
                "attribute": undefined,
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "[]",
                "complexType": {
                    "original": "Group[]",
                    "resolved": "Group[]",
                    "references": {
                        "Group": {
                            "location": "global",
                            "id": "global::Group"
                        }
                    }
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "canEdit",
                "type": "boolean",
                "attribute": "can-edit",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "pendingChannel"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "popNotifyChange",
                "method": "popNotifyChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "NotifyChangeDetail",
                    "resolved": "NotifyChangeDetail",
                    "references": {
                        "NotifyChangeDetail": {
                            "location": "local",
                            "path": "ui-kit/organisms/thread-settings-sheet/thread-settings-sheet.tsx",
                            "id": "ui-kit/organisms/thread-settings-sheet/thread-settings-sheet.tsx::NotifyChangeDetail"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popChannelToggle",
                "method": "popChannelToggle",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "ChannelToggleDetail",
                    "resolved": "ChannelToggleDetail",
                    "references": {
                        "ChannelToggleDetail": {
                            "location": "local",
                            "path": "ui-kit/organisms/thread-settings-sheet/thread-settings-sheet.tsx",
                            "id": "ui-kit/organisms/thread-settings-sheet/thread-settings-sheet.tsx::ChannelToggleDetail"
                        }
                    }
                },
                "internal": false
            }, {
                "name": "popClose",
                "method": "popClose",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popAclChange",
                "method": "popAclChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Re-emitted from the embedded `pop-share-sheet`."
                },
                "complexType": {
                    "original": "AclChangeDetail",
                    "resolved": "AclChangeDetail",
                    "references": {
                        "AclChangeDetail": {
                            "location": "global",
                            "id": "global::AclChangeDetail"
                        }
                    }
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-THREAD-SETTINGS-SHEET",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/thread-settings-sheet/thread-settings-sheet.css",
                        "relativePath": "thread-settings-sheet.css",
                        "originalComponentPath": "thread-settings-sheet.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": true,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": true,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": true,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": false,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": true,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["class", "role", "aria-label", "key", "type", "aria-pressed", "onClick", "data-channel", "checked", "disabled", "label", "open", "sheetTitle", "subject", "acl", "people", "groups", "canEdit"],
        "htmlTagNames": ["section", "h3", "div", "button", "p", "span", "pop-switch", "pop-bottom-sheet", "pop-share-sheet"],
        "htmlParts": [],
        "htmlSlots": [],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
};
//# sourceMappingURL=thread-settings-sheet.js.map