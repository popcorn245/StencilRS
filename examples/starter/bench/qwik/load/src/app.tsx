import { component$, useSignal } from '@builder.io/qwik';
import { ITEMS } from './items';

/** The same card as ../../load/src/load-card.tsx. */
export const Card = component$<{ name: string; price: number }>(({ name, price }) => {
  const likes = useSignal(0);
  return (
    <div class="card">
      <h3>{name}</h3>
      <p class="price">${price.toFixed(2)}</p>
      <button class="like" onClick$={() => likes.value++}>♥ {likes.value}</button>
    </div>
  );
});

/** The same page as ../../load/src/load-app.tsx. */
export const App = component$(() => {
  const count = useSignal(0);
  return (
    <main>
      <header>
        <h1>Shop</h1>
        <button id="count" onClick$={() => count.value++}>Clicked {count.value}</button>
      </header>
      <section>
        {ITEMS.map((i) => <Card key={i.id} name={i.name} price={i.price} />)}
      </section>
    </main>
  );
});
