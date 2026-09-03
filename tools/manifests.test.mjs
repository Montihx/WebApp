import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'kitsu-manifests-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'tools'));
  copyFileSync(new URL('./manifests.mjs', import.meta.url), join(root, 'tools/manifests.mjs'));
  for (const dir of ['public', 'admin']) {
    mkdirSync(join(root, dir));
    const content = '{"status":"pass"}\n';
    const hash = createHash('sha256').update(content).digest('hex');
    writeFileSync(join(root, dir, 'qa-results.json'), content);
    writeFileSync(join(root, dir, 'MANIFEST.sha256'), `${hash}  ./qa-results.json\n`);
  }
  return {
    root,
    run: (...args) => spawnSync(process.execPath, [join(root, 'tools/manifests.mjs'), ...args], { encoding: 'utf8' }),
  };
}

test('integrity check rejects a stale QA hash without rewriting it; explicit regeneration repairs it', t => {
  const { root, run } = fixture(t);
  assert.equal(run().status, 0);
  const manifest = join(root, 'public/MANIFEST.sha256');
  const before = readFileSync(manifest, 'utf8');
  writeFileSync(join(root, 'public/qa-results.json'), '{"status":"pass","revision":2}\n');
  const stale = run();
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /public\/qa-results.json: checksum mismatch/);
  assert.equal(readFileSync(manifest, 'utf8'), before);
  assert.equal(run('--write').status, 0);
  assert.equal(run().status, 0);
  assert.notEqual(readFileSync(manifest, 'utf8'), before);
});

test('missing package files fail verification rather than being dropped from the manifest', t => {
  const { root, run } = fixture(t);
  rmSync(join(root, 'admin/qa-results.json'));
  assert.notEqual(run().status, 0);
  assert.match(readFileSync(join(root, 'admin/MANIFEST.sha256'), 'utf8'), /qa-results\.json/);
});
