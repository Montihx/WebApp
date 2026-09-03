import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPublishFiles, packageDirectories } from './publish-files.mjs';

function readEntries(manifest, write) {
  let content;
  try {
    if (!lstatSync(manifest).isFile()) throw new Error(`${manifest}: manifest must be a regular file`);
    content = readFileSync(manifest, 'utf8');
  } catch (error) {
    if (write && error.code === 'ENOENT') return new Map();
    throw error;
  }
  const entries = new Map();
  for (const line of content.split(/\r?\n/).filter(Boolean)) {
    const match = /^([a-f0-9]{64})  (\.\/[^\r\n]+)$/.exec(line);
    const path = match?.[2].slice(2);
    if (!path || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..') ||
        path === 'MANIFEST.sha256') {
      throw new Error(`Invalid manifest entry in ${manifest}: ${line}`);
    }
    if (entries.has(path)) throw new Error(`Duplicate manifest entry in ${manifest}: ${path}`);
    entries.set(path, match[1]);
  }
  return entries;
}

function checksum(base, path) {
  let current = base;
  // Listed documentation is also checked; never follow links outside the package.
  for (const part of path.split('/')) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error(`${path}: symlinks are not allowed in manifests`);
  }
  if (!lstatSync(current).isFile()) throw new Error(`${path}: manifest entry must be a regular file`);
  return createHash('sha256').update(readFileSync(current)).digest('hex');
}

export function verifyManifests(root, { write = false } = {}) {
  const files = collectPublishFiles(root);
  const errors = [];
  const updates = [];
  for (const directory of ['', ...packageDirectories]) {
    const base = resolve(root, directory);
    const manifest = join(base, 'MANIFEST.sha256');
    const prefix = directory ? `${directory}/` : '';
    const required = files.filter(path => directory ? path.startsWith(prefix) : !path.includes('/'))
      .map(path => path.slice(prefix.length));
    const entries = readEntries(manifest, write);
    // The root manifest owns root runtime assets, not copies of package inventories.
    if (!directory && [...entries.keys()].some(path => !required.includes(path))) {
      throw new Error('Root MANIFEST.sha256 may only contain published root assets');
    }
    for (const path of required) {
      if (entries.has(path)) continue;
      if (write) entries.set(path, null);
      else errors.push(`${prefix}${path}: missing manifest entry`);
    }
    const lines = [...entries].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([path, expected]) => {
      const actual = checksum(base, path);
      if (!write && actual !== expected) errors.push(`${prefix}${path}: checksum mismatch`);
      return `${actual}  ./${path}`;
    });
    updates.push({ manifest, content: `${lines.join('\n')}\n`, directory: directory || 'root', count: lines.length });
  }
  if (errors.length) throw new Error(errors.join('\n'));
  // Validate every package before writing anything. Missing listed files remain errors,
  // even in --write mode; intentional deletions require removing their manifest row.
  if (write) for (const { manifest, content } of updates) writeFileSync(manifest, content);
  return { files, summaries: updates.map(({ directory, count }) => ({ directory, count })) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const write = process.argv.includes('--write');
  try {
    const result = verifyManifests(root, { write });
    for (const { directory, count } of result.summaries) {
      console.log(`${directory}: ${count} entries ${write ? 'updated' : 'checked'}`);
    }
    console.log(`${result.files.length} publishable files covered`);
  } catch (error) {
    console.error(error.message);
    console.error('Regenerate QA reports first, then run npm run manifest:update and commit all manifests.');
    process.exitCode = 1;
  }
}
