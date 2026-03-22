/**
 * renderer.js — Canvas drawing module
 * Handles background, lane glows, notes, character, and particles.
 */

const Renderer = (() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  let W, H, LANE_Y_TOP, LANE_Y_BOT, HIT_X;

  function resize() {
    W          = canvas.width  = window.innerWidth;
    H          = canvas.height = window.innerHeight;
    LANE_Y_TOP = H * 0.35;
    LANE_Y_BOT = H * 0.65;
    HIT_X      = W * 0.12;
  }

  window.addEventListener('resize', resize);
  resize();

  // Getters used by game.js
  function getDims()     { return { W, H, LANE_Y_TOP, LANE_Y_BOT, HIT_X }; }
  function getNoteSpeed(){ return W / 2.0; }   // px/sec

  // ── Particles ────────────────────────────────────────────────────────────

  let particles = [];

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 6;
      particles.push({
        x, y,
        vx:    Math.cos(ang) * spd,
        vy:    Math.sin(ang) * spd - 2.5,
        life:  1,
        decay: 0.025 + Math.random() * 0.03,
        color,
        size:  3 + Math.random() * 5,
        star:  Math.random() > 0.4,
      });
    }
  }

  function updateParticles() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.14;
      p.life -= p.decay;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle   = p.color;
      if (p.star) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a  = i * 4 * Math.PI / 5 - Math.PI / 2;
          const a2 = (i * 4 + 2) * Math.PI / 5 - Math.PI / 2;
          if (i === 0) ctx.moveTo(p.x + p.size * Math.cos(a),      p.y + p.size * Math.sin(a));
          else         ctx.lineTo(p.x + p.size * Math.cos(a),      p.y + p.size * Math.sin(a));
          ctx.lineTo(p.x + p.size * 0.4 * Math.cos(a2), p.y + p.size * 0.4 * Math.sin(a2));
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── Background & lanes ────────────────────────────────────────────────────

  function drawBackground(bgPulse, laneFlash) {
    ctx.fillStyle = '#0a0015';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.save();
    ctx.strokeStyle = `rgba(167,139,250,${0.06 + bgPulse * 0.05})`;
    ctx.lineWidth   = 0.5;
    for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    // Beat flash
    if (bgPulse > 0.7) {
      ctx.save();
      ctx.globalAlpha = (bgPulse - 0.7) * 0.08;
      ctx.fillStyle   = '#ff6ec7';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Lane line glows
    const laneColors = ['#ff6ec7', '#7dd3fc'];
    for (let i = 0; i < 2; i++) {
      const ly  = i === 0 ? LANE_Y_TOP : LANE_Y_BOT;
      const grd = ctx.createLinearGradient(0, ly, W, ly);
      grd.addColorStop(0,    'transparent');
      grd.addColorStop(0.15, laneColors[i] + '50');
      grd.addColorStop(0.5,  laneColors[i] + '90');
      grd.addColorStop(0.85, laneColors[i] + '50');
      grd.addColorStop(1,    'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, ly - 2, W, 4);

      // Lane band
      const band = ctx.createLinearGradient(0, ly - 55, 0, ly + 55);
      band.addColorStop(0,   'transparent');
      band.addColorStop(0.5, laneColors[i] + '12');
      band.addColorStop(1,   'transparent');
      ctx.fillStyle = band;
      ctx.fillRect(0, ly - 55, W, 110);

      // Hit zone ring
      const f = laneFlash[i];
      ctx.save();
      ctx.globalAlpha = 0.25 + f * 0.55;
      ctx.strokeStyle = laneColors[i];
      ctx.lineWidth   = 2 + f * 2.5;
      ctx.beginPath(); ctx.arc(HIT_X, ly, 30 + f * 10, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.08 + f * 0.28;
      ctx.fillStyle   = laneColors[i];
      ctx.beginPath(); ctx.arc(HIT_X, ly, 30 + f * 10, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // ── Notes ────────────────────────────────────────────────────────────────

  function drawNote(note, bgPulse) {
    if (!note.active) return;
    const ly  = note.lane === 0 ? LANE_Y_TOP : LANE_Y_BOT;
    const col = note.lane === 0 ? '#ff6ec7' : '#7dd3fc';
    const r   = 22;

    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur  = 18 + bgPulse * 10;
    ctx.fillStyle   = col;
    ctx.beginPath();
    ctx.moveTo(note.x,          ly - r);
    ctx.lineTo(note.x + r * 0.7, ly);
    ctx.lineTo(note.x,          ly + r);
    ctx.lineTo(note.x - r * 0.7, ly);
    ctx.closePath();
    ctx.fill();

    // Inner shine
    ctx.fillStyle   = '#fff';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(note.x,            ly - r * 0.5);
    ctx.lineTo(note.x + r * 0.35, ly - r * 0.1);
    ctx.lineTo(note.x,            ly + r * 0.1);
    ctx.lineTo(note.x - r * 0.35, ly - r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Character ────────────────────────────────────────────────────────────

  function drawCharacter(nowSec) {
    const bob = Math.sin(nowSec * 4) * 5;
    const cx  = HIT_X;
    const cy  = LANE_Y_BOT + 12 + bob;

    ctx.save();
    // Body
    ctx.shadowColor = '#ff6ec7'; ctx.shadowBlur = 18;
    ctx.fillStyle   = '#ff6ec7';
    ctx.beginPath(); ctx.ellipse(cx, cy + 18, 17, 26, 0, 0, Math.PI * 2); ctx.fill();

    // Head
    ctx.fillStyle  = '#fde4cf'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(cx, cy - 17, 15, 17, 0, 0, Math.PI * 2); ctx.fill();

    // Hair
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath(); ctx.ellipse(cx,      cy - 25, 17, 11,  0,    0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - 17, cy - 15,  7, 13, -0.5,  0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 5,  cy - 33,  5,  9,  0.3,  0, Math.PI * 2); ctx.fill();

    // Eyes
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.ellipse(cx - 5, cy - 17, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 5, cy - 17, 3, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Blush
    ctx.fillStyle = 'rgba(255,100,150,0.35)';
    ctx.beginPath(); ctx.ellipse(cx - 9, cy - 12, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 9, cy - 12, 5, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Skirt
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.moveTo(cx - 17, cy + 8);
    ctx.quadraticCurveTo(cx, cy + 48, cx + 17, cy + 8);
    ctx.quadraticCurveTo(cx, cy + 18, cx - 17, cy + 8);
    ctx.fill();

    // Arms
    const sw = Math.sin(nowSec * 6) * 14;
    ctx.strokeStyle = '#fde4cf'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 11, cy - 2); ctx.quadraticCurveTo(cx - 26, cy + sw,  cx - 28, cy + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 11, cy - 2); ctx.quadraticCurveTo(cx + 26, cy - sw, cx + 28, cy + 16); ctx.stroke();

    ctx.restore();
  }

  // ── Full frame ────────────────────────────────────────────────────────────

  function drawFrame({ notes, bgPulse, laneFlash, nowSec }) {
    drawBackground(bgPulse, laneFlash);
    for (const n of notes) {
      if (n.x > -60 && n.x < W + 80) drawNote(n, bgPulse);
    }
    drawParticles();
    drawCharacter(nowSec);
  }

  return {
    resize,
    getDims,
    getNoteSpeed,
    spawnParticles,
    updateParticles,
    drawFrame,
    drawBackground,  // for static preview on start screen
  };
})();
