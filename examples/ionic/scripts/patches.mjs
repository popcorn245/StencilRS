// The source patches applied after `stencil migrate`, on top of the migrated copy. Every entry must match
// exactly once, so an upstream change that moves a patched line fails the migration loudly instead of
// silently building something else. Each one is a Stencil v5 breaking change.
export const patches = [
  {
    why: 'v5 types a JSX expression as VNode, not HTMLElement/SVGElement (v4 typed it `any`)',
    file: 'src/components/checkbox/checkbox.tsx',
    find: 'private getSVGPath(mode: Mode, indeterminate: boolean): HTMLElement {',
    replace: 'private getSVGPath(mode: Mode, indeterminate: boolean): any {',
  },
  {
    why: 'same: JSX pushed into an SVGElement[]',
    file: 'src/components/spinner/spinner.tsx',
    find: 'const svgs: SVGElement[] = [];',
    replace: 'const svgs: any[] = [];',
  },
  {
    why: 'same: JSX returned as HTMLElement | string',
    file: 'src/utils/select-option-render.tsx',
    find: '): HTMLElement | string | undefined => {\n  const { id, label, startContent',
    replace: '): any => {\n  const { id, label, startContent',
  },
  {
    why: 'invalid selector (missing comma = descendant combinator between two ::slotted()); v4 emitted it, browsers drop it, lightningcss rejects it',
    file: 'src/components/item-divider/item-divider.ios.scss',
    find: '::slotted(h2:last-child)\n::slotted(h3:last-child),',
    replace: '::slotted(h2:last-child),\n::slotted(h3:last-child),',
  },
  {
    why: '::slotted() takes one compound selector, not a list',
    file: 'src/components/item-divider/item-divider.md.scss',
    find: '::slotted(h3, h4, h5, h6) {',
    replace: '::slotted(h3),\n::slotted(h4),\n::slotted(h5),\n::slotted(h6) {',
  },
  {
    why: 'a pseudo-element cannot go inside :host()',
    file: 'src/components/segment/segment.scss',
    find: ':host(.segment-scrollable::-webkit-scrollbar) {',
    replace: ':host(.segment-scrollable)::-webkit-scrollbar {',
  },
  {
    why: 'a pseudo-element cannot go inside ::slotted()',
    file: 'src/components/tab-button/tab-button.ios.scss',
    find: '::slotted(ion-icon::before) {',
    replace: '::slotted(ion-icon)::before {',
  },
  {
    why: '::slotted() cannot be followed by a pseudo-class',
    file: 'src/components/accordion-group/accordion-group.md.scss',
    find: ':host(.accordion-group-expand-inset) ::slotted(ion-accordion):first-of-type {',
    replace: ':host(.accordion-group-expand-inset) ::slotted(ion-accordion:first-of-type) {',
  },
  {
    why: 'rtl() appends :dir(rtl) to every selector, which is invalid after a pseudo-element (`.a::before:dir(rtl)`, `::slotted(x):dir(rtl)`); browsers drop those rules, lightningcss errors on them',
    file: 'src/themes/ionic.mixins.scss',
    find: '    @at-root #{add-root-selector($root, ":dir(rtl)", false)} {\n      @content;\n    }',
    replace: '    @if not str-contains($root, "::") {\n      @at-root #{add-root-selector($root, ":dir(rtl)", false)} {\n        @content;\n      }\n    }',
  },
];

// Packages Ionic keeps in core's devDependencies that the build type-checks against.
export const tsconfigPatches = {
  // TypeScript 6 deprecates `baseUrl`; `paths` resolve relative to the tsconfig without it. A handful of
  // files import `src/...` bare, which `baseUrl: "."` made resolvable, so map it explicitly.
  removeBaseUrl: true,
  extraPaths: { 'src/*': ['./src/*'] },
};
