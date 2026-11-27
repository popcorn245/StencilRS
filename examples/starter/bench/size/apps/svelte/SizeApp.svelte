<svelte:options customElement="size-app" />

<script>
  let { label = 'Count' } = $props();
  let count = $state(0);
  const ITEMS = Array.from({ length: 10 }, (_, id) => ({ id, text: `Item ${id}` }));
</script>

<div>
  <button onclick={() => count++}>{label}: {count}</button>
  <ul>
    {#each ITEMS as item (item.id)}
      <li class:on={item.id === count % 10}>{item.text}</li>
    {/each}
  </ul>
</div>

<style>
  :host { display: block; padding: 8px; border: 1px solid #888; }
  button { font: inherit; padding: 2px 8px; }
  ul { margin: 8px 0 0; padding-left: 20px; }
  li.on { font-weight: 700; }
</style>
