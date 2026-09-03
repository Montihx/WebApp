import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');
let failed = false;

// Preserve each package's published inventory; never hash the manifest itself.
for (const directory of ['public', 'admin']) {
  const manifest = resolve(root, directory, 'MANIFEST.sha256');
  const entries = readFileSync(manifest, 'utf8').trim().split(/\r?\n/).map(line => {
    const match = /^([a-f0-9]{64})  (\.\/[^\r\n]+)$/.exec(line);
    if (!match || match[2].split('/').includes('..') || match[2] === './MANIFEST.sha256') {
      throw new Error(`Invalid manifest entry in ${directory}: ${line}`);
    }
    const [, expected, path] = match;
    const actual = createHash('sha256').update(readFileSync(resolve(root, directory, path))).digest('hex');
    if (actual !== expected && !write) {
      console.error(`${directory}/${path.slice(2)}: checksum mismatch`);
      failed = true;
    }
    return `${actual}  ${path}`;
  });
  if (write) writeFileSync(manifest, `${entries.join('\n')}\n`);
  console.log(`${directory}: ${entries.length} entries ${write ? 'updated' : 'checked'}`);
}

if (failed) {
  console.error('Regenerate QA reports first, then run npm run manifest:update and commit both.');
  process.exitCode = 1;
}
