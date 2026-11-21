// Mothlight Heist — game loop and state machine.
// Owns the screens (title / playing / caught / level clear / game over / win),
// the detection alarm, scoring, lives and level flow. Guards, the player,
// rendering, sound and input live in their own modules.

import { LEVELS, loadLevel } from './levels.js';
import { createGuard, updateGuard, guardSeesPlayer } from './guard.js';
import { createPlayer, updatePlayer } from './player.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { createAudio } from './audio.js';
import { applyShot } from './shots.js';

export const TILE = 32;
export const VIEW_W = 960;
export const VIEW_H = 640;

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);
  const audio = createAudio();
  const game = {
    canvas, ctx, input, audio,
    screen: 'title',
    levelIndex: 0,
    level: null,
    player: null,
    guards: [],
    gems: [],
    pearl: null,
    exit: null,
    lives: 3,
    score: 0,
    gemsTaken: 0,
    levelTime: 0,
    totalTime: 0,
    alarm: 0,            // 0..100, the loudest guard suspicion, shown on the HUD
    message: '',
    messageTimer: 0,
    shake: 0,
    ripples: [],         // expanding footstep rings: what the noise system looks like
    lastTs: 0,
    shotMode: null,
    buttons: [],         // clickable rects for the current screen
    won: false,
  };
  loadLevelInto(game, 0);
  return game;
}

export function loadLevelInto(game, index) {
  const def = LEVELS[index];
  const loaded = loadLevel(def);
  game.levelIndex = index;
  game.level = loaded;
  game.player = createPlayer(loaded.playerStart.x, loaded.playerStart.y);
  game.guards = loaded.guardDefs.map((d) => createGuard(d));
  game.gems = loaded.gems.map((g) => ({ ...g, taken: false }));
  game.pearl = loaded.pearl ? { ...loaded.pearl, taken: false } : null;
  game.exit = loaded.exit;
  game.levelTime = 0;
  game.alarm = 0;
  game.message = def.intro;
  game.messageTimer = 3.2;
}

function startLevel(game, index) {
  loadLevelInto(game, index);
  game.screen = 'playing';
}

function levelCleared(game) {
  const timeBonus = Math.max(0, 600 - Math.floor(game.levelTime) * 5);
  game.score += timeBonus;
  game.audio.win();
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.screen = 'win';
    game.won = true;
  } else {
    game.screen = 'levelclear';
  }
}

function caught(game) {
  game.lives -= 1;
  game.audio.caught();
  game.shake = 14;
  if (game.lives <= 0) {
    game.screen = 'gameover';
  } else {
    game.screen = 'caught';
  }
}

function resetRun(game) {
  game.lives = 3;
  game.score = 0;
  game.gemsTaken = 0;
  game.totalTime = 0;
  startLevel(game, 0);
}

// --- detection ---------------------------------------------------------------

function updateDetection(game, dt) {
  let loudest = 0;
  for (const guard of game.guards) {
    const seen = guardSeesPlayer(game, guard);
    if (seen.visible) {
      const dist = seen.distance;
      const closeness = 1 - dist / guard.visionRange; // 0 far away, 1 touching
      let rate = 28 + closeness * 62;
      if (seen.inLight) rate *= 1.5;
      if (game.player.sneaking) rate *= 0.6;
      if (game.player.hidden) rate *= 0.25;
      guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
      guard.lastSeen = { x: game.player.x, y: game.player.y };
      guard.seenTimer = 0;
    } else {
      guard.seenTimer += dt;
      guard.suspicion = Math.max(0, guard.suspicion - 26 * dt);
    }
    if (guard.suspicion > loudest) loudest = guard.suspicion;
  }
  game.alarm = loudest;
}

// --- noise -------------------------------------------------------------------

function playerNoiseRadius(game) {
  const p = game.player;
  if (!p.moving) return 0;
  if (p.sneaking) return 0;
  return 95;
}

