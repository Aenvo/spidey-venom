const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the real scene controller with deterministic geometry and a fake renderer.
function scene() {
  const nodes = {}, events = {}, engines = {}, effects = {};
  let now = 1000;
  function node() {
    return { style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} }, dataset: {}, listeners: {},
      setAttribute(k, v) { this[k] = v; }, getAttribute(k) { return this[k]; },
      append(...children) { for (const child of children) nodes[child.id] = child; },
      addEventListener(k, f) { this.listeners[k] = f; } };
  }
  nodes.buttons = node(); nodes.reset = node();
  const context = vm.createContext({
    innerWidth: 1200, innerHeight: 900, Math, performance: { now: () => now },
    matchMedia: () => ({ matches: false }), navigator: {}, setTimeout() {},
    addEventListener: (name, f) => { (events[name] ||= []).push(f); },
    localStorage: { getItem: () => JSON.stringify({ pos: {} }), setItem() {} },
    document: { getElementById: id => nodes[id], createElement: node, createElementNS: node, body: node(), documentElement: node() },
    createElectricity: () => {
      const effect = { bursts: 0, update() {}, combat() {}, burst() { this.bursts++; } };
      effects.miles = effect; return effect;
    },
    createGoo: cfg => {
      const p = cfg.pos, hw = 80, hh = 30, a = hw - hh;
      const engine = { cfg, theme: cfg.theme, hitEl: cfg.hitEl, canvas: cfg.canvas, hasPointer: false,
        infection: 0, infectionTarget: 0, shocks: 0, stops: 0, releases: 0, pointers: 0, webs: [], shots: [],
        place() {}, fling() {}, setScale() {}, size: () => ({ hw, hh }), inZone: () => true,
        edgeDist(x, y) { return Math.hypot(Math.max(Math.abs(x - p.x) - a, 0), y - p.y) - hh; },
        nearest(x, y, inset = 0) {
          const ax = Math.max(-a, Math.min(a, x - p.x)), dx = x - p.x - ax, dy = y - p.y, len = Math.hypot(dx, dy) || 1;
          return [p.x + ax + dx / len * (hh - inset), p.y + dy / len * (hh - inset)];
        },
        target(x, y) { this.aim = [x, y]; },
        setInfect(value) { this.infectionTarget = cfg.canBeInfected && !this.cleansing ? value : 0; },
        cleanse() { this.infectionTarget = 0; this.cleansing = true; },
        shock() { this.shocks++; }, stopShock() { this.stops++; }, release() { this.releases++; },
        webPaths() { return this.webs; }, shootAt(x, y, track) { this.shots.push({ x, y, track }); },
        pointer() { this.pointers++; }, leave() {}, press() {},
      };
      engines[cfg.theme] = engine; return engine;
    },
  });
  for (const name of ['themes.js', 'controller.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', name), 'utf8'), context);
  return { engines, nodes, events, effects,
    place(id, x, y) { Object.assign(engines[id].cfg.pos, { x, y }); },
    connect(from, to) { engines[from].webs.push([[engines[from].cfg.pos.x, engines[from].cfg.pos.y], engines[to].nearest(engines[from].cfg.pos.x, engines[from].cfg.pos.y)]); },
    tick(time = now) {
      const dt = Math.max(0, time - now) / 1000; now = time;
      for (const engine of Object.values(engines)) if (engine.cleansing) {
        engine.infection *= Math.exp(-dt * (engine.cfg.purgeRate || 1));
        if (engine.infection < 0.002) { engine.infection = 0; engine.cleansing = false; }
      }
      engines.spidey.cfg.tick(engines.spidey);
    },
  };
}

test('Miles reuses Spidey font weight and fine silk with a subtle black and red suit', () => {
  const { engines: { miles, spidey } } = scene();
  assert.equal(miles.cfg.emblem, spidey.cfg.emblem);
  assert.equal(miles.cfg.suit.panel, false);
  assert.ok(miles.cfg.iconColor[0] > miles.cfg.iconColor[2]);
  assert.ok(miles.cfg.suit.base.every(c => c < 0.01));
  assert.equal(miles.cfg.labelStyle, spidey.cfg.labelStyle);
  assert.equal(miles.cfg.params.thickness, spidey.cfg.params.thickness);
  assert.equal(miles.cfg.shotRadius, spidey.cfg.shotRadius);
  assert.ok(miles.cfg.suit.webWidth < spidey.cfg.suit.webWidth);
  assert.ok(miles.cfg.suit.webStrength < spidey.cfg.suit.webStrength);
  assert.ok(miles.cfg.params.maxLen > spidey.cfg.params.maxLen);
  assert.equal(miles.cfg.canBeInfected, false);
});

