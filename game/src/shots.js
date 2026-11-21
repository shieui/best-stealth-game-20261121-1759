// Mothlight Heist — posed scenes for screenshots (?shot=start|play|alarm|win).
// Each scene puts the real game into a fixed, readable state — the same
// guards, cones and cover a player would meet — and freezes the loop, so a
// screenshot is a real render of the game's own code, not a mock-up.

import { loadLevelInto } from './main.js';

function poseGuard(game, index, tx, ty, dir, state, suspicion) {
  const g = game.guards[index];
  if (!g) return;
  g.x = tx * 32 + 16;
  g.y = ty * 32 + 16;
  g.dir = dir;
  g.state = state;
  g.suspicion = suspicion;
  if (state === 'chase') g.lastSeen = { x: game.player.x, y: game.player.y };
}

function freeze(game, name) {
  game.shotMode = name;
  // Let two frames paint, then tell the screenshot driver the frame is ready.
  let painted = 0;
  function tick() {
    painted += 1;
    if (painted >= 2) window.__shotReady = true;
    else requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function applyShot(game, name) {
  if (name === 'play') {
    loadLevelInto(game, 0);
    game.screen = 'playing';
    game.player.x = 9 * 32 + 16;
    game.player.y = 8 * 32 + 16;
    game.player.dir = Math.PI / 2;
    game.player.sneaking = true;
    game.gems[0].taken = true;
    game.gemsTaken = 1;
    game.score = 100;
    game.levelTime = 47;
    poseGuard(game, 0, 14, 2, Math.PI, 'patrol', 22);
    poseGuard(game, 1, 21, 11, Math.PI / 2, 'patrol', 0);
    game.message = 'Sneak past the patrol — the green door is ahead.';
    game.messageTimer = 99;
    game.alarm = 22;
  } else if (name === 'alarm') {
    loadLevelInto(game, 1);
    game.screen = 'playing';
    game.player.x = 24 * 32 + 16;
    game.player.y = 11 * 32 + 16;
    game.player.dir = -Math.PI / 2;
    game.gems[0].taken = true;
    game.gems[1].taken = true;
    game.gemsTaken = 2;
    game.score = 200;
    game.levelTime = 83;
    poseGuard(game, 0, 24, 8, Math.PI / 2, 'chase', 100);
    poseGuard(game, 1, 20, 13, -Math.PI / 2, 'investigate', 70);
    poseGuard(game, 2, 8, 12, 0, 'patrol', 10);
    game.message = 'Spotted! Break line of sight and hide.';
    game.messageTimer = 99;
    game.alarm = 100;
  } else if (name === 'win') {
    loadLevelInto(game, 2);
    game.screen = 'win';
    game.score = 2840;
    game.gemsTaken = 6;
    game.totalTime = 312;
    game.pearl.taken = true;
    game.gems.forEach((g) => { g.taken = true; });
    game.gemsTaken = game.gems.length;
    poseGuard(game, 0, 14, 2, Math.PI, 'patrol', 0);
    poseGuard(game, 3, 15, 8, -Math.PI / 2, 'patrol', 0);
  } else {
    // start: the title screen over the first gallery, guards mid-patrol.
    loadLevelInto(game, 0);
    game.screen = 'title';
    poseGuard(game, 0, 14, 2, Math.PI, 'patrol', 0);
    poseGuard(game, 1, 21, 12, -Math.PI / 2, 'patrol', 0);
  }
  freeze(game, name);
}
