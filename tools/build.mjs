import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'favicon.svg', 'tokens.css', 'public', 'admin']) {
  await cp(join(root, name), join(output, name), {
    recursive: true,
    filter: path => !['docs', 'tools', 'screenshots'].includes(basename(path)) &&
      !/\.(md|sha256)$/.test(path) && !path.endsWith('qa-results.json'),
  });
}
console.log('Static template built in dist/');
