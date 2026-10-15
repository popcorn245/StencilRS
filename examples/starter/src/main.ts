// Importing a component module registers its custom element; src/index.ts imports them all.
import './index';

const log = document.querySelector('#log')!;
document.querySelector('pop-counter')!.addEventListener('countChanged', (e) => {
  log.textContent = `countChanged → ${(e as CustomEvent<number>).detail}`;
});

// pop-date-field submits with its form (it is form-associated).
document.querySelector<HTMLFormElement>('#date-form')!.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
  document.querySelector('#date-out')!.textContent = ` submitted ${JSON.stringify(data)}`;
});
