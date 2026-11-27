// Shared pieces of the islands spike (issue #183): page definitions split into a shell and islands, island rendering,
// and a static server + Chromium helpers. Prototype code, not library code.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const here = dirname(fileURLToPath(import.meta.url));
export const ionicRoot = join(here, '../..');
export const HYDRATE = join(ionicRoot, 'dist/hydrate-stencilrs/index.js');
export const hydrateHref = pathToFileURL(HYDRATE).href;

// The Ionic client under test. dist-stencil is `stencil build` (Stencil 5, hydrateClientSide on) of the same migrated source.
export const CLIENT_DIR = process.env.ISLANDS_CLIENT_DIR ?? join(ionicRoot, 'dist-client');
export const CSS_DIR = join(ionicRoot, 'node_modules/@ionic/core/css');

const doc = (title, head, body) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="stylesheet" href="/css/ionic.bundle.css">${head}</head>
<body>
${body}
</body>
</html>`;

const items = (from, to) =>
  Array.from(
    { length: to - from + 1 },
    (_, k) => {
      const i = from + k - 1;
      return `      <ion-item>
        <ion-label>Item ${i + 1}</ion-label>
        <ion-badge slot="end">${i + 1}</ion-badge>
        <ion-toggle slot="end"${i % 3 === 0 ? ' checked' : ''}></ion-toggle>
      </ion-item>`;
    }
  ).join('\n');

/**
 * A page as a template with `<stencil-island name="..."></stencil-island>` markers and the island bodies by name.
 * `full()` is the page with the islands filled in, which is what the current engine renders in one go.
 */
const island = (name) => `<stencil-island name="${name}"></stencil-island>`;
const fill = (template, islands) => template.replace(/<stencil-island name="([^"]+)"><\/stencil-island>/g, (_, n) => islands[n]);

const mk = (title, template, islands, head = '') => ({ title, template: doc(title, head, template), islands, full: () => fill(doc(title, head, template), islands) });

// list-50: ion-app / ion-content / ion-list is the shell; the 50 items are two islands of 25 (a long list is the standard split).
const list50 = mk('list-50', `<ion-app>
  <ion-content>
    <ion-list>
${island('a')}
${island('b')}
    </ion-list>
  </ion-content>
</ion-app>`, { a: items(1, 25), b: items(26, 50) });

const sinkItems = ['Inbox', 'Drafts', 'Sent', 'Trash']
  .map((name) => `        <ion-item>
          <ion-label>${name}</ion-label>
          <ion-note slot="end">${name.length}</ion-note>
        </ion-item>`)
  .join('\n');

// kitchen-sink: header toolbars (above the fold) / cards + buttons / the form list / segment, list, progress; tabs stay in the shell.
const sink = mk('kitchen-sink', `<ion-app>
${island('header')}
  <ion-content class="ion-padding">
${island('cards')}
${island('form')}
${island('rest')}
  </ion-content>
  <ion-tabs>
    <ion-tab tab="home"><ion-label>Home content</ion-label></ion-tab>
    <ion-tab-bar slot="bottom">
      <ion-tab-button tab="home"><ion-icon name="home"></ion-icon><ion-label>Home</ion-label></ion-tab-button>
      <ion-tab-button tab="search"><ion-icon name="search"></ion-icon><ion-label>Search</ion-label></ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>
</ion-app>`, {
  header: `  <ion-header>
    <ion-toolbar color="primary">
      <ion-buttons slot="start"><ion-back-button default-href="/"></ion-back-button></ion-buttons>
      <ion-title>Kitchen sink</ion-title>
      <ion-buttons slot="end"><ion-button fill="clear">Edit</ion-button><ion-menu-button></ion-menu-button></ion-buttons>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar placeholder="Search"></ion-searchbar>
    </ion-toolbar>
  </ion-header>`,
  cards: `    <ion-card>
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
    </ion-card>`,
  form: `    <ion-list>
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
    </ion-list>`,
  rest: `    <ion-segment value="all">
      <ion-segment-button value="all"><ion-label>All</ion-label></ion-segment-button>
      <ion-segment-button value="fav"><ion-label>Favorites</ion-label></ion-segment-button>
    </ion-segment>
    <ion-list>
