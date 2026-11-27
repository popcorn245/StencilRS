// Solid has no custom-element mode of its own (solid-element is a separate package): a hand-written
// element that renders the component into a shadow root, which is what solid-element does at its core.
import { render } from 'solid-js/web';
import { createSignal, For } from 'solid-js';

const ITEMS = Array.from({ length: 10 }, (_, id) => ({ id, text: `Item ${id}` }));
const CSS = `
  :host { display: block; padding: 8px; border: 1px solid #888; }
  button { font: inherit; padding: 2px 8px; }
  ul { margin: 8px 0 0; padding-left: 20px; }
  li.on { font-weight: 700; }
`;

function App(props) {
  const [count, setCount] = createSignal(0);
  return (
    <div>
      <button onClick={() => setCount(count() + 1)}>
        {props.label}: {count()}
      </button>
      <ul>
        <For each={ITEMS}>{(item) => <li classList={{ on: item.id === count() % 10 }}>{item.text}</li>}</For>
      </ul>
    </div>
  );
}

const sheet = new CSSStyleSheet();
sheet.replaceSync(CSS);

class SizeApp extends HTMLElement {
  static observedAttributes = ['label'];
  #label = 'Count';
  connectedCallback() {
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [sheet];
    this.dispose = render(() => <App label={this.getAttribute('label') ?? this.#label} />, root);
  }
  disconnectedCallback() {
    this.dispose?.();
  }
}
customElements.define('size-app', SizeApp);
