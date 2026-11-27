// The 500-card page in Solid (solid-js/web, server build, hydratable): compiled by build-solid.mjs.
import { createSignal, For } from 'solid-js';
import { renderToString } from 'solid-js/web';
import { ITEMS } from './items.mjs';

const Card = (props) => {
  const [likes, setLikes] = createSignal(0);
  return (
    <div class="card">
      <h3>{props.name}</h3>
      <p class="price">${props.price.toFixed(2)}</p>
      <button class="like" onClick={() => setLikes(likes() + 1)}>♥ {likes()}</button>
    </div>
  );
};

const App = () => {
  const [count, setCount] = createSignal(0);
  return (
    <main>
      <header>
        <h1>Shop</h1>
        <button id="count" onClick={() => setCount(count() + 1)}>Clicked {count()}</button>
      </header>
      <section>
        <For each={ITEMS}>{(i) => <Card name={i.name} price={i.price} />}</For>
      </section>
    </main>
  );
};

export const renderSolid = () => renderToString(() => <App />);
