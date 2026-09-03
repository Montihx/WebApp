import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyManifests } from './manifests.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist');
// Direct invocation must enforce the same gate as npm run build. Verify before
// touching dist, then copy exactly that inventory instead of walking it again.
const { files } = verifyManifests(root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of files) {
  const target = join(output, path);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, path), target);
}
console.log(`Static template built in dist/: ${files.length} verified files`);
