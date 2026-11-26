import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const readProject = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function stripModuleSyntax(source) {
  return source
    .replace(/^export\s+/gm, '')
    .replace(/^import\s+\{[\s\S]*?\}\s+from\s+'\.\/music\.js';\r?\n/gm, '')
    .replace(/^import\s+\{[\s\S]*?\}\s+from\s+'\.\/answer-grid\.js';\r?\n/gm, '')
    .replace(/^import\s+\{[\s\S]*?\}\s+from\s+'\.\/session\.js';\r?\n/gm, '')
    .replace(/^import\s+\{[\s\S]*?\}\s+from\s+'\.\/practice-config\.js';\r?\n/gm, '');
}

export async function build() {
  const [html, css, music, answerGrid, session, practiceConfig, app] = await Promise.all([
    readProject('chords/index.html'),
    readProject('src/styles.css'),
    readProject('src/music.js'),
    readProject('src/answer-grid.js'),
    readProject('src/session.js'),
    readProject('src/practice-config.js'),
    readProject('src/app.js'),
  ]);
  const script = [music, answerGrid, session, practiceConfig, app].map(stripModuleSyntax).join('\n\n');
  const output = html
    .replace('<link rel="stylesheet" href="../src/styles.css">', `<style>${css}</style>`)
    .replace(/^    <link rel="stylesheet" href="\.\.\/src\/toolbox\.css">\r?\n/m, '')
    .replace(/^    <header class="tool-nav wrap">[\s\S]*?<\/header>\r?\n/m, '')
    .replace('<script type="module" src="../src/app.js"></script>', `<script type="module">${script}</script>`);
  const distUrl = new URL('../dist/', import.meta.url);
  await mkdir(distUrl, { recursive: true });
  const outputUrl = new URL('index.html', distUrl);
  await writeFile(outputUrl, output, 'utf8');
  return fileURLToPath(outputUrl);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = await build();
  console.log(`Built ${output.replace(projectRoot, '')}`);
}
