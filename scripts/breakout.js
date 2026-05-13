(function () {
  var theme = localStorage.getItem('pw_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
})();

window.addEventListener('DOMContentLoaded', function () {
  window.PixelWave.initFullscreen('pwPlaySurface', 'fsBtn');
  window.PixelWave.init('breakout', '#ff6b35');

  (function () {
    var muteBtn = document.getElementById('muteBtn');
    if (!muteBtn) {
      return;
    }

    function syncMuteButton() {
      var muted = window.PW && window.PW.sound.isMuted();
      muteBtn.textContent = muted ? '🔇' : '🔊';
      muteBtn.classList.toggle('muted', !!muted);
    }

    muteBtn.addEventListener('click', function () {
      if (window.PW) {
        window.PW.sound.toggleMute();
      }
      syncMuteButton();
    });

    syncMuteButton();
  })();

  var outerPlayBtn = document.getElementById('playBtn');
  if (outerPlayBtn) {
    outerPlayBtn.addEventListener('click', function (e) {
      if (!localStorage.getItem('pw_pseudo')) {
        e.stopImmediatePropagation();
        e.preventDefault();
        window.PixelWave.promptPseudo('breakout', function () {
          setTimeout(function () { outerPlayBtn.click(); }, 50);
        });
      }
    }, true);
  }

  (function () {
    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var msgEl = document.getElementById('msgEl');
    var W = canvas.width;
    var H = canvas.height;

    var PAD_W = 70;
    var PAD_H = 10;
    var PAD_Y = H - 40;
    var BALL_R = 7;
    var BRICK_COLS = 9;
    var BRICK_ROWS = 6;
    var BRICK_W = Math.floor((W - 20) / BRICK_COLS) - 4;
    var BRICK_H = 16;
    var BRICK_PAD = 4;
    var BRICK_OFFSET_X = 10;
    var BRICK_OFFSET_Y = 50;

    var ROW_COLORS = ['#ff3c3c', '#ff6b35', '#ffe44e', '#00ff88', '#00f0ff', '#b44fff'];
    var ROW_PTS = [7, 6, 5, 4, 3, 2];

    var bricks;
    var ball;
    var padX;
    var lives;
    var score;
    var best;
    var level;
    var running;
    var gameEnded;
    var rafId;
    var lastTs;
    var mouseX = -1;

    function initBricks() {
      bricks = [];
      for (var r = 0; r < BRICK_ROWS; r++) {
        for (var c = 0; c < BRICK_COLS; c++) {
          bricks.push({
            x: BRICK_OFFSET_X + c * (BRICK_W + BRICK_PAD),
            y: BRICK_OFFSET_Y + r * (BRICK_H + BRICK_PAD),
            w: BRICK_W,
            h: BRICK_H,
            color: ROW_COLORS[r],
            pts: ROW_PTS[r] * level,
            alive: true,
            hits: r < 2 ? 2 : 1
          });
        }
      }
    }

    function resetBall() {
      var baseSpeed = 3.5 + (level - 1) * 0.4;
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
      ball = {
        x: W / 2,
        y: PAD_Y - BALL_R - 5,
        dx: Math.cos(angle) * baseSpeed,
        dy: Math.sin(angle) * baseSpeed,
        r: BALL_R,
        trail: []
      };
    }

    var playBtn = document.getElementById('playBtn');

    function syncPlayBtn() {
      if (!playBtn) {
        return;
      }
      if (running) {
        playBtn.style.display = 'none';
      } else {
        playBtn.style.display = '';
        playBtn.textContent = gameEnded ? '↺ REJOUER' : '▶ JOUER';
      }
    }

    function init() {
      lives = 3;
      score = 0;
      level = 1;
      best = parseInt(localStorage.getItem('breakBest') || '0', 10);
      padX = W / 2;
      running = false;
      gameEnded = false;
      cancelAnimationFrame(rafId);
      initBricks();
      resetBall();
      updateUI();
      draw();
      msgEl.textContent = 'APPUIE SUR JOUER !';
      msgEl.style.color = '';
      if (window.PW) window.PW.sound.stopBgm();
      syncPlayBtn();
    }

    function updateUI() {
      document.getElementById('scoreEl').textContent = score;
      document.getElementById('bestEl').textContent = best;
      document.getElementById('livesEl').textContent = '❤️'.repeat(Math.max(0, lives));
      document.getElementById('levelEl').textContent = level;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = '#0a0a2a';
      ctx.lineWidth = 0.5;
      for (var gx = 0; gx < W; gx += 20) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (var gy = 0; gy < H; gy += 20) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      bricks.forEach(function (b) {
        if (!b.alive) {
          return;
        }
        ctx.fillStyle = b.hits === 2 ? '#fff' : b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 4);
        ctx.shadowBlur = 0;
      });

      ball.trail.forEach(function (t, i) {
        var a = (i / ball.trail.length) * 0.4;
        ctx.fillStyle = 'rgba(255,107,53,' + a + ')';
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.r * (i / ball.trail.length), 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#ff6b35';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      var px = padX - PAD_W / 2;
      ctx.fillStyle = '#ff6b35';
      ctx.shadowColor = '#ff6b35';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(px, PAD_Y, PAD_W, PAD_H, 5);
      } else {
        ctx.rect(px, PAD_Y, PAD_W, PAD_H);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.fillRect(px + 4, PAD_Y + 2, PAD_W - 8, 3);
    }

    function step() {
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 8) {
        ball.trail.shift();
      }

      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.x - ball.r < 0) {
        ball.x = ball.r;
        ball.dx = Math.abs(ball.dx);
      }
      if (ball.x + ball.r > W) {
        ball.x = W - ball.r;
        ball.dx = -Math.abs(ball.dx);
      }
      if (ball.y - ball.r < 0) {
        ball.y = ball.r;
        ball.dy = Math.abs(ball.dy);
      }

      if (ball.y - ball.r > H) {
        lives--;
        updateUI();
        if (lives <= 0) {
          gameOver();
          return;
        }
        resetBall();
        if (window.PW) {
          window.PW.sound.die();
        }
        msgEl.textContent = 'AÏÏE !';
        msgEl.style.color = '#ff3c3c';
        setTimeout(function () {
          msgEl.textContent = '';
          msgEl.style.color = '';
        }, 1000);
      }

      var px = padX - PAD_W / 2;
      if (ball.y + ball.r >= PAD_Y && ball.y + ball.r <= PAD_Y + PAD_H + ball.r &&
        ball.x >= px - ball.r && ball.x <= px + PAD_W + ball.r && ball.dy > 0) {
        var rel = (ball.x - (px + PAD_W / 2)) / (PAD_W / 2);
        var angle = -Math.PI / 2 + rel * (Math.PI / 3);
        var spd = Math.hypot(ball.dx, ball.dy);
        ball.dx = Math.cos(angle) * spd;
        ball.dy = Math.sin(angle) * spd;
        ball.y = PAD_Y - ball.r;
        if (window.PW) {
          window.PW.sound.bounce();
        }
      }

      var allDead = true;
      bricks.forEach(function (b) {
        if (!b.alive) {
          return;
        }
        allDead = false;

        var overlapX = ball.x > b.x - ball.r && ball.x < b.x + b.w + ball.r;
        var overlapY = ball.y > b.y - ball.r && ball.y < b.y + b.h + ball.r;
        if (!overlapX || !overlapY) {
          return;
        }

        var fromLeft = Math.abs(ball.x - (b.x - ball.r));
        var fromRight = Math.abs(ball.x - (b.x + b.w + ball.r));
        var fromTop = Math.abs(ball.y - (b.y - ball.r));
        var fromBottom = Math.abs(ball.y - (b.y + b.h + ball.r));
        var minD = Math.min(fromLeft, fromRight, fromTop, fromBottom);

        b.hits--;
        if (b.hits <= 0) {
          b.alive = false;
          score += b.pts;
          if (window.PW) {
            window.PW.sound.hit();
          }
          if (score > best) {
            best = score;
            localStorage.setItem('breakBest', best);
          }
        }
        updateUI();

        if (minD === fromLeft || minD === fromRight) {
          ball.dx *= -1;
        } else {
          ball.dy *= -1;
        }
      });

      if (allDead) {
        level++;
        initBricks();
        resetBall();
        if (window.PW) {
          window.PW.sound.levelUp();
        }
        msgEl.textContent = '🎉 NIVEAU ' + level + ' !';
        setTimeout(function () {
          msgEl.textContent = '';
        }, 1500);
        updateUI();
      }
    }

    function loop(ts) {
      if (!running) {
        return;
      }
      rafId = requestAnimationFrame(loop);
      if (mouseX > 0) {
        var target = Math.max(PAD_W / 2, Math.min(W - PAD_W / 2, mouseX));
        padX += (target - padX) * 0.18;
      }
      step(ts - lastTs);
      lastTs = ts;
      draw();
    }

    function gameOver() {
      running = false;
      gameEnded = true;
      cancelAnimationFrame(rafId);
      if (window.PW) {
        window.PW.sound.die();
      }
      msgEl.textContent = 'GAME OVER — SCORE ' + score;
      msgEl.style.color = '#ff3c3c';
      if (window.PixelWave && window.PixelWave.submitScore) {
        window.PixelWave.submitScore(score);
      }
      if (window.PixelWave && window.PixelWave.submitScoreAnon) {
        window.PixelWave.submitScoreAnon(score);
      }
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.gameOverSfx();
      }
      syncPlayBtn();
    }

    playBtn.addEventListener('click', function () {
      if (running) {
        return;
      }
      if (gameEnded) {
        cancelAnimationFrame(rafId);
        init();
      }
      running = true;
      gameEnded = false;
      lastTs = performance.now();
      msgEl.textContent = '';
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.startBgm('breakout');
      }
      syncPlayBtn();
      rafId = requestAnimationFrame(loop);
    });

    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouseX = (e.clientX - r.left) * (W / r.width);
    });

    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var r = canvas.getBoundingClientRect();
      mouseX = (e.touches[0].clientX - r.left) * (W / r.width);
    }, { passive: false });

    var slider = document.getElementById('paddleSlider');
    slider.addEventListener('input', function () {
      mouseX = (slider.value / 100) * W;
    });

    setInterval(function () {
      if (!running) {
        draw();
      }
    }, 100);

    var _pauseWasRunning = false;
    if (window.PixelWave && window.PixelWave.initPause) {
      window.PixelWave.initPause({
        isRunning: function () { return !!running; },
        pause: function () {
          _pauseWasRunning = running;
          running = false;
          cancelAnimationFrame(rafId);
        },
        resume: function () {
          if (!_pauseWasRunning) return;
          running = true;
          lastTs = performance.now();
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(loop);
        }
      });
    }

    init();
  })();
});
