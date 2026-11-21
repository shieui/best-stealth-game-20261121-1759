// Mothlight Heist — all drawing: the moonlit gallery, lantern light, vision
// cones, the thief and the guards, the HUD and the menu panels. Canvas 2D,
// flat shapes and radial glows only; no images, no fonts beyond the system
// serif used for text.

import { TILE } from './levels.js';
import { visionConePolygon } from './guard.js';

const FONT = "Georgia, 'Times New Roman', serif";

function text(ctx, value, x, y, size, color, align = 'center', style = '') {
  ctx.font = `${style} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function drawFloor(ctx, game) {
  const lv = game.level;
  for (let ty = 0; ty < lv.height; ty += 1) {
    for (let tx = 0; tx < lv.width; tx += 1) {
      const t = lv.tiles[ty][tx];
      const x = tx * TILE;
      const y = ty * TILE;
      if (t === '#') {
        ctx.fillStyle = '#241f33';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#322b47';
        ctx.fillRect(x, y, TILE, 4);
        ctx.fillStyle = '#1b1727';
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
      } else if (t === 'C') {
        ctx.fillStyle = '#171320';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#5d4426';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = '#7a5a33';
        ctx.fillRect(x + 3, y + 3, TILE - 6, 5);
        ctx.strokeStyle = '#3d2c17';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
      } else {
        // checkerboard floor: dim stone, slightly darker on the dark tiles
        const dark = (tx + ty) % 2 === 0;
        ctx.fillStyle = t === ',' ? '#1a1526' : dark ? '#221d31' : '#272138';
        ctx.fillRect(x, y, TILE, TILE);
        if (t === 'L') {
          ctx.fillStyle = '#2b2340';
          ctx.fillRect(x, y, TILE, TILE);
        }
        if (t === 'F') {
          // fern: a tuft of leaves you can crouch in
          ctx.fillStyle = '#1e3a24';
          for (let i = 0; i < 5; i += 1) {
            const lx = x + 6 + i * 5;
            const ly = y + 8 + (i % 2) * 8;
            ctx.beginPath();
            ctx.ellipse(lx, ly, 5, 9, (i - 2) * 0.35, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#2f5c36';
          ctx.beginPath();
          ctx.ellipse(x + 16, y + 14, 6, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function drawLanternGlow(ctx, game) {
  for (const lamp of game.level.lanterns) {
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, 110);
    g.addColorStop(0, 'rgba(242, 201, 76, 0.20)');
    g.addColorStop(0.5, 'rgba(242, 201, 76, 0.07)');
    g.addColorStop(1, 'rgba(242, 201, 76, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(lamp.x - 110, lamp.y - 110, 220, 220);
    // the lantern itself: a little hanging lamp
    ctx.fillStyle = '#3a2f16';
    ctx.fillRect(lamp.x - 1, lamp.y - 16, 2, 10);
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit(ctx, game) {
  const e = game.exit;
  const locked = game.pearl && !game.pearl.taken;
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 350);
  const g = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, 46);
  g.addColorStop(0, locked ? `rgba(180, 60, 60, ${0.25 + 0.15 * pulse})` : `rgba(80, 220, 130, ${0.25 + 0.15 * pulse})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(e.x - 46, e.y - 46, 92, 92);
  ctx.fillStyle = locked ? '#5a2323' : '#1d5c33';
  ctx.fillRect(e.x - 13, e.y - 15, 26, 30);
  ctx.strokeStyle = locked ? '#c05050' : '#4ade80';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x - 13.5, e.y - 15.5, 27, 31);
  ctx.fillStyle = locked ? '#c05050' : '#4ade80';
  ctx.beginPath();
  ctx.arc(e.x + 7, e.y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, locked ? 'SEALED' : 'EXIT', e.x, e.y - 22, 10, locked ? '#c05050' : '#4ade80');
}

