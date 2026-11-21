// Mothlight Heist — the player: Moth, a small thief in a hooded cloak.
// Walks fast and loud, sneaks slow and quiet, hides in ferns, and throws
// pebbles to pull a guard's attention somewhere else.

import { TILE, moveCircle, isFernTile } from './levels.js';

export function createPlayer(x, y) {
  return {
    x, y,
    r: 12,
    dir: 0,                 // facing angle, radians
    moving: false,
    sneaking: false,
    hidden: false,          // standing still inside a fern
    pebbles: 3,
    stepTimer: 0,
  };
}

export function updatePlayer(game, dt) {
  const p = game.player;
  const input = game.input;
  const dx = input.axisX();
  const dy = input.axisY();
  const mag = Math.hypot(dx, dy);
  p.sneaking = input.sneak();
  p.moving = mag > 0.01;

  if (p.moving) {
    const speed = p.sneaking ? 82 : 152;
    const nx = (dx / mag) * speed * dt;
    const ny = (dy / mag) * speed * dt;
    p.dir = Math.atan2(dy, dx);
    moveCircle(game.level, p, nx, ny);
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      p.stepTimer = p.sneaking ? 0.55 : 0.34;
      game.audio.playerStep(p.sneaking);
      // Loud steps ring out where a guard could hear them; sneaking leaves no ring.
      if (!p.sneaking) game.ripples.push({ x: p.x, y: p.y, age: 0, max: 95, color: '120, 200, 160' });
    }
  }

  // Ferns hide you only while you stand still inside one.
  const tx = Math.floor(p.x / TILE);
  const ty = Math.floor(p.y / TILE);
  p.hidden = !p.moving && isFernTile(game.level, tx, ty);
}