test('Venom still infects Spidey when Miles is far away', () => {
  const s = scene(); s.place('spidey', 300, 300); s.place('venom', 510, 300); s.place('miles', 950, 700); s.tick();
  assert.equal(s.engines.spidey.infectionTarget, 1);
  assert.equal(s.engines.venom.shocks, 0);
});

test('Miles automatically targets an infection source and knocks it back smoothly on contact', () => {
  const s = scene(); s.place('spidey', 150, 150); s.place('venom', 600, 500); s.place('miles', 800, 500); s.tick();
  assert.equal(s.engines.miles.infectionTarget, 0);
  assert.ok(s.engines.miles.shots.length > 0, 'approaching the infection source automatically launches silk');
  assert.equal(s.engines.venom.shocks, 0, 'proximity alone must not cause a shock');
  s.connect('miles', 'venom'); s.tick(1050);
  assert.equal(s.engines.venom.cfg.pos.x, 600, 'a shock starts velocity rather than teleporting the button');
  s.tick(1100);
  assert.ok(s.engines.venom.cfg.pos.x < 600);
  assert.ok(s.engines.venom.cfg.pos.x > 550, 'the first step is continuous and limited');
  assert.equal(s.engines.venom.cfg.pos.y, 500);
  assert.ok(s.engines.venom.shocks > 0);
  assert.ok(s.effects.miles.bursts > 0);
});

test('Miles cleanses a nearby infected ally, sustains attacks and releases a distant enemy', () => {
  const s = scene(); s.place('spidey', 300, 300); s.place('venom', 510, 300); s.place('miles', 950, 700); s.tick();
  s.engines.spidey.infection = 0.7; s.place('miles', 320, 460); s.tick(1500);
  assert.equal(s.engines.spidey.infection, 0.7, 'rescue waits for the white web to arrive');
  s.connect('miles', 'spidey'); s.tick(1550);
  assert.ok(s.engines.spidey.infection > 0, 'the contamination retreats over time rather than vanishing');
  assert.equal(s.engines.spidey.infectionTarget, 0);
  s.connect('miles', 'venom'); s.tick(1600);
  assert.equal(s.engines.venom.shocks, 0, 'Venom is not attacked before Spidey is cleansed');
  assert.equal(s.engines.miles.aim[0], null);
  s.tick(2600); assert.ok(s.engines.spidey.infection > 0, 'cleansing remains gradual after one second');
  assert.equal(s.engines.venom.shocks, 0);
  s.tick(6000); assert.equal(s.engines.spidey.infection, 0);
  s.tick(6200);
  const hits = s.engines.venom.shocks; assert.ok(hits > 0);
  s.tick(6500); s.connect('miles', 'venom'); s.tick(6500); assert.ok(s.engines.venom.shocks > hits);
  assert.equal(s.engines.spidey.infectionTarget, 0);
  const lastHits = s.engines.venom.shocks; s.place('venom', 1100, 850); s.tick(6900);
  assert.equal(s.engines.venom.shocks, lastHits);
  assert.equal(s.engines.miles.aim[0], null);
});

test('breaking a web stops shocks even while Venom is still within firing range', () => {
  const s = scene(); s.place('spidey', 150, 150); s.place('venom', 600, 500); s.place('miles', 800, 500);
  s.tick(); s.connect('miles', 'venom'); s.tick(1050);
  const hits = s.engines.venom.shocks, stops = s.engines.venom.stops;
  s.engines.miles.webs = []; s.tick(1100);
  assert.equal(s.engines.venom.shocks, hits);
  assert.ok(s.engines.venom.stops > stops);
});

test('dragging Miles preserves infection until an automatic rescue web actually touches Spidey', () => {
  const s = scene(); s.place('spidey', 300, 300); s.place('venom', 510, 300); s.place('miles', 950, 700); s.tick();
  s.engines.spidey.infection = 0.6;
  s.nodes['btn-miles'].listeners.pointerdown({ clientX: 950, clientY: 700, pointerId: 1, preventDefault() {} });
  s.tick(1100);
  assert.equal(s.engines.spidey.infectionTarget, 1, 'unrelated dragging must not interrupt the ongoing infection');
  assert.ok(!s.engines.spidey.cleansing);
  for (const f of s.events.pointermove) f({ clientX: 320, clientY: 460, pointerId: 1, pointerType: 'mouse' });
  s.tick(1200);
  assert.ok(s.engines.miles.shots.length > 0, 'Miles automatically sends a rescue web when dragged close');
  assert.ok(!s.engines.spidey.cleansing, 'approaching alone must not cleanse');
  s.connect('miles', 'spidey'); s.tick(1300);
  assert.equal(s.engines.spidey.cleansing, true);
  assert.equal(s.engines.spidey.infectionTarget, 0);
  assert.equal(s.engines.venom.shocks, 0, 'rescue still finishes before counterattacking');
});

