// ── BEAT RUSH — game.js ───────────────────────────────
const DIFFS={easy:{label:'EASY',density:.5,holdP:.08,spd:.85},hard:{label:'HARD',density:1,holdP:.18,spd:1},master:{label:'MASTER',density:1.5,holdP:.3,spd:1.2}};

// ── SYNTH ─────────────────────────────────────────────
let AC=null;
function initAC(){AC=new(window.AudioContext||window.webkitAudioContext)();}
function closeAC(){if(AC){AC.close();AC=null;}}
function mkG(v,d){const g=AC.createGain();g.gain.value=v;g.connect(d||AC.destination);return g;}
function mkN(dur){const l=Math.ceil(AC.sampleRate*dur),b=AC.createBuffer(1,l,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<l;i++)d[i]=Math.random()*2-1;return b;}
function kick(t){const g=mkG(1.4),o=AC.createOscillator();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(40,t+.12);o.connect(g);g.gain.setValueAtTime(1.4,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);o.start(t);o.stop(t+.2);}
function snare(t){const s=AC.createBufferSource();s.buffer=mkN(.15);const hp=AC.createBiquadFilter();hp.type='highpass';hp.frequency.value=1800;const g=mkG(.55);g.gain.setValueAtTime(.55,t);g.gain.exponentialRampToValueAtTime(.001,t+.15);s.connect(hp);hp.connect(g);s.start(t);s.stop(t+.16);}
function hh(t,op){const dur=op?.22:.06,s=AC.createBufferSource();s.buffer=mkN(dur);const hp=AC.createBiquadFilter();hp.type='highpass';hp.frequency.value=7000;const v=op?.3:.18,g=mkG(v);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(hp);hp.connect(g);s.start(t);s.stop(t+dur+.01);}
function bassS(f,t,d){const g=mkG(.5),o=AC.createOscillator();o.type='sawtooth';o.frequency.value=f;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=400;o.connect(lp);lp.connect(g);g.gain.setValueAtTime(.5,t);g.gain.exponentialRampToValueAtTime(.001,t+d*.85);o.start(t);o.stop(t+d);}
function lead(f,t,d){const g=mkG(0);[0,5,-5].forEach(dt=>{const o=AC.createOscillator();o.type='square';o.frequency.value=f;o.detune.value=dt;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2000;o.connect(lp);lp.connect(g);o.start(t);o.stop(t+d+.02);});g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.15,t+.01);g.gain.setValueAtTime(.15,t+d-.04);g.gain.linearRampToValueAtTime(0,t+d);}
function schedSynth(song,st){const B=60/song.bpm,tot=song.bars*4,dur=B*tot;for(let b=0;b<tot;b++){const t=st+b*B,b4=b%4;if(b4===0||b4===2)kick(t);if(b4===1||b4===3)snare(t);hh(t,false);hh(t+B*.5,false);if(b4===3)hh(t+B*.75,true);}if(!song.melody)return;for(let r=0;r<2;r++){const off=r*16;song.melody.forEach(n=>{const t=st+(n.b+off)*B;if(t<st+dur+.1)lead(n.f,t,n.d*B*.9);});song.bass.forEach(n=>{const t=st+(n.b+off)*B;if(t<st+dur+.1)bassS(n.f,t,n.d*B);});}}

// ── REAL AUDIO ────────────────────────────────────────
let realAudio=null;
function stopReal(){if(realAudio){realAudio.pause();realAudio.src='';realAudio=null;}}
function playReal(src){
  return new Promise((res,rej)=>{
    stopReal();
    realAudio=new Audio();
    realAudio.preload='auto';
    realAudio.src=src;
    realAudio.oncanplaythrough=()=>{realAudio.currentTime=0;realAudio.play().then(res).catch(rej);};
    realAudio.onerror=rej;
    realAudio.load();
  });
}
function realTime(){return realAudio?realAudio.currentTime*1000:0;}

