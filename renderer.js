/**
 * renderer.js — Canvas rendering with new character, animated backgrounds, hold notes
 */
const Renderer = (() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, LANE_Y_TOP, LANE_Y_BOT, HIT_X;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    LANE_Y_TOP = H * 0.35;
    LANE_Y_BOT = H * 0.65;
    HIT_X = W * 0.13;
  }
  window.addEventListener('resize', resize);
  resize();

  function getDims() { return { W, H, LANE_Y_TOP, LANE_Y_BOT, HIT_X }; }
  function getNoteSpeed(speedMult=1) { return (W / 2.0) * speedMult; }

  // ── Particles ────────────────────────────────────────────────────────────
  let particles = [];
  function spawnParticles(x, y, color, count, type='mix') {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 7;
      particles.push({
        x, y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd - 3,
        life:1, decay:0.022+Math.random()*0.025,
        color, size:3+Math.random()*6,
        shape: type==='star' ? 'star' : (Math.random()>0.4?'star':'circle'),
        rot: Math.random()*Math.PI*2, rotV: (Math.random()-0.5)*0.3,
      });
    }
  }
  function updateParticles() {
    for (const p of particles) {
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.13;
      p.rot+=p.rotV; p.life-=p.decay;
    }
    particles = particles.filter(p=>p.life>0);
  }
  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle   = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.shape==='star') {
        ctx.beginPath();
        for (let i=0;i<5;i++){
          const a=i*4*Math.PI/5-Math.PI/2, a2=(i*4+2)*Math.PI/5-Math.PI/2;
          if(i===0) ctx.moveTo(p.size*Math.cos(a), p.size*Math.sin(a));
          else ctx.lineTo(p.size*Math.cos(a), p.size*Math.sin(a));
          ctx.lineTo(p.size*0.4*Math.cos(a2), p.size*0.4*Math.sin(a2));
        }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0,0,p.size,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── Background scenes ─────────────────────────────────────────────────────
  let bgStars = [];
  function initStars() {
    bgStars = [];
    for (let i=0;i<120;i++) bgStars.push({
      x:Math.random()*W, y:Math.random()*H,
      r:0.5+Math.random()*1.5, twinkle:Math.random()*Math.PI*2,
      speed:0.3+Math.random()*0.7,
    });
  }
  initStars();
  window.addEventListener('resize', initStars);

  function drawBackground(bgPulse, laneFlash, nowSec, songId) {
    // Base
    ctx.fillStyle='#0a0015'; ctx.fillRect(0,0,W,H);

    // Animated stars
    for (const s of bgStars) {
      s.twinkle += 0.02;
      s.x -= s.speed * 0.3;
      if (s.x < 0) s.x = W;
      const alpha = 0.3 + 0.5 * Math.abs(Math.sin(s.twinkle));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Floating sakura petals for Sakura Waltz
    if (songId === 'sakura_waltz') {
      ctx.save();
      const petalCount = 12;
      for (let i=0;i<petalCount;i++) {
        const px = ((nowSec*30 + i*W/petalCount) % (W+60)) - 30;
        const py = (H*0.1 + i*H*0.07 + Math.sin(nowSec*0.8+i)*40) % H;
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ffb7c5';
        ctx.beginPath();
        ctx.ellipse(px, py, 8, 5, nowSec*0.5+i, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Grid lines
    ctx.save();
    ctx.strokeStyle = `rgba(167,139,250,${0.05 + bgPulse*0.05})`;
    ctx.lineWidth = 0.5;
    for (let x=0;x<W;x+=80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0;y<H;y+=80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.restore();

    // Beat flash
    if (bgPulse > 0.7) {
      ctx.save();
      ctx.globalAlpha = (bgPulse-0.7)*0.09;
      ctx.fillStyle = '#ff6ec7';
      ctx.fillRect(0,0,W,H);
      ctx.restore();
    }

    // Lane glows
    const laneColors = ['#ff6ec7','#7dd3fc'];
    for (let i=0;i<2;i++) {
      const ly = i===0 ? LANE_Y_TOP : LANE_Y_BOT;
      const grd = ctx.createLinearGradient(0,ly,W,ly);
      grd.addColorStop(0,'transparent');
      grd.addColorStop(0.15, laneColors[i]+'50');
      grd.addColorStop(0.5,  laneColors[i]+'90');
      grd.addColorStop(0.85, laneColors[i]+'50');
      grd.addColorStop(1,'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0,ly-2,W,4);
      const band = ctx.createLinearGradient(0,ly-55,0,ly+55);
      band.addColorStop(0,'transparent');
      band.addColorStop(0.5, laneColors[i]+'12');
      band.addColorStop(1,'transparent');
      ctx.fillStyle = band;
      ctx.fillRect(0,ly-55,W,110);

      // Hit zone
      const f = laneFlash[i];
      ctx.save();
      ctx.globalAlpha = 0.25+f*0.55;
      ctx.strokeStyle = laneColors[i];
      ctx.lineWidth = 2+f*2.5;
      ctx.beginPath(); ctx.arc(HIT_X,ly,30+f*10,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 0.08+f*0.28;
      ctx.fillStyle = laneColors[i];
      ctx.beginPath(); ctx.arc(HIT_X,ly,30+f*10,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  // ── Notes ────────────────────────────────────────────────────────────────
  function drawNote(note, bgPulse, gameTime) {
    if (!note.active) return;
    const ly  = note.lane===0 ? LANE_Y_TOP : LANE_Y_BOT;
    const col = note.lane===0 ? '#ff6ec7' : '#7dd3fc';
    const r   = 22;

    // Hold note tail
    if (note.holdDur > 0) {
      const speed = getNoteSpeed();
      const tailLen = (note.holdDur / 1000) * speed;
      const tailX   = note.x;
      const tailEndX = tailX + tailLen;

      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = 10;
      const grd = ctx.createLinearGradient(tailX,0,tailEndX,0);
      grd.addColorStop(0, col+'dd');
      grd.addColorStop(1, col+'33');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.roundRect(tailX, ly-10, tailLen, 20, 10);
      ctx.fill();

      // Hold active glow
      if (note.holding) {
        ctx.globalAlpha = 0.5 + Math.sin(gameTime*0.015)*0.3;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(tailX, ly-5, tailLen, 10, 5);
        ctx.fill();
      }
      ctx.restore();
    }

    // Diamond head
    ctx.save();
    ctx.shadowColor = col; ctx.shadowBlur = 18 + bgPulse*10;
    ctx.fillStyle   = col;
    ctx.beginPath();
    ctx.moveTo(note.x, ly-r);
    ctx.lineTo(note.x+r*0.7, ly);
    ctx.lineTo(note.x, ly+r);
    ctx.lineTo(note.x-r*0.7, ly);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff'; ctx.globalAlpha=0.38;
    ctx.beginPath();
    ctx.moveTo(note.x, ly-r*0.5);
    ctx.lineTo(note.x+r*0.35, ly-r*0.1);
    ctx.lineTo(note.x, ly+r*0.1);
    ctx.lineTo(note.x-r*0.35, ly-r*0.1);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ── Character: Gold-hair Shrine Maiden ───────────────────────────────────
  // Based on the reference: long blonde hair, white kimono, pink skirt, flower brooch
  let charState = 'idle'; // idle | jump | hit
  let charStateTimer = 0;
  let charJumpV = 0, charJumpY = 0;

  function setCharState(state) {
    charState = state;
    charStateTimer = state==='jump' ? 40 : state==='hit' ? 20 : 0;
    if (state==='jump') charJumpV = -14;
  }

  function drawCharacter(nowSec) {
    // Update state
    if (charStateTimer > 0) {
      charStateTimer--;
      if (charStateTimer === 0) charState = 'idle';
    }
    if (charState==='jump') {
      charJumpV += 1.2;
      charJumpY += charJumpV;
      if (charJumpY > 0) { charJumpY=0; charJumpV=0; charState='idle'; }
    }

    const bob   = charState==='idle' ? Math.sin(nowSec*3.5)*5 : 0;
    const shakeX = charState==='hit'  ? (Math.random()-0.5)*8 : 0;
    const cx = HIT_X + shakeX;
    const cy = LANE_Y_BOT + charJumpY + bob;

    ctx.save();

    // Shadow on ground
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, LANE_Y_BOT+50, 30-charJumpY*0.3, 8, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Legs & feet ──
    ctx.fillStyle = '#fde4cf';
    ctx.beginPath(); ctx.ellipse(cx-8, cy+52, 7, 14, -0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+8, cy+52, 7, 14,  0.1, 0, Math.PI*2); ctx.fill();
    // Shoes (white with pink sole)
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx-9, cy+63, 9, 5,  0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+9, cy+63, 9, 5, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffb7c5';
    ctx.beginPath(); ctx.ellipse(cx-9, cy+65, 9, 3,  0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+9, cy+65, 9, 3, -0.2, 0, Math.PI*2); ctx.fill();

    // ── Pink under-skirt ──
    ctx.fillStyle = '#e05c8a';
    ctx.beginPath();
    ctx.moveTo(cx-28, cy+18);
    ctx.quadraticCurveTo(cx-32, cy+58, cx-16, cy+56);
    ctx.quadraticCurveTo(cx, cy+60, cx+16, cy+56);
    ctx.quadraticCurveTo(cx+32, cy+58, cx+28, cy+18);
    ctx.quadraticCurveTo(cx, cy+28, cx-28, cy+18);
    ctx.fill();

    // ── White kimono body ──
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#f0f4ff';
    ctx.beginPath();
    ctx.moveTo(cx-22, cy-5);
    ctx.quadraticCurveTo(cx-26, cy+25, cx-30, cy+22);
    ctx.quadraticCurveTo(cx-28, cy+50, cx-18, cy+48);
    ctx.quadraticCurveTo(cx, cy+55, cx+18, cy+48);
    ctx.quadraticCurveTo(cx+28, cy+50, cx+30, cy+22);
    ctx.quadraticCurveTo(cx+26, cy+25, cx+22, cy-5);
    ctx.quadraticCurveTo(cx, cy+5, cx-22, cy-5);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Kimono collar (pink stripe)
    ctx.strokeStyle = '#ffb7c5'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx-6, cy-8); ctx.lineTo(cx-3, cy+8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+6, cy-8); ctx.lineTo(cx+3, cy+8); ctx.stroke();

    // Pink sash (obi)
    ctx.fillStyle = '#e05c8a';
    ctx.beginPath(); ctx.roundRect(cx-20, cy+10, 40, 12, 4); ctx.fill();

    // Gold flower brooch on sash
    for (let p=0;p<6;p++) {
      const a = p*Math.PI/3;
      ctx.fillStyle = '#f0c040';
      ctx.beginPath();
      ctx.ellipse(cx+Math.cos(a)*7, cy+16+Math.sin(a)*7, 4, 4, a, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff8dc';
    ctx.beginPath(); ctx.arc(cx, cy+16, 4, 0, Math.PI*2); ctx.fill();

    // Gold tassel decoration
    ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 1.5;
    for (let i=-2;i<=2;i++) {
      ctx.beginPath();
      ctx.moveTo(cx+i*3, cy+22);
      ctx.lineTo(cx+i*3 + Math.sin(nowSec*3+i)*3, cy+36);
      ctx.stroke();
    }

    // ── Sleeves ──
    const armSwing = Math.sin(nowSec*3.5)*18;
    ctx.fillStyle = '#f0f4ff';
    // Left sleeve
    ctx.beginPath();
    ctx.moveTo(cx-18, cy-2);
    ctx.quadraticCurveTo(cx-38, cy+armSwing, cx-34, cy+28);
    ctx.quadraticCurveTo(cx-38, cy+35, cx-28, cy+32);
    ctx.quadraticCurveTo(cx-18, cy+20, cx-14, cy+2);
    ctx.fill();
    // Right sleeve
    ctx.beginPath();
    ctx.moveTo(cx+18, cy-2);
    ctx.quadraticCurveTo(cx+38, cy-armSwing, cx+34, cy+28);
    ctx.quadraticCurveTo(cx+38, cy+35, cx+28, cy+32);
    ctx.quadraticCurveTo(cx+18, cy+20, cx+14, cy+2);
    ctx.fill();

    // Hands
    ctx.fillStyle = '#fde4cf';
    ctx.beginPath(); ctx.arc(cx-32, cy+32, 7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+32, cy+32, 7, 0, Math.PI*2); ctx.fill();

    // Pink ribbon on left sleeve
    ctx.strokeStyle = '#ffb7c5'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx-40, cy+20);
    ctx.quadraticCurveTo(cx-34, cy+18+Math.sin(nowSec*4)*6, cx-28, cy+22);
    ctx.stroke();

    // ── Head & neck ──
    ctx.fillStyle = '#fde4cf';
    ctx.beginPath(); ctx.ellipse(cx, cy-20, 15, 18, 0, 0, Math.PI*2); ctx.fill();

    // ── Long blonde hair (back layer) ──
    ctx.fillStyle = '#d4a030';
    // Back hair flowing to the right
    ctx.beginPath();
    ctx.moveTo(cx+12, cy-35);
    ctx.quadraticCurveTo(cx+45+Math.sin(nowSec*1.2)*8, cy+20, cx+40+Math.sin(nowSec*0.8)*10, cy+70);
    ctx.quadraticCurveTo(cx+50+Math.sin(nowSec*1)*8, cy+80, cx+30, cy+75);
    ctx.quadraticCurveTo(cx+35, cy+40, cx+8, cy-30);
    ctx.fill();
    // Back left hair
    ctx.beginPath();
    ctx.moveTo(cx-12, cy-35);
    ctx.quadraticCurveTo(cx-30+Math.sin(nowSec*1.1)*6, cy+30, cx-25+Math.sin(nowSec*0.9)*8, cy+65);
    ctx.quadraticCurveTo(cx-35, cy+70, cx-18, cy+68);
    ctx.quadraticCurveTo(cx-20, cy+40, cx-8, cy-28);
    ctx.fill();

    // ── Hair top ──
    ctx.fillStyle = '#c8941c';
    ctx.beginPath();
    ctx.ellipse(cx, cy-32, 17, 13, 0, 0, Math.PI*2); ctx.fill();
    // Side bangs
    ctx.beginPath(); ctx.ellipse(cx-14, cy-26, 8, 12, -0.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+14, cy-26, 8, 12,  0.4, 0, Math.PI*2); ctx.fill();
    // Front bangs
    ctx.fillStyle = '#d4a030';
    ctx.beginPath(); ctx.ellipse(cx-5, cy-34, 5, 8, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+5, cy-34, 5, 8,  0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy-36, 6, 7, 0, 0, Math.PI*2); ctx.fill();

    // White hair bow/ribbon at top
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx-10, cy-40, 10, 6, -0.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+10, cy-40, 10, 6,  0.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy-40, 5, 0, Math.PI*2); ctx.fill();
    // Ribbon highlight
    ctx.fillStyle = '#f0f4ff';
    ctx.beginPath(); ctx.ellipse(cx-10, cy-41, 6, 3, -0.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+10, cy-41, 6, 3,  0.4, 0, Math.PI*2); ctx.fill();

    // ── Face features ──
    // Purple eyes
    ctx.fillStyle = '#6b2fa0';
    ctx.beginPath(); ctx.ellipse(cx-5, cy-20, 3.5, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+5, cy-20, 3.5, 5, 0, 0, Math.PI*2); ctx.fill();
    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx-4, cy-22, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+6, cy-22, 1.5, 0, Math.PI*2); ctx.fill();
    // Eyelashes
    ctx.strokeStyle = '#2a0a3a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx-8, cy-22); ctx.lineTo(cx-9, cy-24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx-2, cy-24); ctx.lineTo(cx-2, cy-26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+2, cy-24); ctx.lineTo(cx+2, cy-26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+8, cy-22); ctx.lineTo(cx+9, cy-24); ctx.stroke();
    // Blush
    ctx.fillStyle = 'rgba(255,150,180,0.4)';
    ctx.beginPath(); ctx.ellipse(cx-10, cy-14, 6, 3.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+10, cy-14, 6, 3.5, 0, 0, Math.PI*2); ctx.fill();
    // Smile
    ctx.strokeStyle = '#c87080'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx-4, cy-10);
    ctx.quadraticCurveTo(cx, cy-7, cx+4, cy-10);
    ctx.stroke();

    // Hit flash
    if (charState==='hit') {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(cx, cy, 40, 50, 0, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
  }

  // ── Full frame ────────────────────────────────────────────────────────────
  function drawFrame({ notes, bgPulse, laneFlash, nowSec, gameTime, songId, speedMult }) {
    drawBackground(bgPulse, laneFlash, nowSec, songId);
    for (const n of notes) {
      if (n.x > -80 && n.x < W+120) drawNote(n, bgPulse, gameTime);
    }
    drawParticles();
    drawCharacter(nowSec);
  }

  return {
    resize, getDims, getNoteSpeed,
    spawnParticles, updateParticles,
    drawFrame, drawBackground,
    setCharState,
  };
})();
