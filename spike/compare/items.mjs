/** The page every framework renders: 500 product cards (same data as examples/starter/bench/load/src/items.ts). */
const A = ['Pretty', 'Large', 'Big', 'Small', 'Tall', 'Short', 'Long', 'Handsome', 'Plain', 'Quaint'];
const N = ['table', 'chair', 'house', 'lamp', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger'];
export const ITEMS = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, name: `${A[i % 10]} ${N[(i * 7) % 10]} #${i + 1}`, price: ((i * 37) % 1000) / 10 + 1 }));
export const CSS = '.card{display:inline-block;width:180px;border:1px solid #ddd;padding:8px;margin:4px;font:14px sans-serif}.card h3{margin:0 0 4px;font-size:14px}.price{color:#080;margin:0 0 4px}';
