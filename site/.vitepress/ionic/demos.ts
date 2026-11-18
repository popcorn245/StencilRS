// The live Usage demos of the Ionic component pages. The headline components have hand-written ones;
// every other component gets `defaultDemo()`: the element with content that shows it. A demo is
// HTML (which is also what the page shows as the code to copy) and, for the overlays, a little script
// that runs with `root` (the demo's element) to set the properties HTML cannot (arrays of buttons).
export interface Demo {
  title: string;
  html: string;
  js?: string;
  /** Components the markup does not name but the script or Ionic creates (overlays made by a controller). */
  needs?: string[];
  /** Render the element? Router, nav and the like have nothing to look at: the page shows only the code. */
  live?: boolean;
  /** A box with a height and `position: relative`, for components that fill their parent. */
  frame?: number;
}

const avatar =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23c7cdd6'/><circle cx='32' cy='25' r='11' fill='%23fff'/><path d='M10 64c2-16 12-22 22-22s20 6 22 22z' fill='%23fff'/></svg>";

export const demos: Record<string, Demo[]> = {
  button: [
    {
      title: 'Fill',
      html: `<ion-button>Default</ion-button>
<ion-button fill="outline">Outline</ion-button>
<ion-button fill="clear">Clear</ion-button>
<ion-button shape="round">Round</ion-button>`,
    },
    {
      title: 'Color, size and expand',
      html: `<ion-button color="secondary">Secondary</ion-button>
<ion-button color="danger" size="small">Small</ion-button>
<ion-button color="success" size="large">Large</ion-button>
<ion-button color="dark" expand="block">Block</ion-button>`,
    },
    {
      title: 'Icons',
      html: `<ion-button><ion-icon slot="start" name="star"></ion-icon>Start</ion-button>
<ion-button><ion-icon slot="end" name="arrow-forward"></ion-icon>End</ion-button>
<ion-button><ion-icon slot="icon-only" name="heart"></ion-icon></ion-button>`,
    },
    { title: 'Disabled', html: `<ion-button disabled>Disabled</ion-button> <ion-button fill="outline" disabled>Disabled</ion-button>` },
  ],
  card: [
    {
      title: 'Basic card',
      html: `<ion-card>
  <ion-card-header>
    <ion-card-title>Card Title</ion-card-title>
    <ion-card-subtitle>Card Subtitle</ion-card-subtitle>
  </ion-card-header>
  <ion-card-content>Here's a small text description for the card content. Nothing more, nothing less.</ion-card-content>
</ion-card>`,
    },
    {
      title: 'Colors and buttons',
      html: `<ion-card color="primary">
  <ion-card-header><ion-card-title>Primary</ion-card-title></ion-card-header>
  <ion-card-content>A card in the primary color.</ion-card-content>
</ion-card>
<ion-card>
  <ion-card-header><ion-card-subtitle>Actions</ion-card-subtitle><ion-card-title>Buttons</ion-card-title></ion-card-header>
  <ion-card-content>Cards group related content.<br />
    <ion-button fill="clear">Action 1</ion-button><ion-button fill="clear">Action 2</ion-button>
  </ion-card-content>
</ion-card>`,
    },
  ],
  list: [
    {
      title: 'List with items',
      html: `<ion-list>
  <ion-item><ion-label>Pokémon Yellow</ion-label></ion-item>
  <ion-item><ion-label>Mega Man X</ion-label><ion-note slot="end">12</ion-note></ion-item>
  <ion-item><ion-label>The Legend of Zelda</ion-label></ion-item>
  <ion-item lines="none"><ion-label>Pac-Man</ion-label></ion-item>
</ion-list>`,
    },
    {
      title: 'Inset list with a header',
      html: `<ion-list inset="true">
  <ion-list-header><ion-label>Games</ion-label></ion-list-header>
  <ion-item><ion-label>Super Metroid</ion-label></ion-item>
  <ion-item><ion-label>Chrono Trigger</ion-label></ion-item>
</ion-list>`,
    },
  ],
  item: [
    {
      title: 'Items',
      html: `<ion-list>
  <ion-item><ion-label>Default item</ion-label></ion-item>
  <ion-item button detail><ion-label>Button item with detail</ion-label></ion-item>
  <ion-item><ion-icon name="mail" slot="start"></ion-icon><ion-label>Item with an icon</ion-label></ion-item>
  <ion-item color="light"><ion-label>Colored item</ion-label><ion-badge slot="end">3</ion-badge></ion-item>
  <ion-item lines="none"><ion-label>Without lines</ion-label></ion-item>
</ion-list>`,
    },
    {
      title: 'With a form control',
      html: `<ion-list>
  <ion-item><ion-input label="Name" placeholder="Enter text"></ion-input></ion-item>
  <ion-item><ion-toggle>Notifications</ion-toggle></ion-item>
  <ion-item><ion-checkbox checked>I agree</ion-checkbox></ion-item>
</ion-list>`,
    },
  ],
  input: [
    {
      title: 'Basic',
      html: `<ion-input label="Default label" placeholder="Enter text"></ion-input>
<ion-input label="Email" type="email" value="hello@example.com" helper-text="Enter your email"></ion-input>`,
    },
    {
      title: 'Fill and label placement',
      html: `<ion-input label="Outline" label-placement="floating" fill="outline" placeholder="Enter text"></ion-input>
<br />
<ion-input label="Solid" label-placement="floating" fill="solid" placeholder="Enter text"></ion-input>`,
    },
    {
      title: 'Clear button and counter',
      html: `<ion-input label="Clearable" clear-input="true" value="Clear me" counter="true" maxlength="20"></ion-input>`,
    },
  ],
  toggle: [
    {
      title: 'Basic',
      html: `<ion-list>
  <ion-item><ion-toggle>Default</ion-toggle></ion-item>
  <ion-item><ion-toggle checked>Checked</ion-toggle></ion-item>
  <ion-item><ion-toggle disabled>Disabled</ion-toggle></ion-item>
</ion-list>`,
    },
    {
      title: 'Colors and label placement',
      html: `<ion-toggle color="success" checked>Success</ion-toggle><br />
<ion-toggle color="danger" checked label-placement="start">Danger, label first</ion-toggle><br />
<ion-toggle justify="space-between" enable-on-off-labels="true" checked>On / off labels</ion-toggle>`,
    },
  ],
  segment: [
    {
      title: 'Basic',
      html: `<ion-segment value="default">
  <ion-segment-button value="default"><ion-label>Default</ion-label></ion-segment-button>
  <ion-segment-button value="segment"><ion-label>Segment</ion-label></ion-segment-button>
  <ion-segment-button value="buttons"><ion-label>Buttons</ion-label></ion-segment-button>
</ion-segment>`,
    },
    {
      title: 'Scrollable, with icons',
      html: `<ion-segment value="home" color="secondary">
  <ion-segment-button value="home"><ion-icon name="home"></ion-icon></ion-segment-button>
  <ion-segment-button value="heart"><ion-icon name="heart"></ion-icon></ion-segment-button>
  <ion-segment-button value="star"><ion-icon name="star"></ion-icon></ion-segment-button>
</ion-segment>`,
    },
  ],
  modal: [
    {
      title: 'Open from a trigger',
      html: `<ion-button id="open-modal-demo">Open modal</ion-button>
<ion-modal trigger="open-modal-demo">
  <ion-header>
    <ion-toolbar>
      <ion-title>Modal</ion-title>
      <ion-buttons slot="end"><ion-button onclick="this.closest('ion-modal').dismiss()">Close</ion-button></ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">The modal is a child of the page: <code>trigger</code> opens it, <code>dismiss()</code> closes it.</ion-content>
</ion-modal>`,
    },
    {
      title: 'Sheet modal',
      html: `<ion-button id="open-sheet-demo">Open sheet</ion-button>
<ion-modal trigger="open-sheet-demo" initial-breakpoint="0.5">
  <ion-content class="ion-padding">Drag the handle, or tap the backdrop.</ion-content>
</ion-modal>`,
      js: `root.querySelector('ion-modal').breakpoints = [0, 0.5, 0.9]; // an array: a property, there is no attribute`,
    },
  ],
  toast: [
    {
      title: 'Open from a trigger',
      html: `<ion-button id="open-toast-demo">Show toast</ion-button>
<ion-toast trigger="open-toast-demo" message="Hello from a toast" duration="2500"></ion-toast>`,
    },
    {
      title: 'Position and color',
      html: `<ion-button id="open-toast-top-demo" color="success">Top</ion-button>
<ion-toast trigger="open-toast-top-demo" message="Saved" position="top" color="success" duration="2500"></ion-toast>
<ion-button id="open-toast-icon-demo" color="danger">With icon</ion-button>
<ion-toast trigger="open-toast-icon-demo" message="Something went wrong" icon="information-circle" color="danger" position="middle" duration="2500"></ion-toast>`,
    },
  ],
  tabs: [
    {
      title: 'Tabs with a tab bar',
      frame: 240,
      html: `<ion-tabs>
  <ion-tab tab="home"><div class="ion-padding">Home content</div></ion-tab>
  <ion-tab tab="radio"><div class="ion-padding">Radio content</div></ion-tab>
  <ion-tab tab="library"><div class="ion-padding">Library content</div></ion-tab>
  <ion-tab-bar slot="bottom">
    <ion-tab-button tab="home"><ion-icon name="home"></ion-icon><ion-label>Home</ion-label></ion-tab-button>
    <ion-tab-button tab="radio"><ion-icon name="alarm"></ion-icon><ion-label>Radio</ion-label></ion-tab-button>
    <ion-tab-button tab="library"><ion-icon name="albums"></ion-icon><ion-label>Library</ion-label></ion-tab-button>
  </ion-tab-bar>
</ion-tabs>`,
    },
  ],
};

