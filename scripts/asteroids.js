(function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

(function(){
  'use strict';
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const msgEl = document.getElementById('msgEl');

  /* ─── State ─── */
  let ship, bullets, asteroids, particles, score, best, lives, level;
  let running = false, gameEnded = false, invincible = 0;
  let rafId = null, lastTs = 0;
  let _wasRunningBeforePause = false;

  /* ─── Keys ─── */
  const keys = { left:false, right:false, up:false, fire:false };
  let fireCD = 0; // cooldown tir

  /* ─── Init ─── */
  function init() {
    ship = { x:W/2, y:H/2, angle:-Math.PI/2, vx:0, vy:0, alive:true };
    bullets    = [];
    asteroids  = [];
    particles  = [];
    score      = 0;
    lives      = 3;
    level      = 1;
    best       = parseInt(localStorage.getItem('asteroidsBest')||'0');
    running    = false;
    gameEnded  = false;
    invincible = 0;
    fireCD     = 0;
    spawnWave();
    updateUI();
    draw();
    msgEl.textContent = 'APPUIE SUR START !';
    msgEl.style.color = '';
    if(window.PW) window.PW.sound.stopBgm();
  }

  /* ─── Spawn wave ─── */
  function spawnWave() {
    const count = 3 + (level - 1);
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = Math.random() * W;
        y = Math.random() * H;
      } while (Math.hypot(x - W/2, y - H/2) < 100);
      spawnAsteroid(x, y, 'large');
    }
  }

  /* ─── Asteroid sizes ─── */
  const SIZES = { large:38, medium:22, small:12 };
  const POINTS = { large:20, medium:50, small:100 };
  const CHILDREN = { large:'medium', medium:'small', small:null };

  function spawnAsteroid(x, y, size, vx, vy) {
    const spd = (1.2 + Math.random() * 0.8) * (1 + (level-1)*0.12);
    const ang = Math.random() * Math.PI * 2;
    return asteroids.push({
      x, y,
      vx: vx !== undefined ? vx : Math.cos(ang)*spd,
      vy: vy !== undefined ? vy : Math.sin(ang)*spd,
      angle: Math.random() * Math.PI * 2,
      rot: (Math.random() - 0.5) * 0.04,
      size,
      r: SIZES[size],
      pts: POINTS[size],
      verts: makeVerts(SIZES[size]),
    });
  }

  function makeVerts(r) {
    const n = 9 + Math.floor(Math.random()*4);
    return Array.from({length:n}, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const d = r * (0.75 + Math.random() * 0.35);
      return { a, d };
    });
  }

  /* ─── Bullets ─── */
  function shoot() {
    if (fireCD > 0 || !ship.alive) return;
    if(window.PW) window.PW.sound.shoot();
    const spd = 7;
    bullets.push({
      x: ship.x + Math.cos(ship.angle)*18,
      y: ship.y + Math.sin(ship.angle)*18,
      vx: ship.vx + Math.cos(ship.angle)*spd,
      vy: ship.vy + Math.sin(ship.angle)*spd,
      life: 55,
    });
    fireCD = 12;
  }

  /* ─── Particles ─── */
  function explode(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 3;
      particles.push({ x, y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, life:30+Math.random()*20, color });
    }
  }

  /* ─── Ship thrust trail ─── */
  let thrustTrail = [];

  /* ─── Physics step ─── */
  function update(dt) {
    const TURN  = 0.065;
    const THRUST= 0.22;
    const DRAG  = 0.982;
    const MAXSPD= 7;

    if (!ship.alive) return;

    // Rotation
    if (keys.left)  ship.angle -= TURN;
    if (keys.right) ship.angle += TURN;

    // Thrust
    if (keys.up) {
      ship.vx += Math.cos(ship.angle) * THRUST;
      ship.vy += Math.sin(ship.angle) * THRUST;
      // Trail
      thrustTrail.push({ x: ship.x - Math.cos(ship.angle)*14, y: ship.y - Math.sin(ship.angle)*14, life:12 });
    }

    // Drag & clamp
    ship.vx *= DRAG; ship.vy *= DRAG;
    const spd = Math.hypot(ship.vx, ship.vy);
    if (spd > MAXSPD) { ship.vx *= MAXSPD/spd; ship.vy *= MAXSPD/spd; }

    ship.x = wrap(ship.x + ship.vx, W);
    ship.y = wrap(ship.y + ship.vy, H);

    // Fire
    if (keys.fire) shoot();
    if (fireCD > 0) fireCD--;
    if (invincible > 0) invincible--;

    // Bullets
    bullets = bullets.filter(b => {
      b.x = wrap(b.x + b.vx, W);
      b.y = wrap(b.y + b.vy, H);
      b.life--;
      return b.life > 0;
    });

    // Asteroids
    asteroids.forEach(a => {
      a.x = wrap(a.x + a.vx, W);
      a.y = wrap(a.y + a.vy, H);
      a.angle += a.rot;
    });

    // Particles & trail
    particles  = particles.filter(p => { p.x+=p.vx; p.y+=p.vy; p.life--; return p.life>0; });
    thrustTrail= thrustTrail.filter(t => { t.life--; return t.life>0; });

    // Bullet × Asteroid
    for (let bi = bullets.length-1; bi >= 0; bi--) {
      const b = bullets[bi];
      let hit = false;
      for (let ai = asteroids.length-1; ai >= 0; ai--) {
        const a = asteroids[ai];
        if (Math.hypot(b.x-a.x, b.y-a.y) < a.r * 0.85) {
          score += a.pts;
          if (score > best) { best = score; localStorage.setItem('asteroidsBest', best); }
          if(window.PW) window.PW.sound.explode();
          explode(a.x, a.y, '#00f0ff', a.size==='large'?14:a.size==='medium'?8:5);
          // Split
          const child = CHILDREN[a.size];
          if (child) {
            const ang1 = Math.random()*Math.PI*2;
            const cs = (Math.hypot(a.vx,a.vy)||1) * 1.3;
            spawnAsteroid(a.x, a.y, child, Math.cos(ang1)*cs, Math.sin(ang1)*cs);
            spawnAsteroid(a.x, a.y, child, Math.cos(ang1+Math.PI)*cs, Math.sin(ang1+Math.PI)*cs);
          }
          asteroids.splice(ai, 1);
          bullets.splice(bi, 1);
          hit = true;
          updateUI();
          break;
        }
      }
      if (hit) break;
    }

    // Ship × Asteroid collision
    if (invincible === 0) {
      for (const a of asteroids) {
        if (Math.hypot(ship.x-a.x, ship.y-a.y) < a.r * 0.75 + 10) {
          hitShip();
          break;
        }
      }
    }

    // Wave cleared
    if (asteroids.length === 0) {
      level++;
      bullets = [];
      ship.vx = 0; ship.vy = 0;
      ship.x = W/2; ship.y = H/2;
      invincible = 120;
      if(window.PW) window.PW.sound.levelUp();
      msgEl.textContent = `🎉 NIVEAU ${level} !`;
      setTimeout(() => { if (running) msgEl.textContent = ''; }, 1200);
      spawnWave();
      updateUI();
    }
  }

  function hitShip() {
    lives--;
    if(window.PW) window.PW.sound.shipCrash();
    explode(ship.x, ship.y, '#ff3cac', 20);
    ship.vx = 0; ship.vy = 0;
    ship.x = W/2; ship.y = H/2;
    ship.angle = -Math.PI/2;
    invincible = 150;
    updateUI();
    if (lives <= 0) {
      ship.alive = false;
      gameOver();
    }
  }

  function gameOver() {
    running = false;
    gameEnded = true;
    cancelAnimationFrame(rafId);
    if(window.PW){
      window.PW.sound.stopBgm();
      window.PW.sound.gameOverSfx();
    }
    msgEl.textContent = `GAME OVER — SCORE ${score}`;
    msgEl.style.color = '#ff3c3c';
    if (window.PixelWave && window.PixelWave.submitScore) window.PixelWave.submitScore(score);
  }

  /* ─── Draw ─── */
  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Stars background (static seed)
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 60; i++) {
      const sx = (i*137 + 31) % W;
      const sy = (i*97 + 53) % H;
      ctx.fillRect(sx, sy, i%3===0?2:1, i%3===0?2:1);
    }

    // Thrust trail
    thrustTrail.forEach(t => {
      const a = t.life / 12;
      ctx.fillStyle = `rgba(255,140,0,${a})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3*a, 0, Math.PI*2);
      ctx.fill();
    });

    // Particles
    particles.forEach(p => {
      const a = p.life / 50;
      ctx.fillStyle = p.color.replace(')', `,${a})`).replace('rgb', 'rgba').replace('#00f0ff', `rgba(0,240,255,${a})`).replace('#ff3cac', `rgba(255,60,172,${a})`);
      ctx.beginPath(); ctx.arc(p.x, p.y, 2*a+1, 0, Math.PI*2); ctx.fill();
    });

    // Asteroids
    asteroids.forEach(a => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor  = '#00f0ff';
      ctx.shadowBlur   = a.size === 'large' ? 10 : 6;
      ctx.lineWidth    = a.size === 'large' ? 2 : 1.5;
      ctx.beginPath();
      a.verts.forEach((v, i) => {
        const x = Math.cos(v.a)*v.d, y = Math.sin(v.a)*v.d;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Wrap ghost drawing
      [[-W,0],[W,0],[0,-H],[0,H],[-W,-H],[-W,H],[W,-H],[W,H]].forEach(([ox,oy]) => {
        if (a.x+ox > -a.r && a.x+ox < W+a.r && a.y+oy > -a.r && a.y+oy < H+a.r) {
          ctx.save(); ctx.translate(a.x+ox, a.y+oy); ctx.rotate(a.angle);
          ctx.strokeStyle='#00f0ff44'; ctx.lineWidth=1;
          ctx.beginPath();
          a.verts.forEach((v,i) => { const x=Math.cos(v.a)*v.d, y=Math.sin(v.a)*v.d; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
          ctx.closePath(); ctx.stroke(); ctx.restore();
        }
      });
    });

    // Bullets
    bullets.forEach(b => {
      ctx.fillStyle = '#ffe44e';
      ctx.shadowColor = '#ffe44e'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Ship
    if (ship.alive && (invincible === 0 || Math.floor(invincible/6) % 2 === 0)) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor  = '#00f0ff';
      ctx.shadowBlur   = 16;
      ctx.lineWidth    = 2;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-7, 0);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.stroke();

      // Thrust flame
      if (keys.up) {
        ctx.strokeStyle = `hsl(${Math.random()*40+20},100%,60%)`;
        ctx.shadowColor  = '#ff9900';
        ctx.lineWidth    = 2;
        ctx.beginPath();
        ctx.moveTo(-7, -5);
        ctx.lineTo(-20 - Math.random()*8, 0);
        ctx.lineTo(-7, 5);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  /* ─── Loop ─── */
  function loop(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    update(ts - lastTs);
    lastTs = ts;
    draw();
  }

  /* ─── UI ─── */
  function updateUI() {
    document.getElementById('scoreEl').textContent = score.toLocaleString();
    document.getElementById('bestEl').textContent  = best.toLocaleString();
    document.getElementById('livesEl').textContent = '❤️'.repeat(Math.max(0, lives));
    document.getElementById('levelEl').textContent = level;
  }

  function wrap(v, max) { return ((v % max) + max) % max; }

  /* ─── Controls ─── */
  document.getElementById('startBtn').addEventListener('click', () => {
    if (running || gameEnded) return;
    running = true;
    msgEl.textContent = '';
    if(window.PW){
      window.PW.sound.stopBgm();
      window.PW.sound.startBgm('asteroids');
    }
    lastTs = performance.now();
    rafId = requestAnimationFrame(loop);
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    running = false;
    cancelAnimationFrame(rafId);
    Object.keys(keys).forEach(k => keys[k] = false);
    init();
  });

  /* ─── Keyboard ─── */
  document.addEventListener('keydown', e => {
    if (e.key==='ArrowLeft'  || e.key==='a') { keys.left=true;  e.preventDefault(); }
    if (e.key==='ArrowRight' || e.key==='d') { keys.right=true; e.preventDefault(); }
    if (e.key==='ArrowUp'    || e.key==='w') { keys.up=true;    e.preventDefault(); }
    if (e.key===' ')                          { keys.fire=true;  e.preventDefault(); }
  });
  document.addEventListener('keyup', e => {
    if (e.key==='ArrowLeft'  || e.key==='a') keys.left=false;
    if (e.key==='ArrowRight' || e.key==='d') keys.right=false;
    if (e.key==='ArrowUp'    || e.key==='w') keys.up=false;
    if (e.key===' ')                          keys.fire=false;
  });

  /* ─── Mobile buttons ─── */
  function mobileBtn(id, key) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key]=true; btn.classList.add('pressed'); }, {passive:false});
    btn.addEventListener('touchend',   e => { e.preventDefault(); keys[key]=false; btn.classList.remove('pressed'); }, {passive:false});
    btn.addEventListener('mousedown',  ()=>{ keys[key]=true;  btn.classList.add('pressed'); });
    btn.addEventListener('mouseup',    ()=>{ keys[key]=false; btn.classList.remove('pressed'); });
    btn.addEventListener('mouseleave', ()=>{ keys[key]=false; btn.classList.remove('pressed'); });
  }
  mobileBtn('btnLeft',  'left');
  mobileBtn('btnRight', 'right');
  mobileBtn('btnUp',    'up');
  mobileBtn('btnFire',  'fire');
  // btnDown = brake (pas de frein dans asteroids classique, on ignore)

  /* ─── Touch swipe on canvas ─── */
  let tx=0, ty=0;
  canvas.addEventListener('touchstart', e => { tx=e.touches[0].clientX; ty=e.touches[0].clientY; keys.fire=true; }, {passive:true});
  canvas.addEventListener('touchend',   e => { keys.fire=false; }, {passive:true});

  init();

  window.PixelWave.initPause({
    isRunning: function(){ return !!running; },
    pause: function(){
      _wasRunningBeforePause = running;
      running = false;
      cancelAnimationFrame(rafId);
      try { Object.keys(keys).forEach(function(k){ keys[k] = false; }); } catch(e) {}
    },
    resume: function(){
      if (!_wasRunningBeforePause) return;
      running = true;
      lastTs = performance.now();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }
  });
})();

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('pwPlaySurface', 'fsBtn');
      window.PixelWave.init('asteroids', '#00f0ff');
      (function(){
        var mb=document.getElementById('muteBtn'); if(!mb) return;
        function sync(){ var m=window.PW&&window.PW.sound.isMuted(); mb.textContent=m?'🔇':'🔊'; mb.classList.toggle('muted',!!m); }
        mb.addEventListener('click',function(){ if(window.PW) window.PW.sound.toggleMute(); sync(); });
        sync();
      })();

      var _btn = document.getElementById('startBtn');
      if (_btn) {
        _btn.addEventListener('click', function(e) {
          if (!localStorage.getItem('pw_pseudo')) {
            e.stopImmediatePropagation();
            e.preventDefault();
            window.PixelWave.promptPseudo('asteroids', function() {
              setTimeout(function() { _btn.click(); }, 50);
            });
          }
        }, true);
      }
    });
