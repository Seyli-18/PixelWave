// Appliquer le thème sauvegardé immédiatement
    (function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

(function(){
    const canvas  = document.getElementById('gameCanvas');
    const ctx     = canvas.getContext('2d');
    const overlay = document.getElementById('overlay');
    const ovTitle = document.getElementById('ovTitle');
    const ovScore = document.getElementById('ovScore');
    const ovPct   = document.getElementById('ovPct');
    const ovBtn   = document.getElementById('ovBtn');
    const W = canvas.width, H = canvas.height;

    /* ── Constants ── */
    const GROUND  = H - 50;
    const CUBE_S  = 32;
    const GRAVITY = 0.50;
    const JUMP_V  = -11.0;
    const SCROLL  = 3.0;  // Réduit : était 4.5

    /* ── Level data (obstacle types: 0=spike, 1=block, 2=tall) ── */
    /* Each level is an array of [x_offset, type] pairs */
    function buildLevel(seed) {
      const obs = [];
      let x = 500;
      const rng = lcg(seed);
      const count = 20 + seed * 5;
      for (let i = 0; i < count; i++) {
        // Niveau 1 : surtout spikes simples, pas de tall blocks
        const maxType = Math.min(2, Math.floor(seed * 0.7));
        const type = Math.floor(rng() * (maxType + 1));
        // Hauteur réduite pour les blocs
        const h = type===0 ? 24 : type===1 ? 30 : 44;
        obs.push({ x, type, w: type===2?30:22, h });
        // Plus d'espace entre les obstacles : 180-300px au lieu de 120-240px
        x += 180 + Math.floor(rng() * 180);
      }
      obs.push({ x, type:'end', w:30, h:60 });
      return { obs, totalLen: x + 200 };
    }

    function lcg(seed) {
      let s = seed * 1664525 + 1013904223;
      return () => { s = (Math.imul(1664525, s) + 1013904223) | 0; return (s >>> 0) / 0xFFFFFFFF; };
    }

    /* ── State ── */
    let cube, cam, level, levelData, attempts, bestPct, running, rafId;
    let particles = [];
    let bgHue = 220;
    let held = false;
    let _wasRunningBeforePause = false;

    function init() {
      cube = { x: 80, y: GROUND - CUBE_S, vy: 0, onGround: true, rot: 0, trail: [] };
      cam  = { x: 0 };
      attempts = parseInt(localStorage.getItem('gdAttempts') || '0') + 1;
      bestPct  = parseFloat(localStorage.getItem('gdBest') || '0');
      level    = parseInt(localStorage.getItem('gdLevel') || '1');
      levelData = buildLevel(level);
      particles = [];
      running  = false;
      if (window.PW) window.PW.sound.stopBgm();
      updateUI();
      draw();
    }

    function jump() {
      if (!running) return;
      if (cube.onGround) {
        if (window.PW) window.PW.sound.jump();
        cube.vy = JUMP_V;
        cube.onGround = false;
        spawnParticles(cube.x + CUBE_S/2, cube.y + CUBE_S, '#ff6b35', 6);
      }
    }

    function spawnParticles(x, y, color, n) {
      for (let i=0;i<n;i++) particles.push({
        x, y, vx:(Math.random()-.5)*4, vy:-(Math.random()*3+1),
        life:1, color
      });
    }

    /* ── Update ── */
    function update() {
      if (held && cube.onGround) jump();

      // Physics
      cube.vy   += GRAVITY;
      cube.y    += cube.vy;
      cube.rot  += 6;
      cam.x     += SCROLL;

      // Ground
      if (cube.y >= GROUND - CUBE_S) {
        cube.y       = GROUND - CUBE_S;
        cube.vy      = 0;
        cube.onGround = true;
        cube.rot = Math.round(cube.rot / 90) * 90; // snap rotation
      }

      // Progress
      const pct = Math.min(100, Math.floor((cam.x / levelData.totalLen) * 100));
      document.getElementById('progFill').style.width = pct + '%';

      // Obstacle collisions
      for (const o of levelData.obs) {
        const ox = o.x - cam.x;
        if (ox > W + 60 || ox + o.w < -20) continue;
        const oy = GROUND - o.h;

        if (o.type === 'end') {
          if (ox < cube.x + CUBE_S && ox + o.w > cube.x) {
            winLevel(pct); return;
          }
          continue;
        }

        // AABB with small margin
        if (cube.x + CUBE_S - 4 > ox && cube.x + 4 < ox + o.w &&
            cube.y + CUBE_S - 4 > oy && cube.y + 4 < oy + o.h) {
          die(pct); return;
        }
      }

      // Particles
      for (let i = particles.length-1; i>=0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.06;
        if (p.life <= 0) particles.splice(i,1);
      }
    }

    /* ── Die ── */
    function die(pct) {
      running = false;
      cancelAnimationFrame(rafId);
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.gameOverSfx();
      }
      spawnParticles(cube.x+CUBE_S/2, cube.y+CUBE_S/2, '#ff3c3c', 18);
      if (pct > bestPct) { bestPct = pct; localStorage.setItem('gdBest', bestPct); }
      localStorage.setItem('gdAttempts', attempts);
      updateUI();
      // show overlay after particles
      setTimeout(() => {
        ovTitle.innerHTML  = '💥 CRASH !';
        ovScore.style.display = 'block';
        ovPct.style.display   = 'block';
        ovScore.textContent   = 'TENTATIVE #' + attempts;
        ovPct.textContent     = pct + '% DU NIVEAU';
        ovBtn.textContent     = '↺ RÉESSAYER';
        overlay.classList.remove('hidden');
        if (window.PixelWave && window.PixelWave.submitScore) window.PixelWave.submitScore(pct);
      }, 600);
    }

    /* ── Win ── */
    function winLevel(pct) {
      running = false;
      cancelAnimationFrame(rafId);
      if (window.PW) window.PW.sound.levelUp();
      bestPct = 100;
      localStorage.setItem('gdBest', 100);
      level++;
      localStorage.setItem('gdLevel', level);
      updateUI();
      spawnParticles(cube.x+CUBE_S/2, cube.y+CUBE_S/2, '#ffe44e', 24);
      setTimeout(() => {
        ovTitle.innerHTML    = '🎉 NIVEAU TERMINÉ !';
        ovScore.style.display = 'block';
        ovPct.style.display   = 'none';
        ovScore.textContent   = 'PROCHAIN NIVEAU : ' + level;
        ovBtn.textContent     = '▶ CONTINUER';
        overlay.classList.remove('hidden');
        if (window.PixelWave && window.PixelWave.submitScore) window.PixelWave.submitScore(100 * (level-1));
      }, 400);
    }

    /* ── Draw ── */
    function draw() {
      // Animated bg
      bgHue = (bgHue + 0.15) % 360;
      const bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0, `hsl(${bgHue},40%,8%)`);
      bg.addColorStop(1, `hsl(${(bgHue+40)%360},30%,12%)`);
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

      // BG grid lines
      ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1;
      for (let x=((-cam.x*0.3)%60);x<W;x+=60){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke(); }
      for (let y=0;y<H;y+=40){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }

      // Ground
      ctx.fillStyle = '#1a1a3a';
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = '#ff6b35';
      ctx.fillRect(0, GROUND, W, 3);

      // Obstacles
      levelData.obs.forEach(o => {
        const ox = o.x - cam.x;
        if (ox > W + 60 || ox + o.w < -20) return;
        const oy = GROUND - o.h;

        if (o.type === 'end') {
          // Portal
          ctx.fillStyle = '#00ff88';
          ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 20;
          ctx.fillRect(ox, oy, 6, o.h);
          ctx.fillRect(ox+24, oy, 6, o.h);
          ctx.font = '10px sans-serif'; ctx.fillStyle='#00ff88';
          ctx.fillText('END', ox+1, oy-5);
          ctx.shadowBlur = 0;
          return;
        }

        if (o.type === 0) {
          // Spike (triangle)
          ctx.fillStyle = '#ff3c3c';
          ctx.shadowColor = '#ff3c3c'; ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(ox, GROUND);
          ctx.lineTo(ox + o.w/2, oy);
          ctx.lineTo(ox + o.w, GROUND);
          ctx.closePath(); ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Block
          ctx.fillStyle = o.type===2 ? '#b44fff' : '#00f0ff';
          ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
          ctx.fillRect(ox, oy, o.w, o.h);
          ctx.fillStyle = 'rgba(255,255,255,.15)';
          ctx.fillRect(ox+2, oy+2, o.w-4, 4);
          ctx.shadowBlur = 0;
        }
      });

      // Particles
      particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4*p.life, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Cube (only draw if alive)
      if (running || !overlay.classList.contains('hidden')) {
        // Actually always draw cube for particles to show
      }
      if (cube) {
        ctx.save();
        ctx.translate(cube.x + CUBE_S/2, cube.y + CUBE_S/2);
        ctx.rotate(cube.rot * Math.PI / 180);
        // Glow
        ctx.shadowColor = '#ff6b35'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#ff6b35';
        ctx.fillRect(-CUBE_S/2, -CUBE_S/2, CUBE_S, CUBE_S);
        // Inner design
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.fillRect(-CUBE_S/2+3, -CUBE_S/2+3, CUBE_S-6, 6);
        ctx.strokeStyle = '#ffe44e'; ctx.lineWidth = 2;
        ctx.strokeRect(-CUBE_S/2+2, -CUBE_S/2+2, CUBE_S-4, CUBE_S-4);
        ctx.restore();
      }

      // HUD %
      if (running) {
        const pct = Math.min(100, Math.floor((cam.x/levelData.totalLen)*100));
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.font = '10px "Press Start 2P",monospace';
        ctx.textAlign = 'right';
        ctx.fillText(pct+'%', W-10, 22);
        ctx.textAlign = 'left';
      }
    }

    /* ── RAF loop ── */
    function loop() {
      rafId = requestAnimationFrame(loop);
      if (running) update();
      draw();
    }

    function updateUI() {
      document.getElementById('attEl').textContent   = attempts || 0;
      document.getElementById('bestEl').textContent  = (bestPct||0) + '%';
      document.getElementById('levelEl').textContent = level || 1;
    }

    /* ── Overlay button ── */
    function startGame() {
      init();
      overlay.classList.add('hidden');
      running = true;
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.startBgm('geodash');
      }
      rafId = requestAnimationFrame(loop);
    }
    ovBtn.addEventListener('click',    startGame);
    ovBtn.addEventListener('touchend', e => { e.preventDefault(); startGame(); });

    /* ── Input ── */
    let lastTap = 0;
    function onInput(e) {
      if (e.type === 'touchend' || e.type === 'pointerdown') {
        const now = Date.now();
        if (now - lastTap < 300) { e.preventDefault(); return; }
        lastTap = now;
      }
      if (!overlay.classList.contains('hidden')) return;
      jump();
    }
    function onHold(down) { held = down; if (down && !overlay.classList.contains('hidden')) return; if(down) jump(); }

    document.addEventListener('keydown', e => { if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW'){e.preventDefault();jump();} });
    canvas.addEventListener('pointerdown', e => { onHold(true); }, {passive:false});
    document.getElementById('tapArea').addEventListener('pointerdown', e => { onHold(true); onInput(e); }, {passive:false});
    document.addEventListener('pointerup', () => held = false);

    /* ── Start ── */
    init();
    ovTitle.innerHTML  = '🔷 GEOMETRY DASH<br><span style="font-size:.42rem;color:#7070a0">SAUTE PAR-DESSUS LES OBSTACLES !</span>';
    ovScore.style.display = 'none';
    ovPct.style.display   = 'none';
    ovBtn.textContent      = '▶ JOUER';
    loop();

    window.PixelWave.initPause({
      isRunning: function(){ return true; },
      pause: function(){
        _wasRunningBeforePause = running;
        running = false;
        held = false;
      },
      resume: function(){
        if (_wasRunningBeforePause && overlay.classList.contains('hidden')) running = true;
      }
    });
  })();

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('gameWrap', 'fsBtn');
      window.PixelWave.init('geodash', '#ff6b35');
      (function(){
        var mb=document.getElementById('muteBtn'); if(!mb) return;
        function sync(){ var m=window.PW&&window.PW.sound.isMuted(); mb.textContent=m?'🔇':'🔊'; mb.classList.toggle('muted',!!m); }
        mb.addEventListener('click',function(){ if(window.PW) window.PW.sound.toggleMute(); sync(); });
        sync();
      })();

      // Popup pseudo à chaque clic sur Jouer (si pas encore de pseudo)
      var _btn = document.getElementById('ovBtn');
      if (_btn) {
        _btn.addEventListener('click', function(e) {
          if (!localStorage.getItem('pw_pseudo')) {
            e.stopImmediatePropagation();
            e.preventDefault();
            window.PixelWave.promptPseudo('geodash', function() {
              // Relancer le clic après validation
              setTimeout(function() { _btn.click(); }, 50);
            });
          }
        }, true); // capture phase
      }
    });
