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
const THEMES = Object.keys(BUTTON_THEMES);
for (const t of THEMES) {
  const config = BUTTON_THEMES[t], canvas = document.createElement('canvas'), button = document.createElement('button');
  canvas.id = `stage-${t}`; canvas.className = 'stage'; canvas.setAttribute('aria-hidden', 'true');
  button.id = `btn-${t}`; button.className = 'goo-btn'; button.type = 'button'; button.textContent = config.label; button.setAttribute('aria-label', config.aria);
  if (config.electricity) {
    button.dataset.electric = '';
    const cssColor = c => `rgb(${c.map(v => Math.round(Math.pow(v, 1 / 2.2) * 255)).join(' ')})`;
    button.style.setProperty('--fallback-base', cssColor(config.suit.base));
    button.style.setProperty('--fallback-icon', cssColor(config.iconColor));
    button.style.setProperty('--electric-color', config.electricity.color);
  }
  $('buttons').append(canvas, button);
}
const LS = 'spidey-x-venom:v1';
let store = {};
try { store = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch { store = {}; }
const save = () => { try { localStorage.setItem(LS, JSON.stringify(store)); } catch {} };

// ── positions (page px, centre of each pill); persisted as fractions of the viewport
const pos = Object.fromEntries(THEMES.map(t => [t, { x: innerWidth / 2, y: innerHeight / 2 }]));
function defaults() {
  const W = innerWidth, H = innerHeight;
  const hero = { bottom: H * 0.12 }, foot = { top: H - 60 };
  if (W < 761) {
    const top = hero.bottom + 58, bot = foot.top - 52;
    const gap = clamp((bot - top) / Math.max(1, THEMES.length - 1), 110, 180), mid = (top + bot) / 2;
    return Object.fromEntries(THEMES.map((t, i) => [t, { x: W / 2, y: mid + (i - (THEMES.length - 1) / 2) * gap }]));
  }
  const columns = 2, rows = Math.ceil(THEMES.length / columns);
  const dx = clamp(W * 0.18, 180, 330), dy = clamp(H * 0.3, 200, 280);
  return Object.fromEntries(THEMES.map((t, i) => {
    const row = Math.floor(i / columns), count = Math.min(columns, THEMES.length - row * columns);
    return [t, { x: W / 2 + (i % columns - (count - 1) / 2) * dx * 2, y: H / 2 + (row - (rows - 1) / 2) * dy }];
  }));
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
const engines = {};
const electric = Object.fromEntries(THEMES.filter(t => BUTTON_THEMES[t].electricity).map(t => [t, createElectricity(BUTTON_THEMES[t].electricity, reduced)]));
const defenses = Object.fromEntries(Object.keys(electric).map(t => [t, { target: null, nextStrike: 0, nextRescue: 0, nextKnockback: 0, phase: 'idle', ally: null, rescueHitAt: 0, attackAfter: 0 }]));
function fallback(t) {
  const el = $(`btn-${t}`), p = pos[t];
  return {
    theme: t, hitEl: el, canvas: $(`stage-${t}`), engaged: false, hasPointer: false,
    place() { Object.assign(el.style, { width: '170px', height: '60px', transform: `translate3d(${p.x - 85}px, ${p.y - 30}px, 0)` }); },
    edgeDist(x, y) { return Math.hypot(Math.max(Math.abs(x - p.x) - 55, 0), y - p.y) - 30; },
    nearest() { return [p.x, p.y]; }, inZone: () => false, pointer() {}, leave() {}, target() {}, press() {}, fling() {},
    size: () => ({ hw: 85, hh: 30 }),
    infection: 0, cleanse() {}, shock() {},
  };
}
// dropped close together they fight: each reaches for the other, and the symbiote slowly takes Spidey's suit.
// Only the pair being dragged pauses; other ongoing infections keep their state.
const fighting = {};
const knockbacks = {};
let lastCombatTime = performance.now();
const edgeGap = (a, b) => { const p = engines[b].nearest(pos[a].x, pos[a].y, COMBAT.inset); return engines[a].edgeDist(...p); };
const sendWeb = (from, to, now) => {
  const resolve = () => engines[to].nearest(pos[from].x, pos[from].y);
  engines[from].shootAt?.(...resolve(), resolve);
  electric[from].burst(now);
};
function refreshTargets(now, effects = false) {
  for (const e of list) e.refreshTargets?.();
  if (effects) for (const e of list) electric[e.theme]?.update(e, now, true);
}
const webTouches = (paths, target, tolerance) => paths.some(points => points.some((p, i) => i > 0 && Math.hypot(p[0] - points[0][0], p[1] - points[0][1]) > tolerance && engines[target].edgeDist(...p) <= tolerance));
function repel(attacker, defender, distance) {
  const a = pos[attacker], b = pos[defender], angle = Math.atan2(a.y - b.y, a.x - b.x);
  const candidates = [0, Math.PI / 3, -Math.PI / 3, Math.PI * 2 / 3, -Math.PI * 2 / 3].map(turn => clampPos(attacker, a.x + Math.cos(angle + turn) * distance, a.y + Math.sin(angle + turn) * distance));
  candidates.sort((p, q) => Math.hypot(q[0] - b.x, q[1] - b.y) - Math.hypot(p[0] - b.x, p[1] - b.y));
  const [x, y] = candidates[0];
  knockbacks[attacker] = { vx: (x - a.x) * COMBAT.knockbackDamping, vy: (y - a.y) * COMBAT.knockbackDamping };
}
function moveKnockbacks(now) {
  const dt = clamp((now - lastCombatTime) / 1000, 0, 0.05); lastCombatTime = now;
  const decay = Math.exp(-COMBAT.knockbackDamping * dt), step = (1 - decay) / COMBAT.knockbackDamping;
  for (const [t, velocity] of Object.entries(knockbacks)) {
    if (drag?.e.theme === t) { delete knockbacks[t]; continue; }
    const p = pos[t], [x, y] = clampPos(t, p.x + velocity.vx * step, p.y + velocity.vy * step);
    if (x === p.x && dt > 0) velocity.vx = 0;
    if (y === p.y && dt > 0) velocity.vy = 0;
    p.x = x; p.y = y; engines[t].fling(velocity.vx, velocity.vy); engines[t].place(); placeTag(t);
    velocity.vx *= decay; velocity.vy *= decay;
    if (Math.hypot(velocity.vx, velocity.vy) < COMBAT.settleSpeed) { delete knockbacks[t]; remember(); }
  }
}
function updateCombat(now) {
  moveKnockbacks(now);
  refreshTargets(now);
  const requested = {}, protectedBy = {}, guardians = {};
  const paths = Object.fromEntries(Object.keys(electric).map(t => [t, engines[t].webPaths?.() || []]));
  for (const t of THEMES) {
    const e = engines[t], candidates = BUTTON_THEMES[t].targets.filter(id => engines[id]);
    candidates.sort((a, b) => edgeGap(t, a) - edgeGap(t, b));
    const other = candidates[0], gap = other ? edgeGap(t, other) : Infinity;
    const pairDragged = drag && (drag.e.theme === t || drag.e.theme === other);
    if (!pairDragged && !e.hasPointer && gap > -2 && gap < (fighting[t] ? COMBAT.release : COMBAT.reach)) requested[t] = other;
  }
  for (const t of Object.keys(electric)) {
    const settings = BUTTON_THEMES[t].electricity, state = defenses[t];
    for (const ally of THEMES) if (ally !== t && BUTTON_THEMES[ally].canBeInfected && edgeGap(t, ally) < settings.rescueRange) {
      guardians[ally] = t;
      const threatened = THEMES.some(id => requested[id] === ally && BUTTON_THEMES[id].infects);
      if (!state.ally && engines[ally].infection > settings.rescueComplete) {
        state.ally = ally; state.phase = 'rescue'; state.rescueHitAt = 0;
        state.target = THEMES.find(id => requested[id] === ally && BUTTON_THEMES[id].infects) || state.target || THEMES.filter(id => BUTTON_THEMES[id].infects).sort((a, b) => edgeGap(t, a) - edgeGap(t, b))[0];
      }
      if ((engines[ally].infection > 0.001 || threatened) && now >= state.nextRescue) {
        sendWeb(t, ally, now); state.nextRescue = now + settings.attackInterval;
      }
      if (webTouches(paths[t], ally, settings.contactTolerance)) {
        engines[ally].cleanse(); protectedBy[ally] = t;
        if (state.ally === ally) { electric[t].combat(now); if (!state.rescueHitAt) state.rescueHitAt = now; }
      }
    }
    if (state.ally) {
      if (edgeGap(t, state.ally) > settings.rescueRange) { state.ally = null; state.target = null; state.phase = 'idle'; }
      else if (state.rescueHitAt && engines[state.ally].infection <= settings.rescueComplete && now - state.rescueHitAt >= settings.rescueMinDuration) {
        state.ally = null; state.phase = 'attack'; state.attackAfter = now + settings.transferDelay;
      }
    }
  }
  for (const [attacker, target] of Object.entries(requested)) {
    if (!BUTTON_THEMES[attacker].infects) continue;
    const guardian = guardians[target] || (electric[target] ? target : null);
    if (!guardian) continue;
    defenses[guardian].target = attacker;
    if (defenses[guardian].phase === 'idle') defenses[guardian].phase = 'attack';
    if (protectedBy[target]) delete requested[attacker];
  }
  for (const [guardian, state] of Object.entries(defenses)) {
    const settings = BUTTON_THEMES[guardian].electricity;
    if (state.phase === 'rescue' || now < state.attackAfter) { if (state.target) engines[state.target].stopShock?.(); continue; }
    if (!state.target) {
      state.target = THEMES.filter(id => BUTTON_THEMES[id].infects && edgeGap(guardian, id) < settings.triggerRange).sort((a, b) => edgeGap(guardian, a) - edgeGap(guardian, b))[0] || null;
      if (state.target) state.phase = 'attack';
    }
    const contact = THEMES.find(id => BUTTON_THEMES[id].infects && edgeGap(guardian, id) <= settings.attackRange && webTouches(paths[guardian], id, settings.contactTolerance));
    if (contact) { state.target = contact; state.phase = 'attack'; }
    const attacker = state.target;
    if (!attacker) continue;
    if (edgeGap(guardian, attacker) > settings.attackRange) { engines[attacker].stopShock?.(); state.target = null; state.phase = 'idle'; continue; }
    {
      requested[guardian] = attacker;
      if (now >= state.nextStrike) {
        state.nextStrike = now + settings.attackInterval;
        sendWeb(guardian, attacker, now);
      }
      if (webTouches(paths[guardian], attacker, settings.contactTolerance)) {
        delete requested[attacker];
        engines[attacker].shock(settings.shockDuration);
        electric[guardian].combat(now);
        if (settings.knockback && now >= state.nextKnockback && drag?.e.theme !== attacker) {
          state.nextKnockback = now + settings.knockback.cooldown;
          repel(attacker, guardian, settings.knockback.distance);
        }
      } else {
        engines[attacker].stopShock?.();
      }
    }
  }
  for (const t of THEMES) {
    const other = requested[t], e = engines[t]; fighting[t] = !!other;
    const p = other ? engines[other].nearest(pos[t].x, pos[t].y, COMBAT.inset) : [null, null];
    e.target(...p);
    const infector = THEMES.find(id => requested[id] === t && BUTTON_THEMES[id].infects);
    const dx = infector ? pos[infector].x - pos[t].x : 1, dy = infector ? pos[infector].y - pos[t].y : 0, length = Math.hypot(dx, dy) || 1;
    e.setInfect?.(infector && !protectedBy[t] ? 1 : 0, dx / length, dy / length);
  }
}
function tick(e) {
  const now = performance.now();
  if (e.theme === THEMES[0]) updateCombat(now);
  electric[e.theme]?.update(e, now);
}
const onEngage = () => document.body.classList.toggle('is-engaged', THEMES.some((t) => engines[t]?.engaged));

const scaleFor = () => (innerWidth >= 761 ? clamp(Math.min(innerWidth / 1080, innerHeight / 720), 1, 1.5) : 1);
layoutAll();
for (const t of THEMES) {
  const e = createGoo({
    ...BUTTON_THEMES[t], labelStyle: BUTTON_LABEL_STYLE, theme: t,
    canvas: $(`stage-${t}`), hitEl: $(`btn-${t}`), pos: pos[t], pad: coarse ? 215 : 250, maxPpv: coarse ? 1.75 : 1.6,
    tick, onEngage, scale: scaleFor(),
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
    raise(e); e.place(); refreshTargets(performance.now(), true); placeTag(e.theme); markMoved(); remember();
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
  e.place(); refreshTargets(now, true); placeTag(e.theme);
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
  electric[e.theme]?.burst(performance.now());
}

})();
