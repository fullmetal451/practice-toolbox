import { cp, mkdir, readdir, rm } from 'node:fs/promises';

const output = new URL('../dist/site/', import.meta.url);
await mkdir(output, { recursive: true });
// Empty the folder (not remove it, which fails on Windows while a preview server uses it)
// so files removed from the source are not published again.
for (const entry of await readdir(output)) await rm(new URL(encodeURIComponent(entry), output), { recursive: true, force: true });
for (const path of ['index.html', 'chords', 'fretboard', 'loop', 'voicings', 'changes', 'scales', 'metronome', 'src']) {
  await cp(new URL(`../${path}`, import.meta.url), new URL(path, output), { recursive: true });
}
console.log('Built dist/site/');
