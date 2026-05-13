(function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

(function(){
    const canvas = document.getElementById('gameCanvas');
    const ctx    = canvas.getContext('2d');
    const msgEl  = document.getElementById('msgEl');

    const CELL = 18;
    // Map is 23 cols x 23 rows — fully walled border, clean interior
    // 1=wall 2=dot 3=power 0=empty(ghost house/tunnel)
    // Tunnel exits at row 11, cols 0 and 22
    const COLS = 23, ROWS = 23, TUNNEL_ROW = 11;
    canvas.width  = COLS * CELL;
    canvas.height = ROWS * CELL;

    /* ── CLEAN MAP — every cell verified ──
       Rows indexed 0-22, columns 0-22
       Tunnel row (11): col 0 and col 22 are open (=0), rest normal
    ─────────────────────────────────────── */
    const BASE_MAP = [
      //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22
      [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 0
      [ 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // 1
      [ 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1], // 2
      [ 1, 3, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 3, 1], // 3
      [ 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1], // 4
      [ 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // 5
      [ 1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1], // 6
      [ 1, 2, 2, 2, 2, 1, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2, 2, 1, 2, 2, 2, 2, 1], // 7
      [ 1, 1, 1, 1, 2, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 2, 1, 1, 1, 1], // 8
      [ 1, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 1, 1, 1], // 9  ghost house top
      [ 1, 1, 1, 1, 2, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 2, 1, 1, 1, 1], // 10 ghost house
      [ 0, 0, 0, 0, 2, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 2, 0, 0, 0, 0], // 11 TUNNEL
      [ 1, 1, 1, 1, 2, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 2, 1, 1, 1, 1], // 12 ghost house
      [ 1, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 1, 1, 1], // 13 ghost house bot
      [ 1, 1, 1, 1, 2, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 2, 1, 1, 1, 1], // 14
      [ 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // 15
      [ 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1], // 16
      [ 1, 3, 2, 1, 2, 2, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2, 2, 2, 1, 2, 3, 1], // 17
      [ 1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1], // 18
      [ 1, 2, 2, 2, 2, 1, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2, 2, 1, 2, 2, 2, 2, 1], // 19
      [ 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1], // 20
      [ 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // 21
      [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 22
    ];

    // Ghost spawn area center
    const GH = { x: 11, y: 11 };
    // Pac-Man start
    const PAC_START = { x: 11, y: 17 };
    // Ghost spawn positions
    const G_SPAWNS = [{x:10,y:11},{x:11,y:11},{x:12,y:11},{x:11,y:10}];

    const GHOST_COLORS = ['#ff0000','#ffb8ff','#00ffff','#ffb852'];

    // Scatter targets (corners)
    const SCATTER = [{x:22,y:0},{x:0,y:0},{x:22,y:22},{x:0,y:22}];

    let map, pac, ghosts, score, best, lives, level;
    let running=false, gameEnded=false, powered=false, powerTimer=0;
    let rafId=null, lastTs=0, pacAcc=0, ghostAcc=0;
    let _wasRunningBeforePause = false;

    // ms per step — tuned for comfort
    const PAC_BASE   = 240; // pac-man move interval
    const GHOST_BASE = 380; // ghost move interval (much slower!)
    // Each level speeds things up slightly
    const PAC_MIN    = 140;
    const GHOST_MIN  = 240;

    /* ── Walkable ── */
    function walkable(x, y) {
      // Tunnel row: always passable
      if (y === TUNNEL_ROW) return true;
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
      return map[y][x] !== 1;
    }

    /* ── Tunnel wrap ── */
    function wrapX(x) {
      if (x < 0)    return COLS - 1;
      if (x >= COLS) return 0;
      return x;
    }

    /* ── Ghost AI ──
       Modes: 'chase' or 'scatter' (rotate every N steps).
       Each ghost has a personality:
         0 = Blinky: always chases pac
         1 = Pinky:  aims 4 ahead of pac
         2 = Inky:   random-biased
         3 = Clyde:  chases when far, scatters when close
    ──────────────── */
    const D4 = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
    let scatterTimer = 0;
    let scatterMode  = false;

    function ghostTarget(g) {
      if (scatterMode) return SCATTER[g.idx];
      switch(g.idx) {
        case 0: return { x: pac.x, y: pac.y };
        case 1: return { x: pac.x + pac.dx*4, y: pac.y + pac.dy*4 };
        case 2: // random wander
          return { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) };
        case 3: { // Clyde: chase when far, scatter when close
          const dist = Math.abs(g.x - pac.x) + Math.abs(g.y - pac.y);
          return dist > 8 ? {x:pac.x,y:pac.y} : SCATTER[3];
        }
      }
    }

    function moveGhost(g) {
      if (g.exitDelay > 0) { g.exitDelay--; return; }

      let valid = D4.filter(d => {
        if (d.dx === -g.dx && d.dy === -g.dy && (g.dx !== 0 || g.dy !== 0)) return false;
        const nx = wrapX(g.x + d.dx), ny = g.y + d.dy;
        return walkable(nx, ny);
      });

      if (!valid.length) {
        valid = D4.filter(d => walkable(wrapX(g.x+d.dx), g.y+d.dy));
      }
      if (!valid.length) return;

      let chosen;
      if (g.frightened) {
        // Fully random when frightened
        chosen = valid[Math.floor(Math.random()*valid.length)];
      } else {
        const t = ghostTarget(g);
        // Sort by distance to target
        valid.sort((a,b) => {
          const da = Math.abs(wrapX(g.x+a.dx)-t.x)+Math.abs(g.y+a.dy-t.y);
          const db = Math.abs(wrapX(g.x+b.dx)-t.x)+Math.abs(g.y+b.dy-t.y);
          return da-db;
        });
        // Higher randomness = easier game: 50% chance to pick random direction
        chosen = Math.random() < 0.50 ? valid[0] : valid[Math.floor(Math.random()*valid.length)];
      }

      g.dx = chosen.dx; g.dy = chosen.dy;
      g.x  = wrapX(g.x + g.dx);
      g.y += g.dy;
    }

    /* ── Pac movement ── */
    function movePac() {
      // Try buffered direction
      const tnx = wrapX(pac.x + pac.ndx), tny = pac.y + pac.ndy;
      if (walkable(tnx, tny)) { pac.dx = pac.ndx; pac.dy = pac.ndy; }

      const mnx = wrapX(pac.x + pac.dx), mny = pac.y + pac.dy;
      if (walkable(mnx, mny)) { pac.x = mnx; pac.y = mny; }

      const c = map[pac.y][pac.x];
      if (c === 2) { score += 10; map[pac.y][pac.x] = 0; if(window.PW) window.PW.sound.dot(); }
      if (c === 3) {
        score += 50; map[pac.y][pac.x] = 0; if(window.PW) window.PW.sound.power();
        powered = true; powerTimer = 150; // ~6s at 240ms/step ≈ 25 steps
        ghosts.forEach(g => { if(!g.dead) g.frightened = true; });
      }
      if (powered) {
        powerTimer--;
        if (powerTimer <= 0) { powered=false; ghosts.forEach(g=>g.frightened=false); }
      }
    }

    /* ── Collisions ── */
    function checkColl() {
      ghosts.forEach(g => {
        if (g.dead) return;
        if (g.x===pac.x && g.y===pac.y) {
          if (g.frightened) {
            score += 200; g.dead=true; g.frightened=false; if(window.PW) window.PW.sound.bonus();
            setTimeout(()=>{ g.x=GH.x; g.y=GH.y; g.dx=0; g.dy=0; g.dead=false; g.exitDelay=20; }, 3000);
          } else loseLife();
        }
      });
    }

    function loseLife() {
      lives--; updateUI();
      if(window.PW) window.PW.sound.die();
      if (lives<=0) return gameOver();
      pac.x=PAC_START.x; pac.y=PAC_START.y; pac.dx=0; pac.dy=0; pac.ndx=1; pac.ndy=0;
      powered=false; ghosts.forEach(g=>g.frightened=false);
      msgEl.textContent='AÏÏE !'; msgEl.style.color='#ff3c3c';
      setTimeout(()=>{msgEl.textContent='';msgEl.style.color='';},1200);
    }

    function checkWin() {
      if (map.some(r=>r.includes(2)||r.includes(3))) return;
      level++;
      map = BASE_MAP.map(r=>[...r]);
      ghosts.forEach((g,i)=>{ g.x=G_SPAWNS[i].x; g.y=G_SPAWNS[i].y; g.dx=0; g.dy=0; g.frightened=false; g.dead=false; g.exitDelay=i*15; });
      msgEl.textContent=`🎉 NIVEAU ${level} !`;
      setTimeout(()=>msgEl.textContent='',1500);
    }

    /* ── RAF loop ── */
    function loop(ts) {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      const dt = ts - lastTs; lastTs = ts;

      const pacSpd   = Math.max(PAC_MIN,   PAC_BASE   - (level-1)*10);
      const ghostSpd = Math.max(GHOST_MIN, GHOST_BASE - (level-1)*12);

      pacAcc   += dt;
      ghostAcc += dt;
      scatterTimer += dt;

      // Scatter/chase toggle every 7s
      if (scatterTimer > 7000) { scatterTimer=0; scatterMode=!scatterMode; }

      if (pacAcc >= pacSpd) {
        pacAcc -= pacSpd;
        movePac();
        checkColl();
        checkWin();
        if (score>best){ best=score; localStorage.setItem('pacBest',best); }
        updateUI();
      }

      if (ghostAcc >= ghostSpd) {
        ghostAcc -= ghostSpd;
        ghosts.forEach(g=>{ if(!g.dead) moveGhost(g); });
        checkColl();
      }

      draw();
    }

    /* ── Draw ── */
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);

      for (let row=0; row<ROWS; row++) {
        for (let col=0; col<COLS; col++) {
          const v=map[row][col], x=col*CELL, y=row*CELL;
          if (v===1) {
            ctx.fillStyle='#1133cc'; ctx.shadowColor='#0044ff'; ctx.shadowBlur=4;
            ctx.fillRect(x+1,y+1,CELL-2,CELL-2); ctx.shadowBlur=0;
          } else if (v===2) {
            ctx.fillStyle='#ffe0a0'; ctx.shadowColor='#ffe0a0'; ctx.shadowBlur=3;
            ctx.beginPath(); ctx.arc(x+CELL/2,y+CELL/2,2.2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
          } else if (v===3) {
            const p=0.7+0.3*Math.sin(Date.now()/200);
            ctx.fillStyle='#ffe44e'; ctx.shadowColor='#ffe44e'; ctx.shadowBlur=14*p;
            ctx.beginPath(); ctx.arc(x+CELL/2,y+CELL/2,5.5*p,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
          }
        }
      }

      // Tunnel hint
      ctx.fillStyle='#ffffff22'; ctx.font='bold 10px sans-serif';
      ctx.fillText('◀',1,TUNNEL_ROW*CELL+13);
      ctx.fillText('▶',(COLS-1)*CELL+2,TUNNEL_ROW*CELL+13);

      // Ghosts
      ghosts.forEach(g=>{
        if(g.dead) return;
        const gx=g.x*CELL+CELL/2, gy=g.y*CELL+CELL*.6;
        const blink = g.frightened && powerTimer<40 && Math.floor(Date.now()/250)%2===0;
        const col = g.frightened ? (blink?'#fff':'#0000cc') : g.color;
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=8;
        ctx.beginPath();
        ctx.arc(gx,gy-CELL*.28,CELL*.44,Math.PI,0);
        ctx.lineTo(gx+CELL*.44,gy+CELL*.2);
        for(let w=0;w<3;w++){
          const wx1=gx+CELL*.44-(w*CELL*.88/3);
          const wx2=gx+CELL*.44-((w+.5)*CELL*.88/3);
          ctx.quadraticCurveTo(wx1-CELL*.14,gy+CELL*.38,wx2,gy+CELL*.2);
        }
        ctx.closePath(); ctx.fill();
        if (g.frightened) {
          ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.shadowBlur=0;
          [-.13,.13].forEach(ox=>{
            ctx.beginPath(); ctx.moveTo(gx+ox*CELL-2,gy-CELL*.33); ctx.lineTo(gx+ox*CELL+2,gy-CELL*.22); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(gx+ox*CELL+2,gy-CELL*.33); ctx.lineTo(gx+ox*CELL-2,gy-CELL*.22); ctx.stroke();
          });
        } else {
          ctx.shadowBlur=0;
          [-.13,.13].forEach(ox=>{
            ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(gx+ox*CELL,gy-CELL*.28,3.2,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='#00f'; ctx.beginPath(); ctx.arc(gx+ox*CELL+.8,gy-CELL*.28,1.8,0,Math.PI*2); ctx.fill();
          });
        }
        ctx.shadowBlur=0;
      });

      // Pac-Man
      const px=pac.x*CELL+CELL/2, py=pac.y*CELL+CELL/2;
      const ang=(pac.dx===0&&pac.dy===0)?0:Math.atan2(pac.dy,pac.dx);
      pac.mA += 0.05*pac.mDir;
      if(pac.mA>0.35||pac.mA<0.02) pac.mDir*=-1;
      const mA=pac.mA*Math.PI;
      ctx.fillStyle='#ffe44e'; ctx.shadowColor='#ffe44e'; ctx.shadowBlur=14;
      ctx.beginPath(); ctx.moveTo(px,py);
      ctx.arc(px,py,CELL/2-1,ang+mA,ang+Math.PI*2-mA); ctx.closePath(); ctx.fill();
      ctx.shadowBlur=0;
    }

    function gameOver() {
      running=false; gameEnded=true; cancelAnimationFrame(rafId);
      if(window.PW){ window.PW.sound.stopBgm(); window.PW.sound.gameOverSfx(); }
      msgEl.textContent=`GAME OVER — SCORE ${score}`; msgEl.style.color='#ff3c3c';
      if (window.PixelWave && window.PixelWave.submitScore) window.PixelWave.submitScore(score);
      if (window.PixelWave && window.PixelWave.submitScoreAnon) window.PixelWave.submitScoreAnon(score);
      syncPlayBtn();
    }

    function updateUI() {
      document.getElementById('scoreEl').textContent=score;
      document.getElementById('bestEl').textContent=best;
      document.getElementById('livesEl').textContent='🟡'.repeat(Math.max(0,lives));
      document.getElementById('levelEl').textContent=level;
    }

    var playBtn=document.getElementById('playBtn');
    function syncPlayBtn(){
      if(!playBtn)return;
      if(running){ playBtn.style.display='none'; }
      else { playBtn.style.display=''; playBtn.textContent=gameEnded?'↺ REJOUER':'▶ JOUER'; }
    }

    function init() {
      map=BASE_MAP.map(r=>[...r]);
      score=0; lives=3; level=1; powered=false; powerTimer=0;
      running=false; gameEnded=false; pacAcc=0; ghostAcc=0; scatterTimer=0; scatterMode=false;
      best=parseInt(localStorage.getItem('pacBest')||'0');
      cancelAnimationFrame(rafId);

      pac={x:PAC_START.x,y:PAC_START.y,dx:0,dy:0,ndx:1,ndy:0,mA:.25,mDir:1};

      ghosts = GHOST_COLORS.map((c,i)=>({
        x:G_SPAWNS[i].x, y:G_SPAWNS[i].y,
        dx:0,dy:0, color:c, frightened:false, dead:false,
        idx:i, exitDelay: i*15
      }));

      updateUI(); draw();
      msgEl.textContent='APPUIE SUR JOUER !'; msgEl.style.color='';
      if(window.PW) window.PW.sound.stopBgm();
      syncPlayBtn();
    }

    playBtn.addEventListener('click',()=>{
      if(running)return;
      if(gameEnded){ running=false; cancelAnimationFrame(rafId); init(); }
      running=true; gameEnded=false;
      lastTs=performance.now(); pacAcc=0; ghostAcc=0;
      msgEl.textContent='';
      if(window.PW){ window.PW.sound.stopBgm(); window.PW.sound.startBgm('pacman'); }
      syncPlayBtn();
      rafId=requestAnimationFrame(loop);
    });

    const KM={ArrowUp:'U',w:'U',ArrowDown:'D',s:'D',ArrowLeft:'L',a:'L',ArrowRight:'R',d:'R'};
    const DM={U:{dx:0,dy:-1},D:{dx:0,dy:1},L:{dx:-1,dy:0},R:{dx:1,dy:0}};
    function sd(k){pac.ndx=DM[k].dx;pac.ndy=DM[k].dy;}
    document.addEventListener('keydown',e=>{const k=KM[e.key];if(!k)return;e.preventDefault();sd(k);});
    document.getElementById('dUp').addEventListener('click',()=>sd('U'));
    document.getElementById('dDown').addEventListener('click',()=>sd('D'));
    document.getElementById('dLeft').addEventListener('click',()=>sd('L'));
    document.getElementById('dRight').addEventListener('click',()=>sd('R'));

    let tx=0,ty=0;
    canvas.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
    canvas.addEventListener('touchend',e=>{
      const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
      if(Math.abs(dx)>Math.abs(dy))sd(dx>0?'R':'L'); else sd(dy>0?'D':'U');
    },{passive:true});

    setInterval(()=>{if(!running)draw();},100);
    init();

    window.PixelWave.initPause({
      isRunning: function(){ return !!running; },
      pause: function(){
        _wasRunningBeforePause = running;
        running = false;
        cancelAnimationFrame(rafId);
      },
      resume: function(){
        if (!_wasRunningBeforePause) return;
        running = true;
        lastTs = performance.now();
        pacAcc = 0;
        ghostAcc = 0;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(loop);
      }
    });
  })();

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('pwPlaySurface', 'fsBtn');
      window.PixelWave.init('pacman', '#ffe44e');
      (function(){
        var mb=document.getElementById('muteBtn'); if(!mb) return;
        function sync(){ var m=window.PW&&window.PW.sound.isMuted(); mb.textContent=m?'🔇':'🔊'; mb.classList.toggle('muted',!!m); }
        mb.addEventListener('click',function(){ if(window.PW) window.PW.sound.toggleMute(); sync(); });
        sync();
      })();

      // Popup pseudo à chaque clic sur Jouer (si pas encore de pseudo)
      var _btn = document.getElementById('playBtn');
      if (_btn) {
        _btn.addEventListener('click', function(e) {
          if (!localStorage.getItem('pw_pseudo')) {
            e.stopImmediatePropagation();
            e.preventDefault();
            window.PixelWave.promptPseudo('pacman', function() {
              // Relancer le clic après validation
              setTimeout(function() { _btn.click(); }, 50);
            });
          }
        }, true); // capture phase
      }
    });
