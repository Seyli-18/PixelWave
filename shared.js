/* ============================================================
   PIXELWAVE — shared.js  v4
   • Plein écran stable : lock + blocage swipe sur canvas
   • Modal pseudo visible avant le 1er score
   • Noms auto = Player 1, Player 2… sans doublon
   • submitScore unique
   • Thème sombre / clair
   • Stats perso par jeu
   • Affichage bug reports depuis Firebase
   ============================================================ */

(function () {
  window.PixelWave = window.PixelWave || {};

  /* ─── localStorage helpers ─── */
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch { return d; } }
  function lsSave(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

  /* ══════════════════════════════════════
     THÈME
  ══════════════════════════════════════ */
  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    lsSave('pw_theme', dark ? 'dark' : 'light');
  }
  applyTheme(lsGet('pw_theme', 'dark') !== 'light');

  window.PixelWave.toggleTheme = function () {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    applyTheme(!isDark);
    document.querySelectorAll('.theme-toggle-btn').forEach(b => {
      b.textContent = isDark ? '☀️ CLAIR' : '🌙 SOMBRE';
    });
  };

  /* ══════════════════════════════════════
     PLEIN ÉCRAN — anti-sortie par swipe
  ══════════════════════════════════════ */
  window.PixelWave.initFullscreen = function (elementId, btnId) {
    const el  = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    const btn = typeof btnId     === 'string' ? document.getElementById(btnId)     : btnId;
    if (!el || !btn) return;

    function isFS() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement
              || document.mozFullScreenElement);
    }

    function enterFS() {
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
      if (req) req.call(el).catch(() => {});
      try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch {}
    }

    function exitFS() {
      const ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
      if (ex) ex.call(document).catch(() => {});
    }

    function toggle() { isFS() ? exitFS() : enterFS(); }

    btn.addEventListener('click',    e => { e.stopPropagation(); toggle(); });
    btn.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); toggle(); }, { passive: false });

    ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange'].forEach(ev => {
      document.addEventListener(ev, () => { btn.textContent = isFS() ? '⛶ QUITTER' : '⛶ PLEIN ÉCRAN'; });
    });

    /* Bloquer scroll sur canvas en plein écran pour éviter de sortir avec les swipes du jeu */
    el.addEventListener('touchmove', e => {
      if (isFS()) {
        const t = e.target;
        if (t.tagName === 'CANVAS' || t.closest && (t.closest('#gameWrap') || t.closest('#boardWrap') || t.closest('.card-grid'))) {
          e.preventDefault();
        }
      }
    }, { passive: false });

    /* Meta viewport pour iPad : désactive le zoom */
    const vp = document.querySelector('meta[name=viewport]');
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  };

  /* ══════════════════════════════════════
     PLAYER N — sans doublon
  ══════════════════════════════════════ */
  function reserveNextPlayer() {
    const used = lsGet('pw_pnames', []);
    let n = 1;
    while (used.includes('Player ' + n)) n++;
    const name = 'Player ' + n;
    used.push(name);
    lsSave('pw_pnames', used.slice(0, 9999));
    return name;
  }

  /* ══════════════════════════════════════
     MODAL PSEUDO
  ══════════════════════════════════════ */
  window.PixelWave.promptPseudo = function (gameId, cb) {
    const existing = lsGet('pw_pseudo', '');
    if (existing) { cb(existing); return; }
    _showModal(cb);
  };

  function _showModal(onDone) {
    const autoName = reserveNextPlayer();

    const el = document.createElement('div');
    el.id = 'pwModal';
    el.innerHTML =
      '<div id="pwMask" style="position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(8px)">' +
      '<div style="background:#0f0f26;border:2px solid #00f0ff;border-radius:16px;padding:2rem 1.5rem;max-width:380px;width:100%;text-align:center;box-shadow:0 0 40px #00f0ff33;animation:pwPop .3s ease">' +
      '<style>@keyframes pwPop{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}</style>' +
      '<div style="font-size:2.5rem;margin-bottom:.5rem">🎮</div>' +
      '<div style="font-family:\'Press Start 2P\',monospace;font-size:.6rem;color:#00f0ff;letter-spacing:2px;margin-bottom:.8rem;text-shadow:0 0 12px #00f0ff">CHOISIS TON NOM !</div>' +
      '<div style="font-family:\'Rajdhani\',sans-serif;font-size:1rem;color:#7070a0;line-height:1.6;margin-bottom:1.2rem">Ton pseudo apparaîtra dans le leaderboard.<br>Laisse vide pour : <b style="color:#ffe44e">' + autoName + '</b></div>' +
      '<input id="pwNameInput" type="text" maxlength="20" placeholder="Ton pseudo…" inputmode="text" autocomplete="off"' +
      ' style="width:100%;background:#0a0a1a;border:2px solid #1e1e4a;border-radius:8px;padding:.7rem 1rem;color:#e8e8ff;font-family:\'Rajdhani\',sans-serif;font-size:1.1rem;font-weight:700;outline:none;text-align:center;margin-bottom:1rem;box-sizing:border-box"/>' +
      '<button id="pwConfirm" style="width:100%;font-family:\'Press Start 2P\',monospace;font-size:.5rem;letter-spacing:2px;padding:.75rem;border:2px solid #00f0ff;border-radius:8px;background:transparent;color:#00f0ff;cursor:pointer;transition:all .2s;margin-bottom:.5rem">CONFIRMER →</button>' +
      '<button id="pwSkip" style="background:none;border:none;color:#3a3a60;font-family:\'Press Start 2P\',monospace;font-size:.38rem;cursor:pointer;letter-spacing:1px;text-decoration:underline">Passer (nom auto)</button>' +
      '</div></div>';

    document.body.appendChild(el);

    function done(name) {
      const used = lsGet('pw_pnames', []);
      if (!used.includes(name)) { used.push(name); lsSave('pw_pnames', used); }
      lsSave('pw_pseudo', name);
      el.remove();
      onDone(name);
    }

    document.getElementById('pwConfirm').addEventListener('click', () => {
      const val = document.getElementById('pwNameInput').value.trim();
      done(val || autoName);
    });
    document.getElementById('pwSkip').addEventListener('click', () => done(autoName));
    document.getElementById('pwNameInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('pwConfirm').click();
    });

    // Style hover
    const btn = document.getElementById('pwConfirm');
    btn.addEventListener('mouseenter', () => { btn.style.background='#00f0ff'; btn.style.color='#000'; });
    btn.addEventListener('mouseleave', () => { btn.style.background='transparent'; btn.style.color='#00f0ff'; });

    setTimeout(() => document.getElementById('pwNameInput').focus(), 100);
  }

  /* ══════════════════════════════════════
     FIREBASE BRIDGE
  ══════════════════════════════════════ */
  (function () {
    const s = document.createElement('script');
    s.type = 'module';
    s.textContent = `
      import { saveScore, getTopScores, saveReview, getReviews }
        from './firebase.js';
      window._PW_FB = { saveScore, getTopScores, saveReview, getReviews };
      document.dispatchEvent(new CustomEvent('pw:fb:ready'));
    `;
    document.head.appendChild(s);
  })();

  function _whenFB(cb) {
    if (window._PW_FB) cb();
    else document.addEventListener('pw:fb:ready', cb, { once: true });
  }

  /* ══════════════════════════════════════
     MAIN INIT
  ══════════════════════════════════════ */
  window.PixelWave.init = function (gameId, accentColor) {
    accentColor = accentColor || '#b44fff';

    /* ── Score submit unique ── */
    window.PixelWave.submitScore = function (score) {
      let name = lsGet('pw_pseudo', '');
      if (!name) { name = reserveNextPlayer(); lsSave('pw_pseudo', name); }

      _whenFB(async () => {
        try { await window._PW_FB.saveScore(gameId, name, score, ''); }
        catch { _lbFallbackSave(gameId, name, score); }
        renderLeaderboard();
      });

      // Stats perso
      const sk = 'pw_stats_' + gameId;
      const sd = lsGet(sk, { plays:0, best:0, total:0 });
      sd.plays++; sd.total += score;
      if (score > sd.best) sd.best = score;
      lsSave(sk, sd);
      _refreshStats(sd);
    };

    function _lbFallbackSave(gid, n, s) {
      const k = 'pw_lb_'+gid; const a = lsGet(k,[]);
      a.push({name:n,score:s,ts:Date.now()}); a.sort((x,y)=>y.score-x.score);
      lsSave(k, a.slice(0,50));
    }

    function _refreshStats(sd) {
      const el = document.getElementById('statPlays'); if(el) el.textContent = sd.plays;
      const el2= document.getElementById('statBest');  if(el2) el2.textContent= sd.best.toLocaleString();
      const el3= document.getElementById('statAvg');   if(el3) el3.textContent= (sd.plays>0?Math.round(sd.total/sd.plays):0).toLocaleString();
    }

    /* ── Build HTML ── */
    const container = document.getElementById('bottomSections');
    if (!container) return;

    const isDark    = document.documentElement.getAttribute('data-theme') !== 'light';
    const themeLabel= isDark ? '☀️ CLAIR' : '🌙 SOMBRE';
    const pseudo    = lsGet('pw_pseudo', '');
    const sd        = lsGet('pw_stats_'+gameId, {plays:0,best:0,total:0});
    const avg       = sd.plays > 0 ? Math.round(sd.total/sd.plays) : 0;

    container.innerHTML = `
      <div class="section-card">
        <div class="player-bar">
          <div class="player-bar-left">
            <span class="player-avatar">👾</span>
            <div class="player-info">
              <span class="player-name-disp" id="playerNameDisp">${escHtml(pseudo||'—')}</span>
              <span class="player-name-sub">Pseudo joueur</span>
            </div>
            <button class="player-edit-btn" id="playerEditBtn">✏️ MODIFIER</button>
          </div>
          <button class="theme-toggle-btn" id="themeBtn" onclick="window.PixelWave.toggleTheme()">${themeLabel}</button>
        </div>
        <div class="player-edit-form hidden" id="playerEditForm">
          <input type="text" id="playerEditInput" maxlength="20" placeholder="Nouveau pseudo…"/>
          <button id="playerEditSave">✓</button>
        </div>
        <div class="player-stats-row">
          <div class="pstat"><span class="pstat-val" id="statPlays">${sd.plays}</span><span class="pstat-label">PARTIES</span></div>
          <div class="pstat"><span class="pstat-val" id="statBest">${sd.best.toLocaleString()}</span><span class="pstat-label">MEILLEUR</span></div>
          <div class="pstat"><span class="pstat-val" id="statAvg">${avg.toLocaleString()}</span><span class="pstat-label">MOYENNE</span></div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header" id="lbHeader">
          <span class="section-icon">🏆</span>
          <h2 style="color:${accentColor}">LEADERBOARD</h2>
          <span class="section-toggle open" id="lbToggle">▼</span>
        </div>
        <div class="section-body open" id="lbBody">
          <div class="lb-list" id="lbList"><div class="lb-empty">CHARGEMENT…</div></div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header" id="rvHeader">
          <span class="section-icon">⭐</span>
          <h2 style="color:${accentColor}">AVIS DES JOUEURS</h2>
          <span class="section-toggle open" id="rvToggle">▼</span>
        </div>
        <div class="section-body open" id="rvBody">
          <div class="rating-overview">
            <div>
              <div class="rating-big" id="avgScore">—</div>
              <div class="rating-stars-big" id="avgStars">☆☆☆☆☆</div>
              <div class="rating-count" id="ratingCount">0 avis</div>
            </div>
            <div class="rating-bars" id="ratingBars"></div>
          </div>
          <div class="review-form-title">✏️ LAISSER UN AVIS</div>
          <div class="star-picker" id="starPicker">
            <span class="star-pick" data-v="1">⭐</span>
            <span class="star-pick" data-v="2">⭐</span>
            <span class="star-pick" data-v="3">⭐</span>
            <span class="star-pick" data-v="4">⭐</span>
            <span class="star-pick" data-v="5">⭐</span>
          </div>
          <div class="review-author-row">
            <input type="text" id="reviewAuthor" placeholder="Ton pseudo" maxlength="20" value="${escHtml(pseudo)}"/>
          </div>
          <textarea class="review-input" id="reviewText" placeholder="Dis ce que tu penses du jeu…"></textarea>
          <button class="submit-review-btn" id="submitReview">PUBLIER →</button>
          <div class="review-list" id="reviewList"><div class="lb-empty">CHARGEMENT…</div></div>
        </div>
      </div>
    `;

    /* ── Pseudo edit ── */
    document.getElementById('playerEditBtn').addEventListener('click', () => {
      const form = document.getElementById('playerEditForm');
      form.classList.toggle('hidden');
      if (!form.classList.contains('hidden')) {
        document.getElementById('playerEditInput').value = lsGet('pw_pseudo','');
        document.getElementById('playerEditInput').focus();
      }
    });
    document.getElementById('playerEditSave').addEventListener('click', () => {
      const val = document.getElementById('playerEditInput').value.trim();
      if (!val) return;
      const used = lsGet('pw_pnames',[]);
      if (!used.includes(val)) { used.push(val); lsSave('pw_pnames', used); }
      lsSave('pw_pseudo', val);
      document.getElementById('playerNameDisp').textContent = val;
      document.getElementById('reviewAuthor').value = val;
      document.getElementById('playerEditForm').classList.add('hidden');
    });
    document.getElementById('playerEditInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('playerEditSave').click();
    });

    /* ── Collapsibles ── */
    ['lb','rv'].forEach(id => {
      document.getElementById(id+'Header').addEventListener('click', () => {
        const b = document.getElementById(id+'Body');
        const t = document.getElementById(id+'Toggle');
        const o = b.classList.contains('open');
        b.classList.toggle('open', !o);
        t.classList.toggle('open', !o);
      });
    });

    /* ── Leaderboard ── */
    async function renderLeaderboard() {
      const list = document.getElementById('lbList');
      list.innerHTML = '<div class="lb-empty">CHARGEMENT…</div>';
      let scores = [];
      try {
        if (window._PW_FB) scores = await window._PW_FB.getTopScores(gameId,'');
        else scores = lsGet('pw_lb_'+gameId,[]).slice(0,10);
      } catch { scores = lsGet('pw_lb_'+gameId,[]).slice(0,10); }
      if (!scores.length) { list.innerHTML='<div class="lb-empty">AUCUN SCORE ENCORE<br>SOIS LE PREMIER !</div>'; return; }
      const rC=['r1','r2','r3'], rE=['🥇','🥈','🥉'];
      list.innerHTML = scores.map((s,i)=>
        `<div class="lb-row">
          <span class="lb-rank ${rC[i]||'rN'}">${rE[i]||'#'+(i+1)}</span>
          <span class="lb-name">${escHtml(s.name)}</span>
          <span class="lb-score">${Number(s.score).toLocaleString()}</span>
        </div>`
      ).join('');
    }

    /* ── Reviews ── */
    let selS = 0;
    document.querySelectorAll('.star-pick').forEach(s => {
      s.addEventListener('mouseenter', () => _hl(+s.dataset.v));
      s.addEventListener('mouseleave', () => _hl(selS));
      s.addEventListener('click',      () => { selS = +s.dataset.v; _hl(selS); });
    });
    function _hl(n) { document.querySelectorAll('.star-pick').forEach((s,i)=>s.classList.toggle('lit',i<n)); }

    document.getElementById('submitReview').addEventListener('click', async () => {
      const author = document.getElementById('reviewAuthor').value.trim()||lsGet('pw_pseudo','')||'Joueur';
      const text   = document.getElementById('reviewText').value.trim();
      if (!selS)  { alert('Choisis une note !'); return; }
      if (!text)  { document.getElementById('reviewText').focus(); return; }
      const btn = document.getElementById('submitReview');
      btn.textContent='ENVOI…'; btn.disabled=true;
      try {
        if (window._PW_FB) await window._PW_FB.saveReview(gameId, author, text, selS);
        else { const k='pw_rv_'+gameId; const a=lsGet(k,[]); a.unshift({author,text,stars:selS,ts:Date.now()}); lsSave(k,a.slice(0,50)); }
      } catch { const k='pw_rv_'+gameId; const a=lsGet(k,[]); a.unshift({author,text,stars:selS,ts:Date.now()}); lsSave(k,a.slice(0,50)); }
      document.getElementById('reviewText').value='';
      selS=0; _hl(0);
      btn.textContent='PUBLIÉ ✓'; btn.disabled=false;
      setTimeout(()=>{ btn.textContent='PUBLIER →'; }, 2000);
      renderReviews();
    });

    async function renderReviews() {
      const list = document.getElementById('reviewList');
      list.innerHTML = '<div class="lb-empty">CHARGEMENT…</div>';
      let rv = [];
      try {
        if (window._PW_FB) rv = await window._PW_FB.getReviews(gameId);
        else rv = lsGet('pw_rv_'+gameId,[]).slice(0,20);
      } catch { rv = lsGet('pw_rv_'+gameId,[]).slice(0,20); }
      if (rv.length) {
        const avg=rv.reduce((s,r)=>s+r.stars,0)/rv.length;
        document.getElementById('avgScore').textContent    = avg.toFixed(1);
        document.getElementById('avgStars').textContent    = _starsStr(avg);
        document.getElementById('ratingCount').textContent = rv.length+' avis';
      } else {
        document.getElementById('avgScore').textContent    = '—';
        document.getElementById('avgStars').textContent    = '☆☆☆☆☆';
        document.getElementById('ratingCount').textContent = '0 avis';
      }
      const counts=[0,0,0,0,0]; rv.forEach(r=>counts[r.stars-1]++);
      const max=Math.max(...counts,1);
      document.getElementById('ratingBars').innerHTML=[5,4,3,2,1].map(n=>
        `<div class="rbar-row"><span class="rbar-label">${n}</span>
        <div class="rbar-track"><div class="rbar-fill" style="width:${Math.round(counts[n-1]/max*100)}%"></div></div></div>`
      ).join('');
      if (!rv.length) { list.innerHTML='<div class="lb-empty">AUCUN AVIS ENCORE</div>'; return; }
      list.innerHTML = rv.map(r=>
        `<div class="review-item">
          <div class="review-top">
            <span class="review-author">${escHtml(r.author)}</span>
            <span class="review-stars">${'⭐'.repeat(Math.min(5,r.stars))}</span>
          </div>
          <div class="review-text">${escHtml(r.text)}</div>
          <div class="review-date">${_fmtDate(r.ts)}</div>
        </div>`
      ).join('');
    }

    function _load() { renderLeaderboard(); renderReviews(); }
    _whenFB(_load);
    setTimeout(_load, 1500);
  };

  /* ─── Utils ─── */
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _starsStr(a){ const f=Math.floor(a),h=a-f>=.5?1:0; return '★'.repeat(f)+(h?'½':'')+'☆'.repeat(5-f-h); }
  function _fmtDate(ts){
    if(!ts)return'';
    try{ const d=ts&&ts.toDate?ts.toDate():new Date(typeof ts==='number'?ts:(ts.seconds||0)*1000);
      return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}); }catch{return'';}
  }
})();
