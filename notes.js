/**
 * notes.js — Note chart generator with Hold Notes and difficulty support
 */
const NoteChart = (() => {

  function generate(song, difficulty) {
    const cfg   = DIFF_CONFIG[difficulty];
    const BEAT  = AudioEngine.getBeat(song.bpm);
    const totalBeats = song.bars * 4;
    const notes = [];
    let id = 0;

    for (let beat = 0; beat < totalBeats; beat++) {
      if (beat < 4) continue; // grace period

      const beatTime = beat * BEAT * 1000;
      const b4 = beat % 4;

      // Skip notes based on density (Easy skips some)
      const skip = () => Math.random() > cfg.density;

      // Kick → lane 1
      if ((b4===0||b4===2) && !skip()) {
        const hold = Math.random() < cfg.holdChance;
        notes.push(makeNote(id++, 1, beatTime, hold ? BEAT*600 : 0));
      }
      // Snare → lane 0
      if ((b4===1||b4===3) && !skip()) {
        const hold = Math.random() < cfg.holdChance;
        notes.push(makeNote(id++, 0, beatTime, hold ? BEAT*600 : 0));
      }
      // Extra 8th fills after bar 8
      if (beat >= 8 && cfg.density >= 1 && (b4===0||b4===2) && !skip()) {
        notes.push(makeNote(id++, 0, beatTime + BEAT*500));
      }
      // Dense master fills
      if (difficulty === 'master' && beat >= 12 && b4===1 && !skip()) {
        notes.push(makeNote(id++, 1, beatTime + BEAT*500));
      }
    }
    return notes;
  }

  function makeNote(id, lane, time, holdDur=0) {
    return {
      id, lane, time,
      holdDur,      // ms — 0 = tap note, >0 = hold note
      x: 0,
      active: true,
      missed: false,
      holding: false,   // currently being held
      holdReleased: false,
    };
  }

  return { generate };
})();
