import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'kitsu-manifests-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'tools'));
  copyFileSync(new URL('./manifests.mjs', import.meta.url), join(root, 'tools/manifests.mjs'));
  copyFileSync(new URL('./build.mjs', import.meta.url), join(root, 'tools/build.mjs'));
  copyFileSync(new URL('./publish-files.mjs', import.meta.url), join(root, 'tools/publish-files.mjs'));
  const rootEntries = ['index.html', 'favicon.svg', 'tokens.css'].map(path => {
    const content = `fixture ${path}\n`;
    writeFileSync(join(root, path), content);
    return `${createHash('sha256').update(content).digest('hex')}  ./${path}`;
  });
  writeFileSync(join(root, 'MANIFEST.sha256'), `${rootEntries.join('\n')}\n`);
  for (const dir of ['public', 'admin']) {
    mkdirSync(join(root, dir));
    const entries = [['qa-results.json', '{"status":"pass"}\n'], ['index.html', `<h1>${dir}</h1>\n`]]
      .map(([path, content]) => {
        writeFileSync(join(root, dir, path), content);
        return `${createHash('sha256').update(content).digest('hex')}  ./${path}`;
      });
    writeFileSync(join(root, dir, 'MANIFEST.sha256'), `${entries.join('\n')}\n`);
  }
  return {
    root,
    run: (...args) => spawnSync(process.execPath, [join(root, 'tools/manifests.mjs'), ...args], { encoding: 'utf8' }),
    build: () => spawnSync(process.execPath, [join(root, 'tools/build.mjs')], { encoding: 'utf8' }),
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
  const manifests = ['MANIFEST.sha256', 'public/MANIFEST.sha256', 'admin/MANIFEST.sha256'];
  const before = manifests.map(path => readFileSync(join(root, path), 'utf8'));
  writeFileSync(join(root, 'tokens.css'), 'changed before failed update');
  rmSync(join(root, 'admin/qa-results.json'));
  assert.notEqual(run().status, 0);
  assert.notEqual(run('--write').status, 0);
  assert.deepEqual(manifests.map(path => readFileSync(join(root, path), 'utf8')), before);
  assert.match(readFileSync(join(root, 'admin/MANIFEST.sha256'), 'utf8'), /qa-results\.json/);
});

test('an unlisted nested runtime asset fails verification before it can be built', t => {
  const { root, run, build } = fixture(t);
  mkdirSync(join(root, 'public/assets'));
  writeFileSync(join(root, 'public/assets/probe.js'), 'console.log("unlisted");\n');
  const result = run();
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /public\/assets\/probe.js: missing manifest entry/);
  assert.equal(build().status, 1);
  assert.equal(existsSync(join(root, 'dist/public/assets/probe.js')), false);
});

test('shared tokens are checked instead of silently entering the build', t => {
  const { root, run, build } = fixture(t);
  writeFileSync(join(root, 'tokens.css'), ':root { --changed: 1; }\n');
  const result = run();
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /tokens.css: checksum mismatch/);
  assert.equal(build().status, 1);
  assert.equal(run('--write').status, 0);
  assert.equal(run().status, 0);
});

test('both packages reject an omitted existing runtime row without rewriting manifests or dist', t => {
  for (const directory of ['public', 'admin']) {
    const { root, run, build } = fixture(t);
    assert.equal(build().status, 0);
    const manifest = join(root, directory, 'MANIFEST.sha256');
    const incomplete = readFileSync(manifest, 'utf8').split('\n').filter(line => !line.endsWith('./index.html')).join('\n');
    writeFileSync(manifest, incomplete);
    writeFileSync(join(root, 'dist/keep.txt'), 'previous build');
    assert.equal(run().status, 1);
    assert.equal(build().status, 1);
    assert.equal(readFileSync(manifest, 'utf8'), incomplete);
    assert.equal(readFileSync(join(root, 'dist/keep.txt'), 'utf8'), 'previous build');
  }
});

