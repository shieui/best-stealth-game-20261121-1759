// Mothlight Heist — guard patrols, vision and the chase.
// A guard patrols its waypoints, pauses to look around at each one, and
// watches with a vision cone. Suspicion (0..100) is raised by main.js when
// the guard sees the player; here the guard reacts to it: above 55 it walks
// to the last place it saw you, at 100 it chases, and if it loses you it
// searches, then gives up and goes back to its patrol.

import { TILE, moveCircle, hasLineOfSight, isLit } from './levels.js';

export function createGuard(def) {
  const start = def.waypoints[0];
  return {
    x: start.x,
    y: start.y,
    r: 12,
    dir: 0,                 // facing angle, radians
    waypoints: def.waypoints,
    wpIndex: 1,
    speed: def.speed,
    patrolSpeed: def.speed,
    chaseSpeed: def.speed * 1.9,
    visionRange: 175,
    visionHalfAngle: 0.62,  // ~71 degrees of cone
    state: 'patrol',        // patrol | look | investigate | chase
    suspicion: 0,
    lastSeen: { x: start.x, y: start.y },
    seenTimer: 0,           // seconds since the guard last saw the player
    waitTimer: 0,
    target: null,
    lookTimer: 0,
    stepTimer: 0,           // footstep pacing
  };
}

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(guard, targetAngle, dt, rate) {
  const d = angleDiff(targetAngle, guard.dir);
  const step = Math.max(-rate * dt, Math.min(rate * dt, d));
  guard.dir += step;
}

// Can this guard see the player right now? Returns { visible, distance, inLight }.
export function guardSeesPlayer(game, guard) {
  const p = game.player;
  const dx = p.x - guard.x;
  const dy = p.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const out = { visible: false, distance: dist, inLight: false };
  if (dist > guard.visionRange) return out;
  // A guard standing almost on top of you notices you no matter what.
  if (dist < 30) {
    out.visible = true;
    out.inLight = isLit(game.level, p.x, p.y);
    return out;
  }
  const ang = angleDiff(Math.atan2(dy, dx), guard.dir);
  if (Math.abs(ang) > guard.visionHalfAngle) return out;
  // Ferns hide a still player unless the guard is close.
  if (p.hidden && dist > 48) return out;
  if (!hasLineOfSight(game.level, guard.x, guard.y, p.x, p.y)) return out;
  out.visible = true;
  out.inLight = isLit(game.level, p.x, p.y);
  return out;
}

function moveToward(game, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const mx = (dx / dist) * step;
  const my = (dy / dist) * step;
  turnToward(guard, Math.atan2(dy, dx), dt, 6);
  moveCircle(game.level, guard, mx, my);
  // footsteps the player can hear (and see as a ripple when close)
  guard.stepTimer -= dt;
  if (guard.stepTimer <= 0 && dist > 0) {
    guard.stepTimer = 0.42;
    game.audio.footstep(Math.min(1, 220 / Math.max(40, dist)));
    game.ripples.push({ x: guard.x, y: guard.y, age: 0, max: 42, color: '220, 190, 110' });
  }
  return dist <= step + 1;
}

export function updateGuard(game, guard, dt) {
  const p = game.player;

  if (guard.suspicion >= 100 && guard.state !== 'chase') {
    guard.state = 'chase';
    guard.seenTimer = 0;
    game.audio.alert();
  }

  if (guard.state === 'chase') {
    // Chase the player's live position while seen; otherwise the last seen spot.
    const tx = guard.seenTimer < 0.4 ? p.x : guard.lastSeen.x;
    const ty = guard.seenTimer < 0.4 ? p.y : guard.lastSeen.y;
    moveToward(game, guard, tx, ty, guard.chaseSpeed, dt);
    if (guard.seenTimer > 3) {
      guard.state = 'investigate';
      guard.target = { ...guard.lastSeen };
      guard.waitTimer = 0;
    }
    return;
  }

  if (guard.state === 'investigate') {
    const arrived = moveToward(game, guard, guard.target.x, guard.target.y, guard.speed * 1.35, dt);
    if (arrived) {
      guard.waitTimer += dt;
      turnToward(guard, guard.dir + dt * 1.4, dt, 1.4); // scan the room
      if (guard.waitTimer > 2.6 || guard.suspicion < 12) {
        guard.state = 'patrol';
        guard.waitTimer = 0;
      }
    }
    if (guard.suspicion > 55) {
      guard.target = { ...guard.lastSeen };
      guard.waitTimer = 0;
    }
    return;
  }

  if (guard.state === 'look') {
    guard.lookTimer -= dt;
    turnToward(guard, guard.dir + dt * 1.1, dt, 1.1); // slow scan
    if (guard.lookTimer <= 0) {
      guard.state = 'patrol';
      guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
    }
    if (guard.suspicion > 55) {
      guard.state = 'investigate';
      guard.target = { ...guard.lastSeen };
      guard.waitTimer = 0;
    }
    return;
  }

  // patrol
  const wp = guard.waypoints[guard.wpIndex];
  const arrived = moveToward(game, guard, wp.x, wp.y, guard.patrolSpeed, dt);
  if (arrived) {
    guard.state = 'look';
    guard.lookTimer = 1.4;
  }
  if (guard.suspicion > 55) {
    guard.state = 'investigate';
    guard.target = { ...guard.lastSeen };
    guard.waitTimer = 0;
  }
}

// The vision cone as a polygon: rays across the cone, each stopped by the
// first wall or crate it meets, so the cone hugs the level's cover.
export function visionConePolygon(game, guard) {
  const rays = 26;
  const pts = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i += 1) {
    const a = guard.dir - guard.visionHalfAngle + (2 * guard.visionHalfAngle * i) / rays;
    let reach = guard.visionRange;
    const step = 8;
    for (let d = step; d <= guard.visionRange; d += step) {
      const x = guard.x + Math.cos(a) * d;
      const y = guard.y + Math.sin(a) * d;
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      if (tx < 0 || ty < 0 || tx >= game.level.width || ty >= game.level.height) { reach = d; break; }
      const t = game.level.tiles[ty][tx];
      if (t === '#' || t === 'C') { reach = d; break; }
    }
    pts.push({ x: guard.x + Math.cos(a) * reach, y: guard.y + Math.sin(a) * reach });
  }
  return pts;
}
