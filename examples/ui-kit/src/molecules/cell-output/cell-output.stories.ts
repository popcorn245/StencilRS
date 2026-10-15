import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Molecules/CellOutput',
  parameters: {
    docs: {
      description: {
        component:
          'pop-cell-output — the structured output panel for a notebook code cell (notes-app "digital brain", Phase 9 notebook execution). The host (page-editor) runs JS cells in a persistent SANDBOXED iframe runtime and passes the structured result here; this component only RENDERS. Console lines, the last-expression result, and thrown errors are rendered as ESCAPED text (no host-DOM injection). `display.html(...)` output is rendered inside a scriptless, opaque-origin sandbox sub-frame. The gutter shows a Jupyter-style prompt: [ ] idle, [*] running, [N] done/error.',
      },
    },
  },
};

export default meta;

const J = (arr: any[]) => JSON.stringify(arr).replace(/'/g, '&#39;');

function cell(opts: { status?: string; count?: number; ms?: number; items?: any[] } = {}) {
  const attrs = [
    opts.status ? `status="${opts.status}"` : '',
    opts.count != null ? `count="${opts.count}"` : '',
    opts.ms != null ? `ms="${opts.ms}"` : '',
    opts.items ? `items='${J(opts.items)}'` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<div style="max-width:640px;padding:12px;">
    <pop-cell-output ${attrs}></pop-cell-output>
  </div>`;
}

export const Idle: StoryObj = {
  name: 'Idle (not yet run)',
  render: () => cell({ status: 'idle', count: 0, items: [] }),
};

export const Running: StoryObj = {
  name: 'Running',
  render: () => cell({ status: 'running', count: 0, items: [] }),
};

export const Output: StoryObj = {
  name: 'Output (console + result)',
  render: () =>
    cell({
      status: 'done',
      count: 2,
      ms: 4,
      items: [
        { kind: 'log', text: 'hello from cell' },
        { kind: 'info', text: 'computing…' },
        { kind: 'warn', text: 'heads up: deprecated path' },
        { kind: 'result', text: '42' },
      ],
    }),
};

export const StructuredOutput: StoryObj = {
  name: 'Structured (object pretty-print + display)',
  render: () =>
    cell({
      status: 'done',
      count: 3,
      ms: 6,
      items: [
        { kind: 'log', text: '[ 1, 2, 3 ]' },
        { kind: 'display', text: '{\n  "name": "brain",\n  "cells": 4,\n  "ok": true\n}' },
        { kind: 'result', text: '{\n  "sum": 6\n}' },
      ],
    }),
};

export const HtmlDisplay: StoryObj = {
  name: 'display.html() (sandboxed sub-frame)',
  render: () =>
    cell({
      status: 'done',
      count: 4,
      ms: 3,
      items: [
        { kind: 'log', text: 'rendering a chart…' },
        {
          kind: 'display',
          html: '<div style="padding:8px"><b>Bar</b><div style="display:flex;gap:4px;align-items:end;height:60px">' +
            '<span style="width:18px;height:30px;background:#2f6fed"></span>' +
            '<span style="width:18px;height:50px;background:#2bb3a3"></span>' +
            '<span style="width:18px;height:20px;background:#b7791f"></span></div></div>',
        },
      ],
    }),
};

export const ErrorState: StoryObj = {
  name: 'Error (with stack)',
  render: () =>
    cell({
      status: 'error',
      count: 5,
      ms: 1,
      items: [
        { kind: 'log', text: 'before the throw' },
        {
          kind: 'error',
          text: 'ReferenceError: x is not defined',
          stack: 'ReferenceError: x is not defined\n    at <anonymous>:2:1\n    at runCell (<anonymous>:48:7)',
        },
      ],
    }),
};

export const Timeout: StoryObj = {
  name: 'Timeout (kernel restarted)',
  render: () =>
    cell({
      status: 'error',
      count: 6,
      ms: 5000,
      items: [{ kind: 'error', text: 'Timed out after 5000ms — runtime was restarted.' }],
    }),
};
