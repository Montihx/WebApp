import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext, Script} from 'node:vm';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const code = source.slice(source.indexOf('  function initHeroSlider()'), source.indexOf('  function initContinueRail()'));

function node(active = false) {
  const classes = new Set(active ? ['is-active'] : []);
  return {
    attrs: {}, events: {}, textContent: '',
    classList: {
      contains: name => classes.has(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
    },
    setAttribute(name, value) {this.attrs[name] = value},
    removeAttribute(name) {delete this.attrs[name]},
    set tabIndex(value) {this.attrs.tabindex = String(value)},
    addEventListener(name, callback) {this.events[name] = callback},
    fire(name, event = {}) {this.events[name]?.(event)},
  };
}

function fixture({reduced = false, count = 3} = {}) {
  const slider = node(), previous = node(), next = node(), live = node();
  const document = {...node(), hidden: false};
  const motion = {...node(), matches: reduced};
  const slides = Array.from({length: count}, (_, i) => ({
    ...node(i === 0), heading: {textContent: `Тайтл ${i + 1}`}, link: node(),
  }));
  let timerId = 0;
  const timers = new Map();
  const context = createContext({
    document,
    window: {
      matchMedia: () => motion,
      setTimeout: (callback, delay) => {timers.set(++timerId, {callback, delay}); return timerId},
      clearTimeout: id => timers.delete(id),
    },
    $: (selector, scope) => selector === 'h2' ? scope.heading : ({
      '[data-hero-slider]': slider, '[data-hero-prev]': previous,
      '[data-hero-next]': next, '[data-hero-live]': live,
    })[selector] ?? null,
    $$: (selector, scope) => selector === '[data-hero-slide]' ? slides : [scope.link],
  });
  new Script(code + '\ninitHeroSlider();').runInContext(context);
  return {
    slider, slides, previous, next, live, document, motion, timers,
    active: () => slides.findIndex(slide => slide.classList.contains('is-active')),
    tick() {
      const [id, {callback, delay}] = timers.entries().next().value;
      assert.equal(delay, 7000);
      timers.delete(id);
      callback();
    },
  };
}

test('automatic and manual navigation work without pagination controls', () => {
  const f = fixture();
  assert.equal(f.active(), 0);
  assert.equal(f.timers.size, 1);
  f.tick();
  assert.equal(f.active(), 1);
  assert.equal(f.live.textContent, '');
  assert.equal(f.slides[0].attrs['aria-hidden'], 'true');
  assert.equal(f.slides[0].link.attrs.tabindex, '-1');
  assert.equal(f.slides[1].link.attrs.tabindex, undefined);
  f.next.fire('click');
  assert.equal(f.active(), 2);
  assert.equal(f.timers.size, 0);
  assert.equal(f.live.textContent, 'Слайд 3 из 3: Тайтл 3');
  f.next.fire('click');
  assert.equal(f.active(), 0);
  f.previous.fire('click');
  assert.equal(f.active(), 2);
});

test('focus and keyboard control stop automatic movement even after pointer exit', () => {
  const f = fixture();
  f.slider.fire('mouseenter');
  assert.equal(f.timers.size, 0);
  f.slider.fire('focusin');
  f.slider.fire('mouseleave');
  f.slider.fire('focusout');
  f.document.fire('visibilitychange');
  assert.equal(f.timers.size, 0);
  let prevented = false;
  f.slider.fire('keydown', {key: 'ArrowLeft', preventDefault() {prevented = true}});
  assert.equal(prevented, true);
  assert.equal(f.active(), 2);
});

test('horizontal swipes navigate; vertical scroll and cancelled gestures do not', () => {
  const f = fixture();
  const start = {pointerType: 'touch', button: 0, clientX: 200, clientY: 100};
  f.slider.fire('pointerdown', start);
  assert.equal(f.timers.size, 0);
  f.slider.fire('pointerup', {clientX: 190, clientY: 250});
  assert.equal(f.active(), 0);
  f.slider.fire('pointerdown', start);
  f.slider.fire('pointerup', {clientX: 100, clientY: 105});
  assert.equal(f.active(), 1);
  f.slider.fire('pointerdown', start);
  f.slider.fire('pointercancel');
  f.slider.fire('pointerup', {clientX: 100, clientY: 105});
  assert.equal(f.active(), 1);
});

test('automatic movement respects reduced motion, visibility and hover', () => {
  const f = fixture({reduced: true});
  assert.equal(f.timers.size, 0);
  f.motion.matches = false;
  f.motion.fire('change');
  assert.equal(f.timers.size, 1);
  f.document.hidden = true;
  f.document.fire('visibilitychange');
  assert.equal(f.timers.size, 0);
  f.document.hidden = false;
  f.slider.fire('mouseenter');
  f.document.fire('visibilitychange');
  assert.equal(f.timers.size, 0);
  f.slider.fire('mouseleave');
  assert.equal(f.timers.size, 1);
  assert.equal(fixture({count: 1}).timers.size, 0);
  assert.equal(fixture({count: 0}).timers.size, 0);
});