function drawGems(ctx, game) {
  for (const gem of game.gems) {
    if (gem.taken) continue;
    const bob = Math.sin(performance.now() / 300 + gem.x) * 2;
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.moveTo(gem.x, gem.y - 9 + bob);
    ctx.lineTo(gem.x + 7, gem.y + bob);
    ctx.lineTo(gem.x, gem.y + 9 + bob);
    ctx.lineTo(gem.x - 7, gem.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(gem.x, gem.y - 5 + bob);
    ctx.lineTo(gem.x + 3.5, gem.y + bob);
    ctx.lineTo(gem.x, gem.y + 5 + bob);
    ctx.lineTo(gem.x - 3.5, gem.y + bob);
    ctx.closePath();
    ctx.fill();
  }
  if (game.pearl && !game.pearl.taken) {
    const p = game.pearl;
    const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 40);
    glow.addColorStop(0, 'rgba(190, 220, 255, 0.5)');
    glow.addColorStop(1, 'rgba(190, 220, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - 40, p.y - 40, 80, 80);
    ctx.fillStyle = '#dfe9ff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x - 3, p.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'MOON PEARL', p.x, p.y - 20, 10, '#bcd4ff');
  }
}

function drawVisionCones(ctx, game) {
  for (const guard of game.guards) {
    const poly = visionConePolygon(game, guard);
    const alerted = guard.state === 'chase';
    const suspicious = guard.suspicion > 55;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = alerted
      ? 'rgba(220, 60, 60, 0.32)'
      : suspicious
        ? 'rgba(242, 160, 60, 0.26)'
        : 'rgba(242, 201, 76, 0.18)';
    ctx.fill();
    ctx.strokeStyle = alerted ? 'rgba(220, 60, 60, 0.5)' : 'rgba(242, 201, 76, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawGuard(ctx, game, guard) {
  const alerted = guard.state === 'chase';
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(guard.x, guard.y + 9, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // body: a watchman in a dark blue coat with a brass helmet
  ctx.fillStyle = alerted ? '#7a2a2a' : '#2e3a5c';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = alerted ? '#c05050' : '#d8b25c';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 6.5, 0, Math.PI * 2);
  ctx.fill();
  // facing tick: the direction the guard looks
  ctx.strokeStyle = '#e8e2d0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(guard.x + Math.cos(guard.dir) * 8, guard.y + Math.sin(guard.dir) * 8);
  ctx.lineTo(guard.x + Math.cos(guard.dir) * 15, guard.y + Math.sin(guard.dir) * 15);
  ctx.stroke();
  // suspicion: a "?" while curious, a "!" while chasing
  if (guard.suspicion > 55 && guard.state !== 'chase') {
    text(ctx, '?', guard.x, guard.y - 20, 20, '#f2a03c', 'center', 'bold');
  }
  if (alerted) {
    text(ctx, '!', guard.x, guard.y - 20, 22, '#ff5a5a', 'center', 'bold');
  }
  // suspicion ring under the guard
  if (guard.suspicion > 4) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = guard.suspicion > 55 ? '#f2a03c' : '#f2c94c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 17, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
    ctx.stroke();
  }
}

function drawRipples(ctx, game) {
  for (const r of game.ripples) {
    const t = r.age / 0.9; // 0 fresh, 1 gone
    ctx.strokeStyle = `rgba(${r.color}, ${(1 - t) * 0.55})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 6 + t * r.max, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 9, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Moth: a hooded cloak, teal in the dark, brighter when spotted
  const spotted = game.alarm > 55;
  ctx.fillStyle = p.hidden ? '#2f5c4a' : spotted ? '#c96a4a' : '#3fae8a';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 13);
  ctx.quadraticCurveTo(p.x + 12, p.y - 2, p.x + 10, p.y + 10);
  ctx.quadraticCurveTo(p.x, p.y + 14, p.x - 10, p.y + 10);
  ctx.quadraticCurveTo(p.x - 12, p.y - 2, p.x, p.y - 13);
  ctx.fill();
  // hood
  ctx.fillStyle = p.hidden ? '#274d3d' : spotted ? '#a85438' : '#2f8a6c';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 4, 7, 0, Math.PI * 2);
  ctx.fill();
  // face, turned the way you walk
  ctx.fillStyle = '#f2e3c4';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 3, p.y - 4 + Math.sin(p.dir) * 3, 3.4, 0, Math.PI * 2);
  ctx.fill();
  // sneaking: a low crouch line under the cloak
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(232, 226, 208, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x - 8, p.y + 13);
    ctx.lineTo(p.x + 8, p.y + 13);
    ctx.stroke();
  }
  if (p.hidden) text(ctx, 'hidden', p.x, p.y - 20, 11, '#8fd0a8');
}

function drawHud(ctx, game) {
  ctx.fillStyle = 'rgba(8, 7, 14, 0.82)';
  ctx.fillRect(0, 0, 960, 34);
  ctx.fillStyle = '#3a3450';
  ctx.fillRect(0, 34, 960, 1);
  text(ctx, game.level.name, 14, 23, 15, '#f2c94c', 'left');
  text(ctx, `Score ${game.score}`, 330, 23, 14, '#e8e2d0');
  text(ctx, `Gems ${game.gemsTaken}/${game.gems.length}`, 470, 23, 14, '#e8e2d0');
  text(ctx, `Pebbles ${game.player.pebbles}`, 590, 23, 14, '#e8e2d0');
  const mm = String(Math.floor(game.levelTime / 60)).padStart(2, '0');
  const ss = String(Math.floor(game.levelTime % 60)).padStart(2, '0');
  text(ctx, `${mm}:${ss}`, 700, 23, 14, '#e8e2d0');
  // lives as little moths
  for (let i = 0; i < 3; i += 1) {
    const x = 780 + i * 26;
    ctx.fillStyle = i < game.lives ? '#3fae8a' : '#332d45';
    ctx.beginPath();
    ctx.arc(x, 17, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = i < game.lives ? '#f2e3c4' : '#4a4360';
    ctx.beginPath();
    ctx.arc(x, 17, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // the alarm eye: fills as any guard grows suspicious
  const ax = 900;
  ctx.strokeStyle = '#e8e2d0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(ax, 17, 16, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  const alerted = game.alarm > 55;
  ctx.fillStyle = game.alarm >= 100 ? '#ff5a5a' : alerted ? '#f2a03c' : '#f2c94c';
  ctx.beginPath();
  ctx.arc(ax, 17, 3 + (game.alarm / 100) * 5, 0, Math.PI * 2);
  ctx.fill();
  if (game.alarm >= 100) text(ctx, 'SEEN!', ax, 52, 11, '#ff5a5a', 'center', 'bold');
  else if (alerted) text(ctx, 'suspicious…', ax, 52, 10, '#f2a03c');
}

function drawMessage(ctx, game) {
  if (game.messageTimer <= 0 || !game.message) return;
  ctx.fillStyle = 'rgba(8, 7, 14, 0.78)';
  const w = ctx.measureText(game.message).width + 36;
  ctx.fillRect((960 - w) / 2, 560, w, 30);
  text(ctx, game.message, 480, 580, 14, '#e8e2d0');
}

function drawPanel(ctx, title, lines, prompt) {
  ctx.fillStyle = 'rgba(6, 5, 10, 0.72)';
  ctx.fillRect(0, 0, 960, 640);
  const height = 120 + lines.length * 30 + 70;
  const y = (640 - height) / 2;
  ctx.fillStyle = '#14121c';
  ctx.fillRect(180, y, 600, height);
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(180.5, y + 0.5, 600, height);
  text(ctx, title, 480, y + 64, 40, '#f2c94c');
  lines.forEach((line, i) => {
    text(ctx, line, 480, y + 116 + i * 30, 17, '#cfc8da');
  });
  text(ctx, prompt, 480, y + height - 30, 16, '#f2c94c');
}

function drawTitle(ctx, game) {
  drawPanel(ctx, 'MOTHLIGHT HEIST', [
    'You are Moth, a thief in the Gallery of Whispers.',
    'Slip past the guards, take what glitters, and reach the green door unseen.',
    'Vision cones show what a guard can see. Crates block their sight;',
    'ferns hide you if you stand still. Lantern light gives you away faster.',
    'Walk loud, sneak quiet. Click to throw a pebble and pull a guard away.',
    '',
    'Three galleries stand between you and the Moon Pearl.',
  ], 'Press Enter or click to begin');
}

export function render(game) {
  const ctx = game.ctx;
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  ctx.fillStyle = '#0b0a12';
  ctx.fillRect(-20, -20, 1000, 680);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 34, 960, 606);
  ctx.clip();
  drawFloor(ctx, game);
  drawLanternGlow(ctx, game);
  drawExit(ctx, game);
  drawGems(ctx, game);
  drawVisionCones(ctx, game);
  drawRipples(ctx, game);
  for (const guard of game.guards) drawGuard(ctx, game, guard);
  drawPlayer(ctx, game);
  ctx.restore();
  drawHud(ctx, game);
  drawMessage(ctx, game);

  if (game.screen === 'title') drawTitle(ctx, game);
  else if (game.screen === 'caught') {
    drawPanel(ctx, 'CAUGHT!', [
      `A guard laid hands on Moth. ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left.`,
      'The gallery resets. Study the patrols — patience beats speed.',
    ], 'Press Enter or click to try again');
  } else if (game.screen === 'levelclear') {
    drawPanel(ctx, 'UNSEEN', [
      `${game.level.name} — cleared without a sound.`,
      `Score ${game.score} · Gems ${game.gemsTaken}/${game.gems.length}`,
      'The next gallery waits, darker and better guarded.',
    ], 'Press Enter or click for the next gallery');
  } else if (game.screen === 'gameover') {
    drawPanel(ctx, 'THE GALLERY KEEPS ITS SECRETS', [
      `Moth was caught three times. Final score ${game.score}.`,
      'The guards are still laughing. Try again when you are ready.',
    ], 'Press Enter or click to start over');
  } else if (game.screen === 'win') {
    drawPanel(ctx, 'THE MOON PEARL IS YOURS', [
      'Three galleries, not a single alarm that mattered.',
      `Final score ${game.score} · Gems ${game.gemsTaken}/${game.gems.length} · Time ${Math.floor(game.totalTime / 60)}:${String(Math.floor(game.totalTime % 60)).padStart(2, '0')}`,
      'Moth slips into the night, richer and — most importantly — unseen.',
    ], 'Press Enter or click to play again');
  }
  ctx.restore();
}
