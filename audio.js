/**
 * audio.js — Web Audio API synthesizer engine
 */
const AudioEngine = (() => {
  let ctx = null;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  function getCtx()  { return ctx; }
  function getBeat(bpm) { return 60 / bpm; }
  function getSongDur(song) { return getBeat(song.bpm) * 4 * song.bars; }

  function makeGain(val, dest) {
    const g = ctx.createGain();
    g.gain.value = val;
    g.connect(dest || ctx.destination);
    return g;
  }
  function noiseBuf(dur) {
    const len = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random()*2-1;
    return buf;
  }
  function kick(t) {
    const g = makeGain(1.4);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150,t);
    o.frequency.exponentialRampToValueAtTime(40,t+0.12);
    o.connect(g);
    g.gain.setValueAtTime(1.4,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
    o.start(t); o.stop(t+0.2);
  }
  function snare(t) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(0.15);
    const hp = ctx.createBiquadFilter();
    hp.type='highpass'; hp.frequency.value=1800;
    const g = makeGain(0);
    g.gain.setValueAtTime(0.55,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.15);
    src.connect(hp); hp.connect(g);
    src.start(t); src.stop(t+0.16);
  }
  function hihat(t, open) {
    const dur = open ? 0.22 : 0.06;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(dur);
    const hp = ctx.createBiquadFilter();
    hp.type='highpass'; hp.frequency.value=7000;
    const g = makeGain(open ? 0.3 : 0.18);
    g.gain.setValueAtTime(open?0.3:0.18,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(hp); hp.connect(g);
    src.start(t); src.stop(t+dur+0.01);
  }
  function bass(freq,t,dur) {
    const g = makeGain(0.5);
    const o = ctx.createOscillator();
    o.type='sawtooth'; o.frequency.value=freq;
    const lp = ctx.createBiquadFilter();
    lp.type='lowpass'; lp.frequency.value=400;
    o.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.5,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur*0.85);
    o.start(t); o.stop(t+dur);
  }
  function lead(freq,t,dur,vol=0.16) {
    const g = makeGain(0);
    [0,4,-4].forEach(dt => {
      const o = ctx.createOscillator();
      o.type='square'; o.frequency.value=freq; o.detune.value=dt;
      const lp = ctx.createBiquadFilter();
      lp.type='lowpass'; lp.frequency.value=2200;
      o.connect(lp); lp.connect(g);
      o.start(t); o.stop(t+dur+0.02);
    });
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+0.01);
    g.gain.setValueAtTime(vol,t+dur-0.04);
    g.gain.linearRampToValueAtTime(0,t+dur);
  }

  function schedule(song, startT) {
    const BEAT = getBeat(song.bpm);
    const totalBeats = song.bars * 4;
    for (let b = 0; b < totalBeats; b++) {
      const t = startT + b * BEAT;
      const b4 = b % 4;
      if (b4===0||b4===2) kick(t);
      if (b4===1||b4===3) snare(t);
      hihat(t, false);
      hihat(t + BEAT*0.5, false);
      if (b4===3) hihat(t + BEAT*0.75, true);
    }
    const songDur = getSongDur(song);
    for (let rep = 0; rep < 2; rep++) {
      const offset = rep * 16;
      song.melody.forEach(n => {
        const t = startT + (n.b + offset) * BEAT;
        if (t < startT + songDur + 0.1) lead(n.f, t, n.d * BEAT * 0.9);
      });
      song.bass.forEach(n => {
        const t = startT + (n.b + offset) * BEAT;
        if (t < startT + songDur + 0.1) bass(n.f, t, n.d * BEAT);
      });
    }
  }

  function close() { if (ctx) { ctx.close(); ctx = null; } }

  return { init, getCtx, getBeat, getSongDur, schedule, close };
})();
