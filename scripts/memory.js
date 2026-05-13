// Appliquer le thème sauvegardé immédiatement
    (function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

(function(){
    const EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🦁',
                    '🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦉','🦋',
                    '🐢','🦎','🐍','🐬','🐳','🦈','🐙','🦑','🦀','🐡'];

    const DIFFS = {
      easy:   { cols:4, rows:4, gridClass:'g4' },
      medium: { cols:5, rows:4, gridClass:'g5' },
      hard:   { cols:6, rows:5, gridClass:'g6' },
    };

    let diff='easy', cards=[], flipped=[], matched=0, moves=0;
    let running=false, startTime=0, timerInt=null, locked=false;
    let totalPairs=0;

    const grid  = document.getElementById('cardGrid');
    const msgEl = document.getElementById('msgEl');

    function buildDeck(d) {
      const n = (d.cols * d.rows) / 2;
      const pool = EMOJIS.slice(0, n);
      const deck = [...pool, ...pool];
      for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
      return deck;
    }

    function render(d) {
      totalPairs = (d.cols * d.rows) / 2;
      const deck = buildDeck(d);
      grid.className = 'card-grid ' + d.gridClass;
      grid.innerHTML = '';
      cards = deck.map((emoji, i) => {
        const el = document.createElement('div');
        el.className = 'mem-card';
        el.dataset.emoji = emoji;
        el.dataset.idx   = i;
        el.innerHTML = `
          <div class="card-face card-back">🎴</div>
          <div class="card-face card-front">${emoji}</div>
        `;
        el.addEventListener('click', () => flip(el));
        grid.appendChild(el);
        return el;
      });
      matched=0; moves=0; flipped=[];
      document.getElementById('pairsEl').textContent = '0/' + totalPairs;
      document.getElementById('movesEl').textContent = '0';
    }

    function flip(el) {
      if (!running || locked) return;
      if (el.classList.contains('flipped') || el.classList.contains('matched')) return;
      if (window.PW) window.PW.sound.flip();
      el.classList.add('flipped');
      flipped.push(el);
      if (flipped.length === 2) check();
    }

    function check() {
      locked = true;
      moves++;
      document.getElementById('movesEl').textContent = moves;
      const [a, b] = flipped;
        if (a.dataset.emoji === b.dataset.emoji) {
        if (window.PW) window.PW.sound.bonus();
        a.classList.add('matched'); b.classList.add('matched');
        matched++;
        document.getElementById('pairsEl').textContent = matched + '/' + totalPairs;
        flipped = []; locked = false;
        if (matched === totalPairs) win();
      } else {
        if (window.PW) window.PW.sound.wrong();
        setTimeout(() => {
          a.classList.remove('flipped'); b.classList.remove('flipped');
          flipped = []; locked = false;
        }, 900);
      }
    }

    function win() {
      running = false;
      clearInterval(timerInt);
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.win();
      }
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      // Score: base 10000 - (moves * 50) - (elapsed * 10), min 100
      const score = Math.max(100, 10000 - moves * 50 - elapsed * 10);
      msgEl.textContent = `GAGNÉ ! ${moves} essais · ${elapsed}s · SCORE ${score}`;
      msgEl.style.color = '#00ff88';

      // Save best (lowest moves)
      const bestKey = 'memBest_' + diff;
      const prev = parseInt(localStorage.getItem(bestKey) || '9999');
      if (moves < prev) { localStorage.setItem(bestKey, moves); }
      updateBest();

      if (window.PixelWave && window.PixelWave.submitScore) window.PixelWave.submitScore(score);
    }

    function updateBest() {
      const b = localStorage.getItem('memBest_' + diff);
      document.getElementById('bestEl').textContent = b ? b + ' essais' : '—';
    }

    document.getElementById('startBtn').addEventListener('click', () => {
      if (running) return;
      running = true; locked = false; moves = 0; matched = 0; flipped = [];
      msgEl.textContent = ''; msgEl.style.color = '';
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.startBgm('memory');
      }
      render(DIFFS[diff]);
      startTime = Date.now();
      clearInterval(timerInt);
      timerInt = setInterval(() => {
        document.getElementById('timerEl').textContent = Math.round((Date.now()-startTime)/1000) + 's';
      }, 1000);
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      running = false; clearInterval(timerInt);
      if (window.PW) window.PW.sound.stopBgm();
      render(DIFFS[diff]);
      msgEl.textContent = 'APPUIE SUR START !'; msgEl.style.color = '';
      document.getElementById('timerEl').textContent = '0s';
    });

    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        diff = btn.dataset.diff;
        running = false; clearInterval(timerInt);
        if (window.PW) window.PW.sound.stopBgm();
        render(DIFFS[diff]);
        updateBest();
        msgEl.textContent = 'APPUIE SUR START !'; msgEl.style.color = '';
        document.getElementById('timerEl').textContent = '0s';
      });
    });

    render(DIFFS[diff]);
    updateBest();
  })();

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('cardGrid', 'fsBtn');
      window.PixelWave.init('memory', '#ff3cac');
      window.PixelWave.initPause({
        isRunning: function(){ return !!running; },
        pause: function(){ running = false; clearInterval(timerInt); },
        resume: function(){
          // Reprendre uniquement si une partie était en cours (timer lancé)
          if (!startTime) return;
          running = true;
          clearInterval(timerInt);
          timerInt = setInterval(() => {
            document.getElementById('timerEl').textContent = Math.round((Date.now()-startTime)/1000) + 's';
          }, 1000);
        }
      });
      (function(){
        var mb=document.getElementById('muteBtn'); if(!mb) return;
        function sync(){ var m=window.PW&&window.PW.sound.isMuted(); mb.textContent=m?'🔇':'🔊'; mb.classList.toggle('muted',!!m); }
        mb.addEventListener('click',function(){ if(window.PW) window.PW.sound.toggleMute(); sync(); });
        sync();
      })();

      // Popup pseudo à chaque clic sur Jouer (si pas encore de pseudo)
      var _btn = document.getElementById('startBtn');
      if (_btn) {
        _btn.addEventListener('click', function(e) {
          if (!localStorage.getItem('pw_pseudo')) {
            e.stopImmediatePropagation();
            e.preventDefault();
            window.PixelWave.promptPseudo('memory', function() {
              // Relancer le clic après validation
              setTimeout(function() { _btn.click(); }, 50);
            });
          }
        }, true); // capture phase
      }
    });
