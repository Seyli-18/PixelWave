/* ============================================================
   PIXELWAVE — shared.js  v3
   • Un seul enregistrement par partie (plus de doublon Anonyme)
   • Pseudo aléatoire si pas renseigné (Player847, User123…)
   • Mode classe simplifié (juste un pseudo, pas d'onglet classe)
   • Plein écran géré ici (appelé via PixelWave.initFullscreen)
   • Stockage Firebase Firestore + fallback localStorage
   ============================================================ */

(function () {
  window.PixelWave = window.PixelWave || {};

  /* ── Firebase bridge (ES module → window) ── */
  const _bridge = document.createElement('script');
  _bridge.type  = 'module';
  _bridge.textContent = `
    import { saveScore, getTopScores, saveReview, getReviews }
      from './firebase.js';
    window._PW_FB = { saveScore, getTopScores, saveReview, getReviews };
    document.dispatchEvent(new CustomEvent('pw:fb:ready'));
  `;
  document.head.appendChild(_bridge);

  /* ── Random username generator ── */
  function randomName() {
    const adj  = ['Cool','Fast','Epic','Mega','Ultra','Super','Wild','Neo','Dark','Pixel'];
    const nouns= ['Player','Gamer','Bird','Fox','Wolf','Hawk','Tiger','Ninja','Hero','Star'];
    const n    = Math.floor(Math.random() * 900) + 100;
    return adj[Math.floor(Math.random()*adj.length)] + nouns[Math.floor(Math.random()*nouns.length)] + n;
  }

  /* ── LocalStorage helpers ── */
  function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

  /* ── Wait for Firebase ── */
  function _whenFB(cb) {
    if (window._PW_FB) { cb(); }
    else { document.addEventListener('pw:fb:ready', cb, { once: true }); }
  }

  /* ══════════════════════════════════════════
     FULLSCREEN HELPER
     Call: PixelWave.initFullscreen(canvasOrWrapperId, btnId)
  ══════════════════════════════════════════ */
  window.PixelWave.initFullscreen = function (elementId, btnId) {
    const el  = document.getElementById(elementId);
    const btn = document.getElementById(btnId);
    if (!el || !btn) return;

    function isFS() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }

    function toggleFS() {
      if (!isFS()) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) req.call(el);
      } else {
        const ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (ex) ex.call(document);
      }
    }

    btn.addEventListener('click', toggleFS);
    btn.addEventListener('touchend', e => { e.preventDefault(); toggleFS(); });

    document.addEventListener('fullscreenchange',       () => { btn.textContent = isFS() ? '⛶ QUITTER' : '⛶ PLEIN ÉCRAN'; });
    document.addEventListener('webkitfullscreenchange', () => { btn.textContent = isFS() ? '⛶ QUITTER' : '⛶ PLEIN ÉCRAN'; });
  };

  /* ══════════════════════════════════════════
     MAIN INIT
  ══════════════════════════════════════════ */
  window.PixelWave.init = function (gameId, accentColor) {
    accentColor = accentColor || '#b44fff';
    const KEY_PSEUDO = 'pw_pseudo';          // global pseudo (shared across games)
    let pseudo = lsGet(KEY_PSEUDO, '');

    /* ── Single submit function ── */
    window.PixelWave.submitScore = async function (score) {
      const name = pseudo.trim() || randomName();
      // If name was random, don't persist it — just use for this session
      _whenFB(async () => {
        try { await window._PW_FB.saveScore(gameId, name, score, ''); }
        catch (e) { _lsFallbackScore(gameId, name, score); }
        renderLeaderboard();
      });
    };

    /* ── Build HTML ── */
    const container = document.getElementById('bottomSections');
    if (!container) return;

    container.innerHTML = `
      <!-- ── PSEUDO BAR ── -->
      <div class="section-card">
        <div class="pseudo-bar">
          <span class="pseudo-bar-label">👾 TON PSEUDO</span>
          <div class="pseudo-bar-inner">
            <input type="text" id="pseudoInput" placeholder="Laisse vide = pseudo aléatoire" maxlength="20" value="${escHtml(pseudo)}"/>
            <button id="pseudoSave">SAUVEGARDER</button>
          </div>
          <div id="pseudoConfirm" style="display:none;font-family:'Press Start 2P',monospace;font-size:.42rem;color:#00ff88;margin-top:.5rem;letter-spacing:1px">
            ✓ PSEUDO SAUVEGARDÉ : <span id="pseudoShow"></span>
          </div>
        </div>
      </div>

      <!-- ── LEADERBOARD ── -->
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

      <!-- ── REVIEWS ── -->
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
            <input type="text" id="reviewAuthor" placeholder="Ton pseudo (optionnel)" maxlength="20"/>
          </div>
          <textarea class="review-input" id="reviewText" placeholder="Dis ce que tu penses du jeu…"></textarea>
          <button class="submit-review-btn" id="submitReview">PUBLIER →</button>
          <div class="review-list" id="reviewList"><div class="lb-empty">CHARGEMENT…</div></div>
        </div>
      </div>
    `;

    /* ── Pseudo save ── */
    const pseudoInput = document.getElementById('pseudoInput');
    document.getElementById('pseudoSave').addEventListener('click', () => {
      pseudo = pseudoInput.value.trim();
      lsSet(KEY_PSEUDO, pseudo);
      const confirm = document.getElementById('pseudoConfirm');
      confirm.style.display = 'block';
      document.getElementById('pseudoShow').textContent = pseudo || '(aléatoire)';
      setTimeout(() => { confirm.style.display = 'none'; }, 3000);
    });
    pseudoInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('pseudoSave').click(); });

    /* ── Section toggles ── */
    ['lb', 'rv'].forEach(id => {
      document.getElementById(id + 'Header').addEventListener('click', () => {
        const body   = document.getElementById(id + 'Body');
        const toggle = document.getElementById(id + 'Toggle');
        const open   = body.classList.contains('open');
        body.classList.toggle('open', !open);
        toggle.classList.toggle('open', !open);
      });
    });

    /* ── Leaderboard ── */
    async function renderLeaderboard() {
      const list = document.getElementById('lbList');
      list.innerHTML = '<div class="lb-empty">CHARGEMENT…</div>';
      let scores = [];
      try {
        if (window._PW_FB) scores = await window._PW_FB.getTopScores(gameId, '');
        else scores = _lsFallbackGetScores(gameId);
      } catch (e) { scores = _lsFallbackGetScores(gameId); }

      if (!scores.length) {
        list.innerHTML = '<div class="lb-empty">AUCUN SCORE ENCORE<br>SOIS LE PREMIER !</div>';
        return;
      }
      const rankCls   = ['r1','r2','r3'];
      const rankEmoji = ['🥇','🥈','🥉'];
      list.innerHTML = scores.map((s, i) =>
        `<div class="lb-row">
          <span class="lb-rank ${rankCls[i]||'rN'}">${rankEmoji[i]||'#'+(i+1)}</span>
          <span class="lb-name">${escHtml(s.name)}</span>
          <span class="lb-score">${Number(s.score).toLocaleString()}</span>
        </div>`
      ).join('');
    }

    /* ── Reviews ── */
    let selStars = 0;
    document.querySelectorAll('.star-pick').forEach(s => {
      s.addEventListener('mouseenter', () => _hl(+s.dataset.v));
      s.addEventListener('mouseleave', () => _hl(selStars));
      s.addEventListener('click',      () => { selStars = +s.dataset.v; _hl(selStars); });
    });
    function _hl(n) { document.querySelectorAll('.star-pick').forEach((s,i) => s.classList.toggle('lit', i < n)); }

    document.getElementById('submitReview').addEventListener('click', async () => {
      const author = document.getElementById('reviewAuthor').value.trim() || pseudo.trim() || randomName();
      const text   = document.getElementById('reviewText').value.trim();
      if (!selStars) { alert('Choisis une note !'); return; }
      if (!text)     { document.getElementById('reviewText').focus(); return; }
      const btn = document.getElementById('submitReview');
      btn.textContent = 'ENVOI…'; btn.disabled = true;
      try {
        if (window._PW_FB) await window._PW_FB.saveReview(gameId, author, text, selStars);
        else _lsFallbackReview(gameId, author, text, selStars);
      } catch(e) { _lsFallbackReview(gameId, author, text, selStars); }
      document.getElementById('reviewText').value = '';
      document.getElementById('reviewAuthor').value = '';
      selStars = 0; _hl(0);
      btn.textContent = 'PUBLIÉ ✓'; btn.disabled = false;
      setTimeout(() => { btn.textContent = 'PUBLIER →'; }, 2000);
      renderReviews();
    });

    async function renderReviews() {
      const list = document.getElementById('reviewList');
      list.innerHTML = '<div class="lb-empty">CHARGEMENT…</div>';
      let reviews = [];
      try {
        if (window._PW_FB) reviews = await window._PW_FB.getReviews(gameId);
        else reviews = _lsFallbackGetReviews(gameId);
      } catch(e) { reviews = _lsFallbackGetReviews(gameId); }

      if (reviews.length) {
        const avg = reviews.reduce((s,r)=>s+r.stars,0)/reviews.length;
        document.getElementById('avgScore').textContent    = avg.toFixed(1);
        document.getElementById('avgStars').textContent    = _starsStr(avg);
        document.getElementById('ratingCount').textContent = reviews.length+' avis';
      } else {
        document.getElementById('avgScore').textContent    = '—';
        document.getElementById('avgStars').textContent    = '☆☆☆☆☆';
        document.getElementById('ratingCount').textContent = '0 avis';
      }
      const counts=[0,0,0,0,0];
      reviews.forEach(r=>counts[r.stars-1]++);
      const max=Math.max(...counts,1);
      document.getElementById('ratingBars').innerHTML=[5,4,3,2,1].map(n=>
        `<div class="rbar-row"><span class="rbar-label">${n}</span>
        <div class="rbar-track"><div class="rbar-fill" style="width:${Math.round(counts[n-1]/max*100)}%"></div></div></div>`
      ).join('');

      if (!reviews.length) { list.innerHTML='<div class="lb-empty">AUCUN AVIS ENCORE</div>'; return; }
      list.innerHTML = reviews.map(r=>
        `<div class="review-item">
          <div class="review-top">
            <span class="review-author">${escHtml(r.author)}</span>
            <span class="review-stars">${'⭐'.repeat(r.stars)}</span>
          </div>
          <div class="review-text">${escHtml(r.text)}</div>
          <div class="review-date">${_fmtDate(r.ts)}</div>
        </div>`
      ).join('');
    }

    /* ── Load when Firebase ready ── */
    _whenFB(() => { renderLeaderboard(); renderReviews(); });
    // Also try immediately (might already be ready)
    setTimeout(() => { renderLeaderboard(); renderReviews(); }, 1500);
  };

  /* ── localStorage fallbacks ── */
  function _lsFallbackScore(gid, name, score) {
    const k=`pw_lb_${gid}`; const a=lsGet(k,[]);
    a.push({name,score,ts:Date.now()}); a.sort((x,y)=>y.score-x.score);
    lsSet(k,a.slice(0,50));
  }
  function _lsFallbackGetScores(gid) { return lsGet(`pw_lb_${gid}`,[]).slice(0,10); }
  function _lsFallbackReview(gid,author,text,stars) {
    const k=`pw_rv_${gid}`; const a=lsGet(k,[]);
    a.unshift({author,text,stars,ts:Date.now()}); lsSet(k,a.slice(0,50));
  }
  function _lsFallbackGetReviews(gid) { return lsGet(`pw_rv_${gid}`,[]).slice(0,20); }

  /* ── Utils ── */
  function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _starsStr(avg){ const f=Math.floor(avg),h=avg-f>=.5?1:0; return '★'.repeat(f)+(h?'½':'')+'☆'.repeat(5-f-h); }
  function _fmtDate(ts){
    if(!ts)return '';
    try{ const d=ts&&ts.toDate?ts.toDate():new Date(typeof ts==='number'?ts:(ts.seconds||0)*1000);
      return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}); }
    catch(e){ return ''; }
  }
})();