function broadcastNoise(game, x, y, radius, kind) {
  for (const guard of game.guards) {
    const d = Math.hypot(guard.x - x, guard.y - y);
    if (d < radius) {
      if (guard.state === 'patrol' || guard.state === 'look') {
        guard.state = 'investigate';
        guard.target = { x, y };
        guard.suspicion = Math.max(guard.suspicion, kind === 'pebble' ? 55 : 40);
        guard.waitTimer = 0;
      } else if (guard.state === 'investigate') {
        guard.target = { x, y };
      }
    }
  }
}

// --- main update ---------------------------------------------------------------

function updatePlaying(game, dt) {
  game.levelTime += dt;
  game.totalTime += dt;
  if (game.messageTimer > 0) game.messageTimer -= dt;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - 30 * dt);
  for (let i = game.ripples.length - 1; i >= 0; i -= 1) {
    game.ripples[i].age += dt;
    if (game.ripples[i].age > 0.9) game.ripples.splice(i, 1);
  }

  const p = game.player;
  updatePlayer(game, dt);
  const noiseR = playerNoiseRadius(game);
  if (noiseR > 0) broadcastNoise(game, p.x, p.y, noiseR, 'steps');

  // pebble throw: click on the canvas
  const click = game.input.consumeClick();
  if (click && p.pebbles > 0) {
    p.pebbles -= 1;
    game.audio.pebble();
    broadcastNoise(game, click.x, click.y, 170, 'pebble');
    game.message = 'The pebble clatters — a guard turns to look.';
    game.messageTimer = 1.6;
  }

  // gems
  for (const gem of game.gems) {
    if (!gem.taken && Math.hypot(p.x - gem.x, p.y - gem.y) < 24) {
      gem.taken = true;
      game.gemsTaken += 1;
      game.score += 100;
      game.audio.coin();
    }
  }
  // the Moon Pearl
  if (game.pearl && !game.pearl.taken && Math.hypot(p.x - game.pearl.x, p.y - game.pearl.y) < 26) {
    game.pearl.taken = true;
    game.score += 500;
    game.audio.pearl();
    game.message = 'The Moon Pearl is yours — now reach the green door!';
    game.messageTimer = 3;
  }

  updateDetection(game, dt);
  for (const guard of game.guards) updateGuard(game, guard, dt);

  // caught?
  for (const guard of game.guards) {
    if (guard.state === 'chase' && Math.hypot(guard.x - p.x, guard.y - p.y) < 26) {
      caught(game);
      return;
    }
  }

  // exit
  const e = game.exit;
  if (Math.hypot(p.x - e.x, p.y - e.y) < 26) {
    if (game.pearl && !game.pearl.taken) {
      game.message = 'The door is sealed — the Moon Pearl must be taken first.';
      game.messageTimer = 2;
    } else {
      levelCleared(game);
    }
  }
}

function update(game, dt) {
  if (game.shotMode) return; // posed screenshot: frozen frame
  if (game.screen === 'playing') updatePlaying(game, dt);
  else if (game.screen === 'caught' || game.screen === 'levelclear') {
    if (game.input.consumeEnter() || game.input.consumeClick()) {
      if (game.screen === 'caught') startLevel(game, game.levelIndex);
      else startLevel(game, game.levelIndex + 1);
    }
  } else if (game.screen === 'title') {
    if (game.input.consumeEnter() || game.input.consumeClick()) {
      game.audio.unlock();
      resetRun(game);
    }
  } else if (game.screen === 'gameover' || game.screen === 'win') {
    if (game.input.consumeEnter() || game.input.consumeClick()) resetRun(game);
  }
  if (game.input.consumeMute()) game.audio.toggleMute();
}

function frame(game, ts) {
  const dt = Math.min(0.05, (ts - game.lastTs) / 1000 || 0.016);
  game.lastTs = ts;
  update(game, dt);
  render(game);
  requestAnimationFrame((t) => frame(game, t));
}

export function startGame() {
  const canvas = document.getElementById('game');
  const game = createGame(canvas);
  if (typeof window !== 'undefined') window.__game = game; // playtest hook
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) applyShot(game, shot);
  requestAnimationFrame((t) => frame(game, t));
  return game;
}

// bootstrap when loaded as a module
if (typeof document !== 'undefined') startGame();
