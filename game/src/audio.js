// Mothlight Heist — sound, synthesized with WebAudio: no audio files.
// Footsteps, a coin chime, the alarm sting, the pearl's shimmer and the win
// arpeggio. Everything is quiet until the first click or keypress unlocks
// the audio context, and M toggles mute.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type = 'sine', gain = 0.08, when = 0, slideTo = null) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, gain, when = 0) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + when;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(ac.destination);
    src.start(t0);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    // A soft tap: the player's own step, quieter while sneaking.
    playerStep(sneaking) { noiseBurst(0.05, sneaking ? 0.012 : 0.03); },
    // A guard's step, louder the closer the guard is (volume 0..1).
    footstep(volume) { noiseBurst(0.06, 0.015 + volume * 0.05); },
    coin() { tone(880, 0.09, 'sine', 0.06); tone(1318, 0.14, 'sine', 0.05, 0.07); },
    pearl() { tone(523, 0.2, 'sine', 0.06); tone(784, 0.2, 'sine', 0.06, 0.1); tone(1046, 0.35, 'sine', 0.06, 0.2); },
    pebble() { noiseBurst(0.08, 0.06); tone(220, 0.08, 'triangle', 0.04, 0, 140); },
    // Two-note alarm sting when a guard starts the chase.
    alert() { tone(392, 0.16, 'square', 0.05); tone(311, 0.22, 'square', 0.05, 0.14); },
    caught() { tone(220, 0.3, 'sawtooth', 0.07, 0, 110); noiseBurst(0.2, 0.08, 0.05); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, 'sine', 0.06, i * 0.11)); },
  };
}
