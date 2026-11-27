import {readdirSync,readFileSync,statSync} from 'node:fs';import {gzipSync} from 'node:zlib';import {join} from 'node:path';
const dir=process.argv[2];let tr=0,tg=0;
const walk=d=>readdirSync(d).flatMap(f=>{const p=join(d,f);return statSync(p).isDirectory()?walk(p):[p]});
for(const p of walk(dir).filter(p=>/\.m?js$/.test(p))){const b=readFileSync(p);const g=gzipSync(b,{level:9}).length;tr+=b.length;tg+=g;console.log(p.replace(dir,''),b.length,g)}
console.log('TOTAL raw',tr,'gz',tg);
