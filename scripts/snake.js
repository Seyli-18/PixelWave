(function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

/* =====================
       SNAKE — game.js
       ===================== */

    const CELL  = 20;
    const COLS  = 20;
    const ROWS  = 20;

    const canvas = document.getElementById('gameCanvas');
    const ctx    = canvas.getContext('2d');

    const scoreEl = document.getElementById('score');
    const bestEl  = document.getElementById('bestScore');
    const levelEl = document.getElementById('level');
    const msgEl   = document.getElementById('msg');

    let snake, dir, nextDir, food, score, level, best, running, gameEnded, loop;
    let paused = false;

    function init() {
      snake   = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir     = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      score   = 0;
      level   = 1;
      best    = parseInt(localStorage.getItem('snakeBest') || '0');
      running = false;
      gameEnded = false;
      placeFood();
      updateUI();
      drawFrame();
      if (window.PW) window.PW.sound.stopBgm();
      syncPlayBtn();
    }

    function placeFood() {
      do {
        food = {
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * ROWS)
        };
      } while (snake.some(s => s.x === food.x && s.y === food.y));
    }

    function speed() { return Math.max(80, 220 - (level - 1) * 20); }

    /* ── Draw ── */
    function drawFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid lines (faint)
      ctx.strokeStyle = 'rgba(0,255,136,.06)';
      ctx.lineWidth = .5;
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, canvas.height); ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(canvas.width, y * CELL); ctx.stroke();
      }

      // Food
      ctx.fillStyle = '#ff3cac';
      ctx.shadowColor = '#ff3cac';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Snake
      snake.forEach((seg, i) => {
        const ratio = i / snake.length;
        ctx.fillStyle = i === 0
          ? '#00ff88'
          : `rgba(0,${Math.round(200 - ratio * 100)},${Math.round(130 - ratio * 60)},${1 - ratio * .5})`;
        ctx.shadowColor = i === 0 ? '#00ff88' : 'transparent';
        ctx.shadowBlur  = i === 0 ? 12 : 0;
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
      });
      ctx.shadowBlur = 0;
    }

    /* ── Tick ── */
    function tick() {
      if (paused) return;
      dir = { ...nextDir };
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      // Wall collision
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return gameOver();
      // Self collision
      if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        score += 10 * level;
        if (score > best) { best = score; localStorage.setItem('snakeBest', best); }
        if (snake.length % 5 === 0) {
          level++;
          if (window.PW) window.PW.sound.levelUp();
        } else if (window.PW) {
          window.PW.sound.bonus();
        }
        placeFood();
        clearInterval(loop);
        loop = setInterval(tick, speed());
      } else {
        snake.pop();
      }

      updateUI();
      drawFrame();
    }

    function updateUI() {
      scoreEl.textContent = score;
      bestEl.textContent  = best;
      levelEl.textContent = level;
    }

    var playBtn = document.getElementById('playBtn');
    function syncPlayBtn() {
      if (!playBtn) return;
      if (running) {
        playBtn.style.display = 'none';
      } else {
        playBtn.style.display = '';
        playBtn.textContent = gameEnded ? '↺ REJOUER' : '▶ JOUER';
      }
    }

    function gameOver() {
      running = false;
      clearInterval(loop);
      gameEnded = true;
      paused = false;
      if(window.PW){ window.PW.sound.stopBgm(); window.PW.sound.gameOverSfx(); }
      msgEl.textContent = `GAME OVER — SCORE ${score} — APPUIE SUR REJOUER`;
      msgEl.style.color = '#ff3cac';
      if (window.PixelWave && window.PixelWave.submitScore) window.PixelWave.submitScore(score);
      if (window.PixelWave && window.PixelWave.submitScoreAnon) window.PixelWave.submitScoreAnon(score);
      syncPlayBtn();
    }

    /* ── Controls ── */
    playBtn.addEventListener('click', () => {
      if (running) return;
      if (gameEnded) {
        clearInterval(loop);
        init();
        msgEl.textContent = 'APPUIE SUR JOUER !';
        msgEl.style.color = '';
      }
      running = true;
      paused = false;
      gameEnded = false;
      msgEl.textContent = '';
      msgEl.style.color = '';
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.startBgm('snake');
      }
      loop = setInterval(tick, speed());
      syncPlayBtn();
    });

    const keyMap = {
      ArrowUp:    { x: 0, y: -1 }, w: { x: 0, y: -1 },
      ArrowDown:  { x: 0, y: 1  }, s: { x: 0, y: 1  },
      ArrowLeft:  { x: -1, y: 0 }, a: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0  }, d: { x: 1,  y: 0 },
    };

    document.addEventListener('keydown', e => {
      const d = keyMap[e.key];
      if (!d) return;
      e.preventDefault();
      if (d.x !== -dir.x || d.y !== -dir.y) nextDir = d;
    });

    // D-pad
    document.getElementById('up').addEventListener('click',    () => { if (dir.y !== 1)  nextDir = { x:0,  y:-1 }; });
    document.getElementById('down').addEventListener('click',  () => { if (dir.y !== -1) nextDir = { x:0,  y:1  }; });
    document.getElementById('left').addEventListener('click',  () => { if (dir.x !== 1)  nextDir = { x:-1, y:0  }; });
    document.getElementById('right').addEventListener('click', () => { if (dir.x !== -1) nextDir = { x:1,  y:0  }; });

    // Touch swipe
    let tx = 0, ty = 0;
    canvas.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > Math.abs(dy)) {
        nextDir = dx > 0 ? { x:1, y:0 } : { x:-1, y:0 };
      } else {
        nextDir = dy > 0 ? { x:0, y:1 } : { x:0, y:-1 };
      }
    }, { passive: true });

    init();
    syncPlayBtn();

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('gameStage', 'fsBtn');
      window.PixelWave.init('snake', '#00ff88');
      // Pause (bouton en haut à gauche)
      window.PixelWave.initPause({
        isRunning: function(){ return true; },
        pause: function(){
          if (!running) return;
          paused = true;
          clearInterval(loop);
        },
        resume: function(){
          if (!running) return;
          paused = false;
          clearInterval(loop);
          loop = setInterval(tick, speed());
        }
      });
      // Bouton mute
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
            window.PixelWave.promptPseudo('snake', function() {
              // Relancer le clic après validation
              setTimeout(function() { _btn.click(); }, 50);
            });
          }
        }, true); // capture phase
      }
    });
