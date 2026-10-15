// Importing a component module registers its custom element; src/index.ts imports them all.
import './index';

const log = document.querySelector('#log')!;
document.querySelector('pop-counter')!.addEventListener('countChanged', (e) => {
  log.textContent = `countChanged → ${(e as CustomEvent<number>).detail}`;
});
