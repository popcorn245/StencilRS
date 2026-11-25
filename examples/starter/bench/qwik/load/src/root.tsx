import { component$ } from '@builder.io/qwik';
import { App } from './app';
import { CSS } from './items';

export default component$(() => (
  <>
    <head>
      <meta charset="utf-8" />
      <title>page-load bench: qwik</title>
      <style dangerouslySetInnerHTML={CSS} />
    </head>
    <body>
      <App />
    </body>
  </>
));