// ── CANVAS ────────────────────────────────────────────
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let W,H,LYT,LYB,HX;
function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;LYT=H*.35;LYB=H*.65;HX=W*.13;}
resize();window.addEventListener('resize',resize);
let stars=[];
function mkStars(){stars=[];for(let i=0;i<120;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:.5+Math.random()*1.5,tw:Math.random()*Math.PI*2,sp:.2+Math.random()*.6});}
mkStars();window.addEventListener('resize',mkStars);
let parts=[];
function spawnP(x,y,col,n,star){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*7;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,life:1,dec:.022+Math.random()*.025,col,sz:3+Math.random()*6,star:star||Math.random()>.4,rot:Math.random()*Math.PI*2,rv:(Math.random()-.5)*.3});}}
function tickP(){for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=.13;p.rot+=p.rv;p.life-=p.dec;}parts=parts.filter(p=>p.life>0);}
function drawP(){for(const p of parts){ctx.save();ctx.globalAlpha=p.life;ctx.fillStyle=p.col;ctx.translate(p.x,p.y);ctx.rotate(p.rot);if(p.star){ctx.beginPath();for(let i=0;i<5;i++){const a=i*4*Math.PI/5-Math.PI/2,a2=(i*4+2)*Math.PI/5-Math.PI/2;if(i===0)ctx.moveTo(p.sz*Math.cos(a),p.sz*Math.sin(a));else ctx.lineTo(p.sz*Math.cos(a),p.sz*Math.sin(a));ctx.lineTo(p.sz*.4*Math.cos(a2),p.sz*.4*Math.sin(a2));}ctx.closePath();ctx.fill();}else{ctx.beginPath();ctx.arc(0,0,p.sz,0,Math.PI*2);ctx.fill();}ctx.restore();}}
let rings=[];
function spawnRing(x,y,col){rings.push({x,y,col,r:10,life:1});}
function tickRings(){for(const r of rings){r.r+=4;r.life-=.07;}rings=rings.filter(r=>r.life>0);}
function drawRings(){for(const r of rings){ctx.save();ctx.globalAlpha=r.life*.7;ctx.strokeStyle=r.col;ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();ctx.restore();}}

