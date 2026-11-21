// Mothlight Heist — levels and tile rules.
// A level is a grid of characters: '#' wall, '.' floor, ',' dim floor,
// 'C' crate (blocks movement and sight), 'F' fern (hides you when you stand
// still inside it), 'L' lantern floor (lit: guards spot you faster),
// '*' gem, 'P' player start, 'E' exit, 'M' the Moon Pearl.
// Guards patrol waypoint lists given in tile coordinates.

export const TILE = 32;

export const LEVELS = [
  {
    name: 'The Velvet Gallery',
    intro: 'Level 1 — The Velvet Gallery. Slip past the patrols and reach the green door.',
    map: [
      '##############################',
      '#P....F......C......*.......E#',
      '#............................#',
      '#..####.....####......####...#',
      '#..#..#.....#..#......#..#...#',
      '#..#..#..*..#..#..C...#..#...#',
      '#..####.....####......####...#',
      '#.......L..............L.....#',
      '#..C......F......*......F....#',
      '#............................#',
      '#....####......####....##....#',
      '#....#..#......#..#....##....#',
      '#....#..#..*...#..#..*..##...#',
      '#....####......####....##....#',
      '#.......L..............L.....#',
      '#..*......C.......F.......*..#',
      '#............................#',
      '#....F......*.......C........#',
      '#............................#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 2], [27, 2]], speed: 52 },
      { waypoints: [[21, 8], [21, 18]], speed: 46 },
    ],
  },
  {
    name: 'The Hall of Lanterns',
    intro: 'Level 2 — The Hall of Lanterns. Lantern light makes you easy to spot: keep to the dark.',
    map: [
      '##############################',
      '#P...L......C......L......*..#',
      '#............................#',
      '#..####....####....####....###',
      '#..#..#....#..#....#..#....#.#',
      '#..#..#.*..#..#.C..#..#.*..#.#',
      '#..####....####....####....###',
      '#.........F..................#',
      '#..L......*......C......L....#',
      '#............................#',
      '#...####.....####.....####...#',
      '#...#..#.....#..#.....#..#...#',
      '#...#..#..*..#..#..*..#..#.E.#',
      '#...####.....####.....####...#',
      '#............................#',
      '#..*....F......C.......*.....#',
      '#............................#',
      '#....C......L......F......*..#',
      '#............................#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 2], [27, 2]], speed: 58 },
      { waypoints: [[20, 8], [20, 18]], speed: 50 },
      { waypoints: [[8, 10], [8, 17]], speed: 50 },
    ],
  },
  {
    name: 'The Moon Pearl Vault',
    intro: 'Level 3 — The Moon Pearl Vault. Take the pearl from its vault, then reach the green door.',
    map: [
      '##############################',
      '#P....F......C......*.......E#',
      '#............................#',
      '#..#####....######....#####..#',
      '#..#...#....#....#....#...#..#',
      '#..#.M.#....#.C..#....#.*.#..#',
      '#..#...#....#....#....#...#..#',
      '#..##.##....##.###....##.##..#',
      '#............................#',
      '#..C.....F......*......F.....#',
      '#............................#',
      '#...####.....####.....####...#',
      '#...#..#.....#..#.....#..#...#',
      '#...#..#..*..#..#..*..#..#...#',
      '#...####.....####.....####...#',
      '#............................#',
      '#..*.....C.......F........*..#',
      '#............................#',
      '#....L......*.......C........#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 2], [27, 2]], speed: 62 },
      { waypoints: [[10, 9], [10, 17]], speed: 54 },
      { waypoints: [[21, 8], [21, 18]], speed: 54 },
      { waypoints: [[3, 8], [27, 8]], speed: 48 },
    ],
  },
];

// --- tile helpers ------------------------------------------------------------

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return '#';
  return level.tiles[ty][tx];
}

export function isSolidTile(level, tx, ty) {
  const t = tileAt(level, tx, ty);
  return t === '#' || t === 'C';
}

export function blocksSight(level, tx, ty) {
  return isSolidTile(level, tx, ty);
}

export function isFernTile(level, tx, ty) {
  return tileAt(level, tx, ty) === 'F';
}

export function isLit(level, x, y) {
  for (const lamp of level.lanterns) {
    if (Math.hypot(lamp.x - x, lamp.y - y) < 95) return true;
  }
  return false;
}

// Straight-line sight between two pixel points, blocked by walls and crates.
export function hasLineOfSight(level, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 7));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const tx = Math.floor((x1 + dx * t) / TILE);
    const ty = Math.floor((y1 + dy * t) / TILE);
    if (blocksSight(level, tx, ty)) return false;
  }
  return true;
}

// Move a circle (entity with x, y, r) by dx, dy, sliding along solid tiles.
export function moveCircle(level, ent, dx, dy) {
  const r = ent.r;
  let nx = ent.x + dx;
  if (dx !== 0) {
    const top = Math.floor((ent.y - r + 1) / TILE);
    const bottom = Math.floor((ent.y + r - 1) / TILE);
    const edge = dx > 0 ? Math.floor((nx + r) / TILE) : Math.floor((nx - r) / TILE);
    for (let ty = top; ty <= bottom; ty += 1) {
      if (isSolidTile(level, edge, ty)) {
        nx = dx > 0 ? edge * TILE - r - 0.01 : (edge + 1) * TILE + r + 0.01;
        break;
      }
    }
  }
  ent.x = nx;
  let ny = ent.y + dy;
  if (dy !== 0) {
    const left = Math.floor((ent.x - r + 1) / TILE);
    const right = Math.floor((ent.x + r - 1) / TILE);
    const edge = dy > 0 ? Math.floor((ny + r) / TILE) : Math.floor((ny - r) / TILE);
    for (let tx = left; tx <= right; tx += 1) {
      if (isSolidTile(level, tx, edge)) {
        ny = dy > 0 ? edge * TILE - r - 0.01 : (edge + 1) * TILE + r + 0.01;
        break;
      }
    }
  }
  ent.y = ny;
}

// --- loading -----------------------------------------------------------------

export function loadLevel(def) {
  const height = def.map.length;
  const width = Math.max(...def.map.map((row) => row.length));
  const tiles = [];
  const gems = [];
  const lanterns = [];
  let playerStart = { x: TILE * 1.5, y: TILE * 1.5 };
  let exit = { x: TILE * 28.5, y: TILE * 1.5 };
  let pearl = null;

  for (let ty = 0; ty < height; ty += 1) {
    const row = def.map[ty].padEnd(width, '#').slice(0, width);
    const out = [];
    for (let tx = 0; tx < width; tx += 1) {
      const ch = row[tx];
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      if (ch === 'P') { playerStart = { x: cx, y: cy }; out.push('.'); }
      else if (ch === 'E') { exit = { x: cx, y: cy }; out.push('.'); }
      else if (ch === '*') { gems.push({ x: cx, y: cy }); out.push('.'); }
      else if (ch === 'M') { pearl = { x: cx, y: cy }; out.push('.'); }
      else if (ch === 'L') { lanterns.push({ x: cx, y: cy }); out.push('L'); }
      else out.push(ch);
    }
    tiles.push(out);
  }

  return {
    name: def.name,
    intro: def.intro,
    width,
    height,
    tiles,
    gems,
    lanterns,
    playerStart,
    exit,
    pearl,
    guardDefs: def.guards.map((g) => ({
      waypoints: g.waypoints.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 })),
      speed: g.speed,
    })),
  };
}
