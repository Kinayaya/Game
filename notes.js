/**
 * notes.js — Note chart generation
 * Produces a note array synced to the drum pattern.
 * Lane 0 = top (pink, snare beats)
 * Lane 1 = bottom (blue, kick beats)
 */

const NoteChart = (() => {

  /**
   * Generate the note chart for the song.
   * @returns {Array<{id, lane, time, x, active, missed}>}
   */
  function generate() {
    const BEAT        = AudioEngine.getBeat();
    const SONG_BARS   = 16;
    const totalBeats  = SONG_BARS * 4;
    const notes       = [];
    let   id          = 0;

    for (let beat = 0; beat < totalBeats; beat++) {
      if (beat < 4) continue;             // grace period at intro

      const beatTime = beat * BEAT * 1000; // milliseconds
      const b4       = beat % 4;

      // Kick on beats 0,2  → lane 1 (blue)
      if (b4 === 0 || b4 === 2) {
        notes.push(makeNote(id++, 1, beatTime));
      }

      // Snare on beats 1,3 → lane 0 (pink)
      if (b4 === 1 || b4 === 3) {
        notes.push(makeNote(id++, 0, beatTime));
      }

      // Extra 8th-note fills after bar 8
      if (beat >= 8 && (b4 === 0 || b4 === 2)) {
        notes.push(makeNote(id++, 0, beatTime + BEAT * 500));
      }

      // Dense fills in last section (bar 12+)
      if (beat >= 12 && b4 === 1) {
        notes.push(makeNote(id++, 1, beatTime + BEAT * 500));
      }
    }

    return notes;
  }

  function makeNote(id, lane, time) {
    return { id, lane, time, x: 0, active: true, missed: false };
  }

  return { generate };
})();
