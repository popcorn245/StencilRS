// Stencil writes this file on every build; it is committed so the first type-check already
// knows the element types the components name (`HTMLGenTabElement`).
export {};
declare global {
  interface HTMLGenTabElement extends HTMLElement {}
  interface HTMLGenTabsElement extends HTMLElement {}
}
