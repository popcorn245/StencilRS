import { component$, render, useSignal, useStore, useVisibleTask$ } from '@builder.io/qwik';

type Row = { id: number; label: string };
type Item = { label: string; value: number };
const A = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint'];
const C = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'white', 'black', 'orange'];
const N = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger'];
let nextId = 1;
let seed = 1;
const rand = (n: number) => ((seed = (seed * 16807) % 2147483647) % n);
const build = (count: number): Row[] =>
  Array.from({ length: count }, () => ({ id: nextId++, label: `${A[rand(10)]} ${C[rand(10)]} ${N[rand(10)]}` }));

/** The same cell as ../src/bench-cell.tsx. */
export const BenchCell = component$<{ item: Item }>(({ item }) => (
  <div class={{ odd: item.value % 2 === 1 }}>
    <span class="label">{item.label}</span>
    <b>{item.value}</b>
  </div>
));

/** The same table as ../src/bench-table.tsx, driven from the page through `window.bench`. */
export const App = component$(() => {
  const rows = useSignal<Row[]>([]);
  const selected = useSignal(-1);
  const cells = useStore<{ items: Item[] }>({ items: [] });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(
    () => {
      (window as any).bench = {
        run: (n: number) => (rows.value = build(n)),
        add: (n: number) => (rows.value = rows.value.concat(build(n))),
        update: () => (rows.value = rows.value.map((r, i) => (i % 10 === 0 ? { ...r, label: r.label + ' !!!' } : r))),
        select: (i: number) => (selected.value = rows.value[i].id),
        swap: () => {
          if (rows.value.length > 998) {
            const r = rows.value.slice();
            const t = r[1];
            r[1] = r[998];
            r[998] = t;
            rows.value = r;
          }
        },
        remove: (i: number) => (rows.value = rows.value.filter((_, j) => j !== i)),
        clear: () => (rows.value = []),
        cells: (n: number) => (cells.items = Array.from({ length: n }, (_, i) => ({ label: `cell ${i}`, value: i }))),
        bump: () => {
          for (const c of cells.items) c.value++;
        },
      };
    },
    { strategy: 'document-ready' },
  );

  return (
    <>
      <table class="table">
        <tbody>
          {rows.value.map((row) => (
            <tr key={row.id} class={row.id === selected.value ? 'danger' : ''}>
              <td class="col-md-1">{row.id}</td>
              <td class="col-md-4"><a>{row.label}</a></td>
              <td class="col-md-1"><a><span class="remove" aria-hidden="true">x</span></a></td>
              <td class="col-md-6"></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div id="cells">
        {cells.items.map((item, i) => <BenchCell key={i} item={item} />)}
      </div>
    </>
  );
});

render(document.getElementById('app')!, <App />);
