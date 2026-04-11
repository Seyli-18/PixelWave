/* ======================================
   PIXELWAVE — shared.js
   Reviews + Leaderboard + Class mode
   Usage: call initGameExtras(gameId, accentColor)
          call submitScore(score) after each game over
   ====================================== */

(function() {
  /* ─── Storage helpers ─── */
  function load(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; }
    catch { return def; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  /* ─── Expose submitScore globally ─── */
  window.PixelWave = window.PixelWave || {};

  window.PixelWave.init = function(gameId, accentColor = '#b44fff') {
    const KEY_SCORES   = `pw_scores_${gameId}`;
    const KEY_SCORES_C = `pw_classScores_${gameId}`;
    const KEY_REVIEWS  = `pw_reviews_${gameId}`;
    const KEY_PSEUDO   = `pw_pseudo_${gameId}`;

    let classMode  = false;
    let pseudo     = load(KEY_PSEUDO, '');
    let pendingScore = null;

    /* ── Submit score (called from game logic) ── */
    window.PixelWave.submitScore = function(score) {
      if (!classMode || !pseudo.trim()) return;
      const name = pseudo.trim().slice(0, 20);
      const scores = load(KEY_SCORES_C, []);
      scores.push({ name, score, date: Date.now() });
      scores.sort((a, b) => b.score - a.score);
      save(KEY_SCORES_C, scores.slice(0, 50));

      const global = load(KEY_SCORES, []);
      global.push({ name, score, date: Date.now() });
      global.sort((a, b) => b.score - a.score);
      save(KEY_SCORES, global.slice(0, 50));

      renderLeaderboard();
    };

    /* Also store anonymous global scores */
    window.PixelWave.submitScoreAnon = function(score) {
      const global = load(KEY_SCORES, []);
      global.push({ name: 'Anonyme', score, date: Date.now() });
      global.sort((a, b) => b.score - a.score);
      save(KEY_SCORES, global.slice(0, 50));
      renderLeaderboard();
    };

    /* ── Build the bottom section HTML ── */
    const container = document.getElementById('bottomSections');
    if (!container) return;

    container.innerHTML = `
      <!-- ── CLASS MODE BAR ── -->
      <div class="section-card">
        <div class="class-mode-bar">
          <label>
            <span class="toggle-switch">
              <input type="checkbox" id="classToggle" />
              <span class="toggle-track"></span>
            </span>
            MODE CLASSE
          </label>
          <div class="pseudo-wrap" id="pseudoWrap">
            <input type="text" id="pseudoInput" placeholder="Ton pseudo…" maxlength="20" value="${pseudo}" />
            <button id="pseudoSave">VALIDER</button>
          </div>
        </div>
        <div id="classBadge" style="display:none;padding:.6rem 1.2rem;font-family:'Press Start 2P',monospace;font-size:.45rem;color:#00ff88;letter-spacing:1px;background:#00220a;border-top:1px solid #1e1e4a;">
          ✓ CONNECTÉ EN TANT QUE : <span id="pseudoDisplay"></span>
        </div>
      </div>

      <!-- ── LEADERBOARD ── -->
      <div class="section-card">
        <div class="section-header" id="lbHeader">
          <span class="section-icon">🏆</span>
          <h2>LEADERBOARD</h2>
          <span class="section-toggle" id="lbToggle">▼</span>
        </div>
        <div class="section-body open" id="lbBody">
          <div class="lb-tabs">
            <button class="lb-tab active" data-tab="global">🌍 GLOBAL</button>
            <button class="lb-tab" data-tab="class">🏫 CLASSE</button>
          </div>
          <div class="lb-list" id="lbList"></div>
        </div>
      </div>

      <!-- ── REVIEWS ── -->
      <div class="section-card">
        <div class="section-header" id="rvHeader">
          <span class="section-icon">⭐</span>
          <h2>AVIS DES JOUEURS</h2>
          <span class="section-toggle open" id="rvToggle">▼</span>
        </div>
        <div class="section-body open" id="rvBody">
          <!-- Overview -->
          <div class="rating-overview">
            <div>
              <div class="rating-big" id="avgScore">—</div>
              <div class="rating-stars-big" id="avgStars">☆☆☆☆☆</div>
              <div class="rating-count" id="ratingCount">0 avis</div>
            </div>
            <div class="rating-bars" id="ratingBars"></div>
          </div>

          <!-- Form -->
          <div class="review-form-title">✏️ LAISSER UN AVIS</div>
          <div class="star-picker" id="starPicker">
            <span class="star-pick" data-v="1">⭐</span>
            <span class="star-pick" data-v="2">⭐</span>
            <span class="star-pick" data-v="3">⭐</span>
            <span class="star-pick" data-v="4">⭐</span>
            <span class="star-pick" data-v="5">⭐</span>
          </div>
          <div class="review-author-row">
            <input type="text" id="reviewAuthor" placeholder="Ton pseudo" maxlength="20" />
          </div>
          <textarea class="review-input" id="reviewText" placeholder="Dis ce que tu penses du jeu…"></textarea>
          <button class="submit-review-btn" id="submitReview">PUBLIER →</button>

          <!-- Review list -->
          <div class="review-list" id="reviewList"></div>
        </div>
      </div>
    `;

    /* ── Accent color for the section card header ── */
    document.querySelectorAll('.section-header h2').forEach(el => {
      el.style.color = accentColor;
    });

    /* ── Class mode toggle ── */
    const classToggle = document.getElementById('classToggle');
    const pseudoWrap  = document.getElementById('pseudoWrap');
    const pseudoInput = document.getElementById('pseudoInput');
    const classBadge  = document.getElementById('classBadge');
    const pseudoDisp  = document.getElementById('pseudoDisplay');

    classToggle.addEventListener('change', () => {
      classMode = classToggle.checked;
      pseudoWrap.classList.toggle('show', classMode);
      if (!classMode) { classBadge.style.display = 'none'; }
      else if (pseudo.trim()) showBadge();
    });

    document.getElementById('pseudoSave').addEventListener('click', () => {
      const val = pseudoInput.value.trim();
      if (!val) { pseudoInput.focus(); return; }
      pseudo = val;
      save(KEY_PSEUDO, pseudo);
      showBadge();
    });

    pseudoInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('pseudoSave').click();
    });

    function showBadge() {
      pseudoDisp.textContent = pseudo.toUpperCase();
      classBadge.style.display = 'block';
    }

    /* ── Section toggles ── */
    ['lb','rv'].forEach(id => {
      document.getElementById(`${id}Header`).addEventListener('click', () => {
        const body    = document.getElementById(`${id}Body`);
        const toggle  = document.getElementById(`${id}Toggle`);
        const isOpen  = body.classList.contains('open');
        body.classList.toggle('open', !isOpen);
        toggle.classList.toggle('open', !isOpen);
      });
    });

    /* ── Leaderboard ── */
    let lbTab = 'global';

    document.querySelectorAll('.lb-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        lbTab = btn.dataset.tab;
        renderLeaderboard();
      });
    });

    function renderLeaderboard() {
      const list = document.getElementById('lbList');
      const scores = lbTab === 'global'
        ? load(KEY_SCORES, [])
        : load(KEY_SCORES_C, []);

      if (!scores.length) {
        list.innerHTML = '<div class="lb-empty">AUCUN SCORE ENCORE<br>SOIS LE PREMIER !</div>';
        return;
      }

      const rankClass = ['r1','r2','r3'];
      const rankEmoji = ['🥇','🥈','🥉'];

      list.innerHTML = scores.slice(0, 10).map((s, i) => `
        <div class="lb-row">
          <span class="lb-rank ${rankClass[i] || 'rN'}">${rankEmoji[i] || '#' + (i+1)}</span>
          <span class="lb-name">${escHtml(s.name)}</span>
          <span class="lb-score">${s.score.toLocaleString()}</span>
        </div>
      `).join('');
    }

    renderLeaderboard();

    /* ── Reviews ── */
    let selectedStars = 0;

    document.querySelectorAll('.star-pick').forEach(star => {
      star.addEventListener('mouseenter', () => highlightStars(+star.dataset.v));
      star.addEventListener('mouseleave', () => highlightStars(selectedStars));
      star.addEventListener('click', () => {
        selectedStars = +star.dataset.v;
        highlightStars(selectedStars);
      });
    });

    function highlightStars(n) {
      document.querySelectorAll('.star-pick').forEach((s, i) => {
        s.classList.toggle('lit', i < n);
      });
    }

    document.getElementById('submitReview').addEventListener('click', () => {
      const author = document.getElementById('reviewAuthor').value.trim() || 'Anonyme';
      const text   = document.getElementById('reviewText').value.trim();
      if (!selectedStars) { alert('Choisis une note !'); return; }
      if (!text) { document.getElementById('reviewText').focus(); return; }

      const reviews = load(KEY_REVIEWS, []);
      reviews.unshift({ author, text, stars: selectedStars, date: Date.now() });
      save(KEY_REVIEWS, reviews.slice(0, 100));

      document.getElementById('reviewText').value  = '';
      document.getElementById('reviewAuthor').value = '';
      selectedStars = 0;
      highlightStars(0);

      renderReviews();
    });

    function renderReviews() {
      const reviews = load(KEY_REVIEWS, []);

      /* Average */
      if (reviews.length) {
        const avg = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;
        document.getElementById('avgScore').textContent = avg.toFixed(1);
        document.getElementById('avgStars').textContent = starsStr(avg);
        document.getElementById('ratingCount').textContent = `${reviews.length} avis`;
      } else {
        document.getElementById('avgScore').textContent = '—';
        document.getElementById('avgStars').textContent = '☆☆☆☆☆';
        document.getElementById('ratingCount').textContent = '0 avis';
      }

      /* Bars */
      const counts = [0,0,0,0,0];
      reviews.forEach(r => counts[r.stars - 1]++);
      const max = Math.max(...counts, 1);
      document.getElementById('ratingBars').innerHTML = [5,4,3,2,1].map(n => `
        <div class="rbar-row">
          <span class="rbar-label">${n}</span>
          <div class="rbar-track">
            <div class="rbar-fill" style="width:${Math.round(counts[n-1]/max*100)}%"></div>
          </div>
        </div>
      `).join('');

      /* List */
      const list = document.getElementById('reviewList');
      if (!reviews.length) { list.innerHTML = ''; return; }
      list.innerHTML = reviews.slice(0, 20).map(r => `
        <div class="review-item">
          <div class="review-top">
            <span class="review-author">${escHtml(r.author)}</span>
            <span class="review-stars">${'⭐'.repeat(r.stars)}</span>
          </div>
          <div class="review-text">${escHtml(r.text)}</div>
          <div class="review-date">${formatDate(r.date)}</div>
        </div>
      `).join('');
    }

    renderReviews();
  };

  /* ─── Utilities ─── */
  function starsStr(avg) {
    const full = Math.floor(avg);
    const half = avg - full >= 0.5 ? 1 : 0;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }
})();
