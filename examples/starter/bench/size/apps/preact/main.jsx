// preact-custom-element registers a Preact component as a custom element (shadow: true).
import { useState } from 'preact/hooks';
import register from 'preact-custom-element';

const ITEMS = Array.from({ length: 10 }, (_, id) => ({ id, text: `Item ${id}` }));
const CSS = `
  :host { display: block; padding: 8px; border: 1px solid #888; }
  button { font: inherit; padding: 2px 8px; }
  ul { margin: 8px 0 0; padding-left: 20px; }
  li.on { font-weight: 700; }
`;

function SizeApp({ label = 'Count' }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <style>{CSS}</style>
      <button onClick={() => setCount(count + 1)}>
        {label}: {count}
      </button>
      <ul>
        {ITEMS.map((item) => (
          <li key={item.id} class={item.id === count % 10 ? 'on' : ''}>
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

register(SizeApp, 'size-app', ['label'], { shadow: true });