${sinkItems}
    </ion-list>
    <ion-progress-bar value="0.4"></ion-progress-bar>
    <ion-spinner name="crescent"></ion-spinner>
    <ion-skeleton-text animated style="width: 60%"></ion-skeleton-text>`,
});

// stress: three islands full of slotted text and nested slotted elements (what scoped mode annotates with `o.`/`t.`/`s.` ids).
const stressBlock = (tag) => Array.from({ length: 12 }, (_, i) => `    <ion-button>${tag} button ${i}</ion-button><ion-chip>${tag} chip <b>${i}</b></ion-chip>`).join('\n');
const stress = mk('stress', `<ion-app><ion-content class="ion-padding">
${island('x')}
${island('y')}
${island('z')}
</ion-content></ion-app>`, { x: stressBlock('X'), y: stressBlock('Y'), z: stressBlock('Z') });


// Real app layouts (Ionic's own starters, served as one page per route): what an Ionic app's view looks like, rather than a list in ion-content.
// app-menu: the split-pane starter. The menu is off canvas on a phone, the page is header / content / footer, the content a hero and a feed.
const menuItems = ['Inbox', 'Outbox', 'Favorites', 'Archived', 'Trash', 'Spam']
  .map((name) => `          <ion-menu-toggle auto-hide="false"><ion-item lines="none" detail="false" href="#${name.toLowerCase()}"><ion-icon slot="start" name="mail"></ion-icon><ion-label>${name}</ion-label></ion-item></ion-menu-toggle>`)
  .join('\n');
const feed = Array.from({ length: 20 }, (_, i) => `        <ion-item>
          <ion-avatar slot="start"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></ion-avatar>
          <ion-label><h2>Message ${i + 1}</h2><p>Preview text of message ${i + 1}</p></ion-label>
          <ion-note slot="end">${(i % 12) + 1}:00</ion-note>
        </ion-item>`).join('\n');
const appMenu = mk('app-menu', `<ion-app>
  <ion-split-pane content-id="main">
${island('menu')}
    <div class="ion-page" id="main">
${island('header')}
      <ion-content>
${island('hero')}
${island('feed')}
      </ion-content>
${island('footer')}
    </div>
  </ion-split-pane>
</ion-app>`, {
  menu: `    <ion-menu content-id="main" type="overlay">
      <ion-header><ion-toolbar><ion-title>Mail</ion-title></ion-toolbar></ion-header>
      <ion-content>
        <ion-list id="inbox-list">
          <ion-list-header>Folders</ion-list-header>
${menuItems}
        </ion-list>
      </ion-content>
    </ion-menu>`,
  header: `      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
          <ion-title>Inbox</ion-title>
        </ion-toolbar>
      </ion-header>`,
  hero: `        <ion-card>
          <ion-card-header><ion-card-title>Welcome back</ion-card-title><ion-card-subtitle>3 new</ion-card-subtitle></ion-card-header>
          <ion-card-content><ion-button expand="block">Compose</ion-button></ion-card-content>
        </ion-card>`,
  feed: `        <ion-list>
${feed}
        </ion-list>
        <ion-infinite-scroll><ion-infinite-scroll-content></ion-infinite-scroll-content></ion-infinite-scroll>`,
  footer: `      <ion-footer>
        <ion-toolbar><ion-segment value="all"><ion-segment-button value="all"><ion-label>All</ion-label></ion-segment-button><ion-segment-button value="unread"><ion-label>Unread</ion-label></ion-segment-button></ion-segment></ion-toolbar>
      </ion-footer>`,
});

// app-tabs: the tabs starter. Each tab is a page; only the selected one is on screen.
const tabPage = (title, body) => `        <div class="ion-page">
          <ion-header><ion-toolbar><ion-title>${title}</ion-title></ion-toolbar></ion-header>
          <ion-content class="ion-padding">