/** What each component needs around it to show anything. */
const D = (title: string, html: string, more: Partial<Demo> = {}): Demo[] => [{ title, html, ...more }];

const overlayButton = (id: string, label: string) => `<ion-button id="${id}">${label}</ion-button>`;

const defaults: Record<string, Demo[]> = {
  accordion: D('Accordion', `<ion-accordion-group value="first">
  <ion-accordion value="first"><ion-item slot="header"><ion-label>First</ion-label></ion-item><div class="ion-padding" slot="content">First content</div></ion-accordion>
  <ion-accordion value="second"><ion-item slot="header"><ion-label>Second</ion-label></ion-item><div class="ion-padding" slot="content">Second content</div></ion-accordion>
</ion-accordion-group>`),
  'action-sheet': D('Open from a trigger', `${overlayButton('open-action-sheet-demo', 'Open action sheet')}
<ion-action-sheet trigger="open-action-sheet-demo" header="Actions"></ion-action-sheet>`, {
    js: `const sheet = root.querySelector('ion-action-sheet');
sheet.buttons = [
  { text: 'Delete', role: 'destructive' },
  { text: 'Share' },
  { text: 'Cancel', role: 'cancel' },
];`,
  }),
  alert: D('Open from a trigger', `${overlayButton('open-alert-demo', 'Open alert')}
<ion-alert trigger="open-alert-demo" header="Alert" sub-header="Important message" message="This is an alert!"></ion-alert>`, {
    js: `root.querySelector('ion-alert').buttons = ['OK'];`,
  }),
  app: D('ion-app', `<ion-app>
  <ion-header><ion-toolbar><ion-title>App</ion-title></ion-toolbar></ion-header>
  <ion-content class="ion-padding">ion-app wraps the whole page of an Ionic app.</ion-content>
</ion-app>`, { live: false }),
  avatar: D('Avatar', `<ion-avatar><img alt="Silhouette of a person" src="${avatar}" /></ion-avatar>
<ion-chip><ion-avatar><img alt="Silhouette of a person" src="${avatar}" /></ion-avatar><ion-label>Chip with avatar</ion-label></ion-chip>`),
  backdrop: D('Backdrop', `<div style="position: relative; height: 120px; background: #ddd">
  <ion-backdrop visible="true" tappable="false"></ion-backdrop>
</div>`),
  badge: D('Badge', `<ion-badge>Default</ion-badge>
<ion-badge color="success">99+</ion-badge>
<ion-badge color="danger">New</ion-badge>
<ion-badge color="dark">Dark</ion-badge>`),
  breadcrumb: D('Breadcrumb', `<ion-breadcrumbs><ion-breadcrumb href="#">Home</ion-breadcrumb><ion-breadcrumb href="#">Electronics</ion-breadcrumb><ion-breadcrumb>Cameras</ion-breadcrumb></ion-breadcrumbs>`),
  breadcrumbs: D('Breadcrumbs', `<ion-breadcrumbs max-items="4">
  <ion-breadcrumb href="#">Home</ion-breadcrumb><ion-breadcrumb href="#">Electronics</ion-breadcrumb><ion-breadcrumb href="#">Photography</ion-breadcrumb>
  <ion-breadcrumb href="#">Cameras</ion-breadcrumb><ion-breadcrumb>Film</ion-breadcrumb>
</ion-breadcrumbs>`),
  'back-button': D('Back button', `<ion-toolbar><ion-buttons slot="start"><ion-back-button default-href="#" text="Back"></ion-back-button></ion-buttons><ion-title>Page</ion-title></ion-toolbar>`),
  buttons: D('Buttons in a toolbar', `<ion-toolbar><ion-buttons slot="start"><ion-button>Cancel</ion-button></ion-buttons><ion-title>Edit</ion-title><ion-buttons slot="end"><ion-button strong="true">Done</ion-button></ion-buttons></ion-toolbar>`),
  'card-header': D('Card header', `<ion-card><ion-card-header><ion-card-subtitle>Subtitle</ion-card-subtitle><ion-card-title>Title</ion-card-title></ion-card-header><ion-card-content>Content</ion-card-content></ion-card>`),
  'card-title': D('Card title', `<ion-card><ion-card-header><ion-card-title>Card title</ion-card-title></ion-card-header></ion-card>`),
  'card-subtitle': D('Card subtitle', `<ion-card><ion-card-header><ion-card-subtitle>Card subtitle</ion-card-subtitle></ion-card-header></ion-card>`),
  'card-content': D('Card content', `<ion-card><ion-card-content>The content of the card, in the card's padding.</ion-card-content></ion-card>`),
  checkbox: D('Checkbox', `<ion-list>
  <ion-item><ion-checkbox>Default</ion-checkbox></ion-item>
  <ion-item><ion-checkbox checked>Checked</ion-checkbox></ion-item>
  <ion-item><ion-checkbox indeterminate="true">Indeterminate</ion-checkbox></ion-item>
  <ion-item><ion-checkbox color="success" checked>Success</ion-checkbox></ion-item>
</ion-list>`),
  chip: D('Chip', `<ion-chip>Default</ion-chip>
<ion-chip color="primary"><ion-icon name="star"></ion-icon><ion-label>With icon</ion-label></ion-chip>
<ion-chip outline="true" color="success"><ion-label>Outline</ion-label></ion-chip>`),
  content: D('Content', `<ion-content class="ion-padding" style="height: 160px; position: relative">
  <p>ion-content is the scrollable area of a page.</p><p>Its scroll container is in the shadow DOM, and it fires scroll events.</p><p>More text.</p><p>More text.</p><p>More text.</p>
</ion-content>`),
  datetime: D('Date and time', `<ion-datetime presentation="date" value="2026-11-18T10:00:00"></ion-datetime>`),
  'datetime-button': D('Datetime button', `<ion-datetime-button datetime="datetime-demo"></ion-datetime-button>
<ion-modal keep-contents-mounted="true"><ion-datetime id="datetime-demo" value="2026-11-18T10:00:00"></ion-datetime></ion-modal>`),
  fab: D('Floating action button', `<ion-fab vertical="bottom" horizontal="end" style="position: absolute"><ion-fab-button><ion-icon name="add"></ion-icon></ion-fab-button></ion-fab>`, { frame: 140 }),
  'fab-button': D('Fab button', `<ion-fab-button><ion-icon name="add"></ion-icon></ion-fab-button>
<ion-fab-button color="danger" size="small"><ion-icon name="heart"></ion-icon></ion-fab-button>`),
  'fab-list': D('Fab list', `<ion-fab vertical="bottom" horizontal="end" style="position: absolute">
  <ion-fab-button><ion-icon name="share"></ion-icon></ion-fab-button>
  <ion-fab-list side="top"><ion-fab-button><ion-icon name="mail"></ion-icon></ion-fab-button><ion-fab-button><ion-icon name="call"></ion-icon></ion-fab-button></ion-fab-list>
</ion-fab>`, { frame: 200 }),
  grid: D('Grid', `<ion-grid>
  <ion-row><ion-col>1 of 3</ion-col><ion-col>2 of 3</ion-col><ion-col>3 of 3</ion-col></ion-row>
  <ion-row><ion-col size="4">4 of 12</ion-col><ion-col size="8">8 of 12</ion-col></ion-row>
</ion-grid>`),
  row: D('Row', `<ion-grid><ion-row class="ion-justify-content-center"><ion-col size="3">Centered</ion-col><ion-col size="3">Row</ion-col></ion-row></ion-grid>`),
  col: D('Column', `<ion-grid><ion-row><ion-col size="6">size 6</ion-col><ion-col size="3" offset="3">size 3, offset 3</ion-col></ion-row></ion-grid>`),
  img: D('Image', `<ion-img style="width: 160px; height: 100px" alt="A grey square" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='100'><rect width='160' height='100' fill='%23c7cdd6'/></svg>"></ion-img>`),
  'infinite-scroll': D('Infinite scroll', `<ion-content style="height: 160px; position: relative">
  <ion-list><ion-item><ion-label>Item 1</ion-label></ion-item><ion-item><ion-label>Item 2</ion-label></ion-item><ion-item><ion-label>Item 3</ion-label></ion-item><ion-item><ion-label>Item 4</ion-label></ion-item></ion-list>
  <ion-infinite-scroll><ion-infinite-scroll-content loading-spinner="bubbles" loading-text="Loading more data..."></ion-infinite-scroll-content></ion-infinite-scroll>
</ion-content>`),
  'infinite-scroll-content': D('Content of the infinite scroll', `<ion-infinite-scroll-content loading-spinner="dots" loading-text="Loading more data..."></ion-infinite-scroll-content>`),
  'input-otp': D('One-time code', `<ion-input-otp length="4" value="12"></ion-input-otp>`),
  'input-password-toggle': D('Password toggle', `<ion-input type="password" label="Password" value="secret"><ion-input-password-toggle slot="end"></ion-input-password-toggle></ion-input>`),
  textarea: D('Textarea', `<ion-textarea label="Comment" label-placement="floating" fill="outline" placeholder="Type here" auto-grow="true"></ion-textarea>`),
  'item-divider': D('Item divider', `<ion-list><ion-item-divider><ion-label>Section</ion-label></ion-item-divider><ion-item><ion-label>Item</ion-label></ion-item></ion-list>`),
  'item-group': D('Item group', `<ion-item-group><ion-item-divider><ion-label>A</ion-label></ion-item-divider><ion-item><ion-label>Apple</ion-label></ion-item><ion-item><ion-label>Avocado</ion-label></ion-item></ion-item-group>`),
  'item-sliding': D('Sliding item (drag it left)', `<ion-list><ion-item-sliding><ion-item><ion-label>Drag me</ion-label></ion-item><ion-item-options side="end"><ion-item-option color="danger">Delete</ion-item-option></ion-item-options></ion-item-sliding></ion-list>`),
  'item-options': D('Item options', `<ion-list><ion-item-sliding><ion-item><ion-label>Drag me</ion-label></ion-item><ion-item-options side="start"><ion-item-option>Archive</ion-item-option></ion-item-options><ion-item-options side="end"><ion-item-option color="danger">Delete</ion-item-option></ion-item-options></ion-item-sliding></ion-list>`),
  'item-option': D('Item option', `<ion-list><ion-item-sliding><ion-item><ion-label>Drag me</ion-label></ion-item><ion-item-options side="end"><ion-item-option color="warning">Flag</ion-item-option><ion-item-option color="danger" expandable="true">Delete</ion-item-option></ion-item-options></ion-item-sliding></ion-list>`),
  label: D('Label', `<ion-list><ion-item><ion-label>Default</ion-label></ion-item><ion-item><ion-label color="primary">Primary</ion-label></ion-item><ion-item><ion-label><h2>Heading</h2><p>Paragraph</p></ion-label></ion-item></ion-list>`),
  note: D('Note', `<ion-list><ion-item><ion-label>Item</ion-label><ion-note slot="end">On</ion-note></ion-item><ion-item><ion-label>Colored</ion-label><ion-note color="success" slot="end">OK</ion-note></ion-item></ion-list>`),
  'list-header': D('List header', `<ion-list><ion-list-header><ion-label>Recent</ion-label></ion-list-header><ion-item><ion-label>Item</ion-label></ion-item></ion-list>`),
  loading: D('Open from a trigger', `${overlayButton('open-loading-demo', 'Show loading')}
<ion-loading trigger="open-loading-demo" message="Dismissing after 2 seconds..." duration="2000"></ion-loading>`),
  menu: D('Menu', `<div class="ion-demo-menu" style="position: relative; height: 220px; overflow: hidden; transform: translateZ(0)">
  <ion-menu content-id="menu-demo-main" type="overlay" style="position: absolute">
    <ion-header><ion-toolbar><ion-title>Menu</ion-title></ion-toolbar></ion-header>
    <ion-content><ion-list><ion-item><ion-label>Inbox</ion-label></ion-item><ion-item><ion-label>Outbox</ion-label></ion-item></ion-list></ion-content>
  </ion-menu>
  <div id="menu-demo-main" class="ion-padding"><ion-menu-toggle><ion-button>Toggle menu</ion-button></ion-menu-toggle></div>
</div>`, { frame: 240 }),
  'menu-button': D('Menu button', `<ion-toolbar><ion-buttons slot="start"><ion-menu-button auto-hide="false"></ion-menu-button></ion-buttons><ion-title>Page</ion-title></ion-toolbar>`),
  'menu-toggle': D('Menu toggle', `<ion-menu-toggle auto-hide="false"><ion-button>Toggle menu</ion-button></ion-menu-toggle>`),
  nav: D('ion-nav', `<ion-nav root="page-one"></ion-nav>`, { live: false }),
  'nav-link': D('ion-nav-link', `<ion-nav-link router-direction="forward" component="page-two"><ion-button>Go to page two</ion-button></ion-nav-link>`, { live: false }),
  picker: D('Picker', `<ion-picker>
  <ion-picker-column value="coffee">
    <ion-picker-column-option value="tea">Tea</ion-picker-column-option>
    <ion-picker-column-option value="coffee">Coffee</ion-picker-column-option>
    <ion-picker-column-option value="juice">Juice</ion-picker-column-option>
  </ion-picker-column>
</ion-picker>`),
  'picker-column': D('Picker column', `<ion-picker><ion-picker-column value="2"><ion-picker-column-option value="1">One</ion-picker-column-option><ion-picker-column-option value="2">Two</ion-picker-column-option><ion-picker-column-option value="3">Three</ion-picker-column-option></ion-picker-column></ion-picker>`),
  'picker-column-option': D('Picker column option', `<ion-picker><ion-picker-column value="b"><ion-picker-column-option value="a">A</ion-picker-column-option><ion-picker-column-option value="b">B</ion-picker-column-option><ion-picker-column-option value="c" disabled="true">C (disabled)</ion-picker-column-option></ion-picker-column></ion-picker>`),
  popover: D('Open from a trigger', `${overlayButton('open-popover-demo', 'Open popover')}
<ion-popover trigger="open-popover-demo"><ion-content class="ion-padding">Popover content</ion-content></ion-popover>`),
  'progress-bar': D('Progress bar', `<ion-progress-bar value="0.5"></ion-progress-bar><br />
<ion-progress-bar type="indeterminate" color="success"></ion-progress-bar><br />
<ion-progress-bar value="0.25" buffer="0.6" color="secondary"></ion-progress-bar>`),
  radio: D('Radio group', `<ion-radio-group value="a"><ion-item><ion-radio value="a">Apple</ion-radio></ion-item><ion-item><ion-radio value="b">Banana</ion-radio></ion-item><ion-item><ion-radio value="c" disabled="true">Cherry</ion-radio></ion-item></ion-radio-group>`),
  'radio-group': D('Radio group', `<ion-list><ion-radio-group value="small"><ion-list-header><ion-label>Size</ion-label></ion-list-header><ion-item><ion-radio value="small">Small</ion-radio></ion-item><ion-item><ion-radio value="large">Large</ion-radio></ion-item></ion-radio-group></ion-list>`),
  range: D('Range', `<ion-range value="40" label="Volume"></ion-range>
<ion-range dual-knobs="true" min="0" max="100" pin="true" ticks="true" snaps="true" step="10" label="Dual"></ion-range>
<ion-range color="danger" value="70" label-placement="end" label="End"></ion-range>`),
  refresher: D('ion-refresher (pull down inside a content area)', `<ion-content style="height: 160px; position: relative">
  <ion-refresher slot="fixed"><ion-refresher-content></ion-refresher-content></ion-refresher>
  <ion-list><ion-item><ion-label>Pull this list down</ion-label></ion-item></ion-list>
</ion-content>`),
  'refresher-content': D('Refresher content', `<ion-refresher-content pulling-text="Pull to refresh" refreshing-spinner="circles" refreshing-text="Refreshing..."></ion-refresher-content>`, { live: false }),
  reorder: D('Reorder', `<ion-list><ion-reorder-group disabled="false"><ion-item><ion-label>Item 1</ion-label><ion-reorder slot="end"></ion-reorder></ion-item><ion-item><ion-label>Item 2</ion-label><ion-reorder slot="end"></ion-reorder></ion-item></ion-reorder-group></ion-list>`),
  'reorder-group': D('Reorder group', `<ion-list><ion-reorder-group disabled="false"><ion-item><ion-label>Item 1</ion-label><ion-reorder slot="end"></ion-reorder></ion-item><ion-item><ion-label>Item 2</ion-label><ion-reorder slot="end"></ion-reorder></ion-item><ion-item><ion-label>Item 3</ion-label><ion-reorder slot="end"></ion-reorder></ion-item></ion-reorder-group></ion-list>`),
  'ripple-effect': D('Ripple effect (click the box)', `<div class="ion-activatable" style="position: relative; overflow: hidden; padding: 32px; border: 1px solid #ccc; border-radius: 8px; text-align: center">Click me<ion-ripple-effect></ion-ripple-effect></div>`),
  router: D('ion-router', `<ion-router>
  <ion-route url="/" component="page-home"></ion-route>
  <ion-route url="/settings" component="page-settings"></ion-route>
</ion-router>`, { live: false }),
  route: D('ion-route', `<ion-router><ion-route url="/profile/:id" component="page-profile"></ion-route></ion-router>`, { live: false }),
  'route-redirect': D('ion-route-redirect', `<ion-router><ion-route-redirect from="/old" to="/new"></ion-route-redirect><ion-route url="/new" component="page-new"></ion-route></ion-router>`, { live: false }),
  'router-link': D('Router link', `<ion-router-link href="#">A link</ion-router-link> <ion-router-link href="#" color="danger">Danger link</ion-router-link>`),
  'router-outlet': D('ion-router-outlet', `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`, { live: false }),
  searchbar: D('Searchbar', `<ion-searchbar placeholder="Search" value="Ionic"></ion-searchbar>
<ion-searchbar animated="true" show-cancel-button="focus" placeholder="With cancel button"></ion-searchbar>`),
  'segment-button': D('Segment button', `<ion-segment value="one"><ion-segment-button value="one"><ion-label>One</ion-label></ion-segment-button><ion-segment-button value="two"><ion-label>Two</ion-label></ion-segment-button></ion-segment>`),
  'segment-content': D('Segment content', `<ion-segment value="one"><ion-segment-button value="one" content-id="seg-one"><ion-label>One</ion-label></ion-segment-button><ion-segment-button value="two" content-id="seg-two"><ion-label>Two</ion-label></ion-segment-button></ion-segment>
<ion-segment-view style="height: 60px"><ion-segment-content id="seg-one">First content</ion-segment-content><ion-segment-content id="seg-two">Second content</ion-segment-content></ion-segment-view>`),
  'segment-view': D('Segment view', `<ion-segment value="one"><ion-segment-button value="one" content-id="segv-one"><ion-label>One</ion-label></ion-segment-button><ion-segment-button value="two" content-id="segv-two"><ion-label>Two</ion-label></ion-segment-button></ion-segment>
<ion-segment-view style="height: 60px"><ion-segment-content id="segv-one">Swipe, or tap a button</ion-segment-content><ion-segment-content id="segv-two">Second view</ion-segment-content></ion-segment-view>`),
  select: D('Select', `<ion-select label="Fruit" placeholder="Select one" interface="popover">
  <ion-select-option value="apple">Apple</ion-select-option>
  <ion-select-option value="banana">Banana</ion-select-option>
  <ion-select-option value="cherry">Cherry</ion-select-option>
</ion-select>
<ion-select label="Outline" label-placement="floating" fill="outline" value="banana"><ion-select-option value="apple">Apple</ion-select-option><ion-select-option value="banana">Banana</ion-select-option></ion-select>`, { needs: ['ion-popover', 'ion-select-popover', 'ion-modal', 'ion-select-modal', 'ion-action-sheet', 'ion-alert'] }),
  'select-option': D('Select option', `<ion-select label="Pet" value="dog"><ion-select-option value="cat">Cat</ion-select-option><ion-select-option value="dog">Dog</ion-select-option><ion-select-option value="fish" disabled="true">Fish</ion-select-option></ion-select>`, { needs: ['ion-popover', 'ion-select-popover'] }),
  'select-modal': D('ion-select-modal', `<ion-select label="Fruit" interface="modal" placeholder="Opens ion-select-modal"><ion-select-option value="apple">Apple</ion-select-option><ion-select-option value="banana">Banana</ion-select-option></ion-select>`, { needs: ['ion-modal', 'ion-select-modal'] }),
  'skeleton-text': D('Skeleton text', `<ion-list><ion-item><ion-label><h3><ion-skeleton-text animated="true" style="width: 80%"></ion-skeleton-text></h3><p><ion-skeleton-text animated="true" style="width: 60%"></ion-skeleton-text></p></ion-label></ion-item></ion-list>`),
  spinner: D('Spinner', `<ion-spinner></ion-spinner> <ion-spinner name="dots" color="secondary"></ion-spinner> <ion-spinner name="lines" color="danger"></ion-spinner> <ion-spinner name="bubbles" color="success"></ion-spinner> <ion-spinner name="crescent"></ion-spinner>`),
  'split-pane': D('Split pane', `<ion-split-pane content-id="split-demo-main" when="xs" style="position: relative; height: 140px">
  <ion-menu content-id="split-demo-main"><ion-content class="ion-padding">Side menu</ion-content></ion-menu>
  <div class="ion-page" id="split-demo-main"><ion-content class="ion-padding">Main content</ion-content></div>
</ion-split-pane>`, { live: false }),
  tab: D('Tab', `<ion-tabs><ion-tab tab="one"><div class="ion-padding">One</div></ion-tab><ion-tab tab="two"><div class="ion-padding">Two</div></ion-tab><ion-tab-bar slot="bottom"><ion-tab-button tab="one"><ion-label>One</ion-label></ion-tab-button><ion-tab-button tab="two"><ion-label>Two</ion-label></ion-tab-button></ion-tab-bar></ion-tabs>`, { frame: 200 }),
  'tab-bar': D('Tab bar', `<ion-tab-bar><ion-tab-button tab="home"><ion-icon name="home"></ion-icon><ion-label>Home</ion-label></ion-tab-button><ion-tab-button tab="search"><ion-icon name="search"></ion-icon><ion-label>Search</ion-label><ion-badge>2</ion-badge></ion-tab-button><ion-tab-button tab="settings"><ion-icon name="settings"></ion-icon><ion-label>Settings</ion-label></ion-tab-button></ion-tab-bar>`),
  'tab-button': D('Tab button', `<ion-tab-bar><ion-tab-button tab="a" selected="true"><ion-icon name="star"></ion-icon><ion-label>Selected</ion-label></ion-tab-button><ion-tab-button tab="b"><ion-icon name="heart"></ion-icon><ion-label>Heart</ion-label></ion-tab-button><ion-tab-button tab="c" disabled="true"><ion-icon name="person"></ion-icon><ion-label>Disabled</ion-label></ion-tab-button></ion-tab-bar>`),
  text: D('Text', `<ion-text color="primary"><h2>Primary heading</h2></ion-text>
<ion-text color="danger"><p>A danger paragraph.</p></ion-text>`),
  thumbnail: D('Thumbnail', `<ion-item><ion-thumbnail slot="start"><img alt="Silhouette" src="${avatar}" /></ion-thumbnail><ion-label>Item with a thumbnail</ion-label></ion-item>`),
  toolbar: D('Toolbar', `<ion-toolbar><ion-buttons slot="start"><ion-button><ion-icon slot="icon-only" name="menu"></ion-icon></ion-button></ion-buttons><ion-title>Toolbar</ion-title><ion-buttons slot="end"><ion-button><ion-icon slot="icon-only" name="search"></ion-icon></ion-button></ion-buttons></ion-toolbar>
<ion-toolbar color="primary"><ion-title>Primary toolbar</ion-title></ion-toolbar>`),
  header: D('Header', `<ion-header><ion-toolbar><ion-title>Header</ion-title></ion-toolbar></ion-header>`),
  footer: D('Footer', `<ion-footer><ion-toolbar><ion-title>Footer</ion-title></ion-toolbar></ion-footer>`),
  title: D('Title', `<ion-toolbar><ion-title>Page title</ion-title></ion-toolbar>
<ion-toolbar><ion-title size="large">Large title</ion-title></ion-toolbar>`),
  'accordion-group': D('Accordion group', `<ion-accordion-group multiple="true" value="['first']">
  <ion-accordion value="first"><ion-item slot="header"><ion-label>First</ion-label></ion-item><div class="ion-padding" slot="content">First content</div></ion-accordion>
  <ion-accordion value="second"><ion-item slot="header"><ion-label>Second</ion-label></ion-item><div class="ion-padding" slot="content">Second content</div></ion-accordion>
</ion-accordion-group>`),
};

export function demosFor(name: string): Demo[] {
  return demos[name] ?? defaults[name] ?? D('Default', `<ion-${name}>${name}</ion-${name}>`);
}

export const handWritten = Object.keys(demos);
