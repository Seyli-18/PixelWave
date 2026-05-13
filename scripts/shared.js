/* ============================================================
   PIXELWAVE — shared.js  v5
   • Plein écran VRAI sur iOS/iPad Safari (CSS position:fixed)
     car iOS ne supporte pas l'API Fullscreen API
   • Popup pseudo à chaque clic "Jouer" si pas encore de pseudo
   • Player 1, Player 2… sans doublon
   • submitScore unique (plus de doublon)
   • Thème sombre / clair
   • Stats personnelles par jeu
   ============================================================ */

(function () {
  'use strict';
  window.PixelWave = window.PixelWave || {};

  /* ─── localStorage ─── */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch(e) { return d; } }
  function lsSave(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }

  /* ══════════════════════════════════════════
     THÈME
  ══════════════════════════════════════════ */
  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    lsSave('pw_theme', dark ? 'dark' : 'light');
  }
  // Appliquer dès le chargement
  applyTheme(lsGet('pw_theme', 'dark') !== 'light');

  window.PixelWave.toggleTheme = function () {
    var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    applyTheme(!isDark);
    document.querySelectorAll('.theme-toggle-btn').forEach(function(b) {
      b.textContent = isDark ? '☀️' : '🌙';
    });
  };

  /* ══════════════════════════════════════════
     PLEIN ÉCRAN — compatible iOS Safari / iPad

     iOS Safari NE supporte PAS requestFullscreen().
     Solution : on overlay l'élément en position:fixed
     qui couvre tout l'écran, et on injecte un style
     pour empêcher le scroll de la page derrière.

     Sur Android Chrome / Desktop, on utilise l'API native.
  ══════════════════════════════════════════ */

  // Inject global fullscreen CSS once
  (function() {
    var s = document.createElement('style');
    s.id = 'pw-fs-style';
    s.textContent = [
      /* Quand la page entière est en "faux" plein écran iOS */
      'body.pw-fs-active { overflow: hidden !important; }',

      /* L'élément en plein écran CSS (iOS) */
      '.pw-fs-elem {',
      '  position: fixed !important;',
      '  top: 0 !important; left: 0 !important;',
      '  width: 100vw !important; height: 100vh !important;',
      '  width: 100dvw !important; height: 100dvh !important;',
      '  z-index: 9998 !important;',
      '  border-radius: 0 !important;',
      '  border: none !important;',
      '  background: #000 !important;',
      '  overflow: auto !important;',
      '  -webkit-overflow-scrolling: touch;',
      '  overscroll-behavior: contain;',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  gap: 0.75rem !important;',
      '  padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)) !important;',
      '  box-sizing: border-box !important;',
      '}',

      '.pw-fs-elem .play-zone { flex-wrap: wrap !important; justify-content: center !important; }',

      /* Canvas dans l'élément plein écran */
      '.pw-fs-elem canvas {',
      '  max-width: min(100vw, 100%) !important;',
      '  max-height: min(82dvh, 82vh, 100%) !important;',
      '  width: auto !important;',
      '  height: auto !important;',
      '  object-fit: contain !important;',
      '  flex-shrink: 0 !important;',
      '}',

      '.pw-fs-elem #boardWrap, .pw-fs-elem #quizArea, .pw-fs-elem #gameWrap, .pw-fs-elem #pwPlaySurface, .pw-fs-elem #cardGrid {',
      '  max-width: min(100vw - 24px, 100%) !important;',
      '  max-height: min(82dvh, 82vh) !important;',
      '  overflow: auto;',
      '}',

      '.pw-fs-elem #board { transform-origin: center center; }',

      /* Bouton plein écran flottant quand actif (iOS) */
      '#pw-fs-exit-btn {',
      '  position: fixed;',
      '  top: 10px; right: 10px;',
      '  z-index: 10003;',
      '  font-family: "Press Start 2P", monospace;',
      '  font-size: .45rem;',
      '  letter-spacing: 1px;',
      '  padding: .5rem .9rem;',
      '  background: rgba(0,0,0,.7);',
      '  color: #fff;',
      '  border: 1px solid rgba(255,255,255,.3);',
      '  border-radius: 6px;',
      '  cursor: pointer;',
      '  backdrop-filter: blur(4px);',
      '  -webkit-backdrop-filter: blur(4px);',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  })();

  /** Réancrage pause / overlay après plein écran ou resize layout */
  function dispatchPwLayout() {
    try { document.dispatchEvent(new CustomEvent('pw:layout')); } catch (e) {}
  }

  window.PixelWave.initFullscreen = function(elementId, btnId) {
    var el  = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    var btn = typeof btnId     === 'string' ? document.getElementById(btnId)     : btnId;
    if (!el || !btn) return;

    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
             || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isCoarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    var hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    /* Plein écran natif + canvas / div = souvent bugué sur tactile ; on force le mode CSS. */
    var allowNativeFs = !isIOS && !hasTouch && !isCoarsePointer;

    var hasNativeFS = allowNativeFs && !!(
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen
    );

    var cssFSActive = false;
    var exitBtn = null;
    var scrollYBefore = 0;
    var lockTouchMove = null;
    var lockWheel = null;

    function setBtnState(active) {
      btn.textContent = active ? '⛶ QUITTER' : '⛶ PLEIN ÉCRAN';
    }

    function activeNativeElement() {
      return document.fullscreenElement ||
             document.webkitFullscreenElement ||
             document.mozFullScreenElement ||
             document.msFullscreenElement ||
             null;
    }

    function isActive() {
      if (cssFSActive) return true;
      return activeNativeElement() === el;
    }

    function blockPageScroll(e) {
      if (!cssFSActive) return;
      if (!el.contains(e.target)) e.preventDefault();
    }

    function blockWheel(e) {
      if (cssFSActive) e.preventDefault();
    }

    function onEsc(e) {
      if (e.key === 'Escape' && cssFSActive) exitCSS();
    }

    function cleanupLocks() {
      if (lockTouchMove) {
        document.removeEventListener('touchmove', lockTouchMove);
        lockTouchMove = null;
      }
      if (lockWheel) {
        document.removeEventListener('wheel', lockWheel, true);
        lockWheel = null;
      }
      document.removeEventListener('keydown', onEsc);
    }

    function enterCSS() {
      if (cssFSActive) return;
      cssFSActive = true;
      scrollYBefore = window.scrollY || window.pageYOffset || 0;

      el.classList.add('pw-fs-elem');
      document.body.classList.add('pw-fs-active');

      exitBtn = document.createElement('button');
      exitBtn.id = 'pw-fs-exit-btn';
      exitBtn.textContent = '✕ QUITTER';
      exitBtn.addEventListener('click', function(ev) {
        ev.preventDefault();
        exitCSS();
      });
      document.body.appendChild(exitBtn);

      lockTouchMove = blockPageScroll;
      lockWheel = blockWheel;
      document.addEventListener('touchmove', lockTouchMove, { passive: false });
      document.addEventListener('wheel', lockWheel, { passive: false, capture: true });
      document.addEventListener('keydown', onEsc);
      setBtnState(true);
      dispatchPwLayout();
    }

    function exitCSS() {
      if (!cssFSActive) return;
      cssFSActive = false;
      el.classList.remove('pw-fs-elem');
      document.body.classList.remove('pw-fs-active');
      if (exitBtn) {
        exitBtn.remove();
        exitBtn = null;
      }
      cleanupLocks();
      window.scrollTo(0, scrollYBefore);
      setBtnState(false);
      dispatchPwLayout();
    }

    function enterNative() {
      var req = el.requestFullscreen ||
                el.webkitRequestFullscreen ||
                el.mozRequestFullScreen ||
                el.msRequestFullscreen;
      if (!req) {
        enterCSS();
        return;
      }
      var p = req.call(el);
      if (p && typeof p.catch === 'function') {
        p.catch(function() { enterCSS(); });
      }
    }

    function exitNative() {
      var ex = document.exitFullscreen ||
               document.webkitExitFullscreen ||
               document.mozCancelFullScreen ||
               document.msExitFullscreen;
      if (!ex) {
        exitCSS();
        return;
      }
      var p = ex.call(document);
      if (p && typeof p.catch === 'function') p.catch(function(){});
    }

    function toggle(ev) {
      if (ev) ev.preventDefault();
      if (isActive()) {
        if (cssFSActive) exitCSS();
        else exitNative();
      } else if (!hasNativeFS) {
        enterCSS();
      } else {
        enterNative();
      }
    }

    btn.addEventListener('click', toggle);

    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(function(ev) {
      document.addEventListener(ev, function() {
        if (activeNativeElement() !== el) setBtnState(cssFSActive);
        else setBtnState(true);
        dispatchPwLayout();
      });
    });

    var vp = document.querySelector('meta[name=viewport]');
    if (vp) {
      vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
    setBtnState(false);
  };

  /* ══════════════════════════════════════════
     PLAYER N — sans doublon
  ══════════════════════════════════════════ */
  function reserveNextPlayer() {
    var used = lsGet('pw_pnames', []);
    var n = 1;
    while (used.indexOf('Player ' + n) !== -1) n++;
    var name = 'Player ' + n;
    used.push(name);
    lsSave('pw_pnames', used.slice(0, 9999));
    return name;
  }

  /* ══════════════════════════════════════════
     MODAL PSEUDO
  ══════════════════════════════════════════ */
  window.PixelWave.promptPseudo = function(gameId, onDone) {
    var existing = lsGet('pw_pseudo', '');
    if (existing) { if (onDone) onDone(existing); return; }
    _showModal(onDone);
  };

  function _showModal(onDone) {
    // Éviter double modal
    if (document.getElementById('pwModalWrap')) return;

    var autoName = reserveNextPlayer();

    var wrap = document.createElement('div');
    wrap.id = 'pwModalWrap';
    wrap.style.cssText = [
      'position:fixed', 'inset:0', 'background:rgba(0,0,0,.88)',
      'z-index:99999', 'display:flex', 'align-items:center', 'justify-content:center',
      'padding:1rem', 'backdrop-filter:blur(8px)', '-webkit-backdrop-filter:blur(8px)',
      'touch-action:none'
    ].join(';');

    wrap.innerHTML = [
      '<style>',
      '@keyframes pwPop{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}',
      '#pwModalBox{background:#0f0f26;border:2px solid #00f0ff;border-radius:16px;',
      'padding:2rem 1.5rem;max-width:380px;width:100%;text-align:center;',
      'box-shadow:0 0 40px #00f0ff33;animation:pwPop .25s ease;}',
      '#pwModalBox h2{font-family:"Press Start 2P",monospace;font-size:.6rem;color:#00f0ff;',
      'letter-spacing:2px;margin-bottom:.8rem;text-shadow:0 0 12px #00f0ff}',
      '#pwModalBox p{font-family:"Rajdhani",sans-serif;font-size:1rem;color:#7070a0;',
      'line-height:1.6;margin-bottom:1.2rem}',
      '#pwModalBox p b{color:#ffe44e}',
      '#pwNameInput{width:100%;background:#0a0a1a;border:2px solid #1e1e4a;border-radius:8px;',
      'padding:.7rem 1rem;color:#e8e8ff;font-family:"Rajdhani",sans-serif;font-size:1.1rem;',
      'font-weight:700;outline:none;text-align:center;margin-bottom:1rem;',
      'transition:border-color .2s;box-sizing:border-box}',
      '#pwNameInput:focus{border-color:#00f0ff;box-shadow:0 0 12px #00f0ff33}',
      '#pwConfirmBtn{width:100%;font-family:"Press Start 2P",monospace;font-size:.5rem;',
      'letter-spacing:2px;padding:.75rem;border:2px solid #00f0ff;border-radius:8px;',
      'background:transparent;color:#00f0ff;cursor:pointer;transition:all .2s;margin-bottom:.5rem}',
      '#pwConfirmBtn:hover,#pwConfirmBtn:active{background:#00f0ff;color:#000;',
      'box-shadow:0 0 20px #00f0ff}',
      '#pwSkipBtn{background:none;border:none;color:#3a3a60;font-family:"Press Start 2P",monospace;',
      'font-size:.38rem;cursor:pointer;letter-spacing:1px;text-decoration:underline;',
      'padding:.3rem}',
      '#pwSkipBtn:hover{color:#7070a0}',
      '</style>',
      '<div id="pwModalBox">',
      '<div style="font-size:2.5rem;margin-bottom:.5rem">🎮</div>',
      '<h2>CHOISIS TON NOM !</h2>',
      '<p>Ton pseudo apparaîtra dans le leaderboard.<br>Laisse vide pour : <b>' + autoName + '</b></p>',
      '<input id="pwNameInput" type="text" maxlength="20" placeholder="Ton pseudo…" inputmode="text" autocomplete="off"/>',
      '<button id="pwConfirmBtn">CONFIRMER →</button>',
      '<button id="pwSkipBtn">Passer · nom auto</button>',
      '</div>',
    ].join('');

    document.body.appendChild(wrap);
    setTimeout(function(){ var inp = document.getElementById('pwNameInput'); if(inp) inp.focus(); }, 100);

    function done(name) {
      var used = lsGet('pw_pnames', []);
      if (used.indexOf(name) === -1) { used.push(name); lsSave('pw_pnames', used); }
      lsSave('pw_pseudo', name);
      wrap.remove();
      if (onDone) onDone(name);
    }

    document.getElementById('pwConfirmBtn').addEventListener('click', function() {
      var val = (document.getElementById('pwNameInput').value || '').trim();
      done(val || autoName);
    });
    document.getElementById('pwSkipBtn').addEventListener('click', function() { done(autoName); });
    document.getElementById('pwNameInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('pwConfirmBtn').click();
    });

    // Hover style
    var cb = document.getElementById('pwConfirmBtn');
    cb.addEventListener('mouseenter', function(){ cb.style.background='#00f0ff'; cb.style.color='#000'; });
    cb.addEventListener('mouseleave', function(){ cb.style.background='transparent'; cb.style.color='#00f0ff'; });
  }

  /* ══════════════════════════════════════════
     FIREBASE BRIDGE
  ══════════════════════════════════════════ */
  (function() {
    var s = document.createElement('script');
    s.type = 'module';
    s.textContent = [
      "import { saveScore, getTopScores, saveReview, getReviews } from '../scripts/firebase.js';",
      "window._PW_FB = { saveScore, getTopScores, saveReview, getReviews };",
      "document.dispatchEvent(new CustomEvent('pw:fb:ready'));"
    ].join('\n');
    document.head.appendChild(s);
  })();

  function _whenFB(cb) {
    if (window._PW_FB) cb();
    else document.addEventListener('pw:fb:ready', cb, { once: true });
  }

  /* ══════════════════════════════════════════
     MAIN INIT
  ══════════════════════════════════════════ */
  window.PixelWave.init = function(gameId, accentColor) {
    accentColor = accentColor || '#b44fff';

    /* ── Score submit unique ── */
    window.PixelWave.submitScore = function(score) {
      var name = lsGet('pw_pseudo', '');
      if (!name) { name = reserveNextPlayer(); lsSave('pw_pseudo', name); }

      _whenFB(function() {
        window._PW_FB.saveScore(gameId, name, score, '').then(function() {
          renderLB();
        }).catch(function() {
          var k = 'pw_lb_' + gameId;
          var a = lsGet(k, []);
          a.push({ name: name, score: score, ts: Date.now() });
          a.sort(function(x,y){ return y.score - x.score; });
          lsSave(k, a.slice(0, 50));
          renderLB();
        });
      });

      // Stats perso
      var sk = 'pw_stats_' + gameId;
      var sd = lsGet(sk, { plays:0, best:0, total:0 });
      sd.plays++; sd.total += score;
      if (score > sd.best) sd.best = score;
      lsSave(sk, sd);
      _refreshStatUI(sd);
    };

    function _refreshStatUI(sd) {
      var ep = document.getElementById('statPlays'); if(ep) ep.textContent = sd.plays;
      var eb = document.getElementById('statBest');  if(eb) eb.textContent = sd.best.toLocaleString();
      var ea = document.getElementById('statAvg');   if(ea) ea.textContent = (sd.plays>0 ? Math.round(sd.total/sd.plays) : 0).toLocaleString();
    }

    /* ── Build HTML ── */
    var container = document.getElementById('bottomSections');
    if (!container) return;

    var isDark    = document.documentElement.getAttribute('data-theme') !== 'light';
    var themeIcon = isDark ? '☀️' : '🌙';
    var pseudo    = lsGet('pw_pseudo', '');
    var sd        = lsGet('pw_stats_' + gameId, { plays:0, best:0, total:0 });
    var avg       = sd.plays > 0 ? Math.round(sd.total / sd.plays) : 0;

    container.innerHTML = [
      '<div class="section-card">',
        '<div class="player-bar">',
          '<div class="player-bar-left">',
            '<span class="player-avatar">👾</span>',
            '<div class="player-info">',
              '<span class="player-name-disp" id="playerNameDisp">' + _esc(pseudo || '—') + '</span>',
              '<span class="player-name-sub">Pseudo joueur</span>',
            '</div>',
            '<button class="player-edit-btn" id="playerEditBtn">✏️ MODIFIER</button>',
          '</div>',
          '<button class="theme-toggle-btn" onclick="window.PixelWave.toggleTheme()">' + themeIcon + '</button>',
        '</div>',
        '<div class="player-edit-form hidden" id="playerEditForm">',
          '<input type="text" id="playerEditInput" maxlength="20" placeholder="Nouveau pseudo…"/>',
          '<button id="playerEditSave">✓</button>',
        '</div>',
        '<div class="player-stats-row">',
          '<div class="pstat"><span class="pstat-val" id="statPlays">' + sd.plays + '</span><span class="pstat-label">PARTIES</span></div>',
          '<div class="pstat"><span class="pstat-val" id="statBest">'  + sd.best.toLocaleString() + '</span><span class="pstat-label">MEILLEUR</span></div>',
          '<div class="pstat"><span class="pstat-val" id="statAvg">'   + avg.toLocaleString() + '</span><span class="pstat-label">MOYENNE</span></div>',
        '</div>',
      '</div>',

      '<div class="section-card">',
        '<div class="section-header" id="lbHeader">',
          '<span class="section-icon">🏆</span>',
          '<h2 style="color:' + accentColor + '">LEADERBOARD</h2>',
          '<span class="section-toggle open" id="lbToggle">▼</span>',
        '</div>',
        '<div class="section-body open" id="lbBody">',
          '<div class="lb-list" id="lbList"><div class="lb-empty">CHARGEMENT…</div></div>',
        '</div>',
      '</div>',

      '<div class="section-card">',
        '<div class="section-header" id="rvHeader">',
          '<span class="section-icon">⭐</span>',
          '<h2 style="color:' + accentColor + '">AVIS DES JOUEURS</h2>',
          '<span class="section-toggle open" id="rvToggle">▼</span>',
        '</div>',
        '<div class="section-body open" id="rvBody">',
          '<div class="rating-overview">',
            '<div>',
              '<div class="rating-big" id="avgScore">—</div>',
              '<div class="rating-stars-big" id="avgStars">☆☆☆☆☆</div>',
              '<div class="rating-count" id="ratingCount">0 avis</div>',
            '</div>',
            '<div class="rating-bars" id="ratingBars"></div>',
          '</div>',
          '<div class="review-form-title">✏️ LAISSER UN AVIS</div>',
          '<div class="star-picker" id="starPicker">',
            '<span class="star-pick" data-v="1">⭐</span>',
            '<span class="star-pick" data-v="2">⭐</span>',
            '<span class="star-pick" data-v="3">⭐</span>',
            '<span class="star-pick" data-v="4">⭐</span>',
            '<span class="star-pick" data-v="5">⭐</span>',
          '</div>',
          '<div class="review-author-row">',
            '<input type="text" id="reviewAuthor" placeholder="Ton pseudo (optionnel)" maxlength="20" value="' + _esc(pseudo) + '"/>',
          '</div>',
          '<textarea class="review-input" id="reviewText" placeholder="Dis ce que tu penses du jeu…"></textarea>',
          '<button class="submit-review-btn" id="submitReview">PUBLIER →</button>',
          '<div class="review-list" id="reviewList"><div class="lb-empty">CHARGEMENT…</div></div>',
        '</div>',
      '</div>',
    ].join('');

    /* ── Pseudo edit ── */
    document.getElementById('playerEditBtn').addEventListener('click', function() {
      var form = document.getElementById('playerEditForm');
      form.classList.toggle('hidden');
      if (!form.classList.contains('hidden')) {
        var inp = document.getElementById('playerEditInput');
        inp.value = lsGet('pw_pseudo', '');
        inp.focus();
      }
    });
    document.getElementById('playerEditSave').addEventListener('click', function() {
      var val = (document.getElementById('playerEditInput').value || '').trim();
      if (!val) return;
      var used = lsGet('pw_pnames', []);
      if (used.indexOf(val) === -1) { used.push(val); lsSave('pw_pnames', used); }
      lsSave('pw_pseudo', val);
      document.getElementById('playerNameDisp').textContent = val;
      var ra = document.getElementById('reviewAuthor'); if(ra) ra.value = val;
      document.getElementById('playerEditForm').classList.add('hidden');
    });
    document.getElementById('playerEditInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('playerEditSave').click();
    });

    /* ── Collapsibles ── */
    ['lb', 'rv'].forEach(function(id) {
      document.getElementById(id + 'Header').addEventListener('click', function() {
        var b = document.getElementById(id + 'Body');
        var t = document.getElementById(id + 'Toggle');
        var o = b.classList.contains('open');
        b.classList.toggle('open', !o);
        t.classList.toggle('open', !o);
      });
    });

    /* ── Leaderboard ── */
    function _dedup(scores) {
      // Un pseudo → uniquement son meilleur score
      var seen = {};
      (scores || []).forEach(function(s) {
        var key = String(s.name || '').trim().toLowerCase();
        if (!seen[key] || s.score > seen[key].score) {
          seen[key] = s;
        }
      });
      var result = Object.keys(seen).map(function(k) { return seen[k]; });
      result.sort(function(a, b) { return b.score - a.score; });
      return result.slice(0, 10);
    }

    function renderLB() {
      var list = document.getElementById('lbList');
      if (!list) return;
      list.innerHTML = '<div class="lb-empty">CHARGEMENT…</div>';
      var p = window._PW_FB
        ? window._PW_FB.getTopScores(gameId, '')
        : Promise.resolve(_dedup(lsGet('pw_lb_' + gameId, [])));
      p.then(function(scores) {
        // Déduplication côté client aussi (double sécurité)
        scores = _dedup(scores);
        if (!scores || !scores.length) {
          list.innerHTML = '<div class="lb-empty">AUCUN SCORE ENCORE<br>SOIS LE PREMIER !</div>';
          return;
        }
        var rC = ['r1','r2','r3'], rE = ['🥇','🥈','🥉'];
        list.innerHTML = scores.map(function(s, i) {
          return '<div class="lb-row">' +
            '<span class="lb-rank ' + (rC[i]||'rN') + '">' + (rE[i]||'#'+(i+1)) + '</span>' +
            '<span class="lb-name">'  + _esc(s.name)  + '</span>' +
            '<span class="lb-score">' + Number(s.score).toLocaleString() + '</span>' +
            '</div>';
        }).join('');
      }).catch(function() {
        list.innerHTML = '<div class="lb-empty">ERREUR DE CHARGEMENT</div>';
      });
    }

    /* ── Reviews ── */
    var selS = 0;
    document.querySelectorAll('.star-pick').forEach(function(s) {
      s.addEventListener('mouseenter', function(){ _hl(+s.dataset.v); });
      s.addEventListener('mouseleave', function(){ _hl(selS); });
      s.addEventListener('click',      function(){ selS = +s.dataset.v; _hl(selS); });
    });
    function _hl(n) { document.querySelectorAll('.star-pick').forEach(function(s,i){ s.classList.toggle('lit', i<n); }); }

    document.getElementById('submitReview').addEventListener('click', function() {
      var author = (document.getElementById('reviewAuthor').value || '').trim() || lsGet('pw_pseudo','') || 'Joueur';
      var text   = (document.getElementById('reviewText').value || '').trim();
      if (!selS)  { alert('Choisis une note !'); return; }
      if (!text)  { document.getElementById('reviewText').focus(); return; }
      var btn = document.getElementById('submitReview');
      btn.textContent = 'ENVOI…'; btn.disabled = true;
      var p = window._PW_FB
        ? window._PW_FB.saveReview(gameId, author, text, selS)
        : Promise.resolve().then(function(){ var k='pw_rv_'+gameId; var a=lsGet(k,[]); a.unshift({author:author,text:text,stars:selS,ts:Date.now()}); lsSave(k,a.slice(0,50)); });
      p.catch(function() {
        var k='pw_rv_'+gameId; var a=lsGet(k,[]); a.unshift({author:author,text:text,stars:selS,ts:Date.now()}); lsSave(k,a.slice(0,50));
      }).then(function() {
        document.getElementById('reviewText').value = '';
        selS = 0; _hl(0);
        btn.textContent = 'PUBLIÉ ✓'; btn.disabled = false;
        setTimeout(function(){ btn.textContent = 'PUBLIER →'; }, 2000);
        renderRV();
      });
    });

    function renderRV() {
      var list = document.getElementById('reviewList');
      if (!list) return;
      list.innerHTML = '<div class="lb-empty">CHARGEMENT…</div>';
      var p = window._PW_FB
        ? window._PW_FB.getReviews(gameId)
        : Promise.resolve(lsGet('pw_rv_'+gameId,[]).slice(0,20));
      p.then(function(rv) {
        if (rv && rv.length) {
          var avg = rv.reduce(function(s,r){ return s+r.stars; },0) / rv.length;
          document.getElementById('avgScore').textContent    = avg.toFixed(1);
          document.getElementById('avgStars').textContent    = _starsStr(avg);
          document.getElementById('ratingCount').textContent = rv.length + ' avis';
          var counts=[0,0,0,0,0]; rv.forEach(function(r){ counts[r.stars-1]++; });
          var max = Math.max.apply(null, counts.concat([1]));
          document.getElementById('ratingBars').innerHTML = [5,4,3,2,1].map(function(n) {
            return '<div class="rbar-row"><span class="rbar-label">' + n + '</span>' +
              '<div class="rbar-track"><div class="rbar-fill" style="width:' + Math.round(counts[n-1]/max*100) + '%"></div></div></div>';
          }).join('');
        }
        if (!rv || !rv.length) { list.innerHTML = '<div class="lb-empty">AUCUN AVIS ENCORE</div>'; return; }
        list.innerHTML = rv.map(function(r) {
          return '<div class="review-item">' +
            '<div class="review-top">' +
            '<span class="review-author">' + _esc(r.author) + '</span>' +
            '<span class="review-stars">' + '⭐'.repeat(Math.min(5,r.stars)) + '</span>' +
            '</div>' +
            '<div class="review-text">' + _esc(r.text) + '</div>' +
            '<div class="review-date">' + _fmtDate(r.ts) + '</div>' +
            '</div>';
        }).join('');
      }).catch(function() { list.innerHTML = '<div class="lb-empty">ERREUR</div>'; });
    }

    /* Load */
    function _load() { renderLB(); renderRV(); }
    _whenFB(_load);
    setTimeout(_load, 1800);
  };

  /* ══════════════════════════════════════════
     PAUSE (bouton #pauseBtn)
     Chaque jeu fournit { pause(), resume(), isRunning? }.
  ══════════════════════════════════════════ */
  window.PixelWave.initPause = function (handlers) {
    handlers = handlers || {};
    var btn = document.getElementById('pauseBtn');
    if (!btn) return { isPaused: false };

    var paused = false;
    var hostEl = null;

    btn.setAttribute('title', 'Pause / Reprendre — P, Échap, ou touche Pause');

    function findGameContainer() {
      var fsCss = document.querySelector('.pw-fs-elem');
      if (fsCss) {
        if (fsCss.tagName === 'CANVAS' && fsCss.parentElement) return fsCss.parentElement;
        return fsCss;
      }
      var nat = document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        null;
      if (nat) {
        var root = nat.tagName === 'CANVAS' && nat.parentElement ? nat.parentElement : nat;
        if (root.querySelector && (root.querySelector('canvas') || root.querySelector('#board') || root.querySelector('#cardGrid'))) {
          return root;
        }
      }
      var candidates = [
        document.getElementById('pwPlaySurface'),
        document.getElementById('gameStage'),
        document.getElementById('boardWrap'),
        document.getElementById('gameWrap'),
        document.getElementById('tetrisPlayZone'),
        document.getElementById('quizArea'),
        document.getElementById('cardGrid'),
        document.querySelector('.game-wrapper'),
        document.querySelector('.game-area'),
        document.querySelector('.game-wrap'),
        (function () {
          var c = document.getElementById('gameCanvas') || document.querySelector('canvas');
          return c && c.parentElement;
        })()
      ].filter(Boolean);
      return candidates[0] || null;
    }

    function anchorIntoHost() {
      var host = findGameContainer();
      if (!host) return;
      hostEl = host;
      var cs = window.getComputedStyle(hostEl);
      if (cs && cs.position === 'static') hostEl.style.position = 'relative';
      try {
        if (hostEl.firstChild) hostEl.insertBefore(btn, hostEl.firstChild);
        else hostEl.appendChild(btn);
      } catch (e) {}
      var ov = document.getElementById('pwPauseOverlay');
      if (ov && ov.parentElement !== hostEl) {
        try { hostEl.appendChild(ov); } catch (e2) {}
      }
    }

    function ensureOverlay() {
      var ov = document.getElementById('pwPauseOverlay');
      if (ov) return ov;
      ov = document.createElement('div');
      ov.id = 'pwPauseOverlay';
      ov.setAttribute('role', 'presentation');
      ov.textContent = '⏸ PAUSE';
      var host = hostEl || findGameContainer();
      if (host) host.appendChild(ov);
      else document.body.appendChild(ov);
      return ov;
    }

    function sync() {
      anchorIntoHost();
      var ov = ensureOverlay();
      if (ov.parentElement !== hostEl && hostEl) {
        try { hostEl.appendChild(ov); } catch (e) {}
      }
      ov.classList.toggle('open', paused);
      btn.textContent = paused ? '▶' : '⏸';
      btn.classList.toggle('pw-pause-on', paused);
    }

    function canToggle(nextPaused) {
      if (typeof handlers.isRunning !== 'function') return true;
      if (!nextPaused) return true;
      return !!handlers.isRunning();
    }

    function setPaused(p) {
      if (!canToggle(p)) return;
      if (paused === p) return;
      paused = p;
      try {
        if (paused && handlers.pause) handlers.pause();
        if (!paused && handlers.resume) handlers.resume();
      } catch (e) {}
      sync();
    }

    function isTypingFocus(t) {
      if (!t || t.nodeType !== 1) return false;
      if (t.isContentEditable) return true;
      var el = t.closest && t.closest('input, textarea, select');
      if (!el) return false;
      var type = String(el.type || '').toLowerCase();
      if (type === 'button' || type === 'submit' || type === 'reset' || type === 'checkbox' || type === 'radio' || type === 'range' || type === 'file') return false;
      return true;
    }

    function isPauseKey(e) {
      if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') return true;
      if (e.code === 'Pause' || e.key === 'Pause') return true;
      if (e.code === 'MediaPause' || e.code === 'MediaPlayPause') return true;
      if (e.code === 'Escape' || e.key === 'Escape') return true;
      return false;
    }

    function onKeyDown(e) {
      if (!isPauseKey(e)) return;
      if (isTypingFocus(e.target)) return;
      // Échap : en plein écran CSS iOS, la 1re Échap doit pouvoir quitter le plein écran (handler dédié)
      if (e.code === 'Escape' || e.key === 'Escape') {
        var fsCss = document.querySelector('.pw-fs-elem');
        if (fsCss && !paused) return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      setPaused(!paused);
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      setPaused(!paused);
    });

    document.addEventListener('keydown', onKeyDown, true);

    function reanchorPauseUi() {
      var next = findGameContainer();
      if (!next) return;
      if (next !== hostEl) hostEl = next;
      var cs = hostEl && window.getComputedStyle(hostEl);
      if (hostEl && cs && cs.position === 'static') hostEl.style.position = 'relative';
      if (btn.parentElement !== hostEl && hostEl) {
        try {
          if (hostEl.firstChild) hostEl.insertBefore(btn, hostEl.firstChild);
          else hostEl.appendChild(btn);
        } catch (e) {}
      }
      var ov = document.getElementById('pwPauseOverlay');
      if (ov && hostEl && ov.parentElement !== hostEl) {
        try { hostEl.appendChild(ov); } catch (e2) {}
      }
    }

    document.addEventListener('pw:layout', reanchorPauseUi);
    window.addEventListener('resize', reanchorPauseUi);

    (function rafReanchor() {
      var n = 0;
      function step() {
        reanchorPauseUi();
        if (++n < 24) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    })();

    sync();
    return {
      get isPaused() { return paused; },
      pause: function () { setPaused(true); },
      resume: function () { setPaused(false); }
    };
  };

  // CSS injecté (une seule fois) pour le bouton + overlay (dans le conteneur de jeu)
  (function () {
    var old = document.getElementById('pw-pause-style');
    if (old) old.remove();
    var s = document.createElement('style');
    s.id = 'pw-pause-style';
    s.textContent = [
      '#pauseBtn{position:absolute;left:10px;top:10px;z-index:12;',
      'font-family:\"Press Start 2P\",monospace;font-size:.48rem;letter-spacing:1px;',
      'padding:.45rem .7rem;border-radius:8px;',
      'border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.55);',
      'color:rgba(255,255,255,.85);cursor:pointer;',
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
      'touch-action:manipulation;-webkit-tap-highlight-color:transparent;',
      'pointer-events:auto;',
      '}',
      '#pauseBtn:hover{border-color:#00f0ff;color:#00f0ff;}',
      '#pauseBtn.pw-pause-on{border-color:#ffe44e;color:#ffe44e;}',
      '#pwPlaySurface{position:relative;display:inline-block;max-width:100%;}',
      '#pwPauseOverlay{position:absolute;inset:0;z-index:11;display:none;',
      'align-items:center;justify-content:center;',
      'box-sizing:border-box;',
      'background:rgba(0,0,0,.55);',
      'font-family:\"Press Start 2P\",monospace;font-size:.9rem;',
      'color:#ffe44e;text-shadow:0 0 20px #ffe44e66;',
      'pointer-events:none;',
      '}',
      '#pwPauseOverlay.open{display:flex;pointer-events:auto;}'
    ].join('');
    document.head.appendChild(s);
  })();

  /* ─── Utils ─── */
  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _starsStr(a) { var f=Math.floor(a),h=a-f>=.5?1:0; return '★'.repeat(f)+(h?'½':'')+'☆'.repeat(5-f-h); }
  function _fmtDate(ts) {
    if (!ts) return '';
    try {
      var d = ts && ts.toDate ? ts.toDate() : new Date(typeof ts==='number' ? ts : (ts.seconds||0)*1000);
      return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});
    } catch(e) { return ''; }
  }
})();
