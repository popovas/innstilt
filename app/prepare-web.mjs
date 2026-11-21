/* Copies ../web into ./www for the Android app, leaving out the train data (the app fetches it from
   innstilt.app, so the app stays small and gets new data every night without an update). */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = new URL('../web/', import.meta.url).pathname;
const OUT = new URL('./www/', import.meta.url).pathname;
if (existsSync(OUT)) rmSync(OUT, { recursive: true });
cpSync(SRC, OUT, {
  recursive: true,
  filter: p => !relative(SRC, p).split(sep).includes('data') && !p.endsWith('.DS_Store'),
});
console.log('web -> www (without data/)');
