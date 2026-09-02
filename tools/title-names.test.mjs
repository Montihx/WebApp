import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext, Script} from 'node:vm';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/anime.html', import.meta.url), 'utf8');
const names = [...html.matchAll(/class="title-name-value" id="([^"]+)"[^>]*>([^<]*)<\/span>/g)];
const copyTargets = [...html.matchAll(/data-copy-title="([^"]+)"/g)].map(match => match[1]);

function node(dataset = {}) {
  return {dataset, attrs: {}, events: {}, textContent: '',
    setAttribute(name, value) {this.attrs[name] = value},
    removeAttribute(name) {delete this.attrs[name]},
    addEventListener(name, handler) {this.events[name] = handler},
    fire(name) {return this.events[name]?.({currentTarget: this})}};
}

function fixture(writeText = async () => {}) {
  const values = Object.fromEntries(names.map(([, id, text]) => [id, {textContent: text}]));
  const controls = copyTargets.map(copyTitle => ({...node({copyTitle}), icon: node()}));
  const dialog = node(), feedback = node(), trigger = node();
  const context = createContext({
    navigator: {clipboard: writeText ? {writeText} : undefined},
    document: {getElementById: id => values[id]},
    $: (selector, scope) => selector === '#titles-dialog' ? dialog
      : selector === '#title-copy-feedback' ? feedback
      : selector === '[data-open-titles]' ? trigger
      : selector === '[data-copy-icon]' ? scope.icon : null,
    $$: () => controls,
    setIcon: (target, icon) => {target.icon = icon},
    openDialog: () => {dialog.open = true},
  });
  const code = source.slice(source.indexOf('  function initTitleNames()'), source.indexOf('  function initAnime()'));
  new Script(code + '\ninitTitleNames();').runInContext(context);
  trigger.fire('click');
  return {controls, values, dialog, feedback, trigger};
}

test('each title and synonym copies its own full text, including Japanese', async () => {
  const copied = [];
  const f = fixture(async value => {copied.push(value)});
  assert.equal(f.controls.length, 5);
  for (const control of f.controls) {
    await control.fire('click');
    assert.equal(control.dataset.copyState, 'copied');
    assert.equal(control.icon.icon, 'check');
    assert.equal(f.feedback.dataset.state, 'success');
  }
  assert.deepEqual(copied, ['Монстр', 'Monster', 'モンスター', 'MONSTER', "Naoki Urasawa's Monster"]);
});

test('pending copy has no success state and prevents overlapping writes', async () => {
  let resolveCopy, calls = 0;
  const f = fixture(() => {calls += 1; return new Promise(resolve => {resolveCopy = resolve})});
  const pending = f.controls[0].fire('click');
  assert.equal(f.feedback.dataset.state, 'pending');
  assert.equal(f.controls[0].dataset.copyState, undefined);
  assert.ok(f.controls.every(control => control.attrs['aria-disabled'] === 'true'));
  await f.controls[1].fire('click');
  assert.equal(calls, 1);
  resolveCopy();
  await pending;
  assert.equal(f.feedback.dataset.state, 'success');
  assert.ok(f.controls.every(control => !control.attrs['aria-disabled']));
});

test('clipboard denial preserves selectable text and permits retry', async () => {
  let denied = true;
  const f = fixture(async () => {if (denied) throw new Error('denied')});
  await f.controls[2].fire('click');
  assert.equal(f.feedback.dataset.state, 'error');
  assert.match(f.feedback.textContent, /вручную/);
  assert.equal(f.controls[2].dataset.copyState, undefined);
  assert.equal(f.values['title-name-original'].textContent, 'モンスター');
  denied = false;
  await f.controls[2].fire('click');
  assert.equal(f.feedback.dataset.state, 'success');
});

test('closing and reopening ignores an earlier pending result', async () => {
  let resolveCopy;
  const f = fixture(() => new Promise(resolve => {resolveCopy = resolve}));
  const pending = f.controls[0].fire('click');
  f.dialog.fire('close');
  f.trigger.fire('click');
  resolveCopy();
  await pending;
  assert.equal(f.feedback.dataset.state, undefined);
  assert.ok(f.controls.every(control => !control.dataset.copyState && !control.attrs['aria-busy']));
});

test('unavailable clipboard reports a manual copy path', async () => {
  const f = fixture(null);
  await f.controls[0].fire('click');
  assert.equal(f.feedback.dataset.state, 'error');
  assert.equal(f.controls[0].icon.icon, 'copy');
  assert.equal(f.controls[0].attrs['aria-disabled'], undefined);
});
