import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, } from 'd3-force';
import PopGraphViewStyle0 from "./ui-kit/organisms/graph-view/graph-view.css?tag=pop-graph-view&encapsulation=scoped";
/**
 * pop-graph-view — the 2D force-directed knowledge graph.
 *
 * LOCKED design (planned/notes-app-digital-brain/linking-and-graph.mdx):
 *   • Nodes = notes. Edges = `[[links]]` ONLY. Tags = colour / cluster (NEVER edges).
 *   • Node size = link-count (hubs are bigger).
 *   • 2D force-directed: d3-force simulation + CANVAS render (not SVG) + quadtree-free
 *     linear hit-testing (fine for the "hundreds → low-thousands" v1 target).
 *   • "Simplest that works" perf posture. Idle-pause: the sim ticks for a *capped*
 *     number of iterations, then stops — we never run rAF forever. A node drag or a
 *     `reheat()` restarts a short burst, then it settles again.
 *   • Reduced-motion: run the sim synchronously to convergence on load (no animation),
 *     then paint once. No ticking rAF at all.
 *
 * Inputs are set as DOM **properties** (`nodes`, `edges`, `tagColors`).
 * Emits `nodeSelect({ id })` on click/tap and `nodeHover({ id | null })`.
 *
 * The component owns its <canvas>; it manages its own resize observer, pointer
 * listeners and simulation, and tears all of them down on disconnect.
 *
 * See planned/notes-app-digital-brain/components.mdx §pop-graph-view.
 */
