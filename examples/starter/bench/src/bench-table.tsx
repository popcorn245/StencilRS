import { Component, Method, State } from '@stencil/core';

type Row = { id: number; label: string };
const A = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint'];
const C = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'white', 'black', 'orange'];
const N = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger'];
let nextId = 1;
let seed = 1;
const rand = (n: number) => ((seed = (seed * 16807) % 2147483647) % n);
const build = (count: number): Row[] =>
  Array.from({ length: count }, () => ({ id: nextId++, label: `${A[rand(10)]} ${C[rand(10)]} ${N[rand(10)]}` }));

/** A js-framework-benchmark style table: the same source on both runtimes. */
@Component({ tag: 'bench-table', encapsulation: { type: 'shadow' } })
export class BenchTable {
  @State() rows: Row[] = [];
  @State() selected = -1;

  @Method() async run(n: number) { this.rows = build(n); }
  @Method() async add(n: number) { this.rows = this.rows.concat(build(n)); }
  @Method() async update() { this.rows = this.rows.map((r, i) => (i % 10 === 0 ? { ...r, label: r.label + ' !!!' } : r)); }
  @Method() async select(i: number) { this.selected = this.rows[i].id; }
  @Method() async swap() {
    if (this.rows.length > 998) {
      const rows = this.rows.slice();
      const t = rows[1];
      rows[1] = rows[998];
      rows[998] = t;
      this.rows = rows;
    }
  }
  @Method() async remove(i: number) { this.rows = this.rows.filter((_, j) => j !== i); }
  @Method() async clear() { this.rows = []; }

  componentWillRender() { (window as any).__t0 = performance.now(); }
  componentDidRender() { (window as any).__work = performance.now() - (window as any).__t0; (window as any).__done = performance.now(); }

  render() {
    return (
      <table class="table">
        <tbody>
          {this.rows.map((row) => (
            <tr key={row.id} class={row.id === this.selected ? 'danger' : ''}>
              <td class="col-md-1">{row.id}</td>
              <td class="col-md-4"><a>{row.label}</a></td>
              <td class="col-md-1"><a><span class="remove" aria-hidden="true">x</span></a></td>
              <td class="col-md-6"></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
