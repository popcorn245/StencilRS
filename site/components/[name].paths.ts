// One page per Ionic component: the data is data/ionic-api.json (scripts/components.mjs), the markup is
// .vitepress/ionic/render.ts. Nothing is generated into the source tree.
import { names, pageFor } from '../.vitepress/ionic/render';

export default {
  paths() {
    return names.map((name) => ({ params: { name }, content: pageFor(name) }));
  },
};