export class PopGraphView {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.nodeSelect = __stencil_createEvent(this, "nodeSelect", 7);
        this.nodeHover = __stencil_createEvent(this, "nodeHover", 7);
    }
    get host() { return __stencil_getElement(this); }
    /** Notes → nodes (set as a property). */
    nodes = [];
    /** `[[links]]` → edges (set as a property). source/target are note ids. */
    edges = [];
    /** Stable tag → CSS colour map for node fill / legend (set as a property). */
    tagColors = {};
    /** Cap node count (lower on mobile). 0 / undefined = no cap. */
    nodeCap = 0;
    /** Dim nodes whose tags don't include this tag ('' = no filter). */
    filterTag = '';
    /** Highlight nodes whose title matches this query ('' = none). */
    highlight = '';
    /** Show only orphans (notes with no resolved links). */
    orphansOnly = false;
    /** Fired on click / tap of a node → page navigates to /note/:id. */
    nodeSelect;
    /** Fired on hover (id) / hover-out (null) → page can show a preview card. */
    nodeHover;
    // ── internal graph state ──
    canvas;
    ctx;
    sim;
    simNodes = [];
    simEdges = [];
    // ── view transform (pan / zoom) ──
    scale = 1;
    tx = 0;
    ty = 0;
    // ── interaction state ──
    dragging = null;
    panning = false;
    hovered = null;
    lastPointer = { x: 0, y: 0 };
    pointerDownAt = { x: 0, y: 0 };
    moved = false;
    // ── pinch state ──
    pinchDist = 0;
    // ── rAF / sim lifecycle ──
    raf = 0;
    painting = false;
    dpr = 1;
    width = 0;
    height = 0;
    ro;
    reduceMotion = false;
    mql;
    /** Max ticks before we declare the layout settled and stop ticking. */
    static MAX_TICKS = 400;
    tickCount = 0;
    /** When true, auto-fit the viewport to the layout as it settles (then clear). */
    fitOnSettle = true;
    componentDidLoad() {
        this.canvas = this.host.querySelector('canvas');
        this.ctx = this.canvas?.getContext('2d');
        this.reduceMotion =
            typeof window !== 'undefined' &&
                !!window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (typeof window !== 'undefined' && window.matchMedia) {
            this.mql = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.mql.addEventListener?.('change', this.onMotionChange);
        }
        this.measure();
        this.ro = new ResizeObserver(() => this.onResize());
        this.ro.observe(this.host);
        this.attachPointer();
        this.rebuild();
    }
    disconnectedCallback() {
        this.stopSim();
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.painting = false;
        this.ro?.disconnect();
        this.ro = undefined;
        this.mql?.removeEventListener?.('change', this.onMotionChange);
        this.detachPointer();
    }
    graphChanged() {
        if (this.canvas)
            this.rebuild();
    }
    styleChanged() {
        // Filtering/highlighting only changes paint, not layout.
        this.requestPaint();
    }
    /** Public: re-run a short simulation burst (used by "re-layout" controls). */
    async reheat() {
        if (!this.sim)
            return;
        this.tickCount = 0;
        if (this.reduceMotion) {
            this.runToConvergence();
            this.requestPaint();
        }
        else {
            this.sim.alpha(0.6).restart();
            this.startTicking();
        }
    }
    /** Public: fit + centre all nodes in the viewport. */
    async zoomToFit(padding = 60) {
        this.fit(padding);
        this.clampTransform();
        this.requestPaint();
    }
    // ── build / layout ────────────────────────────────────────────────────
    rebuild() {
        this.stopSim();
        // Cap nodes (keep the highest-degree ones — most connected first).
        let nodes = Array.isArray(this.nodes) ? this.nodes.map((n) => ({ ...n })) : [];
        const edges = Array.isArray(this.edges) ? this.edges : [];
        // Degree = #edges touching the node (used for size + orphan flag).
        const degree = new Map();
        for (const e of edges) {
            const s = typeof e.source === 'string' ? e.source : e.source.id;
            const t = typeof e.target === 'string' ? e.target : e.target.id;
            degree.set(s, (degree.get(s) ?? 0) + 1);
            degree.set(t, (degree.get(t) ?? 0) + 1);
        }
        for (const n of nodes) {
            n.degree = degree.get(n.id) ?? 0;
            n.orphan = n.degree === 0;
        }
        if (this.nodeCap > 0 && nodes.length > this.nodeCap) {
            nodes = [...nodes].sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0)).slice(0, this.nodeCap);
        }
        const ids = new Set(nodes.map((n) => n.id));
        // Only keep edges whose endpoints both survive the cap.
        const liveEdges = edges
            .filter((e) => {
            const s = typeof e.source === 'string' ? e.source : e.source.id;
            const t = typeof e.target === 'string' ? e.target : e.target.id;
            return ids.has(s) && ids.has(t) && s !== t;
        })
            .map((e) => ({
            source: typeof e.source === 'string' ? e.source : e.source.id,
            target: typeof e.target === 'string' ? e.target : e.target.id,
        }));
        this.simNodes = nodes;
        this.simEdges = liveEdges;
        if (!nodes.length) {
            // Nothing to lay out — clear the canvas and bail.
            this.requestPaint();
            return;
        }
        // Seed positions on a small circle so the sim starts from a sane state
        // (and converges deterministically-ish for empty/few-edge graphs).
        const cx = this.width / 2 || 200;
        const cy = this.height / 2 || 200;
        const r = Math.min(cx, cy) * 0.6 || 120;
        nodes.forEach((n, i) => {
            if (n.x == null || n.y == null) {
                const a = (i / nodes.length) * Math.PI * 2;
                n.x = cx + Math.cos(a) * r;
                n.y = cy + Math.sin(a) * r;
            }
        });
        const link = forceLink(this.simEdges)
            .id((d) => d.id)
            .distance(70)
            .strength(0.4);
        this.sim = forceSimulation(nodes)
            .force('link', link)
            .force('charge', forceManyBody().strength(-180))
            .force('center', forceCenter(cx, cy))
            .force('collide', forceCollide().radius((d) => this.nodeRadius(d) + 4))
            .alpha(1)
            .alphaDecay(0.045) // settles in ~150–250 ticks
            .velocityDecay(0.4);
        // We tick manually (rAF or sync) so we can cap iterations and stop cleanly.
        this.sim.stop();
        this.tickCount = 0;
        this.fitOnSettle = true;
        if (this.reduceMotion) {
            this.runToConvergence();
            this.fit();
            this.fitOnSettle = false;
            this.requestPaint();
        }
        else {
            this.startTicking();
        }
    }
    /** Reduced-motion / reheat: tick synchronously until settled, no animation. */
    runToConvergence() {
        if (!this.sim)
            return;
        let i = 0;
        while (this.sim.alpha() > this.sim.alphaMin() && i < PopGraphView.MAX_TICKS) {
            this.sim.tick();
            i++;
        }
    }
    /** Animated mode: tick on rAF, capped, then stop (no infinite CPU). */
    startTicking() {
        if (!this.sim)
            return;
        cancelAnimationFrame(this.raf);
        const step = () => {
            if (!this.sim)
                return;
            // Drag pins a node; keep ticking while dragging even if alpha is low.
            const settled = this.sim.alpha() < this.sim.alphaMin() || this.tickCount >= PopGraphView.MAX_TICKS;
            if (!settled || this.dragging) {
                this.sim.tick();
                this.tickCount++;
            }
            // Keep the layout framed while it spreads out (cheap; only during the run).
            if (this.fitOnSettle && this.tickCount % 12 === 0)
                this.fit();
            this.paint();
            if (settled && !this.dragging) {
                // One final fit so the settled layout is centred, then idle-pause:
                // stop the loop. A reheat()/drag will restart it.
                if (this.fitOnSettle) {
                    this.fit();
                    this.fitOnSettle = false;
                    this.paint();
                }
                this.raf = 0;
                return;
            }
            this.raf = requestAnimationFrame(step);
        };
        this.raf = requestAnimationFrame(step);
    }
    stopSim() {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.sim?.stop();
        this.sim = undefined;
    }
    // ── sizing / transform ────────────────────────────────────────────────
    measure() {
        const rect = this.host.getBoundingClientRect();
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.width = Math.max(rect.width, 1);
        this.height = Math.max(rect.height, 1);
        if (this.canvas) {
            this.canvas.width = Math.round(this.width * this.dpr);
            this.canvas.height = Math.round(this.height * this.dpr);
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
        }
    }
    onResize() {
        const prevW = this.width;
        const prevH = this.height;
        this.measure();
        // Keep the centre fixed across resizes.
        if (prevW && prevH) {
            this.tx += (this.width - prevW) / 2;
            this.ty += (this.height - prevH) / 2;
        }
        this.requestPaint();
    }
    onMotionChange = (e) => {
        this.reduceMotion = e.matches;
    };
    /** World-space bounding box of the current layout (null when empty). */
    nodeBounds() {
        const ns = this.simNodes;
        if (!ns.length)
            return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const n of ns) {
            minX = Math.min(minX, n.x ?? 0);
            minY = Math.min(minY, n.y ?? 0);
            maxX = Math.max(maxX, n.x ?? 0);
            maxY = Math.max(maxY, n.y ?? 0);
        }
        if (!Number.isFinite(minX))
            return null;
        return { minX, minY, maxX, maxY };
    }
    /** Centre + scale so all nodes fit the viewport. */
    fit(padding = 60) {
        const b = this.nodeBounds();
        if (!b) {
            this.scale = 1;
            this.tx = 0;
            this.ty = 0;
            return;
        }
        const w = Math.max(b.maxX - b.minX, 1);
        const h = Math.max(b.maxY - b.minY, 1);
        const s = Math.min((this.width - padding * 2) / w, (this.height - padding * 2) / h, 2.5);
        this.scale = Math.max(Math.min(s, 2.5), 0.1);
        const cx = (b.minX + b.maxX) / 2;
        const cy = (b.minY + b.maxY) / 2;
        this.tx = this.width / 2 - cx * this.scale;
        this.ty = this.height / 2 - cy * this.scale;
    }
    /**
     * Clamp the pan/zoom transform so the graph can NEVER be lost off-screen.
     *
     * We keep the node bounding box (padded by a node radius so labels/edges near
     * the rim stay onscreen) overlapping the viewport by at least `KEEP` px on
     * every side — so there is always something to grab and drag back. When the
     * whole layout is smaller than the viewport we instead pin its centre inside
     * the viewport (it can drift a little but never leaves). Called after every
     * pan, zoom, drag and fit.
     */
    clampTransform() {
        const b = this.nodeBounds();
        if (!b)
            return;
        const KEEP = 48; // px of the graph that must remain visible on each edge
        // Screen-space extent of the (padded) node bounds under the current transform.
        const pad = 24; // world px margin around nodes (approx label/edge overhang)
        const sMinX = (b.minX - pad) * this.scale + this.tx;
        const sMaxX = (b.maxX + pad) * this.scale + this.tx;
        const sMinY = (b.minY - pad) * this.scale + this.ty;
        const sMaxY = (b.maxY + pad) * this.scale + this.ty;
        const contentW = sMaxX - sMinX;
        const contentH = sMaxY - sMinY;
        // Horizontal.
        if (contentW <= this.width) {
            // Fits: keep it inside (pin so it can't drift fully out either edge).
            const minTx = this.width - (b.maxX + pad) * this.scale;
            const maxTx = -(b.minX - pad) * this.scale;
            this.tx = Math.min(Math.max(this.tx, Math.min(minTx, maxTx)), Math.max(minTx, maxTx));
        }
        else {
            // Larger than viewport: don't let either edge pass beyond KEEP.
            if (sMinX > this.width - KEEP)
                this.tx += this.width - KEEP - sMinX;
            if (sMaxX < KEEP)
                this.tx += KEEP - sMaxX;
        }
        // Vertical.
        if (contentH <= this.height) {
            const minTy = this.height - (b.maxY + pad) * this.scale;
            const maxTy = -(b.minY - pad) * this.scale;
            this.ty = Math.min(Math.max(this.ty, Math.min(minTy, maxTy)), Math.max(minTy, maxTy));
        }
        else {
            if (sMinY > this.height - KEEP)
                this.ty += this.height - KEEP - sMinY;
            if (sMaxY < KEEP)
                this.ty += KEEP - sMaxY;
        }
    }
    /** Screen px → world (graph) coords. */
    toWorld(px, py) {
        return { x: (px - this.tx) / this.scale, y: (py - this.ty) / this.scale };
    }
    nodeRadius(n) {
        // Size by link-count (hubs bigger). 5px base, +1.6px per link, capped.
        return Math.min(5 + Math.sqrt(n.degree ?? 0) * 3, 22);
    }
    primaryTag(n) {
        return n.tags && n.tags.length ? n.tags[0] : undefined;
    }
    nodeColor(n) {
        const tag = this.primaryTag(n);
        if (tag && this.tagColors[tag])
            return this.tagColors[tag];
        // Fall back to a theme token (resolved against the live CSS vars).
        return this.cssVar('--brand-violet', '#7c3aed');
    }
    cssVar(name, fallback) {
        if (typeof window === 'undefined')
            return fallback;
        const v = getComputedStyle(this.host).getPropertyValue(name).trim();
        return v || fallback;
    }
    // ── filtering helpers ──
    isDimmed(n) {
        if (this.orphansOnly && !n.orphan)
            return true;
        if (this.filterTag && !(n.tags ?? []).includes(this.filterTag))
            return true;
        return false;
    }
    isHighlighted(n) {
        if (!this.highlight)
            return false;
        return (n.title ?? '').toLowerCase().includes(this.highlight.toLowerCase());
    }
    // ── paint ─────────────────────────────────────────────────────────────
    requestPaint() {
        if (this.painting)
            return;
        this.painting = true;
        requestAnimationFrame(() => {
            this.painting = false;
            this.paint();
        });
    }
    paint() {
        const ctx = this.ctx;
        if (!ctx || !this.canvas)
            return;
        ctx.save();
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.translate(this.tx, this.ty);
        ctx.scale(this.scale, this.scale);
        const ink = this.cssVar('--ink', '#1a1a2e');
        const inkSoft = this.cssVar('--ink-soft', '#6b7280');
        const edgeColor = this.cssVar('--pico-muted-border-color', 'rgba(120,120,140,0.35)');
        // Neighbours of the hovered node (for highlight focus).
        const focus = this.hovered;
        const neighbourIds = new Set();
        if (focus) {
            neighbourIds.add(focus.id);
            for (const e of this.simEdges) {
                const s = e.source.id ?? e.source;
                const t = e.target.id ?? e.target;
                if (s === focus.id)
                    neighbourIds.add(t);
                if (t === focus.id)
                    neighbourIds.add(s);
            }
        }
        // ── edges ──
        ctx.lineWidth = 1 / this.scale;
        for (const e of this.simEdges) {
            const s = e.source;
            const t = e.target;
            if (s.x == null || t.x == null)
                continue;
            const inFocus = !focus || (neighbourIds.has(s.id) && neighbourIds.has(t.id));
            ctx.strokeStyle = edgeColor;
            ctx.globalAlpha = inFocus ? 0.7 : 0.08;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(t.x, t.y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // ── nodes ──
        const showLabels = this.scale > 0.9 || this.simNodes.length <= 30;
        for (const n of this.simNodes) {
            if (n.x == null || n.y == null)
                continue;
            const r = this.nodeRadius(n);
            const dimmed = this.isDimmed(n) || (focus ? !neighbourIds.has(n.id) : false);
            const highlighted = this.isHighlighted(n);
            ctx.globalAlpha = dimmed ? 0.18 : 1;
            // Orphan = hollow ring; linked = filled disc.
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            if (n.orphan) {
                ctx.fillStyle = this.cssVar('--surface-card', '#ffffff');
                ctx.fill();
                ctx.lineWidth = 1.5 / this.scale;
                ctx.strokeStyle = this.nodeColor(n);
                ctx.stroke();
            }
            else {
                ctx.fillStyle = this.nodeColor(n);
                ctx.fill();
            }
            // Highlight ring (search match) or hover ring.
            if (highlighted || n === this.hovered) {
                ctx.lineWidth = 2.5 / this.scale;
                ctx.strokeStyle = highlighted
                    ? this.cssVar('--brand-red', '#ef4444')
                    : this.cssVar('--ink', '#1a1a2e');
                ctx.beginPath();
                ctx.arc(n.x, n.y, r + 3 / this.scale, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Labels (hover always; otherwise when zoomed in / sparse).
            if ((showLabels || n === this.hovered) && !dimmed && n.title) {
                ctx.globalAlpha = n === this.hovered ? 1 : 0.85;
                ctx.fillStyle = n === this.hovered ? ink : inkSoft;
                ctx.font = `${12 / this.scale}px var(--font-brand, system-ui, sans-serif)`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const label = n.title.length > 24 ? n.title.slice(0, 22) + '…' : n.title;
                ctx.fillText(label, n.x, n.y + r + 2 / this.scale);
            }
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }
    // ── hit testing (linear; fine for v1 node counts) ──
    nodeAt(px, py) {
        const w = this.toWorld(px, py);
        // Iterate in reverse so the topmost (last-painted) wins.
        for (let i = this.simNodes.length - 1; i >= 0; i--) {
            const n = this.simNodes[i];
            if (n.x == null || n.y == null)
                continue;
            if (this.isDimmed(n))
                continue;
            const r = this.nodeRadius(n) + 4 / this.scale;
            const dx = w.x - n.x;
            const dy = w.y - n.y;
            if (dx * dx + dy * dy <= r * r)
                return n;
        }
        return null;
    }
    // ── pointer / wheel / touch ───────────────────────────────────────────
    attachPointer() {
        const c = this.canvas;
        if (!c)
            return;
        c.addEventListener('pointerdown', this.onPointerDown);
        c.addEventListener('pointermove', this.onPointerMove);
        c.addEventListener('pointerup', this.onPointerUp);
        c.addEventListener('pointercancel', this.onPointerUp);
        c.addEventListener('pointerleave', this.onPointerLeave);
        c.addEventListener('wheel', this.onWheel, { passive: false });
        c.addEventListener('touchstart', this.onTouchStart, { passive: false });
        c.addEventListener('touchmove', this.onTouchMove, { passive: false });
        c.addEventListener('touchend', this.onTouchEnd);
    }
    detachPointer() {
        const c = this.canvas;
        if (!c)
            return;
        c.removeEventListener('pointerdown', this.onPointerDown);
        c.removeEventListener('pointermove', this.onPointerMove);
        c.removeEventListener('pointerup', this.onPointerUp);
        c.removeEventListener('pointercancel', this.onPointerUp);
        c.removeEventListener('pointerleave', this.onPointerLeave);
        c.removeEventListener('wheel', this.onWheel);
        c.removeEventListener('touchstart', this.onTouchStart);
        c.removeEventListener('touchmove', this.onTouchMove);
        c.removeEventListener('touchend', this.onTouchEnd);
    }
    localXY(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    onPointerDown = (e) => {
        if (e.pointerType === 'touch')
            return; // touch handled separately
        const p = this.localXY(e);
        this.pointerDownAt = p;
        this.lastPointer = p;
        this.moved = false;
        const hit = this.nodeAt(p.x, p.y);
        if (hit) {
            this.dragging = hit;
            hit.fx = hit.x;
            hit.fy = hit.y;
            if (!this.reduceMotion) {
                this.sim?.alphaTarget(0.2).restart();
                this.startTicking();
            }
        }
        else {
            this.panning = true;
            if (this.canvas)
                this.canvas.style.cursor = 'grabbing';
        }
        this.canvas?.setPointerCapture?.(e.pointerId);
    };
    onPointerMove = (e) => {
        if (e.pointerType === 'touch')
            return;
        const p = this.localXY(e);
        const dx = p.x - this.lastPointer.x;
        const dy = p.y - this.lastPointer.y;
        this.lastPointer = p;
        if (Math.abs(p.x - this.pointerDownAt.x) + Math.abs(p.y - this.pointerDownAt.y) > 3) {
            this.moved = true;
        }
        if (this.dragging) {
            const w = this.toWorld(p.x, p.y);
            this.dragging.fx = w.x;
            this.dragging.fy = w.y;
            if (this.reduceMotion) {
                this.dragging.x = w.x;
                this.dragging.y = w.y;
                this.requestPaint();
            }
            return;
        }
        if (this.panning) {
            this.tx += dx;
            this.ty += dy;
            this.clampTransform();
            this.requestPaint();
            return;
        }
        // Hover.
        const hit = this.nodeAt(p.x, p.y);
        if (hit !== this.hovered) {
            this.hovered = hit;
            this.nodeHover.emit({ id: hit ? hit.id : null });
            this.canvas.style.cursor = hit ? 'pointer' : 'grab';
            this.requestPaint();
        }
    };
    onPointerUp = (e) => {
        if (e.pointerType === 'touch')
            return;
        const wasDragging = this.dragging;
        if (wasDragging) {
            wasDragging.fx = null;
            wasDragging.fy = null;
            this.sim?.alphaTarget(0);
        }
        this.dragging = null;
        this.panning = false;
        if (this.canvas)
            this.canvas.style.cursor = this.hovered ? 'pointer' : 'grab';
        // A click without movement → select the node.
        if (!this.moved) {
            const hit = this.nodeAt(this.lastPointer.x, this.lastPointer.y);
            if (hit)
                this.nodeSelect.emit({ id: hit.id });
        }
    };
    onPointerLeave = () => {
        if (this.hovered) {
            this.hovered = null;
            this.nodeHover.emit({ id: null });
            this.requestPaint();
        }
    };
    onWheel = (e) => {
        e.preventDefault();
        const p = this.localXY(e);
        const factor = Math.exp(-e.deltaY * 0.0015);
        this.zoomAt(p.x, p.y, factor);
    };
    zoomAt(px, py, factor) {
        const newScale = Math.max(0.1, Math.min(this.scale * factor, 4));
        const f = newScale / this.scale;
        // Keep the point under the cursor fixed.
        this.tx = px - (px - this.tx) * f;
        this.ty = py - (py - this.ty) * f;
        this.scale = newScale;
        this.clampTransform();
        this.requestPaint();
    }
    // ── touch (pan + pinch + tap) ──
    onTouchStart = (e) => {
        if (e.touches.length === 1) {
            const p = this.localXY(e.touches[0]);
            this.pointerDownAt = p;
            this.lastPointer = p;
            this.moved = false;
            const hit = this.nodeAt(p.x, p.y);
            if (hit) {
                this.dragging = hit;
                hit.fx = hit.x;
                hit.fy = hit.y;
                if (!this.reduceMotion) {
                    this.sim?.alphaTarget(0.2).restart();
                    this.startTicking();
                }
            }
            else {
                this.panning = true;
            }
        }
        else if (e.touches.length === 2) {
            e.preventDefault();
            this.dragging = null;
            this.panning = false;
            this.pinchDist = this.touchDist(e);
        }
    };
    onTouchMove = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const d = this.touchDist(e);
            if (this.pinchDist > 0) {
                const mid = this.touchMid(e);
                this.zoomAt(mid.x, mid.y, d / this.pinchDist);
            }
            this.pinchDist = d;
            return;
        }
        if (e.touches.length === 1) {
            const p = this.localXY(e.touches[0]);
            const dx = p.x - this.lastPointer.x;
            const dy = p.y - this.lastPointer.y;
            this.lastPointer = p;
            if (Math.abs(p.x - this.pointerDownAt.x) + Math.abs(p.y - this.pointerDownAt.y) > 5) {
                this.moved = true;
            }
            if (this.dragging) {
                e.preventDefault();
                const w = this.toWorld(p.x, p.y);
                this.dragging.fx = w.x;
                this.dragging.fy = w.y;
                if (this.reduceMotion) {
                    this.dragging.x = w.x;
                    this.dragging.y = w.y;
                    this.requestPaint();
                }
            }
            else if (this.panning) {
                this.tx += dx;
                this.ty += dy;
                this.clampTransform();
                this.requestPaint();
            }
        }
    };
    onTouchEnd = (e) => {
        if (this.dragging) {
            this.dragging.fx = null;
            this.dragging.fy = null;
            this.sim?.alphaTarget(0);
        }
        const wasDragging = this.dragging;
        this.dragging = null;
        this.panning = false;
        this.pinchDist = 0;
        // Tap (no move, single touch) → select.
        if (!this.moved && !wasDragging && e.touches.length === 0) {
            const hit = this.nodeAt(this.lastPointer.x, this.lastPointer.y);
            if (hit)
                this.nodeSelect.emit({ id: hit.id });
        }
        else if (!this.moved && wasDragging && e.touches.length === 0) {
            const hit = this.nodeAt(this.lastPointer.x, this.lastPointer.y);
            if (hit)
                this.nodeSelect.emit({ id: hit.id });
        }
    };
    touchDist(e) {
        const a = e.touches[0];
        const b = e.touches[1];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }
    touchMid(e) {
        const a = e.touches[0];
        const b = e.touches[1];
        const rect = this.canvas.getBoundingClientRect();
        return { x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top };
    }
    // ── keyboard a11y: Tab to focus, Enter to open the focused node ──
    focusIndex = -1;
    onKeyDown = (e) => {
        if (!this.simNodes.length)
            return;
        const visible = this.simNodes.filter((n) => !this.isDimmed(n));
        if (!visible.length)
            return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Tab') {
            if (e.key === 'Tab' && e.shiftKey)
                return; // let shift+tab leave the canvas
            e.preventDefault();
            this.focusIndex = (this.focusIndex + 1) % visible.length;
            this.focusNode(visible[this.focusIndex]);
        }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            this.focusIndex = (this.focusIndex - 1 + visible.length) % visible.length;
            this.focusNode(visible[this.focusIndex]);
        }
        else if ((e.key === 'Enter' || e.key === ' ') && this.hovered) {
            e.preventDefault();
            this.nodeSelect.emit({ id: this.hovered.id });
        }
    };
    focusNode(n) {
        this.hovered = n;
        this.nodeHover.emit({ id: n.id });
        // Centre the focused node.
        this.tx = this.width / 2 - (n.x ?? 0) * this.scale;
        this.ty = this.height / 2 - (n.y ?? 0) * this.scale;
        this.requestPaint();
    }
    /** Orphan count for the a11y summary (nodes with no resolved link). */
    orphanCount() {
        const nodes = Array.isArray(this.nodes) ? this.nodes : [];
        const edges = Array.isArray(this.edges) ? this.edges : [];
        if (!nodes.length)
            return 0;
        const linked = new Set();
        for (const e of edges) {
            const s = typeof e.source === 'string' ? e.source : e.source?.id;
            const t = typeof e.target === 'string' ? e.target : e.target?.id;
            if (s)
                linked.add(s);
            if (t)
                linked.add(t);
        }
        return nodes.filter((n) => !linked.has(n.id)).length;
    }
    render() {
        const empty = !this.nodes || this.nodes.length === 0;
        const noEdges = !empty && (!this.edges || this.edges.length === 0);
        const orphans = empty ? 0 : this.orphanCount();
        const label = empty
            ? 'Knowledge graph (empty). No notes yet.'
            : `Knowledge graph: ${this.nodes.length} notes, ${this.edges?.length ?? 0} links, ${orphans} orphan${orphans === 1 ? '' : 's'}. Use arrow keys to move between notes and Enter to open the focused note.`;
        return (h("div", { key: '0', class: "gv" },
            h("canvas", { key: '1', class: "gv__canvas", role: "application", tabindex: "0", "aria-label": label, "aria-roledescription": "Interactive knowledge graph", onKeyDown: this.onKeyDown }),
            empty && (h("div", { key: '2', class: "gv__overlay" },
                h("slot", { key: '3', name: "empty" },
                    h("pop-empty-state", { key: '4', iconName: "graph", heading: "No notes yet", message: "Capture a thought to start building your brain.", size: "full" })))),
            noEdges && (h("div", { key: '5', class: "gv__hint", role: "note" },
                "Link notes with ",
                h("code", { key: '6' }, "[[ ]]"),
                " to grow your brain."))));
    }
    static get watchers() { return {
        "nodes": [{
                "graphChanged": 0
            }],
        "edges": [{
                "graphChanged": 0
            }],
        "filterTag": [{
                "styleChanged": 0
            }],
        "highlight": [{
                "styleChanged": 0
            }],
        "orphansOnly": [{
                "styleChanged": 0
            }]
    }; }
    static get style() { return PopGraphViewStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-graph-view",
        "$members$": {
            "nodes": [16],
            "edges": [16],
            "tagColors": [8, "tag-colors"],
            "nodeCap": [2, "node-cap"],
            "filterTag": [1, "filter-tag"],
            "highlight": [1],
            "orphansOnly": [4, "orphans-only"],
            "reheat": [64],
            "zoomToFit": [64]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=graph-view.js.map