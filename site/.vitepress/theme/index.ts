import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';

import DataTable from './components/DataTable.vue';
import Demo from './components/Demo.vue';
import IonDemos from './components/IonDemos.vue';
import Landing from './components/Landing.vue';
import PipelineFlow from './components/PipelineFlow.vue';
import When from './components/When.vue';
import './style.css';

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('DataTable', DataTable);
    app.component('Demo', Demo);
    app.component('IonDemos', IonDemos);
    app.component('Landing', Landing);
    app.component('PipelineFlow', PipelineFlow);
    app.component('When', When);

    // VitePress prerenders every page in Node, where there is no customElements registry.
    // The components are compiled by stencilrs (see vite.plugins in config.mts) and defined only in
    // the browser, from this one module.
    if (!import.meta.env.SSR) {
      import('./elements').then(() => document.documentElement.classList.add('elements-ready'));
    }
  },
};

export default theme;
