/* ============================================================
   PIXELWAVE — shared.js
   Reviews + Leaderboard + Class mode
   Utilise Firebase Firestore via firebase.js (ES module bridge)
   ============================================================ */

(function () {
  window.PixelWave = window.PixelWave || {};

  /* ── On injecte un <script type="module"> qui importe firebase.js
        et expose les fonctions sur window._PW_FB ── */
  const bridge = document.createElement('script');
  bridge.type  = 'module';
  bridge.textContent = `
    import {
      saveScore, getTopScores,
      saveReview, getReviews
    } from './firebase.js';
    window._PW_FB = { saveScore, getTopScores, saveReview, getReviews };
    document.dispatchEvent(new CustomEvent('pw:fb:ready'));
  `;
  document.head.appendChild(bridge);

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  window.PixelWave.init = function (gameId, accentColor) {
    accentColor = accentColor || '#b44fff';

    function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
    function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

    const KEY_PSEUDO = 'pw_pseudo_' + gameId;
    let pseudo    = lsGet(KEY_PSEUDO, '');
    let classMode = false;
    let classId   = lsGet('pw_class_' + gameId, '');

    /* ── Score submit hooks ── */
    window.PixelWave.submitScore = async function (score) {
      if (!classMode || !pseudo.trim()) return;
      await _saveScore(pseudo.trim(), score, classId);
      renderLeaderboard();
    };

    window.PixelWave.submitScoreAnon = async function (score) {
      await _saveScore('Anonyme', score, '');
      renderLeaderboard();
    };

    async function _saveScore(name, score, cid) {
      if (window._PW_FB) {
        await window._PW_FB.saveScore(gameId, name, score, cid);
      } else {
        await new Promise(res => {
          document.addEventListener('pw:fb:ready', async () => {
            await window._PW_FB.saveScore(gameId, name, score, cid);
            res();
          }, { once: true });
        });
      }
    }

    /* ── Build HTML ── */
    const container = document.getElementById('bottomSections');
    if (!container) return;

    container.innerHTML = `
      <div class="section-card">
        <div class="class-mode-bar">
          <label>
            <span class="toggle-switch">
              <input type="checkbox" id="classToggle"/>
              <span class="toggle-track"></span>
            </span>
            MODE CLASSE
          </label>
          <div class="pseudo-wrap" id="pseudoWrap">
            <input type="text" id="classIdInput" placeholder="Code classe (ex: 3eB)" maxlength="15" value="${escHtml(classId)}"/>
            <input type="text" id="pseudoInput" placeholder="Ton pseudo…" maxlength="20" value="${escHtml(pseudo)}"/>
            <button id="pseudoSave">VALIDER</button>
          </div>
        </div>
        <div id="classBadge" style="display:none;padding:.6rem 1.2rem;font-family:'Press Start 2P',monospace;font-size:.45rem;color:#00ff88;letter-spacing:1px;background:#00220a;border-top:1px solid #1e1e4a;">
          ✓ <span id="pseudoDisplay"></span> &nbsp;·&nbsp; CLASSE : <span id="classDisplay"></span>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header" id="lbHeader">
          <span class="section-icon">🏆</span>
          <h2 style="color:${accentColor}">LEADERBOARD</h2>
          <span class="section-toggle open" id="lbToggle">▼</span>
        </div>
        <div class="section-body open" id="lbBody">
          <div class="lb-tabs">
            <button class="lb-tab active" data-tab="global">🌍 GLOBAL</button>
            <button class="lb-tab" data-tab="class">🏫 CLASSE</button>
          </div>
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
            <input type="text" id="reviewAuthor" placeholder="Ton pseudo" maxlength="20"/>
          </div>
          <textarea class="review-input" id="reviewText" placeholder="Dis ce que tu penses du jeu…"></textarea>
          <button class="submit-review-btn" id="submitReview">PUBLIER →</button>
          <div class="review-list" id="reviewList"><div class="lb-empty">CHARGEMENT…</div></div>
        </div>
      </div>
    `;

    /* ── Class mode ── */
    const classToggle = document.getElementById('classToggle');
    const pseudoWrap  = document.getElementById('pseudoWrap');
    const pseudoInput = document.getElementById('pseudoInput');
    const classInput  = document.getElementById('classIdInput');
    const classBadge  = document.getElementById('classBadge');

    classToggle.addEventListener('change', function () {
      classMode = classToggle.checked;
      pseudoWrap.classList.toggle('show', classMode);
      if (!classMode) classBadge.style.display = 'none';
      else if (pseudo.trim()) _showBadge();
    });

    document.getElementById('pseudoSave').addEventListener('click', function () {
      var p = pseudoInput.value.trim();
      var c = classInput.value.trim();
      if (!p) { pseudoInput.focus(); return; }
      pseudo  = p; classId = c;
      lsSet(KEY_PSEUDO, pseudo);
      lsSet('pw_class_' + gameId, classId);
      _showBadge();
    });

    pseudoInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('pseudoSave').click();
    });

    function _showBadge() {
      document.getElementById('pseudoDisplay').textContent = pseudo.toUpperCase();
      document.getElementById('classDisplay').textContent  = classId || '—';
      classBadge.style.display = 'block';
    }

    /* ── Collapsible sections ── */
    ['lb', 'rv'].forEach(function (id) {
      document.getElementById(id + 'Header').addEventListener('click', function () {
        var body   = document.getElementById(id + 'Body');
        var toggle = document.getElementById(id + 'Toggle');
        var open   = body.classList.contains('open');
        body.classList.toggle('open', !open);
        toggle.classList.toggle('open', !open);
      });
    });

    /* ── Leaderboard ── */
    var lbTab = 'global';

    document.querySelectorAll('.lb-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.lb-tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        lbTab = btn.dataset.tab;
        renderLeaderboard();
      });
    });

    async function renderLeaderboard() {
      var list = document.getElementById('lbList');
      list.innerHTML = '<div class="lb-empty">CHARGEMENT…</div>';

      var scores = [];
      try {
        var cid = lbTab === 'class' ? classId : '';
        if (window._PW_FB) {
          scores = await window._PW_FB.getTopScores(gameId, cid);
        }
      } catch (e) { console.warn(e); }

      if (!scores.length) {
        list.innerHTML = '<div class="lb-empty">AUCUN SCORE ENCORE<br>SOIS LE PREMIER !</div>';
        return;
      }

      var rankCls   = ['r1', 'r2', 'r3'];
      var rankEmoji = ['🥇', '🥈', '🥉'];

      list.innerHTML = scores.map(function (s, i) {
        return '<div class="lb-row">' +
          '<span class="lb-rank ' + (rankCls[i] || 'rN') + '">' + (rankEmoji[i] || '#' + (i + 1)) + '</span>' +
          '<span class="lb-name">'  + escHtml(s.name)  + '</span>' +
          '<span class="lb-score">' + Number(s.score).toLocaleString() + '</span>' +
          '</div>';
      }).join('');
    }

    /* ── Reviews ── */
    var selectedStars = 0;

    document.querySelectorAll('.star-pick').forEach(function (star) {
      star.addEventListener('mouseenter', function () { _hl(+star.dataset.v); });
      star.addEventListener('mouseleave', function () { _hl(selectedStars); });
      star.addEventListener('click',      function () { selectedStars = +star.dataset.v; _hl(selectedStars); });
    });

    function _hl(n) {
      document.querySelectorAll('.star-pick').forEach(function (s, i) {
        s.classList.toggle('lit', i < n);
      });
    }

    document.getElementById('submitReview').addEventListener('click', async function () {
      var author = document.getElementById('reviewAuthor').value.trim() || 'Anonyme';
      var text   = document.getElementById('reviewText').value.trim();
      if (!selectedStars) { alert('Choisis une note !'); return; }
      if (!text)           { document.getElementById('reviewText').focus(); return; }

      var btn = document.getElementById('submitReview');
      btn.textContent = 'ENVOI…'; btn.disabled = true;

      try {
        if (window._PW_FB) {
          await window._PW_FB.saveReview(gameId, author, text, selectedStars);
        }
      } catch (e) { console.warn(e); }

      document.getElementById('reviewText').value   = '';
      document.getElementById('reviewAuthor').value = '';
      selectedStars = 0; _hl(0);
      btn.textContent = 'PUBLIÉ ✓'; btn.disabled = false;
      setTimeout(function () { btn.textContent = 'PUBLIER →'; }, 2000);
      renderReviews();
    });

    async function renderReviews() {
      var list = document.getElementById('reviewList');
      list.innerHTML = '<div class="lb-empty">CHARGEMENT…</div>';

      var reviews = [];
      try {
        if (window._PW_FB) reviews = await window._PW_FB.getReviews(gameId);
      } catch (e) { console.warn(e); }

      if (reviews.length) {
        var avg = reviews.reduce(function (s, r) { return s + r.stars; }, 0) / reviews.length;
        document.getElementById('avgScore').textContent    = avg.toFixed(1);
        document.getElementById('avgStars').textContent    = _starsStr(avg);
        document.getElementById('ratingCount').textContent = reviews.length + ' avis';
      } else {
        document.getElementById('avgScore').textContent    = '—';
        document.getElementById('avgStars').textContent    = '☆☆☆☆☆';
        document.getElementById('ratingCount').textContent = '0 avis';
      }

      var counts = [0, 0, 0, 0, 0];
      reviews.forEach(function (r) { counts[r.stars - 1]++; });
      var max = Math.max.apply(null, counts.concat(1));
      document.getElementById('ratingBars').innerHTML = [5, 4, 3, 2, 1].map(function (n) {
        return '<div class="rbar-row">' +
          '<span class="rbar-label">' + n + '</span>' +
          '<div class="rbar-track"><div class="rbar-fill" style="width:' +
          Math.round(counts[n-1]/max*100) + '%"></div></div></div>';
      }).join('');

      if (!reviews.length) { list.innerHTML = '<div class="lb-empty">AUCUN AVIS ENCORE</div>'; return; }
      list.innerHTML = reviews.map(function (r) {
        return '<div class="review-item">' +
          '<div class="review-top">' +
          '<span class="review-author">' + escHtml(r.author) + '</span>' +
          '<span class="review-stars">' + '⭐'.repeat(r.stars) + '</span>' +
          '</div>' +
          '<div class="review-text">' + escHtml(r.text) + '</div>' +
          '<div class="review-date">' + _fmtDate(r.ts) + '</div>' +
          '</div>';
      }).join('');
    }

    /* ── Load data once Firebase is ready ── */
    function _load() { renderLeaderboard(); renderReviews(); }
    if (window._PW_FB) { _load(); }
    else { document.addEventListener('pw:fb:ready', _load, { once: true }); }
  };

  /* ── Utils ── */
  function escHtml(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _starsStr(avg) {
    var f = Math.floor(avg), h = avg - f >= 0.5 ? 1 : 0;
    return '★'.repeat(f) + (h ? '½' : '') + '☆'.repeat(5 - f - h);
  }
  function _fmtDate(ts) {
    if (!ts) return '';
    try {
      var d = ts.toDate ? ts.toDate() : new Date(typeof ts === 'number' ? ts : ts.seconds * 1000);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return ''; }
  }
})();
