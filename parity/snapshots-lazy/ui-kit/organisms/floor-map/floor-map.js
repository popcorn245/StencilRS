import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { floorSvg, FLOOR_VIEWBOX, roomDimsCaption, } from '@popcorn245/floorplan-core';
import PopFloorMapStyle0 from "./ui-kit/organisms/floor-map/floor-map.css?tag=pop-floor-map&encapsulation=scoped";
export const PopFloorMap = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.roomSelect = __stencil_createEvent(this, "roomSelect", 7);
        this.deviceSelect = __stencil_createEvent(this, "deviceSelect", 7);
        this.planChange = __stencil_createEvent(this, "planChange", 7);
        this.haImportRequested = __stencil_createEvent(this, "haImportRequested", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** JSON-stringified FloorPlan (single source of truth, owned by the host). */
    plan = 'null';
    /** Active floor id. Uncontrolled after first render (internal state mirrors). */
    activeFloorId;
    /** Interaction mode. */
    mode = 'tasks';
    /** Per-room task counts as JSON `{ [roomId]: number }` — Tasks-mode shading. */
    taskCounts = '{}';
    /**
     * Per-room emoji hints as JSON `{ [roomId]: string[] }`. Up to 3 are rendered
     * in each read-only room zone (sourced from the spaces that resolve there).
     */
    roomEmojis = '{}';
    /**
     * Editable surface. When false (the default — the task view), the map is
     * READ-ONLY: floor switcher + shaded room zones with counts + emojis only.
     * The mode toggle, device pins, edges, edit tooling and HA import are all
     * hidden. When true (Settings), the full editor (Tasks/Devices/Edit) renders.
     */
    editable = false;
    /** Highlighted room id (the active room filter), for Tasks mode. */
    selectedRoomId;
    /** Room id currently hovered as a drag drop-target (set imperatively by
     *  pop-task-list while a task is dragged over the map). Drives a distinct
     *  highlight so the user sees where the drop will land. Tasks mode only. */
    dropTargetRoomId;
    /** A room hit-zone was clicked. */
    roomSelect;
    /** A device pin was clicked (Devices mode). */
    deviceSelect;
    /** The plan was edited (Edit mode) — host persists. Detail = the new plan. */
    planChange;
    /** Host should fetch Home Assistant entities to add as pins (Edit mode). */
    haImportRequested;
    floorId = '';
    localMode = 'tasks';
    /** Pin currently being dragged. */
    draggingPinId = null;
    /** Pin selected in Edit mode (shows the editor panel). */
    editPinId = null;
    /** "Link from" pin id while the user wires an uplink. */
    linkFromId = null;
    svgEl;
    /** Watches `<html data-theme>` so the injected base SVG re-colors the instant
     *  the user flips light↔dark (a theme toggle doesn't re-render this component). */
    themeObserver;
    componentWillLoad() {
        // Read-only surface is always in tasks mode regardless of the `mode` prop.
        this.localMode = this.editable ? this.mode : 'tasks';
        this.floorId = this.activeFloorId || this.firstFloorId();
    }
    connectedCallback() {
        if (typeof document === 'undefined' || typeof MutationObserver === 'undefined')
            return;
        this.themeObserver = new MutationObserver(() => this.applyBaseTheme());
        this.themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
    }
    disconnectedCallback() {
        this.themeObserver?.disconnect();
        this.themeObserver = undefined;
    }
    onModeProp() {
        if (this.editable)
            this.localMode = this.mode;
    }
    onEditableProp() {
        if (!this.editable)
            this.localMode = 'tasks';
    }
    onPlanProp() {
        // Keep the active floor valid if the plan changed underneath us.
        const plan = this.parsedPlan;
        if (plan && !plan.floors.some((f) => f.id === this.floorId)) {
            this.floorId = this.firstFloorId();
        }
    }
    get parsedPlan() {
        try {
            return JSON.parse(this.plan);
        }
        catch {
            return null;
        }
    }
    get parsedCounts() {
        try {
            return JSON.parse(this.taskCounts);
        }
        catch {
            return {};
        }
    }
    get parsedEmojis() {
        try {
            return JSON.parse(this.roomEmojis);
        }
        catch {
            return {};
        }
    }
    firstFloorId() {
        const plan = this.parsedPlan;
        if (!plan || !plan.floors.length)
            return '';
        // Default to the GROUND floor (level 0) when present — with a basement
        // (level -1) in the plan, "lowest level" would otherwise open underground.
        const sorted = [...plan.floors].sort((a, b) => a.level - b.level);
        return (sorted.find((f) => f.level === 0) ?? sorted[0]).id;
    }
    get floors() {
        const plan = this.parsedPlan;
        return plan ? [...plan.floors].sort((a, b) => a.level - b.level) : [];
    }
    get rooms() {
        const plan = this.parsedPlan;
        return plan ? plan.rooms.filter((r) => r.floorId === this.floorId) : [];
    }
    get pins() {
        const plan = this.parsedPlan;
        return plan ? plan.devices.filter((d) => d.floorId === this.floorId) : [];
    }
    get edges() {
        const plan = this.parsedPlan;
        if (!plan)
            return [];
        const pinIds = new Set(this.pins.map((p) => p.id));
        // Only edges where BOTH endpoints are on the active floor.
        return plan.edges.filter((e) => pinIds.has(e.fromId) && pinIds.has(e.toId));
    }
    // ─────────────── plan mutation (Edit mode) ───────────────
    emitPlan(next) {
        this.planChange.emit({ ...next, updatedAt: Date.now() });
    }
    patchPin(id, patch) {
        const plan = this.parsedPlan;
        if (!plan)
            return;
        this.emitPlan({
            ...plan,
            devices: plan.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        });
    }
    addPin(x, y) {
        const plan = this.parsedPlan;
        if (!plan)
            return;
        const room = this.rooms[0];
        const id = `pin-${Math.random().toString(36).slice(2, 9)}`;
        const pin = {
            id,
            label: 'New device',
            type: 'device',
            roomId: room?.id ?? '',
            floorId: this.floorId,
            x,
            y,
        };
        this.emitPlan({ ...plan, devices: [...plan.devices, pin] });
        this.editPinId = id;
    }
    deletePin(id) {
        const plan = this.parsedPlan;
        if (!plan)
            return;
        this.emitPlan({
            ...plan,
            devices: plan.devices.filter((d) => d.id !== id),
            edges: plan.edges.filter((e) => e.fromId !== id && e.toId !== id),
        });
        if (this.editPinId === id)
            this.editPinId = null;
    }
    /** Wire `fromId` → `toId` as an uplink, creating/updating the edge. */
    linkPins(fromId, toId, linkType) {
        const plan = this.parsedPlan;
        if (!plan || fromId === toId)
            return;
        const edgeId = `edge-${fromId}-${toId}`;
        const edges = plan.edges.filter((e) => !(e.fromId === fromId));
        edges.push({ id: edgeId, fromId, toId, linkType });
        this.emitPlan({
            ...plan,
            devices: plan.devices.map((d) => (d.id === fromId ? { ...d, uplinkId: toId, linkType } : d)),
            edges,
        });
    }
    renameRoom(roomId, name) {
        const plan = this.parsedPlan;
        if (!plan)
            return;
        this.emitPlan({
            ...plan,
            rooms: plan.rooms.map((r) => (r.id === roomId ? { ...r, name } : r)),
        });
    }
    addRoomAlias(roomId, alias) {
        const plan = this.parsedPlan;
        if (!plan || !alias.trim())
            return;
        this.emitPlan({
            ...plan,
            rooms: plan.rooms.map((r) => r.id === roomId ? { ...r, aliases: Array.from(new Set([...r.aliases, alias.trim()])) } : r),
        });
    }
    /** Move a geometry-driven room's box (Edit-mode drag), clamped to the
     *  viewBox. Same emit-per-move contract as patchPin — the host debounces
     *  persistence off `planChange`. */
    patchRoomGeometry(id, x, y) {
        const plan = this.parsedPlan;
        if (!plan)
            return;
        // Belt-and-suspenders: never emit non-finite geometry (the server's
        // sanitizeRoom would DROP it and the room could vanish from the map).
        if (!Number.isFinite(x) || !Number.isFinite(y))
            return;
        this.emitPlan({
            ...plan,
            rooms: plan.rooms.map((r) => {
                if (r.id !== id || !r.geometry)
                    return r;
                const nx = Math.max(0, Math.min(x, FLOOR_VIEWBOX.width - r.geometry.w));
                const ny = Math.max(0, Math.min(y, FLOOR_VIEWBOX.height - r.geometry.h));
                return { ...r, geometry: { ...r.geometry, x: nx, y: ny } };
            }),
        });
    }
    // ─────────────── pointer → viewBox coords ───────────────
    /** Pointer → viewBox coords, or NULL when they can't be computed (no svg,
     *  or a zero-sized bounding rect → division yields NaN/Infinity). Callers
     *  bail on null so a bad coordinate never flows into pin/room geometry —
     *  the server drops non-finite geometry and the room would vanish. */
    toViewBox(ev) {
        const svg = this.svgEl;
        if (!svg)
            return null;
        const rect = svg.getBoundingClientRect();
        const vb = svg.viewBox.baseVal;
        const w = vb && vb.width ? vb.width : FLOOR_VIEWBOX.width;
        const h = vb && vb.height ? vb.height : FLOOR_VIEWBOX.height;
        const x = Math.round(((ev.clientX - rect.left) / rect.width) * w);
        const y = Math.round(((ev.clientY - rect.top) / rect.height) * h);
        if (!Number.isFinite(x) || !Number.isFinite(y))
            return null;
        return { x, y };
    }
    onPinPointerDown = (ev, id) => {
        if (this.localMode !== 'edit')
            return;
        ev.stopPropagation();
        // Linking flow: click a second pin to wire from the linkFrom pin.
        if (this.linkFromId && this.linkFromId !== id) {
            this.linkPins(this.linkFromId, id, 'wired');
            this.linkFromId = null;
            return;
        }
        this.draggingPinId = id;
        ev.target.setPointerCapture?.(ev.pointerId);
    };
    // ── geometry-room dragging (Edit mode) — reuses the pin toViewBox math ────
    /** Room currently being dragged (geometry-driven rooms, Edit mode only). */
    draggingRoomId = null;
    /** Pointer→box-corner offset at drag start, in viewBox units. */
    roomDragOffset = { dx: 0, dy: 0 };
    /** True once the pointer actually moved — suppresses the trailing click so a
     *  drag never doubles as a roomSelect. */
    roomDragMoved = false;
    onRoomPointerDown = (ev, roomId) => {
        if (this.localMode !== 'edit')
            return;
        const room = this.parsedPlan?.rooms.find((r) => r.id === roomId);
        if (!room?.geometry)
            return;
        ev.stopPropagation();
        const pt = this.toViewBox(ev);
        if (!pt)
            return; // can't compute coords → don't start a drag
        this.roomDragOffset = { dx: pt.x - room.geometry.x, dy: pt.y - room.geometry.y };
        this.roomDragMoved = false;
        this.draggingRoomId = roomId;
        ev.target.setPointerCapture?.(ev.pointerId);
    };
    onSvgPointerMove = (ev) => {
        if (this.localMode !== 'edit')
            return;
        const pt = this.toViewBox(ev);
        if (!pt)
            return; // non-finite coords → leave pin/room geometry unchanged
        if (this.draggingPinId) {
            this.patchPin(this.draggingPinId, { x: pt.x, y: pt.y });
            return;
        }
        if (this.draggingRoomId) {
            this.roomDragMoved = true;
            this.patchRoomGeometry(this.draggingRoomId, Math.round(pt.x - this.roomDragOffset.dx), Math.round(pt.y - this.roomDragOffset.dy));
        }
    };
    onSvgPointerUp = () => {
        this.draggingPinId = null;
        this.draggingRoomId = null;
    };
    // ─────────────── render ───────────────
    setMode(m) {
        this.localMode = m;
        this.editPinId = null;
        this.linkFromId = null;
    }
    roomFill(room) {
        if (this.localMode === 'tasks') {
            const count = this.parsedCounts[room.id] ?? 0;
            if (this.selectedRoomId === room.id)
                return 'rgba(47, 107, 255, 0.28)';
            if (count > 0) {
                // Soft blue wash that deepens with the task count.
                const a = Math.min(0.34, 0.08 + count * 0.06);
                return `rgba(47, 107, 255, ${a})`;
            }
            // Idle rooms get a barely-there tint so zones read as intentional cards.
            return 'rgba(120, 140, 180, 0.06)';
        }
        return 'transparent';
    }
    /** Fill for a GEOMETRY-drawn room card: tasks shading when it applies, else
     *  a visible surface (these rooms have no base-SVG artwork behind them). */
    geoFill(room) {
        if (this.localMode === 'tasks') {
            const count = this.parsedCounts[room.id] ?? 0;
            if (this.selectedRoomId === room.id)
                return 'rgba(47, 107, 255, 0.28)';
            if (count > 0)
                return `rgba(47, 107, 255, ${Math.min(0.34, 0.08 + count * 0.06)})`;
        }
        return 'var(--surface-card, rgba(120, 140, 180, 0.10))';
    }
    renderRoomZones() {
        // Two sources for a room's box:
        //   1. room.geometry (House Layout) — the overlay DRAWS the room rectangle
        //      itself (label + dimension caption), no base SVG needed; in Edit mode
        //      the box is DRAGGABLE (same toViewBox math as pins).
        //   2. legacy: the rendered base-SVG room <g> bounding boxes (mirrored into
        //      roomBoxes after mount) — a transparent hit-zone over the artwork.
        return this.rooms.map((room) => {
            const geo = !!room.geometry;
            const box = this.roomBox(room);
            if (!box)
                return null;
            const count = this.parsedCounts[room.id] ?? 0;
            const emojis = (this.parsedEmojis[room.id] ?? []).slice(0, 3);
            const active = this.selectedRoomId === room.id;
            const isDrop = this.localMode === 'tasks' && this.dropTargetRoomId === room.id;
            const showBadge = this.localMode === 'tasks' && count > 0;
            const draggable = geo && this.localMode === 'edit';
            const caption = geo ? roomDimsCaption(room) : '';
            const cx = box.x + box.w / 2;
            const cy = box.y + box.h / 2;
            return (h("g", { class: {
                    'fm__zone': true,
                    'fm__zone--active': active,
                    'fm__zone--drop': isDrop,
                    'fm__zone--geo': geo,
                    'fm__zone--draggable': draggable,
                    'fm__zone--clickable': this.localMode === 'tasks' || this.localMode === 'edit',
                }, onClick: () => {
                    // A real drag must not double as a select.
                    if (this.roomDragMoved) {
                        this.roomDragMoved = false;
                        return;
                    }
                    if (this.localMode === 'tasks' || this.localMode === 'edit') {
                        this.roomSelect.emit({ roomId: room.id });
                    }
                }, onPointerDown: draggable ? (ev) => this.onRoomPointerDown(ev, room.id) : undefined },
                h("rect", { x: box.x, y: box.y, width: box.w, height: box.h, rx: geo ? 8 : 14, class: { 'fm__zone-rect': true, 'fm__zone-rect--geo': geo, 'fm__zone-rect--active': active, 'fm__zone-rect--has': count > 0, 'fm__zone-rect--drop': isDrop }, fill: isDrop ? 'rgba(47, 107, 255, 0.42)' : geo ? this.geoFill(room) : this.roomFill(room), stroke: isDrop || active ? 'var(--brand-blue, #2f6bff)' : geo ? 'var(--line, #cbd5ea)' : 'transparent', "stroke-width": isDrop ? '4' : geo ? '1.5' : '3', "data-room-drop": this.localMode === 'tasks' ? room.id : undefined }),
                geo && box.h >= 26 && (h("text", { x: cx, y: caption && box.h >= 52 ? cy - 5 : cy, "text-anchor": "middle", "dominant-baseline": "central", class: { 'fm__geo-name': true, 'fm__geo-name--small': box.w < 70 || box.h < 46 } }, room.name)),
                geo && caption && box.h >= 52 && box.w >= 80 && (h("text", { x: cx, y: cy + 14, "text-anchor": "middle", "dominant-baseline": "central", class: "fm__geo-dims" }, caption)),
                showBadge && (h("g", { class: "fm__badge", transform: `translate(${box.x + box.w - 22}, ${box.y + 22})` },
                    h("circle", { r: "14", class: "fm__badge-bg" }),
                    h("text", { class: "fm__badge-text", "text-anchor": "middle", "dominant-baseline": "central" }, count))),
                this.localMode === 'tasks' && emojis.length > 0 && (h("text", { x: box.x + 12, y: box.y + 26, class: "fm__zone-emojis" }, emojis.join(' '))),
                isDrop && (h("text", { x: box.x + box.w / 2, y: box.y + box.h / 2, "text-anchor": "middle", "dominant-baseline": "central", class: "fm__zone-droplabel" }, "Drop here"))));
        });
    }
    /**
     * Bounding box for a room's hit-zone, keyed by svgGroupId. Read from the
     * base SVG's `<g id="svgGroupId"><rect/></g>` after mount (componentDidRender)
     * so the overlay zones align exactly with the drawn rooms. @State so updating
     * it re-renders the overlay once boxes are known.
     */
    roomBoxes = {};
    roomBox(room) {
        // Geometry-driven rooms carry their own box; legacy rooms fall back to the
        // base-SVG group boxes mirrored after mount.
        if (room.geometry)
            return room.geometry;
        return this.roomBoxes[room.svgGroupId] ?? null;
    }
    componentDidRender() {
        // Mirror the base SVG's room rects into roomBoxes so the overlay aligns.
        const base = this.el.querySelector('.fm__base svg');
        if (!base)
            return;
        // Normalize the injected base SVG so it fills the stage exactly like the
        // overlay (same box + same viewBox mapping). The artwork is injected via
        // innerHTML, so scoped CSS can't reach it and an authored SVG may carry
        // hardcoded width/height — force responsive sizing here. Without this the
        // base renders at its intrinsic size while the overlay scales to fit, and
        // the room zones drift out of alignment.
        if (base.getAttribute('width') !== '100%')
            base.setAttribute('width', '100%');
        if (base.getAttribute('height') !== '100%')
            base.setAttribute('height', '100%');
        base.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        // Re-color the injected artwork for the active theme (innerHTML resets to the
        // baked light markup on every render, so re-apply after each one).
        this.applyBaseTheme(base);
        const next = {};
        let changed = false;
        for (const room of this.rooms) {
            const g = base.querySelector(`[id="${room.svgGroupId}"] rect`);
            if (!g)
                continue;
            const box = {
                x: Number(g.getAttribute('x') ?? 0),
                y: Number(g.getAttribute('y') ?? 0),
                w: Number(g.getAttribute('width') ?? 0),
                h: Number(g.getAttribute('height') ?? 0),
            };
            next[room.svgGroupId] = box;
            const prev = this.roomBoxes[room.svgGroupId];
            if (!prev || prev.x !== box.x || prev.y !== box.y || prev.w !== box.w || prev.h !== box.h) {
                changed = true;
            }
        }
        // Only re-render when the set of boxes actually changed (avoids a loop).
        if (changed || Object.keys(next).length !== Object.keys(this.roomBoxes).length) {
            this.roomBoxes = next;
        }
    }
    /** Read a theme token off the host element, falling back when unset. */
    token(name, fallback) {
        if (typeof window === 'undefined')
            return fallback;
        const v = getComputedStyle(this.el).getPropertyValue(name).trim();
        return v || fallback;
    }
    /**
     * Re-color the innerHTML-injected base SVG for the active theme.
     *
     * The floorplan-core artwork bakes in LIGHT fills/strokes/labels (an opaque
     * near-white boundary + room cards), and because it's injected via innerHTML
     * the component's scoped CSS can't reach it — so on the dark theme the map
     * would render as a glaring white card. We fix that WITHOUT a blunt
     * `filter:invert` (which would wreck the brand tints + red pins): in dark mode
     * we tag the boundary rect and append a `<style>` (last child → wins by source
     * order over the baked `<style>`) that maps the base elements onto the app's
     * dark surface/line/ink tokens. In light mode we strip the override so the
     * baked artwork shows exactly as before (no regression). The interactive
     * overlay (zones/counts/badges/pins) already uses token-driven component CSS.
     */
    applyBaseTheme(base) {
        const svg = base ?? this.el.querySelector('.fm__base svg');
        if (!svg)
            return;
        const dark = typeof document !== 'undefined' &&
            (document.documentElement.getAttribute('data-theme') || '').toLowerCase() === 'dark';
        // Marker class on the boundary rect so a CSS rule can override its inline
        // `fill`/`stroke` presentation attributes (CSS beats presentation attrs).
        const boundary = svg.querySelector(':scope > rect');
        boundary?.classList.add('fm__mapedge');
        let styleEl = svg.querySelector('style[data-fm-theme]');
        if (!dark) {
            // Light → let the baked artwork stand.
            styleEl?.remove();
            return;
        }
        if (!styleEl) {
            styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            styleEl.setAttribute('data-fm-theme', '');
            svg.appendChild(styleEl);
        }
        const edge = this.token('--surface-card', '#18233a');
        const edgeLine = this.token('--line-strong', '#344766');
        const roomFill = this.token('--surface-sunken', '#0e1626');
        const roomLine = this.token('--line', '#283750');
        const label = this.token('--ink-soft', '#c2cde0');
        const css = `.fm__mapedge{fill:${edge};stroke:${edgeLine};}` +
            `.room rect{fill:${roomFill};stroke:${roomLine};}` +
            `.room text{fill:${label};}`;
        if (styleEl.textContent !== css)
            styleEl.textContent = css;
    }
    renderEdges() {
        if (this.localMode === 'tasks')
            return null;
        const pinById = new Map(this.pins.map((p) => [p.id, p]));
        return this.edges.map((e) => {
            const from = pinById.get(e.fromId);
            const to = pinById.get(e.toId);
            if (!from || !to)
                return null;
            return (h("line", { class: { 'fm__edge': true, 'fm__edge--wireless': e.linkType === 'wireless' }, x1: from.x, y1: from.y, x2: to.x, y2: to.y }));
        });
    }
    renderPins() {
        if (this.localMode === 'tasks')
            return null;
        return this.pins.map((pin) => (h("g", { class: { 'fm__pin': true, 'fm__pin--linking': this.linkFromId === pin.id }, transform: `translate(${pin.x}, ${pin.y})`, onPointerDown: (ev) => this.onPinPointerDown(ev, pin.id), onClick: (ev) => {
                ev.stopPropagation();
                if (this.localMode === 'devices')
                    this.deviceSelect.emit({ deviceId: pin.id });
                else if (this.localMode === 'edit')
                    this.editPinId = pin.id;
            } },
            h("circle", { r: "11", class: "fm__pin-dot" }),
            h("text", { y: "-16", "text-anchor": "middle", class: "fm__pin-label" }, pin.label))));
    }
    renderEditPanel() {
        if (this.localMode !== 'edit' || !this.editPinId)
            return null;
        const pin = this.pins.find((p) => p.id === this.editPinId);
        if (!pin)
            return null;
        return (h("div", { class: "fm__panel" },
            h("div", { class: "fm__panel-head" },
                h("strong", null, "Edit pin"),
                h("button", { type: "button", class: "fm__x", onClick: () => (this.editPinId = null) }, "\u2715")),
            h("label", { class: "fm__field" },
                h("span", null, "Label"),
                h("input", { type: "text", value: pin.label, onInput: (e) => this.patchPin(pin.id, { label: e.target.value }) })),
            h("label", { class: "fm__field" },
                h("span", null, "Type"),
                h("input", { type: "text", value: pin.type, onInput: (e) => this.patchPin(pin.id, { type: e.target.value }) })),
            h("label", { class: "fm__field" },
                h("span", null, "Room"),
                h("select", { onChange: (e) => this.patchPin(pin.id, { roomId: e.target.value }) }, this.rooms.map((r) => (h("option", { value: r.id, selected: r.id === pin.roomId }, r.name))))),
            h("label", { class: "fm__field" },
                h("span", null, "HA entity"),
                h("input", { type: "text", placeholder: "light.living_room", value: pin.haEntityId ?? '', onInput: (e) => this.patchPin(pin.id, { haEntityId: e.target.value }) })),
            h("label", { class: "fm__field fm__field--row" },
                h("span", null, "IP"),
                h("input", { type: "text", value: pin.ip ?? '', onInput: (e) => this.patchPin(pin.id, { ip: e.target.value }) }),
                h("span", null, "MAC"),
                h("input", { type: "text", value: pin.mac ?? '', onInput: (e) => this.patchPin(pin.id, { mac: e.target.value }) })),
            h("div", { class: "fm__panel-actions" },
                h("button", { type: "button", class: { 'fm__btn': true, 'fm__btn--on': this.linkFromId === pin.id }, onClick: () => (this.linkFromId = this.linkFromId === pin.id ? null : pin.id) }, this.linkFromId === pin.id ? 'Click target pin…' : 'Link uplink'),
                pin.uplinkId && (h("button", { type: "button", class: "fm__btn", onClick: () => this.patchPin(pin.id, {
                        linkType: pin.linkType === 'wired' ? 'wireless' : 'wired',
                    }) }, pin.linkType === 'wireless' ? 'Wireless' : 'Wired')),
                h("button", { type: "button", class: "fm__btn fm__btn--danger", onClick: () => this.deletePin(pin.id) }, "Delete"))));
    }
    /** Rooms editor (Edit mode, no pin selected) — rename + add aliases. */
    renderRoomsEditor() {
        if (this.localMode !== 'edit' || this.editPinId)
            return null;
        return (h("div", { class: "fm__panel fm__panel--rooms" },
            h("div", { class: "fm__panel-head" },
                h("strong", null, "Rooms on this floor")),
            this.rooms.map((room) => (h("div", { class: "fm__room-edit" },
                h("input", { class: "fm__room-name", type: "text", value: room.name, "aria-label": `Rename ${room.name}`, onChange: (e) => this.renameRoom(room.id, e.target.value) }),
                h("input", { class: "fm__room-alias", type: "text", placeholder: "+ alias, Enter", "aria-label": `Add alias to ${room.name}`, onKeyDown: (e) => {
                        if (e.key === 'Enter') {
                            const input = e.target;
                            this.addRoomAlias(room.id, input.value);
                            input.value = '';
                        }
                    } }),
                h("span", { class: "fm__room-aliases" }, (room.aliases ?? []).slice(0, 4).join(', ')))))));
    }
    render() {
        const plan = this.parsedPlan;
        if (!plan) {
            return h("div", { class: "fm fm--empty" }, "No floor plan available.");
        }
        // A GEOMETRY-DRIVEN floor (every room carries `geometry`) needs no base
        // artwork — the overlay draws the room cards itself. Never inject a base
        // SVG for one: a stale/mismatched base would double-render old rooms
        // UNDERNEATH the real cards (House Layout code-review finding #1).
        const geometryDriven = this.rooms.length > 0 && this.rooms.every((r) => !!r.geometry);
        const svg = geometryDriven ? null : floorSvg(this.floorId);
        return (h("div", { class: { 'fm': true, 'fm--readonly': !this.editable } },
            this.editable && (h("div", { class: "fm__bar" },
                h("div", { class: "fm__modes" }, ['tasks', 'devices', 'edit'].map((m) => (h("button", { type: "button", class: { 'fm__mode': true, 'fm__mode--active': this.localMode === m }, onClick: () => this.setMode(m) }, m === 'tasks' ? 'Tasks' : m === 'devices' ? 'Devices' : 'Edit')))))),
            h("div", { class: { 'fm__work': true, 'fm__work--editing': this.editable && this.localMode === 'edit' } },
                h("div", { class: "fm__stage" },
                    svg && h("div", { class: "fm__base", innerHTML: svg }),
                    h("svg", { class: "fm__overlay", viewBox: `0 0 ${FLOOR_VIEWBOX.width} ${FLOOR_VIEWBOX.height}`, preserveAspectRatio: "xMidYMid meet", ref: (el) => (this.svgEl = el), onPointerMove: this.onSvgPointerMove, onPointerUp: this.onSvgPointerUp, onDblClick: (ev) => {
                            if (this.localMode === 'edit') {
                                const pt = this.toViewBox(ev);
                                if (pt)
                                    this.addPin(pt.x, pt.y);
                            }
                        } },
                        this.renderRoomZones(),
                        this.renderEdges(),
                        this.renderPins()),
                    this.floors.length > 1 && (h("select", { class: "fm__floor-select", "aria-label": "Floor", onChange: (e) => {
                            this.floorId = e.target.value;
                            this.editPinId = null;
                        } }, this.floors.map((f) => (h("option", { value: f.id, selected: f.id === this.floorId }, f.name)))))),
                this.editable && this.localMode === 'edit' && (h("div", { class: "fm__side" },
                    this.renderEditPanel(),
                    this.renderRoomsEditor()))),
            this.editable && this.localMode === 'edit' && (h("div", { class: "fm__edit-hint" },
                "Double-click the plan to add a pin \u00B7 drag rooms + pins to position \u00B7 click a pin to edit.",
                h("button", { type: "button", class: "fm__btn", onClick: () => this.haImportRequested.emit() }, "Add from Home Assistant")))));
    }
    static get watchers() { return {
        "mode": [{
                "onModeProp": 0
            }],
        "editable": [{
                "onEditableProp": 0
            }],
        "plan": [{
                "onPlanProp": 0
            }]
    }; }
};
PopFloorMap.style = PopFloorMapStyle0();
//# sourceMappingURL=floor-map.js.map