// ── SPRITES ───────────────────────────────────────────
const sprImgs={};
function loadSprites(){
  return new Promise(res=>{
    const spr=window.SPRITES||{};
    const keys=Object.keys(spr);
    if(!keys.length){res();return;}
    let done=0;
    keys.forEach(k=>{
      const img=new Image();
      img.onload=()=>{sprImgs[k]={img,frames:spr[k].frames,fps:spr[k].fps};done++;if(done===keys.length)res();};
      img.onerror=()=>{done++;if(done===keys.length)res();};
      img.src=spr[k].src;
    });
  });
}
let cSt='run',cFr=0,cJY=0,cJV=0,cHT=0;
function setCS(s){if(s===cSt&&s!=='hit')return;cSt=s;if(s==='jump'){cJY=0;cJV=-18;}if(s==='hit'){cHT=20;cFr=0;}}
function drawChar(dt){
  const an=sprImgs[cSt]||sprImgs['run'];
  if(!an)return;
  cFr+=an.fps*dt;
  if(cSt==='jump'){cJV+=1.6;cJY+=cJV;if(cJY>=0){cJY=0;cJV=0;cSt='run';cFr=0;}}
  else if(cSt==='hit'){cHT--;if(cHT<=0){cSt='run';cFr=0;}}
  else if(cFr>=an.frames)cFr=0;
  const fi=Math.floor(cFr)%an.frames,img=an.img;
  if(!img||!img.complete||!img.width)return;
  const fw=img.width/an.frames,fh=img.height,dh=H*.36,dw=fw*(dh/fh),dx=HX-dw*.5,dy=LYB-dh+cJY;
  ctx.save();
  if(cSt==='hit'){ctx.drawImage(img,fi*fw,0,fw,fh,dx,dy,dw,dh);ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=.4;ctx.fillStyle='#ff2244';ctx.fillRect(dx,dy,dw,dh);}
  else if(cSt==='jump'&&cJV<-5){ctx.translate(dx+dw/2,dy+dh/2);ctx.scale(.9,1.1);ctx.drawImage(img,fi*fw,0,fw,fh,-dw/2,-dh/2,dw,dh);ctx.globalCompositeOperation='screen';ctx.globalAlpha=.18;ctx.fillStyle='#ff6ec7';ctx.beginPath();ctx.ellipse(0,0,dw*.4,dh*.4,0,0,Math.PI*2);ctx.fill();}
  else ctx.drawImage(img,fi*fw,0,fw,fh,dx,dy,dw,dh);
  ctx.restore();
  ctx.save();ctx.globalAlpha=Math.max(.04,.16+cJY*.005);ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(HX,LYB+14,dw*.33,6,0,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawBG(pulse,lf,t,sid){
  ctx.fillStyle='#0a0015';ctx.fillRect(0,0,W,H);
  for(const s of stars){s.tw+=.02;s.x-=s.sp*.3;if(s.x<0)s.x=W;ctx.save();ctx.globalAlpha=.25+.5*Math.abs(Math.sin(s.tw));ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(sid==='sea'){ctx.save();ctx.globalAlpha=.05;ctx.fillStyle='#55aaff';ctx.fillRect(0,0,W,H);ctx.restore();}
  if(sid==='porch'){ctx.save();ctx.globalAlpha=.05;ctx.fillStyle='#88cc44';ctx.fillRect(0,0,W,H);ctx.restore();}
  ctx.save();ctx.strokeStyle=`rgba(167,139,250,${.05+pulse*.05})`;ctx.lineWidth=.5;for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.restore();
  if(pulse>.7){ctx.save();ctx.globalAlpha=(pulse-.7)*.08;ctx.fillStyle='#ff6ec7';ctx.fillRect(0,0,W,H);ctx.restore();}
  const LC=['#ff6ec7','#7dd3fc'];
  for(let i=0;i<2;i++){const ly=i===0?LYT:LYB;const g=ctx.createLinearGradient(0,ly,W,ly);g.addColorStop(0,'transparent');g.addColorStop(.15,LC[i]+'50');g.addColorStop(.5,LC[i]+'90');g.addColorStop(.85,LC[i]+'50');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,ly-2,W,4);const f=lf[i];ctx.save();ctx.globalAlpha=.22+f*.55;ctx.strokeStyle=LC[i];ctx.lineWidth=2+f*2.5;ctx.beginPath();ctx.arc(HX,ly,30+f*10,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.07+f*.28;ctx.fillStyle=LC[i];ctx.beginPath();ctx.arc(HX,ly,30+f*10,0,Math.PI*2);ctx.fill();ctx.restore();}
}
function drawNote(n,pulse,g){
  if(!n.active&&!n.holding)return;
  const ly=n.lane===0?LYT:LYB,col=n.lane===0?'#ff6ec7':'#7dd3fc',r=22;
  if(n.holdDur>0){const sp=W/2*G.spd(),tl=(n.holdDur/1000)*sp;ctx.save();ctx.shadowColor=col;ctx.shadowBlur=10;const gr=ctx.createLinearGradient(n.x,0,n.x+tl,0);gr.addColorStop(0,col+'dd');gr.addColorStop(1,col+'33');ctx.fillStyle=gr;ctx.beginPath();ctx.roundRect(n.x,ly-10,tl,20,10);ctx.fill();if(n.holding){ctx.globalAlpha=.4+Math.sin(g*.015)*.3;ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(n.x,ly-5,tl,10,5);ctx.fill();}ctx.restore();}
  ctx.save();ctx.shadowColor=col;ctx.shadowBlur=18+pulse*10;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(n.x,ly-r);ctx.lineTo(n.x+r*.7,ly);ctx.lineTo(n.x,ly+r);ctx.lineTo(n.x-r*.7,ly);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.globalAlpha=.36;ctx.beginPath();ctx.moveTo(n.x,ly-r*.5);ctx.lineTo(n.x+r*.35,ly-r*.1);ctx.lineTo(n.x,ly+r*.1);ctx.lineTo(n.x-r*.35,ly-r*.1);ctx.closePath();ctx.fill();ctx.restore();
}

// ── GAME ─────────────────────────────────────────────
// Use simple globals for state that needs to be accessible
let G_SONG = null; // set by song select
let G_DIFF = 'hard';
let G_RUNNING = false;
let G_NOTES = [], G_MST = 0, G_ISREAL = false;
let G_SC=0,G_CB=0,G_MX=0,G_PF=0,G_GD=0,G_MS=0,G_HN=0;
let G_LF=[0,0],G_PULSE=0,G_FBTM=0,G_LASTT=0,G_BEATTM=0;

const $=id=>document.getElementById(id);
const show=id=>{document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));if(id)$(id).classList.add('active');};
const lbKey=(s,d)=>'br_'+s.id+'_'+d;
function saveSc(s,d,score,combo,acc){const k=lbKey(s,d),e={score,combo,acc,date:new Date().toLocaleDateString()};let a=JSON.parse(localStorage.getItem(k)||'[]');a.push(e);a.sort((x,y)=>y.score-x.score);a=a.slice(0,10);localStorage.setItem(k,JSON.stringify(a));}
function showLBScreen(){const rows=$('lb-rows');rows.innerHTML='';let any=false;(window.SONGS||[]).forEach(s=>{Object.keys(DIFFS).forEach(d=>{const a=JSON.parse(localStorage.getItem(lbKey(s,d))||'[]');if(!a.length)return;any=true;const h=document.createElement('div');h.className='lbr hd';h.textContent=s.ico+' '+s.name+' · '+DIFFS[d].label;rows.appendChild(h);a.slice(0,3).forEach((e,i)=>{const r=document.createElement('div');r.className='lbr';r.innerHTML='<span class="rk">#'+(i+1)+'</span><span style="flex:1;padding:0 10px">'+e.date+' CB'+e.combo+' '+e.acc+'%</span><span class="sc">'+String(e.score).padStart(6,'0')+'</span>';rows.appendChild(r);});});});if(!any)rows.innerHTML='<div style="color:#555;text-align:center;padding:20px">還沒有紀錄！</div>';show('lb');}

function buildSS(){
  const list=$('song-list');list.innerHTML='';
  (window.SONGS||[]).forEach((s,i)=>{
    const c=document.createElement('div');
    c.className='scard'+(s===G_SONG?' sel':'');
    c.innerHTML='<div class="ico">'+s.ico+'</div><div class="nm">'+s.name+'</div><div class="bpm">'+s.desc+'</div><div class="src">'+(s.src==='real'?'🎵 真實音樂':'🔊 合成音樂')+'</div>';
    c.onclick=()=>{G_SONG=s;document.querySelectorAll('.scard').forEach(x=>x.classList.remove('sel'));c.classList.add('sel');};
    list.appendChild(c);
  });
}

function hud(){$('score').textContent=String(G_SC).padStart(6,'0');$('combo').textContent='COMBO x '+G_CB;const tot=G_HN+G_MS,a=tot>0?Math.round(G_HN/tot*100):100;$('acc').textContent='Accuracy: '+a+'%';}
function fb(txt,col,sz){const el=$('feedback');el.textContent=txt;el.style.color=col;el.style.fontSize=sz+'px';el.style.opacity='1';G_FBTM=22;}
function rank(acc){return acc>=100?'🌟 S+':acc>=95?'⭐ S':acc>=85?'🏆 A':acc>=70?'🎵 B':acc>=50?'📀 C':'💫 D';}

function hitLane(lane){
  const now=G_ISREAL?realTime():(AC.currentTime-G_MST)*1000;
  let best=null,bd=9999;
  for(const n of G_NOTES){if(!n.active||n.lane!==lane)continue;const d=Math.abs(n.time-now);if(d<250&&d<bd){best=n;bd=d;}}
  if(!best)return;
  const ly=lane===0?LYT:LYB,col=lane===0?'#ff6ec7':'#7dd3fc';
  spawnRing(HX,ly,col);
  if(best.holdDur>0){best.holding=true;G_HN++;G_CB++;if(G_CB>G_MX)G_MX=G_CB;G_SC+=150;fb('HOLD!','#ffdd00',24);spawnP(HX,ly,col,10,true);setCS('jump');}
  else{best.active=false;G_HN++;
    if(bd<60){G_PF++;G_SC+=300*Math.max(1,Math.floor(G_CB/10)+1);G_CB++;fb('✦ PERFECT!','#ffdd00',26);spawnP(HX,ly,col,22);spawnP(HX,ly,'#fff',6);setCS('jump');}
    else if(bd<140){G_GD++;G_SC+=100;G_CB++;fb('GOOD','#a0f0a0',20);spawnP(HX,ly,col,10);setCS('jump');}
    else{G_GD++;G_SC+=40;G_CB++;fb('LATE','#aaaaff',18);}
    if(G_CB>G_MX)G_MX=G_CB;}
  hud();
}
function relLane(lane){
  const now=G_ISREAL?realTime():(AC.currentTime-G_MST)*1000;
  for(const n of G_NOTES){if(!n.holding||n.lane!==lane)continue;n.holding=false;n.active=false;const rem=n.time+n.holdDur-now,col=lane===0?'#ff6ec7':'#7dd3fc',ly=lane===0?LYT:LYB;if(rem<200){G_PF++;G_SC+=200;fb('✦ HOLD OK!','#ffdd00',24);spawnP(HX,ly,col,14,true);}else{G_GD++;G_SC+=80;fb('HOLD GOOD','#a0f0a0',18);}hud();}
}

function genNotes(song,diff){
  const cfg=DIFFS[diff],B=60/song.bpm,total=song.bars*4,arr=[];let id=0;
  for(let b=0;b<total;b++){if(b<4)continue;const bt=b*B*1000,b4=b%4,skip=()=>Math.random()>cfg.density;
    if((b4===0||b4===2)&&!skip())arr.push({id:id++,lane:1,time:bt,holdDur:Math.random()<cfg.holdP?B*600:0,x:0,active:true,missed:false,holding:false});
    if((b4===1||b4===3)&&!skip())arr.push({id:id++,lane:0,time:bt,holdDur:Math.random()<cfg.holdP?B*600:0,x:0,active:true,missed:false,holding:false});
    if(b>=8&&cfg.density>=1&&(b4===0||b4===2)&&!skip())arr.push({id:id++,lane:0,time:bt+B*500,holdDur:0,x:0,active:true,missed:false,holding:false});
    if(diff==='master'&&b>=12&&b4===1&&!skip())arr.push({id:id++,lane:1,time:bt+B*500,holdDur:0,x:0,active:true,missed:false,holding:false});}
  return arr;
}

function gameLoop(now){
  if(!G_RUNNING)return;
  const ns=now/1000,dt=Math.min(ns-G_LASTT,.05);G_LASTT=ns;
  const g=G_ISREAL?realTime():(AC.currentTime-G_MST)*1000;
  const B=60/G_SONG.bpm,sdur=B*G_SONG.bars*4*1000;
  G_BEATTM+=dt;G_PULSE=Math.max(0,1-(G_BEATTM%B)/B*3.5);
  $('beat-dot').style.opacity=G_PULSE>.6?String(G_PULSE):'0';
  G_LF[0]=Math.max(0,G_LF[0]-dt*5);G_LF[1]=Math.max(0,G_LF[1]-dt*5);
  const spd2=W/2*(DIFFS[G_DIFF]||DIFFS.hard).spd;
  for(const n of G_NOTES){if(!n.active&&!n.holding)continue;n.x=HX+(n.time-g)/1000*spd2;}
  for(const n of G_NOTES){if(!n.holding)continue;if(g>=n.time+n.holdDur){n.holding=false;n.active=false;G_PF++;G_SC+=100;hud();spawnP(HX,n.lane===0?LYT:LYB,n.lane===0?'#ff6ec7':'#7dd3fc',8);}else if(Math.floor(g/100)>Math.floor((g-dt*1000)/100)){G_SC+=10;hud();}}
  for(const n of G_NOTES){if(!n.active||n.missed||n.holding)continue;if(n.x<HX-80){n.active=false;n.missed=true;G_MS++;G_CB=0;fb('MISS','#ff4444',24);setCS('hit');hud();}}
  tickP();tickRings();
  if(G_FBTM>0){G_FBTM--;$('feedback').style.opacity=String(Math.min(1,G_FBTM/8));if(G_FBTM===0)$('feedback').style.opacity='0';}
  $('progress-bar').style.width=Math.min(100,Math.max(0,g/sdur*100))+'%';
  drawBG(G_PULSE,G_LF,ns,G_SONG.id);
  for(const n of G_NOTES)if(n.x>-80&&n.x<W+120)drawNote(n,G_PULSE,g);
  drawRings();drawP();drawChar(dt);
  if(g>=sdur){endGame();return;}
  requestAnimationFrame(gameLoop);
}

async function startGame(){
  initAC();show(null);
  G_NOTES=genNotes(G_SONG,G_DIFF);
  G_SC=0;G_CB=0;G_MX=0;G_PF=0;G_GD=0;G_MS=0;G_HN=0;
  G_LF=[0,0];G_FBTM=0;rings=[];parts=[];
  cSt='run';cFr=0;cJY=0;cJV=0;G_BEATTM=0;
  $('song-title').textContent=G_SONG.ico+' '+G_SONG.name;
  $('song-sub').textContent=G_SONG.desc+' · '+DIFFS[G_DIFF].label;
  hud();
  G_ISREAL=G_SONG.src==='real';
  if(G_ISREAL){
    if(AC.state==='suspended')await AC.resume();
    await playReal(G_SONG.mp3);
  }else{
    G_MST=AC.currentTime+.15;
    schedSynth(G_SONG,G_MST);
  }
  G_RUNNING=true;G_LASTT=performance.now()/1000;
  requestAnimationFrame(gameLoop);
}

function endGame(){
  G_RUNNING=false;stopReal();
  const tot=G_PF+G_GD+G_MS,acc=tot>0?Math.round((G_PF+G_GD)/tot*100):100;
  saveSc(G_SONG,G_DIFF,G_SC,G_MX,acc);
  $('r-song').textContent=G_SONG.ico+' '+G_SONG.name;
  $('r-diff').textContent=DIFFS[G_DIFF].label;
  $('r-score').textContent=String(G_SC).padStart(6,'0');
  $('r-combo').textContent=G_MX;
  $('r-p').textContent=G_PF;$('r-g').textContent=G_GD;$('r-m').textContent=G_MS;
  $('r-acc').textContent=acc+'%';
  $('r-rank').textContent=rank(acc);
  show('res');
}

// Public API for HTML buttons
const G={
  start:()=>startGame(),
  retry:()=>{stopReal();closeAC();show(null);setTimeout(startGame,100);},
  toSelect:()=>{stopReal();closeAC();buildSS();show('ss');drawBG(0,[0,0],0,'');},
  tap:(lane,down,e)=>{if(e)e.preventDefault();document.getElementById(lane===0?'tL':'tR').classList.toggle('on',!!down);if(down&&G_RUNNING){hitLane(lane);G_LF[lane]=1;}if(!down&&G_RUNNING)relLane(lane);},
  setDiff:(el)=>{G_DIFF=el.dataset.d;document.querySelectorAll('.dbtn').forEach(b=>b.classList.toggle('sel',b===el));},
  showLB:()=>showLBScreen(),
  hideLB:()=>show('ss'),
  spd:()=>(DIFFS[G_DIFF]||DIFFS.hard).spd,
};

document.addEventListener('keydown',e=>{if(!G_RUNNING)return;if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')G.tap(0,1,null);if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')G.tap(1,1,null);});
document.addEventListener('keyup',e=>{if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')G.tap(0,0,null);if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')G.tap(1,0,null);});

// ── INIT ─────────────────────────────────────────────
(async function init(){
  const bar=$('load-bar'),txt=$('load-txt');
  txt.textContent='載入精靈圖...';bar.style.width='40%';
  await loadSprites();
  bar.style.width='100%';txt.textContent='完成！';
  setTimeout(()=>{
    document.getElementById('loading').style.display='none';
    const SONGS=window.SONGS||[];
    G_SONG=SONGS[0]||null;
    buildSS();
    drawBG(0,[0,0],0,(G_SONG||{}).id||'');
  },300);
})();
