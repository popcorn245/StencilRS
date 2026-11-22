// The pages and render options of the Ionic SSR benchmark (bench-ssr.mjs, issue #127). A module of its own so the
// stencilrs hydrate build (issue #128) renders exactly the same inputs: import { PAGES, MODES, renderOptions } from it.
//
//   fragment        one ion-button
//   list-50         ion-app / ion-content / ion-list with 50 ion-item (ion-label, ion-badge, ion-toggle)
//   kitchen-sink    header, toolbar, buttons, cards, inputs, segment, tabs and a list: one of each common component
//
// Every page is a full document (what an SSR framework hands to renderToString), with the `lang` and mode-neutral
// markup only: no random ids, dates or counters, so two correct renderers can produce the same bytes.

const doc = (title, body) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${title}</title></head>
<body>
${body}
</body>
</html>`;

const items = Array.from(
  { length: 50 },
  (_, i) => `      <ion-item>
        <ion-label>Item ${i + 1}</ion-label>
        <ion-badge slot="end">${i + 1}</ion-badge>
        <ion-toggle slot="end"${i % 3 === 0 ? ' checked' : ''}></ion-toggle>
      </ion-item>`
).join('\n');

const sinkItems = ['Inbox', 'Drafts', 'Sent', 'Trash']
  .map(
    (name) => `        <ion-item>
          <ion-label>${name}</ion-label>
          <ion-note slot="end">${name.length}</ion-note>
        </ion-item>`
  )
  .join('\n');

export const PAGES = {
  fragment: doc('fragment', '<ion-button>Click me</ion-button>'),

  'list-50': doc(
    'list-50',
    `<ion-app>
  <ion-content>
    <ion-list>
${items}
    </ion-list>
  </ion-content>
</ion-app>`
  ),

  'kitchen-sink': doc(
    'kitchen-sink',
    `<ion-app>
  <ion-header>
    <ion-toolbar color="primary">
      <ion-buttons slot="start"><ion-back-button default-href="/"></ion-back-button></ion-buttons>
      <ion-title>Kitchen sink</ion-title>
      <ion-buttons slot="end"><ion-button fill="clear">Edit</ion-button><ion-menu-button></ion-menu-button></ion-buttons>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar placeholder="Search"></ion-searchbar>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <ion-card>
      <ion-card-header>
        <ion-card-subtitle>Subtitle</ion-card-subtitle>
        <ion-card-title>Card title</ion-card-title>
      </ion-card-header>
      <ion-card-content>Card content with <ion-chip>a chip</ion-chip> and <ion-text color="medium">some text</ion-text>.</ion-card-content>
    </ion-card>
    <ion-card>
      <ion-card-content>
        <ion-button expand="block">Block</ion-button>
        <ion-button fill="outline" color="secondary">Outline</ion-button>
        <ion-button size="small" color="danger" disabled>Disabled</ion-button>
      </ion-card-content>
    </ion-card>
    <ion-list>
      <ion-list-header><ion-label>Form</ion-label></ion-list-header>
      <ion-item><ion-input label="Name" placeholder="Your name" value="Ada"></ion-input></ion-item>
      <ion-item><ion-input label="Email" type="email" label-placement="floating"></ion-input></ion-item>
      <ion-item><ion-textarea label="Notes" rows="3"></ion-textarea></ion-item>
      <ion-item><ion-checkbox checked>Agree</ion-checkbox></ion-item>
      <ion-item><ion-toggle>Notifications</ion-toggle></ion-item>
      <ion-item>
        <ion-select label="Fruit" placeholder="Pick one">
          <ion-select-option value="apple">Apple</ion-select-option>
          <ion-select-option value="pear">Pear</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-radio-group value="a">
        <ion-item><ion-radio value="a">A</ion-radio></ion-item>
        <ion-item><ion-radio value="b">B</ion-radio></ion-item>
      </ion-radio-group>
    </ion-list>
    <ion-segment value="all">
      <ion-segment-button value="all"><ion-label>All</ion-label></ion-segment-button>
      <ion-segment-button value="fav"><ion-label>Favorites</ion-label></ion-segment-button>
    </ion-segment>
    <ion-list>
${sinkItems}
    </ion-list>
    <ion-progress-bar value="0.4"></ion-progress-bar>
    <ion-spinner name="crescent"></ion-spinner>
    <ion-skeleton-text animated style="width: 60%"></ion-skeleton-text>
  </ion-content>
  <ion-tabs>
    <ion-tab tab="home"><ion-label>Home content</ion-label></ion-tab>
    <ion-tab-bar slot="bottom">
      <ion-tab-button tab="home"><ion-icon name="home"></ion-icon><ion-label>Home</ion-label></ion-tab-button>
      <ion-tab-button tab="search"><ion-icon name="search"></ion-icon><ion-label>Search</ion-label></ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>
</ion-app>`
  ),
};

/** The two shadow-root serializations every row is measured in. */
export const MODES = ['declarative-shadow-dom', 'scoped'];

/**
 * Options passed to every renderToString: identical for every row; everything not named here is the default.
 * `buildId` is the one addition to the issue's list: left out, every render stamps a random `data-stencil-build` on
 * <html>, so no two outputs could ever be byte-identical. A fixed id costs nothing and changes nothing else.
 */
export const renderOptions = (mode) => ({ prettyHtml: false, serializeShadowRoot: mode, buildId: 'ionic-ssr-bench' });
