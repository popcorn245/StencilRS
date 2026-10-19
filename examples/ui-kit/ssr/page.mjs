// The page the smoke test server-renders, and the checks the two client steps share.
//
// Eight ui-kit components: scoped and shadow encapsulation (declarative shadow DOM), slots, props
// read from attributes, a reflected prop, an event, and state a click changes.

export const TAGS = ['pop-card', 'pop-status-badge', 'pop-chip', 'pop-switch', 'pop-progress-bar', 'pop-stat', 'pop-button', 'pop-address-autocomplete'];

export const PAGE = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>ui-kit server render</title></head>
<body>
<pop-card variant="outlined">
  <h3>Card</h3>
  <pop-status-badge variant="success">Done</pop-status-badge>
  <pop-chip value="alpha" removable>Alpha</pop-chip>
  <pop-switch label="Notify me" checked></pop-switch>
  <pop-progress-bar value="40" max="100" label="Upload"></pop-progress-bar>
  <pop-stat value="42" label="Open tasks"></pop-stat>
  <pop-button text="Save"></pop-button>
  <pop-address-autocomplete placeholder="Where"></pop-address-autocomplete>
</pop-card>
</body>
</html>`;

/** Strings the server render must contain: the markup each component produced, not just that it ran. */
export const RENDERED = [
  'class="sb sb--success sb--md sc-pop-status-badge',
  '>Done</span>',
  'class="chip sc-pop-chip',
  'role="switch" aria-checked="true" aria-label="Notify me"',
  'role="progressbar" aria-valuenow="40"',
  'style="width: 40%;"',
  '>42</span>',
  '>Open tasks</span>',
  '>Save</a>',
  '<template shadowrootmode="open"',
  'placeholder="Where"',
];

/**
 * Self-contained (Playwright serializes it into the page): the elements inside the page's
 * components, remembered so a later check can tell hydration adopted them from a re-render.
 */
export function markServerNodes(doc) {
  const nodes = [];
  const visit = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.localName === 'script' || el.localName === 'style') continue;
      nodes.push(el);
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(doc.body);
  doc.defaultView.__serverNodes = nodes;
  return nodes.length;
}

/**
 * Self-contained, run after the client bundle has loaded. `adopted`: elements from the server
 * render that are still the ones in the document. `annotations`: the hydration markers
 * (`c-id` attributes, `<!--r.1-->` comments) the client consumes and removes.
 */
export function hydrationState(doc) {
  const nodes = doc.defaultView.__serverNodes;
  const comments = (root) => {
    let n = 0;
    const walker = doc.createTreeWalker(root, 128);
    while (walker.nextNode()) if (/^[rostc]\.\d/.test(walker.currentNode.nodeValue)) n++;
    return n;
  };
  return {
    total: nodes.length,
    adopted: nodes.filter((n) => n.isConnected).length,
    lost: nodes.filter((n) => !n.isConnected).map((n) => n.localName + '.' + n.className),
    annotations: doc.querySelectorAll('[c-id]').length + comments(doc.body),
    undefinedHosts: [...doc.querySelectorAll('*')].filter((e) => e.localName.startsWith('pop-') && !doc.defaultView.customElements.get(e.localName)).map((e) => e.localName),
  };
}

/** Self-contained: click the switch, let the component re-render, and report what it did. */
export async function clickSwitch(doc) {
  const host = doc.querySelector('pop-switch');
  const events = [];
  host.addEventListener('popChange', (e) => events.push(e.detail));
  const button = () => host.querySelector('button');
  const before = button().getAttribute('aria-checked');
  button().click();
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { before, after: button().getAttribute('aria-checked'), on: button().classList.contains('sw--on'), events };
}
