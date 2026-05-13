// Appliquer le thème sauvegardé immédiatement
    (function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

(function(){
    const canvas  = document.getElementById('gameCanvas');
    const ctx     = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const GROUND  = H - 35;

    /* ── Dino drawing helper ── */
    const DINO_W=28, DINO_H=38, DINO_DUCK_H=22;

    /* ── State ── */
    let dino, obs, clouds, score, best, speed, running, rafId, frame;
    let _wasRunningBeforePause = false;
    let ducking = false;

    function init() {
      dino   = { x:60, y:GROUND-DINO_H, vy:0, onGround:true, animFrame:0 };
      obs    = [];
      clouds = [];
      score  = 0;
      best   = parseInt(localStorage.getItem('dinoBest')||'0');
      speed  = 4.5;
      frame  = 0;
      running= false;
      ducking= false;
      if (window.PW) window.PW.sound.stopBgm();
      updateUI();
      draw();
    }

    function jump() {
      if(!running) return;
      if(dino.onGround) {
        if (window.PW) window.PW.sound.jump();
        dino.vy = -13; dino.onGround = false;
      }
    }
    function duckStart() { ducking = true; }
    function duckEnd()   { ducking = false; }

    /* ── Spawn obstacle ── */
    function spawnObs() {
      const type = Math.random() < 0.25 ? 'bird' : 'cactus';
      if (type==='cactus') {
        const tall = Math.random() < 0.4;
        const n    = Math.floor(Math.random()*2)+1;
        obs.push({ type:'cactus', x:W+20, w:n*18+2, h:tall?52:36, y:GROUND-(tall?52:36) });
      } else {
        const birdY = GROUND - 30 - Math.floor(Math.random()*50);
        obs.push({ type:'bird', x:W+20, w:36, h:18, y:birdY, wingUp:true, wingTimer:0 });
      }
    }

    /* ── Cloud ── */
    function spawnCloud() {
      clouds.push({ x:W+20, y:20+Math.random()*50, w:60+Math.random()*40 });
    }

    /* ── Update ── */
    function update() {
      frame++;
      score++;
      speed = 3.0 + score/800;  // Réduit : était 4.5 + score/500

      // Dino physics
      const dH = (ducking && dino.onGround) ? DINO_DUCK_H : DINO_H;
      if (!dino.onGround) {
        dino.vy += 0.7;
        dino.y  += dino.vy;
      }
      const groundY = GROUND - dH;
      if (dino.y >= groundY) {
        dino.y = groundY; dino.vy = 0; dino.onGround = true;
      }
      dino.animFrame = Math.floor(frame/8)%2;

      // Spawn — plus de temps au début
      const spawnRate = Math.max(55, 130 - score/80);
      if (frame % Math.round(spawnRate) === 0) spawnObs();
      if (frame % 80 === 0) spawnCloud();

      // Move obs
      for (let i=obs.length-1;i>=0;i--) {
        obs[i].x -= speed;
        if (obs[i].type==='bird') {
          obs[i].wingTimer++;
          if(obs[i].wingTimer%12===0) obs[i].wingUp=!obs[i].wingUp;
        }
        if (obs[i].x + obs[i].w < -10) { obs.splice(i,1); continue; }

        // Collision
        const dW = DINO_W;
        const dH2 = (ducking && dino.onGround) ? DINO_DUCK_H : DINO_H;
        const dY  = dino.y;
        const margin = 5;
        if (dino.x + dW - margin > obs[i].x + margin &&
            dino.x + margin < obs[i].x + obs[i].w - margin &&
            dY + dH2 - margin > obs[i].y + margin &&
            dY + margin < obs[i].y + obs[i].h - margin) {
          return die();
        }
      }

      // Move clouds
      for(let i=clouds.length-1;i>=0;i--){
        clouds[i].x -= speed*0.3;
        if(clouds[i].x+clouds[i].w<-10) clouds.splice(i,1);
      }

      if(score>best){best=score;localStorage.setItem('dinoBest',best);}
      updateUI();
    }

    /* ── Die ── */
    function die() {
      running = false;
      cancelAnimationFrame(rafId);
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.gameOverSfx();
      }
      updateUI();
      const ovScore = document.getElementById('ovScore');
      ovScore.textContent = 'SCORE : ' + score;
      ovScore.style.display = 'block';
      document.getElementById('ovTitle').textContent = '💀 GAME OVER !';
      document.getElementById('ovBtn').textContent   = '↺ REJOUER';
      document.getElementById('overlay').classList.remove('hidden');
      if (window.PixelWave && window.PixelWave.submitScore) window.PixelWave.submitScore(score);
    }

    /* ── Draw ── */
    function draw() {
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#050510'; ctx.fillRect(0,0,W,H);

      // Stars (static)
      ctx.fillStyle='rgba(200,200,255,.35)';
      for(let i=0;i<30;i++){
        ctx.beginPath();
        ctx.arc(((i*137+50)%W), ((i*79+20)%60), .8,0,Math.PI*2); ctx.fill();
      }

      // Clouds
      clouds.forEach(c=>{
        ctx.fillStyle='rgba(255,255,255,.08)';
        ctx.beginPath(); ctx.ellipse(c.x+c.w/2,c.y,c.w/2,12,0,0,Math.PI*2); ctx.fill();
      });

      // Ground line
      ctx.strokeStyle='#00ff8866'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(0,GROUND); ctx.lineTo(W,GROUND); ctx.stroke();
      // Ground dots
      ctx.fillStyle='#00ff8833';
      for(let x=(frame*speed%20);x<W;x+=20){ ctx.fillRect(x,GROUND+3,10,2); }

      // Obstacles
      obs.forEach(o=>{
        if(o.type==='cactus'){
          ctx.fillStyle='#00ff88'; ctx.shadowColor='#00ff88'; ctx.shadowBlur=8;
          ctx.fillRect(o.x+(o.w/2)-6,o.y,12,o.h);
          // arms
          ctx.fillRect(o.x,o.y+10,o.w,8);
          ctx.shadowBlur=0;
        } else {
          // bird
          ctx.fillStyle='#ff3cac'; ctx.shadowColor='#ff3cac'; ctx.shadowBlur=8;
          ctx.fillRect(o.x+5,o.y+5,26,8); // body
          // wings
          ctx.fillStyle='#ff3cac';
          if(o.wingUp){
            ctx.fillRect(o.x+8,o.y-4,18,8); // up
          } else {
            ctx.fillRect(o.x+8,o.y+12,18,7); // down
          }
          ctx.shadowBlur=0;
        }
      });

      // Dino
      const dH = (ducking && dino.onGround) ? DINO_DUCK_H : DINO_H;
      ctx.fillStyle='#00ff88'; ctx.shadowColor='#00ff88'; ctx.shadowBlur=10;
      if(ducking && dino.onGround){
        // Ducked body
        ctx.fillRect(dino.x, dino.y, DINO_W+10, dH);
        ctx.fillStyle='#0a0a1a'; ctx.fillRect(dino.x+22,dino.y+4,8,8); // eye area
        ctx.fillStyle='#00ff88'; ctx.fillRect(dino.x+24,dino.y+6,4,4); // eye
      } else {
        // Body
        ctx.fillRect(dino.x+4,dino.y+10,DINO_W-4,DINO_H-10);
        // Head
        ctx.fillRect(dino.x+8,dino.y,DINO_W-4,16);
        // Eye
        ctx.fillStyle='#0a0a1a'; ctx.fillRect(dino.x+18,dino.y+3,8,8);
        ctx.fillStyle='#00ff88'; ctx.fillRect(dino.x+20,dino.y+5,4,4);
        // Legs (animate)
        if(dino.onGround){
          if(dino.animFrame===0){
            ctx.fillStyle='#00ff88';
            ctx.fillRect(dino.x+6, dino.y+DINO_H-10, 8,10);
            ctx.fillRect(dino.x+16,dino.y+DINO_H-5, 8,5);
          } else {
            ctx.fillRect(dino.x+6, dino.y+DINO_H-5, 8,5);
            ctx.fillRect(dino.x+16,dino.y+DINO_H-10, 8,10);
          }
        } else {
          ctx.fillRect(dino.x+6, dino.y+DINO_H-8, 8,8);
          ctx.fillRect(dino.x+16,dino.y+DINO_H-8, 8,8);
        }
      }
      ctx.shadowBlur=0;

      // Score HUD
      if(running){
        ctx.fillStyle='rgba(0,255,136,.7)';
        ctx.font='10px "Press Start 2P",monospace';
        ctx.textAlign='right';
        ctx.fillText(String(score).padStart(5,'0'), W-10, 22);
        ctx.textAlign='left';
      }
    }

    /* ── Loop ── */
    function loop(){
      rafId=requestAnimationFrame(loop);
      if(running) update();
      draw();
    }

    function updateUI(){
      document.getElementById('scoreEl').textContent = score;
      document.getElementById('bestEl').textContent  = best;
      document.getElementById('speedEl').textContent = speed.toFixed(1)+'x';
    }

    /* ── Start ── */
    const ovBtn = document.getElementById('ovBtn');
    function startGame(){
      init();
      document.getElementById('overlay').classList.add('hidden');
      running=true;
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.startBgm('dino');
      }
      rafId=requestAnimationFrame(loop);
    }
    ovBtn.addEventListener('click',    startGame);
    ovBtn.addEventListener('touchend', e=>{e.preventDefault();startGame();});

    /* ── Input ── */
    let lastTap=0;
    function handleJump(e){
      const now=Date.now();
      if(now-lastTap<300){e.preventDefault();return;}
      lastTap=now;
      if(!document.getElementById('overlay').classList.contains('hidden')) return;
      jump();
    }
    canvas.addEventListener('pointerdown', handleJump, {passive:false});
    document.getElementById('tapArea').addEventListener('pointerdown', handleJump, {passive:false});
    document.addEventListener('keydown',e=>{
      if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();jump();}
      if(e.code==='ArrowDown') duckStart();
    });
    document.addEventListener('keyup',e=>{ if(e.code==='ArrowDown') duckEnd(); });

    init();
    loop();

    window.PixelWave.initPause({
      isRunning: function(){ return true; },
      pause: function(){ _wasRunningBeforePause = running; running = false; },
      resume: function(){ if (_wasRunningBeforePause) running = true; }
    });
  })();

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('gameWrap', 'fsBtn');
      window.PixelWave.init('dino', '#00ff88');
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
            window.PixelWave.promptPseudo('dino', function() {
              // Relancer le clic après validation
              setTimeout(function() { _btn.click(); }, 50);
            });
          }
        }, true); // capture phase
      }
    });
