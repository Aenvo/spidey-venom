// ───────────────────────────── page: Spider-Man × Venom ─────────────────────────────
(() => {
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const coarse = matchMedia('(pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
const THEMES = ['spidey', 'venom'];
const LS = 'spidey-x-venom:v1';
let store = {};
try { store = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch { store = {}; }
const save = () => { try { localStorage.setItem(LS, JSON.stringify(store)); } catch {} };

// ── positions (page px, centre of each pill); persisted as fractions of the viewport
const pos = { spidey: { x: innerWidth * 0.35, y: innerHeight * 0.62 }, venom: { x: innerWidth * 0.65, y: innerHeight * 0.62 } };
function defaults() {
  const W = innerWidth, H = innerHeight;
  const hero = { bottom: H * 0.12 }, foot = { top: H - 60 };
  if (W < 761) {
    const top = hero.bottom + 58, bot = foot.top - 52;
    const gap = clamp((bot - top) * 0.62, 96, 170), mid = (top + bot) / 2;
    return { spidey: { x: W / 2, y: mid - gap / 2 }, venom: { x: W / 2, y: mid + gap / 2 } };
  }
  const y = H * 0.5;
  const dx = clamp(W * 0.18, 180, 330);
  return { spidey: { x: W / 2 - dx, y }, venom: { x: W / 2 + dx, y } };
}
function clampPos(theme, x, y) {
  const s = engines[theme] ? engines[theme].size() : { hw: 90, hh: 30 };
  const m = (innerWidth < 761 ? 7 : 12) + 10;
  return [clamp(x, s.hw + m, Math.max(s.hw + m, innerWidth - s.hw - m)), clamp(y, s.hh + m, Math.max(s.hh + m, innerHeight - s.hh - m))];
}
function layoutAll() {
  const d = defaults();
  for (const t of THEMES) {
    const f = store.pos?.[t];
    const [x, y] = clampPos(t, f ? f.fx * innerWidth : d[t].x, f ? f.fy * innerHeight : d[t].y);
    pos[t].x = x; pos[t].y = y;
    engines[t]?.place();
    placeTag(t);
  }
}
function remember() {
  store.pos = {};
  for (const t of THEMES) store.pos[t] = { fx: pos[t].x / innerWidth, fy: pos[t].y / innerHeight };
  save();
}

// ── engines
const PARAMS = {
  // web silk: thin, fast, taut, barely sagging
  spidey: { thickness: 1.0, slither: 0.3, whip: 1.45, magnet: 1.1, gravity: 380, creep: 0.12, snapStretch: 1.9, maxLen: 172, grip: 1.25 },
  // the symbiote: heavier, slithery, with a cool blue sheen
  venom: { sheen: 0.55, slither: 1.25, magnet: 1.8, thickness: 1.05 },
};
const engines = {};
function fallback(t) {
  const el = $(`btn-${t}`), p = pos[t];
  return {
    theme: t, hitEl: el, canvas: $(`stage-${t}`), engaged: false, hasPointer: false,
    place() { Object.assign(el.style, { width: '170px', height: '60px', transform: `translate3d(${p.x - 85}px, ${p.y - 30}px, 0)` }); },
    edgeDist(x, y) { return Math.hypot(Math.max(Math.abs(x - p.x) - 55, 0), y - p.y) - 30; },
    nearest() { return [p.x, p.y]; }, inZone: () => false, pointer() {}, leave() {}, target() {}, press() {}, fling() {},
    size: () => ({ hw: 85, hh: 30 }),
  };
}
// dropped close together they fight: each reaches for the other, and the symbiote slowly takes Spidey's suit.
// Nothing reaches across while a button is being dragged
const fighting = { spidey: false, venom: false };
function tick(e) {
  const t = e.theme, other = engines[t === 'spidey' ? 'venom' : 'spidey'];
  if (!other) return;
  const c = pos[t], p = other.nearest(c.x, c.y, 5);
  const d = e.edgeDist(p[0], p[1]);
  const on = !drag && !e.hasPointer && d > -2 && d < (fighting[t] ? 150 : 100);
  fighting[t] = on;
  e.target(on ? p[0] : null, p[1]);
  if (t === 'spidey') {
    const v = pos.venom, dx = v.x - c.x, dy = v.y - c.y, l = Math.hypot(dx, dy) || 1;
    e.setInfect?.(fighting.venom ? 1 : 0, dx / l, dy / l);
  }
}
const onEngage = () => document.body.classList.toggle('is-engaged', THEMES.some((t) => engines[t]?.engaged));

const scaleFor = () => (innerWidth >= 761 ? clamp(Math.min(innerWidth / 1080, innerHeight / 720), 1, 1.5) : 1);
layoutAll();
for (const t of THEMES) {
  const e = createGoo({
    theme: t, label: t.toUpperCase(), aria: $(`btn-${t}`).getAttribute('aria-label'),
    canvas: $(`stage-${t}`), hitEl: $(`btn-${t}`), pos: pos[t], pad: coarse ? 215 : 250, maxPpv: coarse ? 1.75 : 1.6,
    params: PARAMS[t], tick, onEngage, scale: scaleFor(),
  });
  engines[t] = e || fallback(t);
  engines[t].place();
}
const list = THEMES.map((t) => engines[t]);
layoutAll();
if (!store.pos) document.fonts?.ready.then(() => { if (!store.pos) layoutAll(); });
addEventListener('resize', () => { for (const e of list) e.setScale?.(scaleFor()); layoutAll(); });

function raise(e) {
  for (const o of list) {
    o.canvas.classList.toggle('is-top', o === e);
    o.hitEl.style.zIndex = o === e ? 9 : 8;
  }
}

// ── tags ("drag me") until the first drag
function placeTag(t) {
  const tag = $(`tag-${t}`); if (!tag) return;
  const s = engines[t] ? engines[t].size() : { hh: 30 };
  const above = pos[t].y - s.hh - 50 > 60;
  tag.style.transform = `translate(${pos[t].x - tag.offsetWidth / 2 + (t === 'spidey' ? -18 : 18)}px, ${above ? pos[t].y - s.hh - 44 : pos[t].y + s.hh + 22}px) rotate(${t === 'spidey' ? -4 : 3}deg)`;
}
if (store.moved) document.body.classList.add('has-moved');

// ── pointer routing: the closest button owns the pointer, the other lets go
let drag = null, ptrDown = false;
function route(x, y, mouse, down) {
  let owner = null, best = Infinity, over = Infinity;
  const m = mouse ? 54 : 0;
  for (const e of list) {
    const d = e.edgeDist(x, y);
    over = Math.min(over, d);
    if (!e.inZone(x, y, m)) continue;
    if (d < best) { best = d; owner = e; }
  }
  if (drag) owner = drag.e;
  for (const e of list) if (e === owner) e.pointer(x, y, mouse, down); else e.leave();
  document.body.classList.toggle('is-over-goo', over < 0);
}
const isMouse = (ev) => ev.pointerType === 'mouse' || ev.pointerType === 'pen';
const leaveAll = () => { for (const e of list) e.leave(); document.body.classList.remove('is-over-goo'); };
addEventListener('pointermove', (ev) => {
  if (drag && ev.pointerId === drag.id) moveDrag(ev);
  route(ev.clientX, ev.clientY, isMouse(ev), ptrDown);
}, { passive: true });
addEventListener('pointerdown', (ev) => { ptrDown = true; route(ev.clientX, ev.clientY, isMouse(ev), true); });
addEventListener('pointerup', (ev) => {
  ptrDown = false;
  endDrag(ev, false);
  if (ev.pointerType === 'touch') leaveAll(); else route(ev.clientX, ev.clientY, isMouse(ev), false);
});
addEventListener('pointercancel', (ev) => { ptrDown = false; endDrag(ev, true); leaveAll(); });
document.documentElement.addEventListener('pointerleave', () => { if (!drag) leaveAll(); });
addEventListener('blur', () => { ptrDown = false; leaveAll(); });

// ── dragging
for (const e of list) {
  e.hitEl.addEventListener('pointerdown', (ev) => {
    if (e.edgeDist(ev.clientX, ev.clientY) > 3) return;
    ev.preventDefault();
    const p = pos[e.theme];
    drag = { e, id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, ox: p.x - ev.clientX, oy: p.y - ev.clientY, moved: false, lt: performance.now() };
    try { e.hitEl.setPointerCapture(ev.pointerId); } catch {}
    e.press(true);
    raise(e);
  });
  e.hitEl.addEventListener('click', (ev) => { if (ev.detail === 0) strike(e); }); // keyboard
  e.hitEl.addEventListener('keydown', (ev) => {
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (!k) return;
    ev.preventDefault();
    const step = ev.shiftKey ? 48 : 14, p = pos[e.theme];
    [p.x, p.y] = clampPos(e.theme, p.x + k[0] * step, p.y + k[1] * step);
    e.fling(k[0] * step * 40, k[1] * step * 40);
    raise(e); e.place(); placeTag(e.theme); markMoved(); remember();
  });
}
function markMoved() { if (!store.moved) { store.moved = true; save(); } document.body.classList.add('has-moved'); }
function moveDrag(ev) {
  const d = drag, e = d.e;
  if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 6) {
    d.moved = true; e.press(false); markMoved();
    document.body.classList.add('is-dragging');
  }
  if (!d.moved) return;
  const p = pos[e.theme], now = performance.now(), dt = Math.max(8, now - d.lt) / 1000;
  const [x, y] = clampPos(e.theme, ev.clientX + d.ox, ev.clientY + d.oy);
  e.fling((x - p.x) / dt, (y - p.y) / dt);
  p.x = x; p.y = y; d.lt = now;
  e.place(); placeTag(e.theme);
}
function endDrag(ev, cancel) {
  if (!drag || ev.pointerId !== drag.id) return;
  const { e, moved } = drag;
  drag = null;
  document.body.classList.remove('is-dragging');
  if (moved) {
    // landing: a quick squash as it settles back on the paper
    e.press(true); setTimeout(() => e.press(false, pos[e.theme].x, pos[e.theme].y), 90);
    remember();
  } else {
    e.press(false, ev.clientX, ev.clientY);
    if (!cancel) strike(e);
  }
}
$('reset').addEventListener('click', () => {
  delete store.pos; save();
  for (const t of THEMES) engines[t].fling(rand(-900, 900), rand(-900, 900));
  layoutAll();
});

// ── strikes: a burst of real strands, white silk from Spidey, black goo from Venom
function strike(e) {
  navigator.vibrate?.(e.theme === 'venom' ? [10, 40, 18] : 12);
  e.shoot?.();
}

})();
