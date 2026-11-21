// Mothlight Heist — keyboard and mouse input.
// WASD and arrows move, Shift sneaks, Enter confirms, M mutes, and a click
// on the canvas throws a pebble (or presses a menu button). Clicks and key
// presses are consumed once, so a held key does not repeat a menu action.

export function createInput(canvas) {
  const keys = new Set();
  let clickQueue = [];
  let enterQueue = 0;
  let muteQueue = 0;

  function key(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = key(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (k === 'Enter' && !e.repeat) enterQueue += 1;
    if (k === 'm' && !e.repeat) muteQueue += 1;
    keys.add(k);
    keys.add(e.key);
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(key(e));
    keys.delete(e.key);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    clickQueue.push({ x, y });
  });

  return {
    axisX() {
      let x = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      return x;
    },
    axisY() {
      let y = 0;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      return y;
    },
    sneak() {
      return keys.has('Shift');
    },
    consumeClick() {
      return clickQueue.shift() ?? null;
    },
    consumeEnter() {
      if (enterQueue > 0) { enterQueue -= 1; return true; }
      return false;
    },
    consumeMute() {
      if (muteQueue > 0) { muteQueue -= 1; return true; }
      return false;
    },
    // Test hook: pretend a key is held, so automated play can drive the game.
    _pressForTest(k) { keys.add(k); },
    _releaseForTest(k) { keys.delete(k); },
  };
}
