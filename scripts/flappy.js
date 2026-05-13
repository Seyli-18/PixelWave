// Appliquer le thème sauvegardé immédiatement
    (function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

/* =====================
     FLAPPY BIRD — game.js
     ===================== */
  (function(){
    const canvas  = document.getElementById('gameCanvas');
    const ctx     = canvas.getContext('2d');
    const overlay = document.getElementById('overlay');
    const ovTitle = document.getElementById('ovTitle');
    const ovScore = document.getElementById('ovScore');
    const ovBtn   = document.getElementById('ovBtn');
    const W = canvas.width, H = canvas.height;

    /* ── Constants ── */
    const PIPE_W    = 52;
    const PIPE_GAP  = 145;
    const GRAVITY   = 0.27;
    const FLAP_V    = -6.2;
    const BIRD_R    = 14;

    /* ── State ── */
    let bird, pipes, score, best, level, running, rafId, frame;
    let _wasRunningBeforePause = false;
    let bgStars = [];
    for(let i=0;i<55;i++) bgStars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+.4,phase:Math.random()*Math.PI*2});

    /* ── Init / Reset ── */
    function init() {
      bird  = { x:72, y:H/2, vy:0, rot:0 };
      pipes = [];
      score = 0; level = 1; frame = 0;
      best  = parseInt(localStorage.getItem('flappyBest')||'0');
      running = false;
      cancelAnimationFrame(rafId);
      if (window.PW) window.PW.sound.stopBgm();
      updateUI();
      draw(); // draw first frame (bird visible)
    }

    function showOverlay(title, scoreVal, btnLabel) {
      ovTitle.innerHTML  = title;
      ovScore.style.display = scoreVal !== null ? 'block' : 'none';
      if (scoreVal !== null) ovScore.textContent = 'SCORE : ' + scoreVal;
      ovBtn.textContent  = btnLabel;
      overlay.classList.remove('hidden');
    }

    function hideOverlay() { overlay.classList.add('hidden'); }

    /* ── Flap ── */
    function flap() {
      if (!running) return; // handled by overlay button
      if (window.PW) window.PW.sound.jump();
      bird.vy = FLAP_V;
    }

    /* ── Pipe speed ── */
    function pipeSpeed() { return 2.0 + (level-1)*0.25; }

    /* ── Spawn pipe ── */
    function spawnPipe() {
      const minTop = 55, maxTop = H - PIPE_GAP - 55;
      const top = Math.floor(Math.random()*(maxTop-minTop))+minTop;
      pipes.push({ x: W+12, top, scored: false });
    }

    /* ── Update ── */
    function update() {
      frame++;
      bird.vy  += GRAVITY;
      bird.y   += bird.vy;
      bird.rot  = Math.min(Math.max(bird.vy*0.07, -0.45), 1.3);

      // Spawn pipes
      const interval = Math.max(65, 105 - (level-1)*5);
      if (frame % interval === 0) spawnPipe();

      // Move pipes + score
      const sp = pipeSpeed();
      for (let i = pipes.length-1; i >= 0; i--) {
        pipes[i].x -= sp;
        if (!pipes[i].scored && pipes[i].x + PIPE_W < bird.x) {
          pipes[i].scored = true;
          score++;
          if (window.PW) window.PW.sound.tap();
          if (score > 0 && score % 10 === 0) level++;
          updateUI();
        }
        if (pipes[i].x + PIPE_W < -20) pipes.splice(i, 1);
      }

      // Ceiling / floor
      if (bird.y - BIRD_R < 0 || bird.y + BIRD_R > H - 28) return doGameOver();

      // Pipe collision
      for (const p of pipes) {
        const inX = bird.x + BIRD_R - 5 > p.x && bird.x - BIRD_R + 5 < p.x + PIPE_W;
        const inY = bird.y - BIRD_R + 5 < p.top || bird.y + BIRD_R - 5 > p.top + PIPE_GAP;
        if (inX && inY) return doGameOver();
      }
    }

    /* ── Game over ── */
    function doGameOver() {
      running = false;
      cancelAnimationFrame(rafId);
      if (score > best) { best = score; localStorage.setItem('flappyBest', best); }
      updateUI();
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.gameOverSfx();
      }
      showOverlay('💥 GAME OVER', score, '↺ REJOUER');
      if (window.PixelWave && window.PixelWave.submitScore) window.PixelWave.submitScore(score);
    }

    /* ── Draw ── */
    function draw() {
      // Sky gradient
      const sky = ctx.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,'#05051a'); sky.addColorStop(1,'#0a1a2a');
      ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

      // Stars
      const t = Date.now();
      bgStars.forEach(s => {
        const a = 0.4 + 0.35*Math.sin(t/700 + s.phase);
        ctx.fillStyle = `rgba(200,210,255,${a})`;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
      });

      // Ground
      ctx.fillStyle='#1a3a0a'; ctx.fillRect(0,H-28,W,28);
      ctx.fillStyle='#2a5a15'; ctx.fillRect(0,H-28,W,7);

      // Pipes
      pipes.forEach(p => {
        // top pipe body
        ctx.fillStyle='#1a8a1a'; ctx.shadowColor='#00ff44'; ctx.shadowBlur=6;
        ctx.fillRect(p.x,0,PIPE_W,p.top);
        ctx.fillStyle='#2aaa2a';
        ctx.fillRect(p.x-5,p.top-18,PIPE_W+10,18);
        // bottom pipe body
        ctx.fillStyle='#1a8a1a';
        ctx.fillRect(p.x,p.top+PIPE_GAP,PIPE_W,H-p.top-PIPE_GAP-28);
        ctx.fillStyle='#2aaa2a';
        ctx.fillRect(p.x-5,p.top+PIPE_GAP,PIPE_W+10,18);
        ctx.shadowBlur=0;
      });

      // Bird
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.rot);
      // shadow glow
      ctx.shadowColor='#ffe44e'; ctx.shadowBlur=12;
      // body
      ctx.fillStyle='#ffe44e';
      ctx.beginPath(); ctx.ellipse(0,0,BIRD_R,BIRD_R-2,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // wing
      const wOff = running ? Math.sin(frame*0.28)*5 : 0;
      ctx.fillStyle='#ffcc00';
      ctx.beginPath(); ctx.ellipse(-4,wOff,9,5,-0.3,0,Math.PI*2); ctx.fill();
      // eye
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(7,-4,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(8,-5,1.5,0,Math.PI*2); ctx.fill();
      // beak
      ctx.fillStyle='#ff9900';
      ctx.beginPath(); ctx.moveTo(BIRD_R,0); ctx.lineTo(BIRD_R+8,-3); ctx.lineTo(BIRD_R+8,3); ctx.closePath(); ctx.fill();
      ctx.restore();

      // HUD score (only when running)
      if (running) {
        ctx.fillStyle='#fff'; ctx.shadowColor='#000'; ctx.shadowBlur=5;
        ctx.font='bold 26px "Press Start 2P",monospace';
        ctx.textAlign='center';
        ctx.fillText(score, W/2, 48);
        ctx.shadowBlur=0; ctx.textAlign='left';
      }
    }

    /* ── RAF loop ── */
    function loop() {
      rafId = requestAnimationFrame(loop);
      if (running) update();
      draw();
    }

    /* ── UI ── */
    function updateUI() {
      document.getElementById('scoreEl').textContent = score;
      document.getElementById('bestEl').textContent  = best;
      document.getElementById('levelEl').textContent = level;
    }

    /* ── Overlay button ── */
    ovBtn.addEventListener('click', startGame);
    ovBtn.addEventListener('touchend', e => { e.preventDefault(); startGame(); });

    function startGame() {
      init();
      hideOverlay();
      running = true;
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.startBgm('flappy');
      }
      rafId = requestAnimationFrame(loop);
    }

    /* ── Input — single unified handler ── */
    let lastTap = 0;
    function handleInput(e) {
      // Block double-tap zoom
      const now = Date.now();
      if (now - lastTap < 300) { e.preventDefault(); }
      lastTap = now;
      if (!overlay.classList.contains('hidden')) return; // overlay is open
      flap();
    }

    // Canvas tap/click
    canvas.addEventListener('pointerdown', handleInput, { passive: false });
    // Big tap button
    document.getElementById('tapBtn').addEventListener('pointerdown', handleInput, { passive: false });
    // Keyboard
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!overlay.classList.contains('hidden')) return;
        flap();
      }
    });

    /* ── Start ── */
    init();
    showOverlay('🐤 FLAPPY BIRD<br><br><span style="font-size:.45rem;color:#7070a0">PASSE ENTRE LES TUYAUX !</span>', null, '▶ JOUER');
    rafId = requestAnimationFrame(loop);

    window.PixelWave.initPause({
      isRunning: function(){ return true; },
      pause: function(){ _wasRunningBeforePause = running; running = false; },
      resume: function(){ if (_wasRunningBeforePause) running = true; }
    });
  })();

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('gameWrap', 'fsBtn');
      window.PixelWave.init('flappy', '#ffe44e');
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
            window.PixelWave.promptPseudo('flappy', function() {
              // Relancer le clic après validation
              setTimeout(function() { _btn.click(); }, 50);
            });
          }
        }, true); // capture phase
      }
    });
