import { lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const rootAssets = ['index.html', 'favicon.svg', 'tokens.css'];
export const packageDirectories = ['public', 'admin'];

// One publication policy for both integrity verification and the build.
export function isPublishable(path) {
  return path.split('/').every(part =>
    !['docs', 'tools', 'screenshots'].includes(part) &&
    !/\.(md|sha256)$/.test(part) && !part.endsWith('qa-results.json'));
}

export function collectPublishFiles(root) {
  const files = [];
  const visit = path => {
    if (!isPublishable(path)) return;
    if (/[\\\r\n]/.test(path)) throw new Error(`Unsupported publication path: ${path}`);
    const stat = lstatSync(join(root, path));
    if (stat.isFile()) files.push(path);
    else if (stat.isDirectory()) {
      for (const name of readdirSync(join(root, path)).sort()) visit(`${path}/${name}`);
    } else {
      throw new Error(`${path}: publication requires regular files and directories, not symlinks`);
    }
  };
  for (const path of rootAssets) {
    if (!lstatSync(join(root, path)).isFile()) throw new Error(`${path}: expected a regular root asset`);
    visit(path);
  }
  for (const directory of packageDirectories) {
    if (!lstatSync(join(root, directory)).isDirectory()) throw new Error(`${directory}: expected a package directory`);
    visit(directory);
  }
  return files.sort();
}
