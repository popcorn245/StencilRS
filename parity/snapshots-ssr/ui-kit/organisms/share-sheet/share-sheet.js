import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopShareSheetStyle0 from "./ui-kit/organisms/share-sheet/share-sheet.css?tag=pop-share-sheet&encapsulation=scoped";
const LEVELS = ['viewer', 'participant'];
/**
 * pop-share-sheet — a GENERIC sharing surface.
 *
 * Deliberately domain-free: it shares a `subject` (`{ kind, id, title }`) with
 * people and groups. Nothing in here knows the word "thread" — the same
 * component is meant to serve projects, notes and tasks later.
 *
 * The sheet is STATELESS with respect to the ACL: every mutation emits
 * `popAclChange` with a **full replacement array**, never a patch, and waits for
 * the host to feed the new `acl` back down. That makes the host the single
 * writer and keeps optimistic-UI drift impossible.
 *
 * The Link section is Phase 2. It renders DISABLED with a "Coming soon" badge in
 * V1 on purpose, so the layout does not shift when it lands.
 */
export class PopShareSheet {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popAclChange = __stencil_createEvent(this, "popAclChange", 7);
        this.popLinkToggle = __stencil_createEvent(this, "popLinkToggle", 7);
        this.popRedactionChange = __stencil_createEvent(this, "popRedactionChange", 7);
    }
    /** What is being shared. Free-form `kind` — this component stays domain-free. */
    subject;
    /** The current access-control list. */
    acl = [];
    /** People the host can resolve, for names and the add-person picker. */
    people = [];
    /** Groups the host can resolve. An acl group missing here renders as deleted. */
    groups = [];
    /** False ⇒ the whole sheet is read-only. */
    canEdit = false;
    /** Phase 2 — public link. Rendered disabled in V1. */
    linkEnabled = false;
    /** Phase 2 — the public link URL. */
    linkUrl = '';
    /** Host-owned redaction settings, passed through untouched. */
    redaction;
    /** The FULL replacement acl. Never a patch. */
    popAclChange;
    /** Phase 2 — emitted when the public link switch flips. */
    popLinkToggle;
    /** Emitted when the host-owned redaction settings change. */
    popRedactionChange;
    /** Which group rows have their member list expanded (view-only UI state). */
    expanded = [];
    /** Selection of the add-person picker (view-only UI state). */
    pendingUid = '';
    entries() {
        return Array.isArray(this.acl) ? this.acl.filter((e) => e && e.subjectType) : [];
    }
    emit(next) {
        this.popAclChange.emit({ acl: next });
    }
    setLevel(entry, level) {
        if (!this.canEdit || entry.level === level)
            return;
        this.emit(this.entries().map((e) => (e === entry ? { ...e, level } : e)));
    }
    remove(entry) {
        if (!this.canEdit)
            return;
        this.emit(this.entries().filter((e) => e !== entry));
    }
    addPerson = () => {
        const uid = this.pendingUid;
        if (!this.canEdit || !uid)
            return;
        this.pendingUid = '';
        this.emit([
            ...this.entries(),
            { subjectType: 'user', subjectId: uid, level: 'viewer', grantedAt: Date.now() },
        ]);
    };
    toggleExpanded(groupId) {
        this.expanded = this.expanded.includes(groupId)
            ? this.expanded.filter((id) => id !== groupId)
            : [...this.expanded, groupId];
    }
    personName(uid) {
        const found = (this.people || []).find((p) => p && p.uid === uid);
        return found?.displayName || 'Unknown person';
    }
    renderLevel(entry) {
        return (h("div", { class: "shs__seg", role: "group", "aria-label": "Access level" }, LEVELS.map((level) => (h("button", { key: level, type: "button", class: { shs__segbtn: true, 'shs__segbtn--on': entry.level === level }, disabled: !this.canEdit, "aria-pressed": entry.level === level ? 'true' : 'false', onClick: () => this.setLevel(entry, level) }, level === 'viewer' ? 'Viewer' : 'Participant')))));
    }
    renderRemove(entry, what) {
        if (!this.canEdit)
            return null;
        return (h("button", { type: "button", class: "pop-iconbtn shs__btn", title: `Remove ${what}`, "aria-label": `Remove ${what}`, onClick: () => this.remove(entry) },
            h("ion-icon", { name: "close-outline", "aria-hidden": "true" })));
    }
    renderPeople() {
        const rows = this.entries().filter((e) => e.subjectType === 'user');
        const takenUids = new Set(rows.map((e) => e.subjectId));
        const addable = (this.people || []).filter((p) => p && !takenUids.has(p.uid));
        return (h("section", { class: "shs__section" },
            h("h3", { class: "shs__heading" }, "People"),
            rows.length === 0 && h("p", { class: "shs__empty" }, "Nobody else has access yet."),
            rows.map((entry) => (h("div", { key: `u:${entry.subjectId}`, class: "shs__row" },
                h("span", { class: "shs__name" }, this.personName(entry.subjectId)),
                this.renderLevel(entry),
                this.renderRemove(entry, this.personName(entry.subjectId))))),
            this.canEdit && addable.length > 0 && (h("div", { class: "shs__add" },
                h("select", { class: "shs__picker", "aria-label": "Add a person", onChange: (ev) => (this.pendingUid = ev.target.value) },
                    h("option", { value: "" }, "Add a person\u2026"),
                    addable.map((p) => (h("option", { key: p.uid, value: p.uid }, p.displayName)))),
                h("button", { type: "button", class: { 'shs__add-btn': true, 'shs__add-btn--off': !this.pendingUid }, "aria-disabled": this.pendingUid ? 'false' : 'true', onClick: this.addPerson }, "Add")))));
    }
    renderGroups() {
        const rows = this.entries().filter((e) => e.subjectType === 'group');
        if (rows.length === 0)
            return null;
        return (h("section", { class: "shs__section" },
            h("h3", { class: "shs__heading" }, "Groups"),
            rows.map((entry) => {
                const group = (this.groups || []).find((g) => g && g.id === entry.subjectId);
                const open = this.expanded.includes(entry.subjectId || '');
                const members = group?.memberUids || [];
                return (h("div", { key: `g:${entry.subjectId}`, class: { shs__row: true, 'shs__row--stack': true } },
                    h("div", { class: "shs__rowline" },
                        h("span", { class: { shs__name: true, 'shs__name--gone': !group } }, group ? group.name : 'deleted group'),
                        group && h("span", { class: "shs__count" }, members.length),
                        group && (h("button", { type: "button", class: "pop-iconbtn shs__btn", title: open ? 'Hide members' : 'Show members', "aria-label": open ? 'Hide members' : 'Show members', "aria-expanded": open ? 'true' : 'false', onClick: () => this.toggleExpanded(entry.subjectId || '') },
                            h("ion-icon", { name: open ? 'chevron-up-outline' : 'chevron-down-outline', "aria-hidden": "true" }))),
                        this.renderLevel(entry),
                        this.renderRemove(entry, group ? group.name : 'deleted group')),
                    open && (h("ul", { class: "shs__members" }, members.map((uid) => (h("li", { key: uid }, this.personName(uid))))))));
            })));
    }
    renderLink() {
        // Phase 2. Rendered now — disabled, with a "Coming soon" badge — so the
        // layout does not shift when public links actually ship.
        return (h("section", { class: "shs__section shs__section--soon" },
            h("h3", { class: "shs__heading" },
                "Link",
                h("span", { class: "shs__soon" }, "Coming soon")),
            h("div", { class: "shs__row" },
                h("span", { class: "shs__name" }, "Anyone with the link can view"),
                h("pop-switch", { checked: this.linkEnabled, disabled: true, label: "Anyone with the link can view" })),
            this.linkUrl && h("p", { class: "shs__url" }, this.linkUrl)));
    }
    render() {
        const title = this.subject?.title || '';
        return (h("div", { key: '0', class: { shs: true, 'shs--readonly': !this.canEdit } },
            h("header", { key: '1', class: "shs__head" },
                h("span", { key: '2', class: "shs__subject" }, title),
                this.subject?.kind && h("span", { key: '3', class: "shs__kind" }, this.subject.kind)),
            !this.canEdit && h("p", { key: '4', class: "shs__note" }, "You can see who has access, but not change it."),
            this.renderPeople(),
            this.renderGroups(),
            this.renderLink()));
    }
    static get style() { return PopShareSheetStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-share-sheet",
        "$members$": {
            "subject": [8],
            "acl": [16],
            "people": [16],
            "groups": [16],
            "canEdit": [4, "can-edit"],
            "linkEnabled": [4, "link-enabled"],
            "linkUrl": [1, "link-url"],
            "redaction": [8],
            "expanded": [32],
            "pendingUid": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=share-sheet.js.map