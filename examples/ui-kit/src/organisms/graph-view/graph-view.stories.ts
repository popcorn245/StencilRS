import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/GraphView',
  parameters: {
    docs: {
      description: {
        component:
          'pop-graph-view — the 2D force-directed knowledge graph. d3-force simulation + canvas render. ' +
          'Nodes = notes, edges = `[[links]]` ONLY, colour/cluster = tags, size = link-count. ' +
          'The simulation ticks on rAF for a capped number of iterations then STOPS (idle-pause) — ' +
          'it never runs forever. `nodes`, `edges` and `tagColors` are set as DOM properties. ' +
          'Emits nodeSelect({id}) on click/tap and nodeHover({id|null}). ' +
          'Pan/zoom is BOUNDED — the layout can never be lost off-screen (drag/zoom/fit all clamp so ' +
          'the graph always stays reachable); call the `zoomToFit()` method to recentre. ' +
          'a11y: the canvas exposes an aria-label summarising note/link/orphan counts, is keyboard ' +
          'navigable (arrows move focus, Enter opens), and respects prefers-reduced-motion.',
      },
    },
  },
};

export default meta;

// Stable tag → colour map (2–3 colours) reused across stories.
const tagColors: Record<string, string> = {
  work: '#7c3aed', // violet
  home: '#2563eb', // blue
  ideas: '#db2777', // pink
};

// 8 notes, a handful of [[link]] edges, mixed tags, one orphan.
const fewNodes = [
  { id: 'brain', title: 'Second Brain', tags: ['ideas'] },
  { id: 'roadmap', title: 'Roadmap 2026', tags: ['work'] },
  { id: 'graph', title: 'Graph view', tags: ['work'] },
  { id: 'rag', title: 'RAG notes', tags: ['ideas'] },
  { id: 'standup', title: 'Standup', tags: ['work'] },
  { id: 'groceries', title: 'Groceries', tags: ['home'] },
  { id: 'reading', title: 'Reading list', tags: ['home', 'ideas'] },
  { id: 'orphan', title: 'Untethered thought', tags: ['ideas'] }, // no links → orphan
];

const fewEdges = [
  { source: 'brain', target: 'roadmap' },
  { source: 'brain', target: 'rag' },
  { source: 'roadmap', target: 'graph' },
  { source: 'roadmap', target: 'standup' },
  { source: 'rag', target: 'graph' },
  { source: 'reading', target: 'brain' },
];

// A denser graph (~30 nodes) to exercise the "hairball" + settle-and-stop path.
function denseFixture(n = 30) {
  const tags = ['work', 'home', 'ideas'];
  const nodes = Array.from({ length: n }, (_, i) => ({
    id: `n${i}`,
    title: `Note ${i}`,
    tags: [tags[i % tags.length]],
  }));
  const edges = [];
  for (let i = 1; i < n; i++) {
    // tree backbone + a few random cross-links
    edges.push({ source: `n${i}`, target: `n${Math.floor(Math.random() * i)}` });
    if (i % 4 === 0) edges.push({ source: `n${i}`, target: `n${Math.floor(Math.random() * i)}` });
  }
  return { nodes, edges };
}

function frame(opts: {
  nodes: unknown;
  edges: unknown;
  tagColors?: Record<string, string>;
  nodeCap?: number;
  filterTag?: string;
  height?: string;
}) {
  const id = 'gv-' + Math.random().toString(36).slice(2, 8);
  const attrs = [opts.nodeCap ? `node-cap="${opts.nodeCap}"` : '', opts.filterTag ? `filter-tag="${opts.filterTag}"` : '']
    .filter(Boolean)
    .join(' ');
  return `
    <div style="height:${opts.height ?? '480px'}; border:1px solid var(--pico-muted-border-color,#ccc); border-radius:12px; overflow:hidden;">
      <pop-graph-view id="${id}" ${attrs}></pop-graph-view>
    </div>
    <div style="margin-top:8px; font:12px var(--font-brand,system-ui); color:var(--ink-soft,#6b7280);">
      Legend:
      ${Object.entries(opts.tagColors ?? {})
        .map(
          ([t, c]) =>
            `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;">
               <span style="width:10px;height:10px;border-radius:50%;background:${c};display:inline-block;"></span>${t}
             </span>`,
        )
        .join('')}
      <span style="display:inline-flex;align-items:center;gap:4px;">
        <span style="width:10px;height:10px;border-radius:50%;border:1.5px solid #999;display:inline-block;"></span>orphan
      </span>
    </div>
    <script>
      (() => {
        const el = document.getElementById('${id}');
        el.tagColors = ${JSON.stringify(opts.tagColors ?? {})};
        el.nodes = ${JSON.stringify(opts.nodes)};
        el.edges = ${JSON.stringify(opts.edges)};
        el.addEventListener('nodeSelect', (e) => console.log('nodeSelect', e.detail));
      })();
    </script>
  `;
}

export const FewNodes: StoryObj = {
  name: 'Few nodes (8 notes, 6 links, 3 tags)',
  render: () => frame({ nodes: fewNodes, edges: fewEdges, tagColors }),
};

export const Empty: StoryObj = {
  name: 'Empty (no notes)',
  render: () => frame({ nodes: [], edges: [], tagColors }),
};

export const NoEdges: StoryObj = {
  name: 'No links yet (nodes float, no edges)',
  render: () => frame({ nodes: fewNodes.map((n) => ({ ...n })), edges: [], tagColors }),
};

export const Dense: StoryObj = {
  name: 'Dense (~30 nodes — settles & stops)',
  render: () => {
    const f = denseFixture(30);
    return frame({ nodes: f.nodes, edges: f.edges, tagColors });
  },
};

export const OrphansFlagged: StoryObj = {
  name: 'Orphans flagged (hollow rings)',
  render: () =>
    frame({
      nodes: [
        ...fewNodes,
        { id: 'o2', title: 'Loose idea', tags: ['home'] },
        { id: 'o3', title: 'Scratch', tags: ['work'] },
      ],
      edges: fewEdges,
      tagColors,
    }),
};

export const TagFiltered: StoryObj = {
  name: 'Tag filter (dims non-work)',
  render: () => frame({ nodes: fewNodes, edges: fewEdges, tagColors, filterTag: 'work' }),
};

export const MobileCap: StoryObj = {
  name: 'Mobile node cap (cap=12 on 50-node graph)',
  render: () => {
    const f = denseFixture(50);
    return frame({ nodes: f.nodes, edges: f.edges, tagColors, nodeCap: 12, height: '420px' });
  },
};