test('electricity forms short coils around real silk and disappears with the silk', () => {
  const layers = [];
  const node = () => ({ children: [], attrs: {}, style: { setProperty() {} }, classList: { add() {} },
    setAttribute(k, v) { this.attrs[k] = v; }, append(child) { this.children.push(child); } });
  const ctx = vm.createContext({ document: { createElementNS: node, body: { append: n => layers.push(n) } } });
  for (const file of ['themes.js', 'electricity.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), ctx);
  const effect = vm.runInContext('createElectricity(BUTTON_THEMES.miles.electricity, false)', ctx);
  effect.update({ hasPointer: true, webPaths: () => [[[0, 0], [200, 0]]] }, 1000);
  const groups = layers[0].children;
  assert.ok(groups.length > 0);
  for (const group of groups) {
    const coordinates = [...group.children[0].attrs.d.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
    const xs = coordinates.map(p => p[0]);
    assert.ok(Math.max(...xs) - Math.min(...xs) < 60, 'an arc must cover only a small part of the strand');
    assert.ok(coordinates.every(p => Math.abs(p[1]) < 5), 'the coil stays close to the white web');
  }
  effect.update({ hasPointer: true, webPaths: () => [] }, 1100);
  assert.ok(groups.every(g => g.style.display === 'none'));
  effect.update({ hasPointer: true, webPaths: () => [[[0, 0], [200, 0]]] }, 1400);
  assert.ok(groups.every(g => g.style.display === 'none'), 'electric arcs stay off between brief flashes');
  effect.combat(1450); effect.update({ hasPointer: true, webPaths: () => [[[0, 0], [200, 0]]] }, 1450);
  assert.equal(groups.filter(g => g.style.display !== 'none').length, 3, 'actual contact creates more arcs than idle hovering');
});

test('closest-button pointer routing and keyboard movement also work for Miles', () => {
  const s = scene(); s.place('spidey', 200, 200); s.place('venom', 900, 200); s.place('miles', 600, 650);
  for (const f of s.events.pointermove) f({ clientX: 600, clientY: 650, pointerType: 'mouse' });
  assert.equal(s.engines.miles.pointers, 1); assert.equal(s.engines.spidey.pointers, 0);
  s.nodes['btn-miles'].listeners.keydown({ key: 'ArrowLeft', shiftKey: false, preventDefault() {} });
  assert.equal(s.engines.miles.cfg.pos.x, 586);
});

test('an already fired web resolves the live target after either button moves', () => {
  const s = scene(); s.place('spidey', 150, 150); s.place('venom', 600, 500); s.place('miles', 800, 500); s.tick();
  const shot = s.engines.miles.shots[0], original = Array.from(shot.track());
  s.place('miles', 600, 300); s.place('venom', 700, 450);
  assert.deepEqual(Array.from(shot.track()), Array.from(s.engines.venom.nearest(600, 300)));
  assert.notDeepEqual(Array.from(shot.track()), original, 'the target is not the launch-time snapshot');
});

test('live strand geometry follows both endpoints immediately without adding velocity', () => {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/web-tracking.js'), 'utf8'), ctx);
  const frame = { origin: [0, 0], source: [10, 10], target: [110, 10], scale: 1, growth: 1 };
  const strand = { pos: new Float32Array([10, 10, 9, 60, 30, 9, 110, 10, 9]), prev: new Float32Array([10, 10, 9, 60, 30, 9, 110, 10, 9]), tgt: [110, 10, 9], tracking: { frame } };
  ctx.reframeWeb(strand, { ...frame, origin: [20, 30], source: [30, 40] });
  assert.deepEqual(Array.from(strand.pos), [10, 10, 9, 50, 15, 9, 90, -20, 9]);
  assert.deepEqual(Array.from(strand.prev), Array.from(strand.pos), 'previous Verlet positions follow the same transform');
  assert.deepEqual(Array.from(strand.tgt), [90, -20, 9], 'moving Miles leaves the tip pinned to Venom in world space');
  ctx.reframeWeb(strand, { ...strand.tracking.frame, target: [140, 70] });
  assert.deepEqual(Array.from(strand.pos.slice(-3)), [120, 40, 9]);
  assert.deepEqual(Array.from(strand.tgt), [120, 40, 9]);
});
