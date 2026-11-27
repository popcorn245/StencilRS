import { component$, render, useSignal, useStylesScoped$ } from '@builder.io/qwik';

const ITEMS = Array.from({ length: 10 }, (_, id) => ({ id, text: `Item ${id}` }));

export const SizeApp = component$<{ label?: string }>(({ label = 'Count' }) => {
  useStylesScoped$(`
    .app { display: block; padding: 8px; border: 1px solid #888; }
    button { font: inherit; padding: 2px 8px; }
    ul { margin: 8px 0 0; padding-left: 20px; }
    li.on { font-weight: 700; }
  `);
  const count = useSignal(0);
  return (
    <div class="app">
      <button onClick$={() => count.value++}>
        {label}: {count.value}
      </button>
      <ul>
        {ITEMS.map((item) => (
          <li key={item.id} class={{ on: item.id === count.value % 10 }}>
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
});

render(document.getElementById('app')!, <SizeApp label="Clicks" />);
