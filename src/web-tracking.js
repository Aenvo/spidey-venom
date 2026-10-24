// Reframe a live strand without resetting its shape or injecting Verlet velocity.
// Both its source and destination stay in world coordinates while either button moves.
function reframeWeb(strand, frame) {
  const previous = strand.tracking.frame;
  if (previous && previous.scale === frame.scale && ['origin', 'source', 'target'].every(key => previous[key].every((v, i) => v === frame[key][i]))) return;
  if (previous) {
    const count = strand.pos.length / 3, growth = frame.growth;
    for (const points of [strand.pos, strand.prev]) {
      for (let i = 0; i < count; i++) {
        const weight = i / (count - 1) * growth;
        for (let axis = 0; axis < 2; axis++) {
          const deltaSource = frame.source[axis] - previous.source[axis];
          const deltaTarget = frame.target[axis] - previous.target[axis];
          const world = points[i * 3 + axis] * previous.scale + previous.origin[axis];
          points[i * 3 + axis] = (world + (1 - weight) * deltaSource + weight * deltaTarget - frame.origin[axis]) / frame.scale;
        }
      }
    }
  }
  strand.tgt = [(frame.target[0] - frame.origin[0]) / frame.scale, (frame.target[1] - frame.origin[1]) / frame.scale, strand.tgt[2]];
  strand.tracking.frame = frame;
}
