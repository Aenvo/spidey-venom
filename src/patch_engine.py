import re, sys
src = open('engine.orig.js', encoding='utf-8').read()
def rep(old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, (old[:80], n)
    src = src.replace(old, new)

rep("'use strict';\n(() => {", "'use strict';\nfunction createGoo(cfg) {")
rep("const DEFAULTS = { ...P };", "Object.assign(P, cfg.params || {});\nconst DEFAULTS = { ...P };")
rep("const VIEW_SCALE = Math.min(4, Math.max(1, Number(new URLSearchParams(location.search).get('scale')) || 1));\nconst viewW = () => innerWidth / VIEW_SCALE, viewH = () => innerHeight / VIEW_SCALE;",
    "const VIEW_SCALE = 1;\nlet CW = 400, CH = 300;\nconst PAD = cfg.pad || 200;\nconst viewW = () => CW, viewH = () => CH;")
rep("const LABEL_TEXT = 'let’s collaborate';", "const LABEL_TEXT = cfg.label;")
rep("""const canvas = document.getElementById('stage');
const hitEl = document.getElementById('venom');
const hintEl = document.getElementById('hint');
const panelEl = document.getElementById('panel');
const tuneToggle = document.getElementById('tuneToggle');""", "const canvas = cfg.canvas;\nconst hitEl = cfg.hitEl;")
rep("pressTarget: 0, intro: reduced ? 1 : 0, introV: 0 };", "pressTarget: 0, intro: reduced ? 1 : 0, introV: 0, sx: 0, sxV: 0, sy: 0, syV: 0, dvx: 0, dvy: 0 };")
rep("const cur = { x: -1e4, y: -1e4, vx: 0, vy: 0, lx: -1e4, ly: -1e4, present: false, down: false, mouse: false, t: 0 };",
    "const cur = { x: -1e4, y: -1e4, vx: 0, vy: 0, lx: -1e4, ly: -1e4, present: false, down: false, mouse: false, t: 0, real: false, virtual: false };")
rep("alpha: false, depth: false", "alpha: true, premultipliedAlpha: true, depth: false")
rep("""  document.body.classList.add('no-gl');
  layoutButton();
  addEventListener('resize', layoutButton);
  return;
}
document.body.classList.add('has-gl');""", "  document.body.classList.add('no-gl');\n  return null;\n}\ndocument.body.classList.add('has-gl');")
rep("uniform vec4 uHand2;\nout vec4 outC;\n\nvec3 KEY;", "uniform vec4 uHand2;\nuniform float uTheme;\nuniform vec4 uInfect;\nout vec4 outC;\n\nvec3 KEY;")

SUIT = r'''
// Spidey's suit: deep blue with a fine embossed web (rays + scalloped rings) that quiets behind the letters.
// uInfect: the symbiote takes the suit over from the side facing Venom while they fight
vec3 suitAlbedo(vec2 p, float strand) {
  vec2 q = p - uBtnP.xy, b = uBtnP.zw;
  float a = b.x - b.y;
  float u = -(length(vec2(max(abs(q.x) - a, 0.0), q.y)) - b.y);
  float px = 1.0 / uDpr;
  vec2 wq = q * vec2(0.62, 1.0);
  float r = length(wq);
  float sec = atan(wq.y, wq.x) * 14.0 / 6.28318;
  float fs = fract(sec);
  float dRay = min(fs, 1.0 - fs) * 6.28318 / 14.0 * r;
  float rc = (r + 2.4 * sin(3.14159 * fs)) / 7.5;
  float dRing = abs(fract(rc + 0.5) - 0.5) * 7.5;
  float w = 0.3;
  float line = max((1.0 - smoothstep(w, w + 1.1 * px, dRay)) * smoothstep(3.0, 7.0, r),
                   (1.0 - smoothstep(w, w + 1.1 * px, dRing)) * smoothstep(4.0, 8.0, r));
  line *= smoothstep(0.8, 2.6, u) * mix(0.35, 1.0, smoothstep(7.0, 13.0, abs(q.y)));
  vec3 alb = vec3(0.018, 0.085, 0.52) * (0.9 + 0.1 * smoothstep(0.0, b.y, u));
  alb = mix(alb, vec3(0.004, 0.012, 0.07), line * 0.75);
  float sF = dot(q, uInfect.xy) / b.x;
  float front = 1.0 - 2.5 * uInfect.z + 0.4 * (vn(p * 0.08 + vec2(uTime * 0.25, -uTime * 0.18)) - 0.5);
  float inf = smoothstep(front - 0.07, front + 0.07, sF) * step(0.003, uInfect.z);
  alb = mix(alb, vec3(0.0007), inf);
  vec3 silk = mix(vec3(0.8, 0.81, 0.84), vec3(0.0007), smoothstep(0.35, 0.85, uInfect.z));
  return mix(alb, silk, smoothstep(0.1, 0.6, strand));
}

vec3 shadeGoo(vec2 p, vec4 g) {'''
rep("\nvec3 shadeGoo(vec2 p, vec4 g) {", SUIT)
rep("""  vec3 diff = vec3(0.0007) * (1.8 * max(dot(N, KEY), 0.0) * sh + 0.9 * ao);
  vec3 col = diff + spec;""", """  vec3 diff = vec3(0.0007) * (1.8 * max(dot(N, KEY), 0.0) * sh + 0.9 * ao);
  if (uTheme > 0.5) {
    diff = suitAlbedo(p, strandness) * (1.15 * max(dot(N, KEY), 0.0) * sh + 0.55 * ao);
    spec *= mix(0.7, 0.85, strandness);
  }
  vec3 col = diff + spec;""")

MAIN_OLD = src[src.index("vec3 aces(vec3 x)"):src.index("}`;", src.index("vec3 aces(vec3 x)"))]
MAIN_NEW = r'''vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 toSRGB(vec3 c) { return pow(aces(c * 0.95), vec3(1.0 / 2.2)); }

// transparent page: the white studio floor is dropped and only its shadows are kept, as alpha, so the
// buttons sit on whatever the page draws underneath exactly as dark as they would on the white floor
float floorShadow(vec2 p) {
  float sh = 1.0, ao = 1.0;
  if (isNear(p)) { sh = softShadow(p, 0.0); ao = mix(occlusion(p, 0.0), 1.0, 0.55 * uLift); }
  float d0 = 1.3 * KEY.z, a0 = 1.2;
  float full = 0.865 * (d0 + a0);
  float lit = 0.865 * (d0 * sh + a0 * ao) * (1.0 - buttonShadow(p) * 0.95);
  return clamp(1.0 - toSRGB(vec3(lit)).x / toSRGB(vec3(full)).x, 0.0, 1.0);
}

void main() {
  KEY = normalize(vec3(-0.45, -0.56, 0.74));
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec4 g = gAt(c);
  vec4 res;
  if (g.w < 0.5) {
    vec2 cv = uRes / uDpr;
    float edgeD = min(min(p.x, p.y), min(cv.x - p.x, cv.y - p.y));
    float a = max(floorShadow(p) * 1.05 - 0.008, 0.0) * smoothstep(0.0, 56.0, edgeD);
    res = vec4(vec3(0.03, 0.02, 0.05) * a, a);
    float cov = clamp(0.5 - g.x * uDpr, 0.0, 1.0);
    if (cov > 0.0) {
      vec4 n0 = gAt(c + ivec2(1, 0)), n1 = gAt(c - ivec2(1, 0)), n2 = gAt(c + ivec2(0, 1)), n3 = gAt(c - ivec2(0, 1));
      vec4 gn = n0.w > 0.5 ? n0 : n1.w > 0.5 ? n1 : n2.w > 0.5 ? n2 : n3.w > 0.5 ? n3 : vec4(0.0);
      vec3 gc = gn.w > 0.5 ? shadeAny(p, gn) : vec3(uTheme > 0.5 ? 0.5 : 0.012);
      res = mix(res, vec4(toSRGB(gc), 1.0), cov);
    }
  } else {
    res = vec4(toSRGB(shadeAny(p, g)), 1.0);
  }
  res.rgb += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0 * res.a;
  outC = vec4(clamp(res.rgb, 0.0, res.a), res.a);
'''
rep(MAIN_OLD, MAIN_NEW)
rep('  vec3 silver = vec3(0.9, 0.91, 0.94);\n', '  float dk = uTheme > 0.5 ? 1.0 - smoothstep(0.55, 0.95, uInfect.z) : 0.0;\n  vec3 silver = mix(vec3(0.9, 0.91, 0.94), vec3(0.012, 0.012, 0.016), dk);\n')
rep('  col += vec3(1.0) * 0.55 * edge * smoothstep(0.1, 0.9, facing);\n', '  col += vec3(1.0) * mix(0.55, 0.06, dk) * edge * smoothstep(0.1, 0.9, facing);\n')
rep("'uHandCol', 'uArrowCol', 'uMorph', 'uHand', 'uHand2']);", "'uHandCol', 'uArrowCol', 'uMorph', 'uHand', 'uHand2', 'uTheme', 'uInfect']);")

FX_OLD = src[src.index("float luma(vec3 c)"):src.index("}`;", src.index("float luma(vec3 c)"))]
FX_NEW = r'''// premultiplied: edges are judged as if composited over paper, so dark goo on a clear background still gets smoothed
float luma(vec4 c) { return dot(c.rgb, vec3(0.299, 0.587, 0.114)) + 0.92 * (1.0 - c.a); }
void main() {
  vec2 px = 1.0 / uRes, uv = gl_FragCoord.xy * px;
  vec4 cM = texture(uC, uv);
  float lNW = luma(texture(uC, uv + vec2(-1.0, -1.0) * px)), lNE = luma(texture(uC, uv + vec2(1.0, -1.0) * px));
  float lSW = luma(texture(uC, uv + vec2(-1.0, 1.0) * px)), lSE = luma(texture(uC, uv + vec2(1.0, 1.0) * px));
  float lM = luma(cM);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  if (lMax - lMin < max(0.03, lMax * 0.08)) { outC = cM; return; }
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
  float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
  dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + reduce), -8.0, 8.0) * px;
  vec4 A = 0.5 * (texture(uC, uv - dir / 6.0) + texture(uC, uv + dir / 6.0));
  vec4 B = A * 0.5 + 0.25 * (texture(uC, uv - dir * 0.5) + texture(uC, uv + dir * 0.5));
  float lB = luma(B);
  outC = (lB < lMin || lB > lMax) ? A : B;
'''
rep(FX_OLD, FX_NEW)

# label: emblem + letter-spaced text
LBL_OLD = src[src.index("async function setLabelText(text) {"):src.index("setLabelText(LABEL_TEXT);")]
LBL_NEW = r'''function drawSpider(ctx, x, y, s, venom) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'white'; ctx.strokeStyle = 'white'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.ellipse(0, -14, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 10, 10, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -27, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = venom ? 5.5 : 5;
  for (const sd of [-1, 1]) {
    const legs = venom
      ? [[[6, -18], [28, -40], [22, -62]], [[7, -12], [40, -18], [50, -44]], [[7, -8], [40, 4], [52, 30]], [[6, -4], [24, 30], [26, 58]]]
      : [[[6, -18], [22, -30], [20, -48]], [[7, -12], [30, -16], [36, -32]], [[7, -8], [30, -2], [36, 16]], [[6, -4], [20, 14], [22, 34]]];
    for (const [a, c, e] of legs) {
      ctx.beginPath(); ctx.moveTo(a[0] * sd, a[1]); ctx.quadraticCurveTo(c[0] * sd, c[1], e[0] * sd, e[1]); ctx.stroke();
    }
  }
  ctx.restore();
}
async function setLabelText(text) {
  await fontReady;
  const venom = cfg.theme !== 'spidey';
  lctx.clearRect(0, 0, LABEL_W, LABEL_H);
  lctx.font = `700 ${LABEL_PX}px "Geist", system-ui, sans-serif`;
  if ('letterSpacing' in lctx) lctx.letterSpacing = '10px';
  lctx.fillStyle = 'white';
  lctx.textAlign = 'left';
  lctx.textBaseline = 'alphabetic';
  const m = lctx.measureText(text);
  const tw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight - ('letterSpacing' in lctx ? 10 : 0);
  const es = venom ? 1.25 : 1.3, ew = (venom ? 108 : 76) * es, gap = 34;
  const total = ew + gap + tw, x0 = (LABEL_W - total) / 2;
  const capH = m.actualBoundingBoxAscent;
  drawSpider(lctx, x0 + ew / 2, LABEL_H / 2 + (venom ? 0 : 2), es * (venom ? 0.95 : 1.0), venom);
  lctx.fillText(text, x0 + ew + gap + m.actualBoundingBoxLeft, LABEL_H / 2 + capH / 2);
  labelInkW = total;
  uploadLabel();
  labelAmt = 0; labelTarget = 1;
  hitEl.setAttribute('aria-label', cfg.aria || text);
  layoutButton();
}
'''
rep(LBL_OLD, LBL_NEW)

rep("""    hw: btn.hh * 0.5 + (btn.hw - btn.hh * 0.5) * e + 2.5 * pr,
    hh: btn.hh * (0.55 + 0.45 * e) + 1 * pr,""", """    hw: btn.hh * 0.5 + (btn.hw - btn.hh * 0.5) * e + 2.5 * pr + btn.sx,
    hh: btn.hh * (0.55 + 0.45 * e) + 1 * pr + btn.sy,""")
# drag jelly
rep("  spring(btn, 'press', 'pressV', btn.pressTarget, 30, 0.75, dt);\n",
    """  spring(btn, 'press', 'pressV', btn.pressTarget, 30, 0.75, dt);
  const adx = Math.abs(btn.dvx), ady = Math.abs(btn.dvy);
  spring(btn, 'sx', 'sxV', clamp(0.006 * adx - 0.004 * ady, -6, 10), 26, 0.32, dt);
  spring(btn, 'sy', 'syV', clamp(0.004 * ady - 0.003 * adx, -5, 6), 26, 0.32, dt);
  btn.dvx *= Math.exp(-dt * 9); btn.dvy *= Math.exp(-dt * 9);
""")
# virtual target: strands aim at the other button instead of the hand
rep("  s.wrap = { f, prog: 0, th0: null, dir: 1, ph: rand(0, 6.28), slide: 0, r: 0.7 };",
    "  s.wrap = cur.virtual ? null : { f, prog: 0, th0: null, dir: 1, ph: rand(0, 6.28), slide: 0, r: 0.7 };\n  s.vo = [rand(-16, 16), rand(-8, 8)];")
rep("    T = coilStart(s);\n    if (s.state === 'attached') {",
    "    T = s.wrap ? coilStart(s) : [cur.x + (s.vo ? s.vo[0] : 0), cur.y + (s.vo ? s.vo[1] : 0), 9];\n    if (s.state === 'attached') {")

# layout / resize / loop
LAY_OLD = src[src.index("function layoutButton() {"):src.index("let last = performance.now()")]
LAY_NEW = r'''let allocReady = false, S = cfg.scale || 1;
function layoutButton() {
  const sc = LABEL_CSS / LABEL_PX;
  btn.hh = 30;
  btn.hw = ((labelInkW || 420) * sc) / 2 + 30;
  btn.lbw = (LABEL_W * sc) / 2;
  btn.lbh = (LABEL_H * sc) / 2;
  CW = Math.ceil(btn.hw * 2 + PAD * 2);
  CH = Math.ceil(btn.hh * 2 + PAD * 2);
  btn.cx = CW / 2; btn.cy = CH / 2;
  place();
  if (allocReady) alloc();
}
function place() {
  const ox = cfg.pos.x - (CW * S) / 2, oy = cfg.pos.y - (CH * S) / 2;
  canvas.style.width = `${CW * S}px`; canvas.style.height = `${CH * S}px`;
  canvas.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
  hitEl.style.width = `${btn.hw * 2 * S}px`; hitEl.style.height = `${btn.hh * 2 * S}px`;
  hitEl.style.transform = `translate3d(${cfg.pos.x - btn.hw * S}px, ${cfg.pos.y - btn.hh * S}px, 0)`;
}
function alloc() {
  const ppv = Math.min((devicePixelRatio || 1) * S, cfg.maxPpv || 1.6) * quality;
  const w = Math.max(1, Math.round(CW * ppv)), h = Math.max(1, Math.round(CH * ppv));
  if (w === W && h === H && gTex) return;
  W = w; H = h;
  canvas.width = W; canvas.height = H;
  DPR = W / viewW();
  makeGBuffer();
}
function resize() { layoutButton(); allocReady = true; alloc(); }
addEventListener('resize', () => alloc());
resize();

'''
rep(LAY_OLD, LAY_NEW)
rep("  while (acc >= SUB && n < 40 && !window.VenomButton?._debug.paused) { step(SUB); acc -= SUB; n++; }",
    "  cfg.tick?.(api);\n  while (acc >= SUB && n < 40) { step(SUB); acc -= SUB; n++; }")
rep("  if (hand.on !== document.body.classList.contains('is-engaged')) document.body.classList.toggle('is-engaged', hand.on);",
    "  if (hand.on !== api.engaged) { api.engaged = hand.on; cfg.onEngage?.(); }")
rep("  if (slowFor > 2 && quality > 0.8) { quality -= 0.1; slowFor = 0; resize(); }", "  if (slowFor > 1.2 && quality > 0.55) { quality -= 0.1; slowFor = 0; alloc(); }")
rep("requestAnimationFrame(frame);\n\n//", "//")

INP_OLD = src[src.index("// ───────────────────────────── input ─────────────────────────────"):]
INP_NEW = r'''// ───────────────────────────── API (pointer routing + dragging live in the page controller) ─────────────────────────────
const toLocal = (x, y) => [(x - cfg.pos.x) / S + CW / 2, (y - cfg.pos.y) / S + CH / 2];
const api = {
  theme: cfg.theme, hitEl, canvas, engaged: false, place, btn,
  edgeDist(px, py) { const [x, y] = toLocal(px, py); return pillEdge(x, y, geo()).d * S; },
  nearest(px, py, inset = 0) {
    const [x, y] = toLocal(px, py), e = pillEdge(x, y, geo(), inset);
    return [(e.x - CW / 2) * S + cfg.pos.x, (e.y - CH / 2) * S + cfg.pos.y];
  },
  inZone(px, py, m) { const [x, y] = toLocal(px, py); m /= S; return x > m && y > m && x < CW - m && y < CH - m; },
  pointer(px, py, mouse, down) {
    const [ex, ey] = toLocal(px, py), now = performance.now(), dts = Math.max(1, now - cur.t) / 1000;
    if (cur.virtual) { cur.virtual = false; releaseAll(false); cur.present = false; }
    if (cur.present) { cur.vx = (ex - cur.lx) / dts; cur.vy = (ey - cur.ly) / dts; }
    cur.t = now; cur.x = cur.lx = ex; cur.y = cur.ly = ey;
    cur.mouse = mouse; cur.down = down; cur.real = true;
    cur.present = mouse || down;
  },
  leave() { if (cur.real) { cur.real = false; cur.present = false; cur.down = false; } },
  get hasPointer() { return cur.real && cur.present; },
  target(px, py) { // aim the strands at a point on the other button (null to let go)
    if (cur.real) return;
    if (px === null) { if (cur.virtual) { cur.virtual = false; cur.present = false; } return; }
    const [x, y] = toLocal(px, py);
    if (!cur.virtual) { releaseAll(false); cur.vx = cur.vy = 0; }
    cur.virtual = true; cur.mouse = false; cur.present = true; cur.x = cur.lx = x; cur.y = cur.ly = y;
  },
  press(on, px, py) {
    btn.pressTarget = on ? 1 : 0;
    if (!on) {
      const [x, y] = px === undefined ? [btn.cx, btn.cy] : toLocal(px, py);
      addRipple(x, y, 1.6);
      for (const s of strands) if (s.state === 'attached') s.rest *= 0.82;
    }
  },
  fling(vx, vy) { btn.dvx = vx / S; btn.dvy = vy / S; },
  size: () => ({ hw: btn.hw * S, hh: btn.hh * S }),
  setScale(s) { if (s === S) return; S = s; place(); alloc(); },
};
requestAnimationFrame(frame);
return api;
}
'''
rep(INP_OLD, INP_NEW)
# tap: real strands shot out in random directions; fight infection state
rep("function spawnProbe(g) {", """const shotQueue = [];
const infect = { amt: 0, target: 0, dx: 1, dy: 0 };
function spawnShot(g, q) {
  if (strands.length >= MAXS - 1) return;
  const far = pillEdge(g.cx + Math.cos(q.a) * 600, g.cy + Math.sin(q.a) * 600, g);
  const s = newStrand('shot', g, far.x, far.y);
  const dx = far.nx * Math.cos(q.spread) - far.ny * Math.sin(q.spread), dy = far.nx * Math.sin(q.spread) + far.ny * Math.cos(q.spread);
  s.tgt = [far.x + dx * q.d, far.y + dy * q.d, q.z];
  s.ttl = q.ttl;
  const rr = cfg.theme === 'spidey' ? 1.45 : 1.75;
  s.vol = Math.PI * rr * rr * (q.d + 40);
  strands.push(s);
}
function spawnProbe(g) {""")
rep("  for (let i = 0; i < strands.length; i++) stepStrand(strands[i], dt, g, present, inside);",
    "  while (shotQueue.length && shotQueue[0].at <= time) spawnShot(g, shotQueue.shift());\n  infect.amt += (infect.target - infect.amt) * (1 - Math.exp(-dt * (infect.target > infect.amt ? 0.5 : 1.1)));\n  for (let i = 0; i < strands.length; i++) stepStrand(strands[i], dt, g, present, inside);")
rep("  } else if (s.kind === 'micro' && s.state !== 'recoil') {",
    "  } else if (s.kind === 'shot' && s.state !== 'recoil') {\n    T = s.tgt;\n    if (s.life > s.ttl) { s.state = 'recoil'; T = null; }\n  } else if (s.kind === 'micro' && s.state !== 'recoil') {")
rep("  gl.uniform1f(u2.uMorph, hand.m);\n", "  gl.uniform1f(u2.uMorph, hand.m);\n  gl.uniform4f(u2.uInfect, infect.dx, infect.dy, infect.amt, 0);\n")
rep("  fling(vx, vy) {", """  shoot() {
    const n = 5 + Math.floor(Math.random() * 3), base = Math.random() * Math.PI * 2;
    let t = time;
    for (let i = 0; i < n; i++) {
      t += rand(0.025, 0.06);
      shotQueue.push({ at: t, a: base + (i / n) * Math.PI * 2 + rand(-0.35, 0.35), d: rand(115, 205), spread: rand(-0.4, 0.4), z: rand(1, 3), ttl: rand(0.8, 1.3) });
    }
  },
  setInfect(target, dx, dy) { infect.target = target; if (target > 0) { infect.dx = dx; infect.dy = dy; } },
  fling(vx, vy) {""")
rep("  render();\n  // adaptive resolution if the GPU struggles\n  if (frameEma > 1 / 40 &&",
    "  // nothing moving: redraw a few times a second for the slow glint instead of every frame\n  const busy = strands.length || crawlers.length || ripples.length || cur.present || hand.on || shotQueue.length ||\n    btn.intro < 0.999 || labelAmt < 0.999 || Math.abs(btn.liftV) + Math.abs(btn.pressV) + Math.abs(btn.sxV) + Math.abs(btn.syV) > 0.02 ||\n    Math.abs(infect.target - infect.amt) > 0.002 || btn.lift > 0.002;\n  if (busy || ++idleFrames % 6 === 0) render();\n  // adaptive resolution if the GPU struggles\n  if (busy && frameEma > 1 / 50 &&")
rep("let last = performance.now(), acc = 0,", "let idleFrames = 0;\nlet last = performance.now(), acc = 0,")
open('engine.js', 'w', encoding='utf-8', newline='').write(src)
print('ok', len(src))
