/**
 * audio.js — Web Audio API synthesizer engine
 * Generates kick, snare, hi-hat, bass, and lead synth entirely in-browser.
 * No external audio files required.
 */

const AudioEngine = (() => {
  const BPM    = 160;
  const BEAT   = 60 / BPM;        // seconds per beat
  const BAR    = BEAT * 4;
  const SONG_BARS = 16;
  const SONG_DURATION = BAR * SONG_BARS; // ~24 seconds

  let ctx = null;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function getCtx()      { return ctx; }
  function getSongDur()  { return SONG_DURATION; }
  function getBeat()     { return BEAT; }

  // ── Low-level helpers ────────────────────────────────────────────────────

  function makeGain(val, dest) {
    const g = ctx.createGain();
    g.gain.value = val;
    g.connect(dest || ctx.destination);
    return g;
  }

  function noiseBuffer(duration) {
    const len = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ── Drum voices ──────────────────────────────────────────────────────────

  function playKick(t) {
    const g = makeGain(1.4);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    o.connect(g);
    g.gain.setValueAtTime(1.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.start(t); o.stop(t + 0.2);
  }

  function playSnare(t) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.15);
    const hp  = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1800;
    const g   = makeGain(0.55);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    src.connect(hp); hp.connect(g);
    src.start(t); src.stop(t + 0.16);
  }

  function playHihat(t, open = false) {
    const dur = open ? 0.22 : 0.06;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const hp  = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7000;
    const g   = makeGain(open ? 0.3 : 0.18);
    g.gain.setValueAtTime(open ? 0.3 : 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp); hp.connect(g);
    src.start(t); src.stop(t + dur + 0.01);
  }

  // ── Melodic voices ────────────────────────────────────────────────────────

  function playBass(freq, t, dur) {
    const g = makeGain(0.5);
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = freq;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 400;
    o.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.85);
    o.start(t); o.stop(t + dur);
  }

  function playLead(freq, t, dur, vol = 0.18) {
    const g = makeGain(0);
    [0, 4, -4].forEach(detune => {
      const o  = ctx.createOscillator();
      o.type   = 'square';
      o.frequency.value = freq;
      o.detune.value    = detune;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2200;
      o.connect(lp); lp.connect(g);
      o.start(t); o.stop(t + dur + 0.02);
    });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + dur - 0.04);
    g.gain.linearRampToValueAtTime(0, t + dur);
  }

  // ── Song data ────────────────────────────────────────────────────────────

  // Melody in beats (pentatonic / synth-pop, relative to song start)
  const MELODY = [
    {b:0,    f:523.25, d:0.5 }, {b:0.5,  f:587.33, d:0.5 },
    {b:1,    f:659.25, d:1   }, {b:2,    f:783.99, d:0.5 },
    {b:2.5,  f:698.46, d:0.5 }, {b:3,    f:659.25, d:1   },
    {b:4,    f:587.33, d:0.5 }, {b:4.5,  f:523.25, d:0.5 },
    {b:5,    f:440,    d:1   }, {b:6,    f:523.25, d:0.5 },
    {b:6.5,  f:587.33, d:0.5 }, {b:7,    f:659.25, d:1   },
    {b:8,    f:783.99, d:0.5 }, {b:8.5,  f:880,    d:0.5 },
    {b:9,    f:783.99, d:1   }, {b:10,   f:698.46, d:0.5 },
    {b:10.5, f:659.25, d:0.5 }, {b:11,   f:587.33, d:0.5 },
    {b:11.5, f:523.25, d:0.5 }, {b:12,   f:440,    d:1   },
    {b:13,   f:523.25, d:0.5 }, {b:13.5, f:587.33, d:0.25},
    {b:13.75,f:659.25, d:0.25}, {b:14,   f:783.99, d:0.5 },
    {b:14.5, f:880,    d:1.5 },
  ];

  const BASS_LINE = [
    {b:0,  f:65.41, d:1.8}, {b:2,  f:73.42, d:1.8},
    {b:4,  f:55,    d:1.8}, {b:6,  f:65.41, d:1.8},
    {b:8,  f:87.31, d:1.8}, {b:10, f:82.41, d:1.8},
    {b:12, f:65.41, d:1.8}, {b:14, f:73.42, d:1.8},
  ];

  // ── Schedule full song ────────────────────────────────────────────────────

  function schedule(startT) {
    const totalBeats = SONG_BARS * 4;

    // Drums — full song
    for (let beat = 0; beat < totalBeats; beat++) {
      const t  = startT + beat * BEAT;
      const b4 = beat % 4;
      if (b4 === 0 || b4 === 2) playKick(t);
      if (b4 === 1 || b4 === 3) playSnare(t);
      playHihat(t, false);
      playHihat(t + BEAT * 0.5, false);
      if (b4 === 3) playHihat(t + BEAT * 0.75, true);
    }

    // Melody + bass — repeat 2× to fill 16 bars
    for (let rep = 0; rep < 2; rep++) {
      const offset = rep * 16;
      MELODY.forEach(n => {
        const t = startT + (n.b + offset) * BEAT;
        if (t < startT + SONG_DURATION + 0.1)
          playLead(n.f, t, n.d * BEAT * 0.9);
      });
      BASS_LINE.forEach(n => {
        const t = startT + (n.b + offset) * BEAT;
        if (t < startT + SONG_DURATION + 0.1)
          playBass(n.f, t, n.d * BEAT);
      });
    }
  }

  function close() {
    if (ctx) { ctx.close(); ctx = null; }
  }

  return { init, getCtx, getSongDur, getBeat, schedule, close };
})();
