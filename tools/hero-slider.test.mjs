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

function fixture({reduced = false, count = 3, arrows = true} = {}) {
  const slider = node(), previous = node(), next = node(), live = node();
  const track = node(), progress = node();
  const animations = [];
  progress.animate = (frames, options) => {
    const animation = {frames, options, cancelled: false, cancel() {this.cancelled = true}};
    animations.push(animation);
    return animation;
  };
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
      '[data-hero-slider]': slider, '[data-hero-prev]': arrows ? previous : null,
      '[data-hero-next]': arrows ? next : null, '[data-hero-live]': live,
      '[data-hero-progress]': progress, '[data-hero-progress-track]': track,
    })[selector] ?? null,
    $$: (selector, scope) => selector === '[data-hero-slide]' ? slides : [scope.link],
  });
  new Script(code + '\ninitHeroSlider();').runInContext(context);
  return {
    slider, slides, previous, next, live, document, motion, timers,
    track, animations,
    active: () => slides.findIndex(slide => slide.classList.contains('is-active')),
    tick() {
      const [id, {callback, delay}] = timers.entries().next().value;
      assert.equal(delay, 9000);
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

test('the progress animation uses the same nine-second clock and resets on each slide', () => {
  const f = fixture();
  const first = f.animations[0];
  assert.equal(first.options.duration, 9000);
  assert.equal(first.frames[0].transform, 'scaleX(0)');
  assert.equal(first.frames[1].transform, 'scaleX(1)');
  f.tick();
  assert.equal(first.cancelled, true);
  assert.equal(f.animations.length, 2);
  f.next.fire('click');
  assert.equal(f.animations.at(-1).cancelled, true);
  assert.equal(f.timers.size, 0);
});

test('swipes work without arrow nodes and interaction prevents automatic restart', () => {
  const f = fixture({arrows: false});
  f.tick();
  assert.equal(f.active(), 1);
  f.slider.fire('pointerdown', {pointerType: 'touch', button: 0, clientX: 200, clientY: 100});
  f.slider.fire('pointerup', {clientX: 100, clientY: 105});
  assert.equal(f.active(), 2);
  f.slider.fire('focusout');
  f.slider.fire('mouseleave');
  f.document.hidden = true;
  f.document.fire('visibilitychange');
  f.document.hidden = false;
  f.document.fire('visibilitychange');
  f.motion.matches = true;
  f.motion.fire('change');
  f.motion.matches = false;
  f.motion.fire('change');
  assert.equal(f.timers.size, 0);
  assert.equal(f.animations.at(-1).cancelled, true);
});

test('reduced motion prevents progress; a single slide needs no timer or progress', () => {
  const f = fixture({reduced: true});
  assert.equal(f.timers.size, 0);
  assert.equal(f.animations.length, 0);
  const single = fixture({count: 1});
  assert.equal(single.track.hidden, true);
  assert.equal(single.timers.size, 0);
  assert.equal(single.animations.length, 0);
});

test('pause markup, styles and logic are removed; desktop arrows and progress remain', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(html + css + code, /data-hero-(?:toggle|pause-icon|play-icon)|feature-slider__toggle|syncToggle|focusPaused/);
  assert.equal((html.match(/data-hero-(?:prev|next)\b/g) || []).length, 2);
  assert.equal((html.match(/data-hero-progress-track\b/g) || []).length, 1);
  assert.doesNotMatch(html, /data-hero-dot|data-hero-counter|О тайтле/);
});

test('phone controls are hidden without hiding the desktop controls or the progress track', () => {
  const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
  const mobile = css.slice(css.indexOf('@media (max-width: 720px)'), css.indexOf('@media (max-width: 639px)'));
  assert.match(mobile, /\.feature-slider__controls\s*\{\s*display:\s*none;\s*\}/);
  assert.match(css.slice(0, css.indexOf('@media')), /\.feature-slider__controls\s*\{[^}]*display:\s*flex;/);
  assert.doesNotMatch(mobile, /\.feature-slider__progress\s*\{[^}]*display:\s*none/);
  assert.match(mobile, /padding: 64px 16px 24px/);
});

test('the public README describes the current slider rather than the removed controls', () => {
  const readme = readFileSync(new URL('../public/README.md', import.meta.url), 'utf8');
  const description = readme.split('\n').find(line => line.startsWith('- полноширинный desktop hero-слайдер'));
  assert.match(description, /9-секундная автопрокрутка/);
  assert.match(description, /единственная нижняя полоса прогресса/);
  assert.match(description, /Стрелки доступны только шире `720 px`/);
  assert.match(description, /на телефоне — свайпы без навигационных кнопок/);
  assert.match(description, /Кнопка паузы, точки, счётчик и «О тайтле» удалены/);
  assert.doesNotMatch(description, /7-секундная/);
});
