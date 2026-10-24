// Electric paths follow the same simulated strands used by the WebGL renderer.
function createElectricity(settings, reduced) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('electric-webs');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.setProperty('--electric-color', settings.color);
  document.body.append(svg);
  const pool = [];
  let burstUntil = 0, last = -Infinity;
  let nextFlash = 0, flashUntil = 0, combatUntil = 0, flashSamples = [];
  const between = range => range[0] + Math.random() * (range[1] - range[0]);
  function pathAt(i) {
    if (!pool[i]) {
      const g = document.createElementNS(ns, 'g');
      for (const [stroke, width, opacity] of [[settings.color, settings.width * 3, 0.45], [settings.core, settings.width, 1]]) {
        const path = document.createElementNS(ns, 'path');
        for (const [key, value] of Object.entries({ fill: 'none', stroke, 'stroke-width': width, opacity, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) path.setAttribute(key, value);
        g.append(path);
      }
      svg.append(g); pool.push(g);
    }
    return pool[i];
  }
  function wrap(points, now, seed, start) {
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    const total = cumulative.at(-1);
    if (total < settings.wrapRadius * 4) return [];
    const arcs = [];
    // A brief stationary arc curls around a small section of the white silk.
    {
      const count = Math.max(5, Math.ceil(total * settings.packetLength / 2));
      const arc = [];
      let segment = 1;
      for (let i = 0; i <= count; i++) {
        const distance = (start + settings.packetLength * i / count) * total;
        while (segment < points.length - 1 && cumulative[segment] < distance) segment++;
        const a = points[segment - 1], b = points[segment], length = cumulative[segment] - cumulative[segment - 1] || 1;
        const t = (distance - cumulative[segment - 1]) / length;
        const phase = distance * settings.frequency + seed;
        const offset = Math.sin(phase) * settings.wrapRadius + Math.sin(i * 12.7 + Math.floor(now / settings.interval)) * settings.jitter;
        const x = a[0] + (b[0] - a[0]) * t - (b[1] - a[1]) / length * offset;
        const y = a[1] + (b[1] - a[1]) * t + (b[0] - a[0]) / length * offset;
        arc.push(`${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
      }
      arcs.push(arc.join(' '));
    }
    return arcs;
  }
  return {
    burst(now) { burstUntil = now + settings.burstDuration; },
    combat(now) {
      if (now >= combatUntil) nextFlash = now;
      combatUntil = now + settings.combatFlash.hold;
      burstUntil = Math.max(burstUntil, combatUntil);
    },
    update(engine, now, force = false) {
      if (!force && now - last < settings.interval) return;
      last = now;
      const paths = !reduced && (engine.hasPointer || now < burstUntil) ? (engine.webPaths?.() || []).slice(0, settings.maxPaths) : [];
      if (paths.length && now >= nextFlash) {
        const activeCombat = now < combatUntil;
        flashUntil = now + between(activeCombat ? settings.combatFlash.duration : settings.flashDuration);
        nextFlash = flashUntil + between(activeCombat ? settings.combatFlash.pause : settings.flashPause);
        flashSamples = Array.from({ length: activeCombat ? settings.combatFlash.count : 1 }, () => ({ start: Math.random() * (1 - settings.packetLength), index: Math.floor(Math.random() * paths.length), seed: Math.random() * Math.PI * 2 }));
      }
      const arcs = paths.length && now < flashUntil ? flashSamples.flatMap(s => wrap(paths[s.index % paths.length], now, s.seed, s.start)) : [];
      arcs.forEach((d, i) => { const group = pathAt(i); group.style.display = ''; for (const path of group.children) path.setAttribute('d', d); });
      for (let i = arcs.length; i < pool.length; i++) pool[i].style.display = 'none';
    },
  };
}
