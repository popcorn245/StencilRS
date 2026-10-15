import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { UserOption } from './user-select/user-select';

const meta: Meta = {
  title: 'Molecules/UserSelect',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A reusable, backend-agnostic people picker: a chip field + suggestion ' +
          'popover driven entirely by an injected async `resolve(query)` source. ' +
          'Selected people render as removable chips (avatar · name · email); with ' +
          '`allow-free-text` a typed email that matches nothing can be added manually. ' +
          '`resolve` and `value` are properties (function / array), so set them in JS ' +
          'rather than as attributes.',
      },
    },
  },
};
export default meta;

/** Demo directory — the story stands in for a real backend (hub contacts, the
 *  tasks-app /users mirror, …). One entry carries an avatar to show the image
 *  path; the rest fall back to the initial-letter placeholder. */
const PEOPLE: UserOption[] = [
  { id: 'u1', name: 'Ada Lovelace', email: 'ada@analytical.dev', avatar: 'https://i.pravatar.cc/64?img=47' },
  { id: 'u2', name: 'Alan Turing', email: 'alan@bletchley.uk' },
  { id: 'u3', name: 'Grace Hopper', email: 'grace@navy.mil' },
  { id: 'u4', name: 'Katherine Johnson', email: 'katherine@nasa.gov' },
  { id: 'u5', name: 'Radia Perlman', email: 'radia@spanningtree.net' },
];

/** Filter the demo directory by name/email substring after a short delay so the
 *  "Searching…" state is visible while typing. */
function demoResolver(delay = 250) {
  return (q: string): Promise<UserOption[]> => {
    const s = q.toLowerCase();
    const hits = PEOPLE.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(s));
    return new Promise((resolve) => setTimeout(() => resolve(hits), delay));
  };
}

interface Props {
  placeholder?: string;
  label?: string;
  value?: UserOption[];
  allowFreeText?: boolean;
  max?: number;
  delay?: number;
}

/** Build the element, wire up the function/array properties, and echo the
 *  current selection under it so the story is interactive. */
function make(props: Props = {}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width: 340px; padding: 1rem; background: var(--pico-background-color, #fff);';

  const el = document.createElement('pop-user-select') as HTMLElement & {
    resolve: (q: string) => Promise<UserOption[]>;
    value: UserOption[];
    allowFreeText: boolean;
    placeholder: string;
    label: string;
    max: number;
  };
  el.resolve = demoResolver(props.delay);
  el.value = props.value ?? [];
  el.allowFreeText = props.allowFreeText ?? false;
  el.placeholder = props.placeholder ?? 'Search people…';
  el.label = props.label ?? 'People';
  if (props.max) el.max = props.max;

  const echo = document.createElement('pre');
  echo.style.cssText = 'margin: 0.75rem 0 0; font-size: 0.72rem; color: var(--pico-muted-color, #64748b); white-space: pre-wrap;';
  const paint = (v: UserOption[]) =>
    (echo.textContent = v.length ? `selected: ${v.map((u) => u.name || u.email).join(', ')}` : 'selected: —');
  paint(el.value);
  el.addEventListener('valueChanged', (e) => paint((e as CustomEvent<UserOption[]>).detail));

  wrap.append(el, echo);
  return wrap;
}

export const Default: StoryObj = {
  name: 'Default',
  render: () => make({ placeholder: 'Search people…' }),
};

export const WithSelection: StoryObj = {
  name: 'Pre-filled selection',
  render: () => make({ value: [PEOPLE[0], PEOPLE[2]] }),
};

export const FreeTextEmail: StoryObj = {
  name: 'Free-text email (invite)',
  parameters: {
    docs: { description: { story: 'With `allow-free-text`, typing a full email that matches no one surfaces an “Add …” option.' } },
  },
  render: () => make({ allowFreeText: true, placeholder: 'Invite people or type an email…' }),
};

export const Capped: StoryObj = {
  name: 'Max two selections',
  parameters: {
    docs: { description: { story: 'A `max` of 2 stops accepting picks once two people are chosen.' } },
  },
  render: () => make({ max: 2, value: [PEOPLE[1]] }),
};

export const SlowSource: StoryObj = {
  name: 'Slow source (loading state)',
  parameters: {
    docs: { description: { story: 'An 800 ms resolver shows the “Searching…” hint while results are in flight.' } },
  },
  render: () => make({ delay: 800 }),
};
