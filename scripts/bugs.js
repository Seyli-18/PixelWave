import { saveReview, getReviews } from './firebase.js';

    /* ── Sévérité ── */
    let selSev = 0;
    const SEV_ICONS = ['','🟡','🟠','🔴','💀'];
    document.querySelectorAll('.sev-btn').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.sev-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        selSev = +b.dataset.s;
      });
    });

    /* ── Submit ── */
    document.getElementById('submitBug').addEventListener('click', async () => {
      const game   = document.getElementById('bugGame').value;
      const desc   = document.getElementById('bugDesc').value.trim();
      const device = document.getElementById('bugDevice').value.trim();
      const author = document.getElementById('bugAuthor').value.trim() || 'Anonyme';
      if (!game)   { alert('Choisis le jeu concerné !'); return; }
      if (!selSev) { alert('Choisis la sévérité !'); return; }
      if (!desc)   { document.getElementById('bugDesc').focus(); return; }

      const btn = document.getElementById('submitBug');
      btn.textContent = 'ENVOI…'; btn.disabled = true;

      // On stocke dans reviews/bugs avec le format : [JEU] Sév.N — description
      const text = '[' + game + '] Sév.' + selSev + '/4 — ' + desc + (device ? ' | Appareil: ' + device : '');
      try {
        await saveReview('bugs', author, text, selSev);
      } catch(e) {
        // Fallback localStorage
        const k = 'pw_bugs';
        const a = JSON.parse(localStorage.getItem(k)||'[]');
        a.unshift({ game, sev: selSev, desc, device, author, ts: Date.now() });
        localStorage.setItem(k, JSON.stringify(a.slice(0, 100)));
      }

      document.getElementById('formCard').style.display = 'none';
      document.getElementById('successCard').classList.add('show');
      btn.textContent = '🐛 ENVOYER'; btn.disabled = false;

      // Recharger les rapports
      loadCommunityReports();
    });

    document.getElementById('anotherBug').addEventListener('click', () => {
      document.getElementById('formCard').style.display = 'block';
      document.getElementById('successCard').classList.remove('show');
      document.getElementById('bugDesc').value = '';
      document.getElementById('bugGame').value = '';
      selSev = 0;
      document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
    });

    /* ── Load community reports from Firebase ── */
    let allReports = [];
    let showCount  = 10;

    async function loadCommunityReports() {
      const list = document.getElementById('communityList');
      list.innerHTML = '<div class="empty-state">CHARGEMENT…</div>';

      try {
        allReports = await getReviews('bugs');
      } catch(e) {
        // Fallback localStorage
        try {
          allReports = JSON.parse(localStorage.getItem('pw_bugs')||'[]').map(b => ({
            author: b.author || 'Anonyme',
            text: '['+b.game+'] Sév.'+b.sev+'/4 — '+b.desc+(b.device?' | '+b.device:''),
            stars: b.sev,
            ts: b.ts
          }));
        } catch { allReports = []; }
      }

      document.getElementById('reportsCount').textContent = allReports.length + ' rapport(s)';
      renderReports();
    }

    function renderReports() {
      const list = document.getElementById('communityList');

      if (!allReports.length) {
        list.innerHTML = '<div class="empty-state">AUCUN RAPPORT ENCORE<br>SOIS LE PREMIER !</div>';
        document.getElementById('loadMoreWrap').style.display = 'none';
        return;
      }

      const toShow = allReports.slice(0, showCount);
      list.innerHTML = toShow.map(r => {
        const sevIcon = ['','🟡','🟠','🔴','💀'][r.stars] || '⚪';
        const date    = _fmtDate(r.ts);
        return `<div class="bug-item">
          <span class="bug-sev-icon">${sevIcon}</span>
          <div style="flex:1;min-width:0">
            <div class="bug-game-tag">Par ${escHtml(r.author)}${date ? ' · ' + date : ''}</div>
            <div class="bug-desc-text">${escHtml(r.text)}</div>
          </div>
        </div>`;
      }).join('');

      const wrap = document.getElementById('loadMoreWrap');
      if (allReports.length > showCount) {
        wrap.style.display = 'block';
      } else {
        wrap.style.display = 'none';
      }
    }

    document.getElementById('loadMoreBtn').addEventListener('click', () => {
      showCount += 10;
      renderReports();
    });

    /* ── Utils ── */
    function escHtml(s) {
      return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function _fmtDate(ts) {
      if (!ts) return '';
      try {
        const d = ts && ts.toDate ? ts.toDate()
                : new Date(typeof ts === 'number' ? ts : (ts.seconds||0)*1000);
        return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
      } catch { return ''; }
    }

    // Appliquer le thème
    const theme = localStorage.getItem('pw_theme');
    if (theme) document.documentElement.setAttribute('data-theme', theme);

    loadCommunityReports();
