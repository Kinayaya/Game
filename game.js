/**
 * game.js — Main game controller
 * Coordinates audio, note chart, renderer, and UI.
 */

const game = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  let notes        = [];
  let score        = 0;
  let combo        = 0;
  let maxCombo     = 0;
  let perfectCount = 0;
  let goodCount    = 0;
  let missCount    = 0;
  let hitNotes     = 0;
  let totalNotes   = 0;
  let gameRunning  = false;
  let musicStartTime = 0;

  let laneFlash    = [0, 0];
  let bgPulse      = 0;
  let feedbackTimer = 0;
  let lastT        = 0;

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Returns elapsed game time in milliseconds, synced to AudioContext clock. */
  function getGameTime() {
    return (AudioEngine.getCtx().currentTime - musicStartTime) * 1000;
  }

  function updateHUD() {
    document.getElementById('score').textContent   = String(score).padStart(6, '0');
    document.getElementById('combo').textContent   = `COMBO × ${combo}`;
    const total = hitNotes + missCount;
    const acc   = total > 0 ? Math.round(hitNotes / total * 100) : 100;
    document.getElementById('accuracy').textContent = `Accuracy: ${acc}%`;
  }

  function showFeedback(text, color, size) {
    const el        = document.getElementById('hit-feedback');
    el.textContent  = text;
    el.style.color  = color;
    el.style.fontSize = size + 'px';
    el.style.opacity  = '1';
    feedbackTimer     = 22;
  }

  // ── Hit detection ─────────────────────────────────────────────────────────

  function hitLane(lane) {
    const gt         = getGameTime();
    let   best       = null;
    let   bestDiff   = 9999;

    for (const n of notes) {
      if (!n.active || n.lane !== lane) continue;
      const diff = Math.abs(n.time - gt);
      if (diff < 250 && diff < bestDiff) { best = n; bestDiff = diff; }
    }

    if (!best) return;

    best.active = false;
    hitNotes++;

    const { LANE_Y_TOP, LANE_Y_BOT, HIT_X } = Renderer.getDims();
    const ly  = lane === 0 ? LANE_Y_TOP : LANE_Y_BOT;
    const col = lane === 0 ? '#ff6ec7' : '#7dd3fc';

    if (bestDiff < 60) {
      perfectCount++;
      score += 300 * Math.max(1, Math.floor(combo / 10) + 1);
      combo++;
      showFeedback('✦ PERFECT!', '#ffdd00', 26);
      Renderer.spawnParticles(HIT_X, ly, col, 20);
      Renderer.spawnParticles(HIT_X, ly, '#fff', 5);
    } else if (bestDiff < 140) {
      goodCount++;
      score += 100;
      combo++;
      showFeedback('GOOD', '#a0f0a0', 20);
      Renderer.spawnParticles(HIT_X, ly, col, 9);
    } else {
      goodCount++;
      score += 40;
      combo++;
      showFeedback('LATE', '#aaaaff', 18);
    }

    if (combo > maxCombo) maxCombo = combo;
    updateHUD();
  }

  // ── Input handlers (called from HTML) ────────────────────────────────────

  function handleLaneTap(lane, down, e) {
    if (e) e.preventDefault();
    const btn = document.getElementById(lane === 0 ? 'laneL' : 'laneR');
    btn.classList.toggle('active', down);
    if (down && gameRunning) {
      hitLane(lane);
      laneFlash[lane] = 1;
    }
  }

  // ── Game loop ─────────────────────────────────────────────────────────────

  function gameLoop(now) {
    if (!gameRunning) return;

    const nowSec = now / 1000;
    const dt     = nowSec - lastT;
    lastT        = nowSec;

    const gt          = getGameTime(); // ms
    const audioCtx    = AudioEngine.getCtx();
    const BEAT        = AudioEngine.getBeat();
    const SONG_DUR    = AudioEngine.getSongDur() * 1000; // ms

    // Beat pulse — synced to AudioContext time
    const beatPos  = (audioCtx.currentTime - musicStartTime) / BEAT;
    const fracBeat = beatPos - Math.floor(beatPos);
    bgPulse        = Math.max(0, 1 - fracBeat * 3.5);

    // Beat indicator dot
    const bi        = document.getElementById('beat-indicator');
    bi.style.opacity = bgPulse > 0.6 ? String(bgPulse) : '0';

    // Lane flash decay
    laneFlash[0] = Math.max(0, laneFlash[0] - dt * 5);
    laneFlash[1] = Math.max(0, laneFlash[1] - dt * 5);

    // Move notes based on audio time
    const speed = Renderer.getNoteSpeed(); // px/sec
    for (const n of notes) {
      if (!n.active) continue;
      n.x = Renderer.getDims().HIT_X + (n.time - gt) / 1000 * speed;
    }

    // Miss detection
    for (const n of notes) {
      if (!n.active || n.missed) continue;
      if (n.x < Renderer.getDims().HIT_X - 75) {
        n.active  = false;
        n.missed  = true;
        missCount++;
        combo     = 0;
        showFeedback('MISS', '#ff4444', 24);
        updateHUD();
      }
    }

    // Particles
    Renderer.updateParticles();

    // Feedback timer
    if (feedbackTimer > 0) {
      feedbackTimer--;
      const el        = document.getElementById('hit-feedback');
      el.style.opacity = String(Math.min(1, feedbackTimer / 8));
      if (feedbackTimer === 0) el.style.opacity = '0';
    }

    // Progress bar
    const prog = Math.min(100, Math.max(0, gt / SONG_DUR * 100));
    document.getElementById('progress-bar').style.width = prog + '%';

    // Render
    Renderer.drawFrame({ notes, bgPulse, laneFlash, nowSec });

    // End condition
    if (gt >= SONG_DUR) { endGame(); return; }

    requestAnimationFrame(gameLoop);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  function start() {
    AudioEngine.init();
    document.getElementById('start-screen').style.display = 'none';

    // Reset state
    notes        = NoteChart.generate();
    totalNotes   = notes.length;
    score        = 0; combo = 0; maxCombo = 0;
    perfectCount = 0; goodCount = 0; missCount = 0; hitNotes = 0;
    laneFlash    = [0, 0];
    feedbackTimer = 0;

    updateHUD();

    // Schedule music with a short delay so browser can prepare
    musicStartTime = AudioEngine.getCtx().currentTime + 0.15;
    AudioEngine.schedule(musicStartTime);

    gameRunning = true;
    lastT = performance.now() / 1000;
    requestAnimationFrame(gameLoop);
  }

  function endGame() {
    gameRunning = false;
    const total = perfectCount + goodCount + missCount;
    const acc   = total > 0 ? Math.round((perfectCount + goodCount) / total * 100) : 100;

    document.getElementById('r-score').textContent   = String(score).padStart(6, '0');
    document.getElementById('r-combo').textContent   = maxCombo;
    document.getElementById('r-perfect').textContent = perfectCount;
    document.getElementById('r-good').textContent    = goodCount;
    document.getElementById('r-miss').textContent    = missCount;
    document.getElementById('r-acc').textContent     = acc + '%';
    document.getElementById('result-screen').style.display = 'flex';
  }

  function reset() {
    AudioEngine.close();
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('start-screen').style.display  = 'flex';
  }

  // ── Keyboard support ─────────────────────────────────────────────────────

  document.addEventListener('keydown', e => {
    if (!gameRunning) return;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  handleLaneTap(0, true,  null);
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') handleLaneTap(1, true,  null);
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  handleLaneTap(0, false, null);
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') handleLaneTap(1, false, null);
  });

  // Static preview on load
  window.addEventListener('load', () => {
    Renderer.drawBackground(0, [0, 0]);
  });

  return { start, reset, handleLaneTap };
})();
