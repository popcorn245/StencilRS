// ionicons 8.1.0's icon.css contains
//   @supports not selector(:dir(rtl)) and selector(:host-context([dir='rtl'])) { ... }
// which is invalid CSS: `not` cannot be combined with `and` without parentheses. Stencil 4's CSS parser let it
// through (and browsers drop the rule); Stencil v5's lightningcss rejects it. Parenthesise `not`, which is what
// the rule's comment says it means (browsers with :host-context() but without :dir()).
export const ioniconsCssFix = {
  name: 'ionicons-css-fix',
  pluginType: 'css',
  transform(code: string, id: string) {
    if (!/ionicons[\\/]dist[\\/]collection[\\/]components[\\/]icon[\\/]icon\.css$/.test(id)) return null;
    return {
      code: code.replace('@supports not selector(:dir(rtl)) and selector(', '@supports (not selector(:dir(rtl))) and selector('),
      id,
    };
  },
};
