import { cp, mkdir } from 'node:fs/promises';

const output = new URL('../dist/site/', import.meta.url);
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'chords', 'loop', 'src']) {
  await cp(new URL(`../${path}`, import.meta.url), new URL(path, output), { recursive: true });
}
console.log('Built dist/site/');
