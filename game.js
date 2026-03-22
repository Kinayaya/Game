/**
 * game.js — Main controller
 * Song select, difficulty, hold notes, leaderboard, result screen
 */
const game = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  let currentSong  = SONGS[0];
  let currentDiff  = 'hard';
  let notes        = [];
  let score=0, combo=0, maxCombo=0;
  let perfectCount=0, goodCount=0, missCount=0, hitNotes=0, totalNotes=0;
  let gameRunning  = false;
  let musicStartTime = 0;
  let laneFlash    = [0, 0];
  let laneHeld     = [false, false];
  let bgPulse      = 0;
  let feedbackTimer= 0;
  let lastT        = 0;

  // ── Leaderboard (localStorage) ─────────────────────────────────────────
  function lbKey(song, diff) { return `br_${song.id}_${diff}`; }

  function saveScore(song, diff, s, combo, acc) {
    const key   = lbKey(song, diff);
    const entry = { score:s, combo, acc, date: new Date().toLocaleDateString() };
    let list = JSON.parse(localStorage.getItem(key)||'[]');
    list.push(entry);
    list.sort((a,b)=>b.score-a.score);
    list = list.slice(0,10);
    localStorage.setItem(key, JSON.stringify(list));
  }

  function getScores(song, diff) {
    return JSON.parse(localStorage.getItem(lbKey(song, diff))||'[]');
  }

  // ── Song Select UI ─────────────────────────────────────────────────────
  function buildSongSelect() {
    const list = document.getElementById('song-list');
    list.innerHTML = '';
    SONGS.forEach((s,i) => {
      const card = document.createElement('div');
      card.className = 'song-card' + (s===currentSong?' selected':'');
      card.innerHTML = `<div class="sc-emoji">${s.emoji}</div><div class="sc-name">${s.name}</div><div class="sc-bpm">BPM ${s.bpm} · ${s.description}</div>`;
      card.onclick = () => {
        currentSong = s;
        document.querySelectorAll('.song-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
      };
      list.appendChild(card);
    });
  }

  function setDiff(d) {
    currentDiff = d;
    document.querySelectorAll('.diff-btn').forEach(b=>{
      b.classList.toggle('active', b.dataset.diff===d);
    });
  }

  // ── Leaderboard Screen ─────────────────────────────────────────────────
  function showLeaderboard() {
    const list = document.getElementById('lb-list');
    list.innerHTML = '';
    SONGS.forEach(song => {
      ['easy','hard','master'].forEach(diff => {
        const scores = getScores(song, diff);
        if (!scores.length) return;
        const header = document.createElement('div');
        header.className = 'lb-row';
        header.style.cssText = 'color:#a78bfa;font-size:13px;border-bottom:1px solid rgba(167,139,250,0.3)';
        header.textContent = `${song.emoji} ${song.name} · ${DIFF_CONFIG[diff].label}`;
        list.appendChild(header);
        scores.slice(0,3).forEach((e,i) => {
          const row = document.createElement('div');
          row.className = 'lb-row';
          row.innerHTML = `<span class="lb-rank">#${i+1}</span><span class="lb-info">${e.date} · Combo ${e.combo} · ${e.acc}%</span><span class="lb-score">${String(e.score).padStart(6,'0')}</span>`;
          list.appendChild(row);
        });
      });
    });
    if (!list.children.length) {
      list.innerHTML = '<div style="color:#555;text-align:center;padding:20px;">還沒有紀錄，快去打歌！</div>';
    }
    document.getElementById('leaderboard-screen').style.display = 'flex';
    document.getElementById('song-select-screen').style.display = 'none';
  }

  function hideLeaderboard() {
    document.getElementById('leaderboard-screen').style.display = 'none';
    document.getElementById('song-select-screen').style.display = 'flex';
  }

  // ── HUD ────────────────────────────────────────────────────────────────
  function getGameTime() {
    return (AudioEngine.getCtx().currentTime - musicStartTime) * 1000;
  }

  function updateHUD() {
    document.getElementById('score').textContent   = String(score).padStart(6,'0');
    document.getElementById('combo').textContent   = `COMBO × ${combo}`;
    const total = hitNotes + missCount;
    const acc   = total>0 ? Math.round(hitNotes/total*100) : 100;
    document.getElementById('accuracy').textContent = `Accuracy: ${acc}%`;
  }

  function showFeedback(text, color, size) {
    const el = document.getElementById('hit-feedback');
    el.textContent=text; el.style.color=color;
    el.style.fontSize=size+'px'; el.style.opacity='1';
    feedbackTimer=22;
  }

  function getRank(acc) {
    if (acc>=100) return '🌟 S+';
    if (acc>=95)  return '⭐ S';
    if (acc>=85)  return '🏆 A';
    if (acc>=70)  return '🎵 B';
    if (acc>=50)  return '📀 C';
    return '💫 D';
  }

  // ── Hit detection ────────────────────────────────────────────────────────
  function hitLane(lane) {
    const gt = getGameTime();
    let best=null, bestDiff=9999;
    for (const n of notes) {
      if (!n.active || n.lane!==lane) continue;
      const diff = Math.abs(n.time - gt);
      if (diff < 250 && diff < bestDiff) { best=n; bestDiff=diff; }
    }
    if (!best) return;

    const { LANE_Y_TOP, LANE_Y_BOT, HIT_X } = Renderer.getDims();
    const ly  = lane===0 ? LANE_Y_TOP : LANE_Y_BOT;
    const col = lane===0 ? '#ff6ec7' : '#7dd3fc';

    if (best.holdDur > 0) {
      // Start holding
      best.holding = true;
      hitNotes++;
      combo++;
      if (combo>maxCombo) maxCombo=combo;
      score += 150;
      showFeedback('HOLD!', '#ffdd00', 24);
      Renderer.spawnParticles(HIT_X, ly, col, 10);
      Renderer.setCharState('jump');
    } else {
      best.active = false;
      hitNotes++;
      if (bestDiff < 60) {
        perfectCount++;
        score += 300 * Math.max(1, Math.floor(combo/10)+1);
        combo++;
        showFeedback('✦ PERFECT!', '#ffdd00', 26);
        Renderer.spawnParticles(HIT_X, ly, col, 22);
        Renderer.spawnParticles(HIT_X, ly, '#fff', 6);
        Renderer.setCharState('jump');
      } else if (bestDiff < 140) {
        goodCount++;
        score += 100; combo++;
        showFeedback('GOOD', '#a0f0a0', 20);
        Renderer.spawnParticles(HIT_X, ly, col, 10);
        Renderer.setCharState('jump');
      } else {
        goodCount++;
        score += 40; combo++;
        showFeedback('LATE', '#aaaaff', 18);
      }
      if (combo>maxCombo) maxCombo=combo;
    }
    updateHUD();
  }

  function releaseLane(lane) {
    const gt = getGameTime();
    for (const n of notes) {
      if (!n.active || n.lane!==lane || !n.holding) continue;
      const holdEnd = n.time + n.holdDur;
      const remaining = holdEnd - gt;
      n.holding = false;
      n.active  = false;
      n.holdReleased = true;

      if (remaining < 200) {
        // Released near end = perfect hold
        perfectCount++;
        score += 200;
        showFeedback('✦ HOLD PERFECT!', '#ffdd00', 24);
        const { LANE_Y_TOP, LANE_Y_BOT, HIT_X } = Renderer.getDims();
        const ly  = lane===0 ? LANE_Y_TOP : LANE_Y_BOT;
        const col = lane===0 ? '#ff6ec7' : '#7dd3fc';
        Renderer.spawnParticles(HIT_X, ly, col, 15, 'star');
      } else {
        goodCount++;
        score += 80;
        showFeedback('HOLD GOOD', '#a0f0a0', 18);
      }
      updateHUD();
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────
  function tap(lane, down, e) {
    if (e) e.preventDefault();
    const btn = document.getElementById(lane===0?'laneL':'laneR');
    btn.classList.toggle('active', down);
    laneHeld[lane] = down;
    if (down && gameRunning)  { hitLane(lane); laneFlash[lane]=1; }
    if (!down && gameRunning) releaseLane(lane);
  }

  // ── Game loop ──────────────────────────────────────────────────────────
  function gameLoop(now) {
    if (!gameRunning) return;
    const nowSec = now/1000;
    const dt     = nowSec - lastT; lastT = nowSec;
    const gt     = getGameTime();
    const cfg    = DIFF_CONFIG[currentDiff];
    const BEAT   = AudioEngine.getBeat(currentSong.bpm);
    const SONG_DUR = AudioEngine.getSongDur(currentSong) * 1000;

    // Beat pulse
    const beatPos  = (AudioEngine.getCtx().currentTime - musicStartTime) / BEAT;
    const fracBeat = beatPos - Math.floor(beatPos);
    bgPulse = Math.max(0, 1 - fracBeat*3.5);
    document.getElementById('beat-indicator').style.opacity = bgPulse>0.6 ? String(bgPulse) : '0';

    // Lane flash decay
    laneFlash[0] = Math.max(0, laneFlash[0]-dt*5);
    laneFlash[1] = Math.max(0, laneFlash[1]-dt*5);

    // Move notes
    const speed = Renderer.getNoteSpeed(cfg.speedMult);
    for (const n of notes) {
      if (!n.active && !n.holding) continue;
      n.x = Renderer.getDims().HIT_X + (n.time - gt)/1000 * speed;
    }

    // Hold note tick
    for (const n of notes) {
      if (!n.holding) continue;
      const holdEnd = n.time + n.holdDur;
      if (gt >= holdEnd) {
        // Auto-complete hold
        n.holding = false; n.active = false;
        perfectCount++;
        score += 100;
        const { LANE_Y_TOP, LANE_Y_BOT, HIT_X } = Renderer.getDims();
        const ly  = n.lane===0 ? LANE_Y_TOP : LANE_Y_BOT;
        const col = n.lane===0 ? '#ff6ec7' : '#7dd3fc';
        Renderer.spawnParticles(HIT_X, ly, col, 8);
        updateHUD();
      } else {
        // Score trickle
        if (Math.floor(gt/100) > Math.floor((gt-dt*1000)/100)) {
          score += 10;
          updateHUD();
        }
      }
    }

    // Miss detection
    for (const n of notes) {
      if (!n.active || n.missed || n.holding) continue;
      if (n.x < Renderer.getDims().HIT_X - 80) {
        n.active=false; n.missed=true;
        missCount++; combo=0;
        showFeedback('MISS', '#ff4444', 24);
        Renderer.setCharState('hit');
        updateHUD();
      }
    }

    // Particles
    Renderer.updateParticles();

    // Feedback timer
    if (feedbackTimer>0) {
      feedbackTimer--;
      const el = document.getElementById('hit-feedback');
      el.style.opacity = String(Math.min(1, feedbackTimer/8));
      if (feedbackTimer===0) el.style.opacity='0';
    }

    // Progress
    const prog = Math.min(100, Math.max(0, gt/SONG_DUR*100));
    document.getElementById('progress-bar').style.width = prog+'%';

    // Render
    Renderer.drawFrame({ notes, bgPulse, laneFlash, nowSec, gameTime:gt, songId:currentSong.id, speedMult:cfg.speedMult });

    if (gt >= SONG_DUR) { endGame(); return; }
    requestAnimationFrame(gameLoop);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────
  function start() {
    AudioEngine.init();
    document.getElementById('song-select-screen').style.display = 'none';

    const cfg = DIFF_CONFIG[currentDiff];
    notes      = NoteChart.generate(currentSong, currentDiff);
    totalNotes = notes.length;
    score=0; combo=0; maxCombo=0;
    perfectCount=0; goodCount=0; missCount=0; hitNotes=0;
    laneFlash=[0,0]; feedbackTimer=0;

    document.getElementById('song-title').textContent = `${currentSong.emoji} ${currentSong.name}`;
    document.getElementById('song-sub').textContent   = `BPM ${currentSong.bpm} · ${cfg.label}`;
    updateHUD();

    musicStartTime = AudioEngine.getCtx().currentTime + 0.15;
    AudioEngine.schedule(currentSong, musicStartTime);
    gameRunning = true;
    lastT = performance.now()/1000;
    requestAnimationFrame(gameLoop);
  }

  function endGame() {
    gameRunning = false;
    const total = perfectCount + goodCount + missCount;
    const acc   = total>0 ? Math.round((perfectCount+goodCount)/total*100) : 100;
    const rank  = getRank(acc);

    saveScore(currentSong, currentDiff, score, maxCombo, acc);

    document.getElementById('r-song').textContent    = `${currentSong.emoji} ${currentSong.name}`;
    document.getElementById('r-diff').textContent    = DIFF_CONFIG[currentDiff].label;
    document.getElementById('r-score').textContent   = String(score).padStart(6,'0');
    document.getElementById('r-combo').textContent   = maxCombo;
    document.getElementById('r-perfect').textContent = perfectCount;
    document.getElementById('r-good').textContent    = goodCount;
    document.getElementById('r-miss').textContent    = missCount;
    document.getElementById('r-acc').textContent     = acc+'%';
    document.getElementById('r-rank').textContent    = rank;
    document.getElementById('result-screen').style.display = 'flex';
  }

  function retry() {
    AudioEngine.close();
    document.getElementById('result-screen').style.display = 'none';
    start();
  }

  function backToSelect() {
    AudioEngine.close();
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('song-select-screen').style.display = 'flex';
    Renderer.drawBackground(0,[0,0],0,'');
  }

  // ── Keyboard ────────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (!gameRunning) return;
    if (e.key==='a'||e.key==='A'||e.key==='ArrowLeft')  tap(0,true,null);
    if (e.key==='d'||e.key==='D'||e.key==='ArrowRight') tap(1,true,null);
  });
  document.addEventListener('keyup', e => {
    if (e.key==='a'||e.key==='A'||e.key==='ArrowLeft')  tap(0,false,null);
    if (e.key==='d'||e.key==='D'||e.key==='ArrowRight') tap(1,false,null);
  });

  // ── Init ─────────────────────────────────────────────────────────────────
  window.addEventListener('load', () => {
    buildSongSelect();
    Renderer.drawBackground(0,[0,0],0,'neon_fantasy');
  });

  return { start, retry, backToSelect, tap, setDiff, showLeaderboard, hideLeaderboard };
})();
