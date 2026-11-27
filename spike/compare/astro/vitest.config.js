import { getViteConfig } from 'astro/config';
export default getViteConfig({ test: { include: ['bench.test.js'] } });
