import { fileURLToPath } from 'node:url';

import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vitepress';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const github = 'https://github.com/popcorn245/StencilRS';

// Vue is only the shell: every `ion-` / `pop-` tag is a custom element, built by stencilrs.
const isCustomElement = (tag: string) => /^(ion|pop)-/.test(tag);

export default defineConfig({
  title: 'stencilrs',
  description: 'Stencil v5 components, compiled by Rust. A docs site that is itself compiled by stencilrs.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: false,
  outDir: 'dist',
  // Dead links fail the build. The one exemption is the ui-kit Storybook, which `npm run build:all`
  // copies to /storybook/ after the site is built.
  ignoreDeadLinks: [/^\/storybook(\/|$)/],

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#c2410c' }],
  ],

  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
    config(md) {
      // Pages that include the repository's own docs/*.md and READMEs keep their links to each
      // other (`../docs/quirks.md`); point them at the pages this site gives those files.
      const pages: Record<string, string> = { quirks: '/guide/quirks', pipeline: '/reference/pipeline', transformers: '/reference/transformers' };
      md.core.ruler.push('repo-doc-links', (state) => {
        for (const block of state.tokens) {
          for (const tok of block.children ?? []) {
            if (tok.type !== 'link_open') continue;
            const m = /^(?:\.\.?\/)+(?:docs\/)?(quirks|pipeline|transformers)\.md(#.*)?$/.exec(tok.attrGet('href') ?? '');
            if (m) tok.attrSet('href', pages[m[1]] + (m[2] ?? ''));
          }
        }
      });
    },
  },
  vue: { template: { compilerOptions: { isCustomElement } } },

  vite: {
    // The stencilrs plugin is in VitePress's own Vite config: every component in the pages is
    // compiled by it, in dev and in the build.
    plugins: [stencilrs({ verbose: true })],
    resolve: { dedupe: ['@stencil/core', 'vue'] },
    server: { fs: { allow: [repo] } },
    build: { chunkSizeWarningLimit: 1200 },
  },

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'stencilrs',
    nav: [
      { text: 'Guide', link: '/guide/introduction', activeMatch: '^/guide/' },
      { text: 'The story', link: '/story/', activeMatch: '^/story/' },
      { text: 'Components', link: '/components/', activeMatch: '^/components/' },
      { text: 'Benchmarks', link: '/benchmarks' },
      { text: 'Reference', link: '/reference/pipeline', activeMatch: '^/reference/' },
      { text: 'Storybook', link: '/storybook/', target: '_blank' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Start',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Writing components', link: '/guide/writing-components' },
            { text: 'Vite plugin', link: '/guide/vite-plugin' },
            { text: 'API', link: '/guide/api' },
            { text: 'Testing', link: '/guide/testing' },
            { text: 'Migrating to Stencil v5', link: '/guide/migrating' },
          ],
        },
        {
          text: 'Under the hood',
          items: [
            { text: 'How it works', link: '/guide/how-it-works' },
            { text: 'How it was built', link: '/guide/how-it-was-built' },
            { text: 'Parity and verification', link: '/guide/parity' },
            { text: 'Stencil quirks', link: '/guide/quirks' },
            { text: 'Roadmap', link: '/guide/roadmap' },
          ],
        },
      ],
      '/components/': [
        {
          text: 'Components',
          items: [
            { text: 'Overview', link: '/components/' },
            { text: 'pop-counter', link: '/components/pop-counter' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Stencil v5 compile pipeline', link: '/reference/pipeline' },
            { text: 'Transformer catalogue', link: '/reference/transformers' },
            { text: 'Vite plugin and unplugin', link: '/reference/vite-plugin' },
            { text: 'Project READMEs', link: '/reference/projects' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: github }],
    search: { provider: 'local' },
    outline: { level: [2, 3], label: 'On this page' },
    editLink: { pattern: `${github}/edit/next/site/:path`, text: 'Edit this page on GitHub' },
    footer: {
      message: 'MIT licensed. Built with VitePress, and compiled by stencilrs. Ionic is the test subject, not our brand.',
      copyright: 'stencilrs',
    },
  },
});