test('all three shared root assets reject omitted entries and stale checksums', t => {
  for (const path of ['index.html', 'favicon.svg', 'tokens.css']) {
    const { root, run, build } = fixture(t);
    const manifest = join(root, 'MANIFEST.sha256');
    writeFileSync(manifest, readFileSync(manifest, 'utf8').split('\n').filter(line => !line.endsWith(`./${path}`)).join('\n'));
    assert.equal(run().status, 1);
    assert.match(run().stderr, /missing manifest entry/);
    assert.equal(run('--write').status, 0);
    writeFileSync(join(root, path), 'changed');
    assert.equal(run().status, 1);
    assert.equal(build().status, 1);
    assert.equal(run('--write').status, 0);
    assert.equal(build().status, 0);
  }
});

test('explicit regeneration adds nested runtime files and builds exactly the publishable inventory', t => {
  const { root, run, build } = fixture(t);
  const assets = ['public/assets/nested/изображение one.png', 'admin/assets/nested/app.js'];
  const ignored = ['public/docs/private.js', 'admin/tools/test.js', 'public/screenshots/screen.png',
    'admin/NOTES.md', 'public/checks.sha256', 'public/assets/docs/nested.js', 'admin/assets/qa-results.json'];
  for (const path of [...assets, ...ignored]) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), Buffer.from([0, 1, 2, 255]));
  }
  assert.equal(run().status, 1);
  assert.equal(run('--write').status, 0);
  assert.equal(run().status, 0);
  for (const path of assets) {
    const [directory, ...rest] = path.split('/');
    assert.ok(readFileSync(join(root, directory, 'MANIFEST.sha256'), 'utf8').includes(`./${rest.join('/')}`));
  }
  assert.equal(build().status, 0);
  const walk = (path, prefix = '') => readdirSync(path, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(join(path, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`]);
  assert.deepEqual(walk(join(root, 'dist')).sort(),
    ['index.html', 'favicon.svg', 'tokens.css', 'public/index.html', 'admin/index.html', ...assets].sort());
  for (const path of assets) assert.deepEqual(readFileSync(join(root, 'dist', path)), readFileSync(join(root, path)));
  const before = ['MANIFEST.sha256', 'public/MANIFEST.sha256', 'admin/MANIFEST.sha256']
    .map(path => readFileSync(join(root, path), 'utf8'));
  assert.equal(run('--write').status, 0);
  assert.deepEqual(['MANIFEST.sha256', 'public/MANIFEST.sha256', 'admin/MANIFEST.sha256']
    .map(path => readFileSync(join(root, path), 'utf8')), before);
});

test('missing root manifests fail read-only checks and can be explicitly initialized', t => {
  const { root, run, build } = fixture(t);
  rmSync(join(root, 'MANIFEST.sha256'));
  assert.equal(run().status, 1);
  assert.equal(build().status, 1);
  assert.equal(existsSync(join(root, 'MANIFEST.sha256')), false);
  assert.equal(run('--write').status, 0);
  assert.equal(run().status, 0);
});

test('malformed, duplicate, self-referencing and noncanonical entries are rejected', t => {
  const hash = '0'.repeat(64);
  for (const entry of [`${hash}  ./../tokens.css`, `${hash}  ./nested/../index.html`, `${hash}  ././index.html`,
    `${hash}  ./assets//app.js`, `${hash}  ./assets\\app.js`, `${hash}  ./MANIFEST.sha256`, 'invalid']) {
    const { root, run } = fixture(t);
    writeFileSync(join(root, 'public/MANIFEST.sha256'), `${entry}\n`);
    assert.equal(run().status, 1, entry);
    assert.match(run().stderr, /Invalid manifest entry/);
    assert.equal(run('--write').status, 1, entry);
  }
  const { root, run } = fixture(t);
  const manifest = join(root, 'public/MANIFEST.sha256');
  writeFileSync(manifest, readFileSync(manifest, 'utf8').repeat(2));
  assert.match(run().stderr, /Duplicate manifest entry/);
  assert.equal(run('--write').status, 1);
});

test('runtime symlinks cannot escape the verified inventory', t => {
  const { root, run, build } = fixture(t);
  symlinkSync(join(root, 'tokens.css'), join(root, 'public/linked.css'));
  assert.equal(run().status, 1);
  assert.match(run().stderr, /not symlinks/);
  assert.equal(run('--write').status, 1);
  assert.equal(build().status, 1);
});