${body}
          </ion-content>
        </div>`;
const appTabs = mk('app-tabs', `<ion-app>
  <ion-tabs>
    <ion-tab tab="home">
${island('home')}
    </ion-tab>
    <ion-tab tab="search">
${island('search')}
    </ion-tab>
    <ion-tab tab="settings">
${island('settings')}
    </ion-tab>
    <ion-tab-bar slot="bottom" selected-tab="home">
      <ion-tab-button tab="home"><ion-icon name="home"></ion-icon><ion-label>Home</ion-label></ion-tab-button>
      <ion-tab-button tab="search"><ion-icon name="search"></ion-icon><ion-label>Search</ion-label></ion-tab-button>
      <ion-tab-button tab="settings"><ion-icon name="settings"></ion-icon><ion-label>Settings</ion-label></ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>
</ion-app>`, {
  home: tabPage('Home', `            <ion-card><ion-card-header><ion-card-title>Today</ion-card-title></ion-card-header><ion-card-content>Three things to do.</ion-card-content></ion-card>
            <ion-list>
${feed}
            </ion-list>`),
  search: tabPage('Search', `            <ion-searchbar placeholder="Search"></ion-searchbar>
            <ion-list><ion-item><ion-label>Recent</ion-label></ion-item><ion-item><ion-label>Popular</ion-label></ion-item></ion-list>`),
  settings: tabPage('Settings', `            <ion-list>
              <ion-item><ion-toggle checked>Notifications</ion-toggle></ion-item>
              <ion-item><ion-select label="Theme" value="auto"><ion-select-option value="auto">Auto</ion-select-option><ion-select-option value="dark">Dark</ion-select-option></ion-select></ion-item>
              <ion-item><ion-input label="Name" value="Ada"></ion-input></ion-item>
              <ion-item><ion-checkbox>Beta features</ion-checkbox></ion-item>
            </ion-list>`),
});

export const PAGES = { 'list-50': list50, 'kitchen-sink': sink, stress, 'app-menu': appMenu, 'app-tabs': appTabs };

export const renderOptions = (mode) => ({ prettyHtml: false, serializeShadowRoot: mode, buildId: 'islands-spike' });
export const MODES = { dsd: 'declarative-shadow-dom', scoped: 'scoped' };

export const loadHydrate = () => import(hydrateHref);

// ---------------------------------------------------------------------------------------------------------------------
// Static server for the page under test plus the client bundle, the Ionic css and an optional per-route handler.

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

/** `routes` maps a path to `(req, res)`. Everything else is looked up in /client (the build) or /css (Ionic's css). */
export const serve = (routes, { clientDir = CLIENT_DIR } = {}) =>
  new Promise((resolve) => {
    const server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (routes[path]) return void routes[path](req, res);
      const [prefix, dir] = path.startsWith('/client/') ? ['/client/', clientDir] : path.startsWith('/css/') ? ['/css/', CSS_DIR] : [null];
      if (!prefix) return void res.writeHead(404).end();
      const file = join(dir, path.slice(prefix.length));
      if (!file.startsWith(dir) || !existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'public, max-age=3600' }).end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });

export const chromiumPath = async () => {
  const { existsSync: ex } = await import('node:fs');
  const c = [process.env.STENCILRS_CHROMIUM, join(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers', 'chromium')];
  try {
    c.push((await import('playwright')).chromium.executablePath());
  } catch {}
  return c.find((p) => p && ex(p));
};

export const launch = async () => {
  const { chromium } = await import('playwright');
  return chromium.launch({ executablePath: await chromiumPath(), args: ['--no-sandbox'] });
};

export const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const med = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  return { med, min: s[0], max: s[s.length - 1], n: s.length };
};
export const fmt = (st, d = 1) => `${st.med.toFixed(d)} (${st.min.toFixed(d)}-${st.max.toFixed(d)}, n=${st.n})`;
