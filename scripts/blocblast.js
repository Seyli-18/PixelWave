(function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

(function(){
'use strict';

/* ══════════════════════════════════════
   CONSTANTES
══════════════════════════════════════ */
const COLS = 8, ROWS = 8;

// Palette de couleurs vives
const COLORS = [
  '#ff3cac', // rose
  '#00f0ff', // cyan
  '#ffe44e', // jaune
  '#00ff88', // vert
  '#b44fff', // violet
  '#ff6b35', // orange
  '#3cf0c8', // turquoise
];

// Bibliothèque de pièces (formes en grille, 1=rempli, 0=vide)
const PIECE_DEFS = [
  // ── Carrés ──
  { shape:[[1,1],[1,1]], name:'carré 2x2' },
  { shape:[[1,1,1],[1,1,1],[1,1,1]], name:'carré 3x3' },
  // ── Lignes ──
  { shape:[[1,1,1,1,1]], name:'ligne 5' },
  { shape:[[1,1,1,1]], name:'ligne 4' },
  { shape:[[1,1,1]], name:'ligne 3' },
  { shape:[[1],[1],[1],[1],[1]], name:'colonne 5' },
  { shape:[[1],[1],[1],[1]], name:'colonne 4' },
  { shape:[[1],[1],[1]], name:'colonne 3' },
  // ── L & J ──
  { shape:[[1,0],[1,0],[1,1]], name:'L' },
  { shape:[[0,1],[0,1],[1,1]], name:'J' },
  { shape:[[1,1],[1,0],[1,0]], name:'L inv' },
  { shape:[[1,1],[0,1],[0,1]], name:'J inv' },
  // ── T ──
  { shape:[[1,1,1],[0,1,0]], name:'T haut' },
  { shape:[[0,1,0],[1,1,1]], name:'T bas' },
  { shape:[[1,0],[1,1],[1,0]], name:'T droite' },
  { shape:[[0,1],[1,1],[0,1]], name:'T gauche' },
  // ── S & Z ──
  { shape:[[0,1,1],[1,1,0]], name:'S' },
  { shape:[[1,1,0],[0,1,1]], name:'Z' },
  // ── Coins & petits ──
  { shape:[[1,1],[1,0]], name:'coin TL' },
  { shape:[[1,1],[0,1]], name:'coin TR' },
  { shape:[[1,0],[1,1]], name:'coin BL' },
  { shape:[[0,1],[1,1]], name:'coin BR' },
  { shape:[[1]], name:'1x1' },
  { shape:[[1,1]], name:'1x2' },
  { shape:[[1],[1]], name:'2x1' },
  // ── Croix ──
  { shape:[[0,1,0],[1,1,1],[0,1,0]], name:'croix' },
  // ── U ──
  { shape:[[1,0,1],[1,1,1]], name:'U' },
  { shape:[[1,1,1],[1,0,1]], name:'U inv' },
];

/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
let grid       = [];   // ROWS x COLS, null ou color string
let pieces     = [];   // 3 pièces courantes [{def, color, used}]
let selected   = -1;   // index pièce sélectionnée (-1 = aucune)
let score      = 0;
let best       = parseInt(localStorage.getItem('blocblastBest') || '0');
let totalLines = 0;
let gameOver   = false;

/* ══════════════════════════════════════
   DOM
══════════════════════════════════════ */
const boardEl   = document.getElementById('board');
const piecesRow = document.getElementById('piecesRow');
const scoreEl   = document.getElementById('scoreEl');
const bestEl    = document.getElementById('bestEl');
const linesEl   = document.getElementById('linesEl');
const msgEl     = document.getElementById('msgEl');
const overlay   = document.getElementById('overlay');
const ovScore   = document.getElementById('ovScore');
const ovBtn     = document.getElementById('ovBtn');

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
function init() {
  grid = Array.from({length:ROWS}, () => Array(COLS).fill(null));
  score = 0; totalLines = 0; gameOver = false; selected = -1;
  best = parseInt(localStorage.getItem('blocblastBest') || '0');
  overlay.classList.add('hidden');
  msgEl.textContent = 'SÉLECTIONNE UNE PIÈCE ET PLACE-LA !';
  msgEl.style.color = '';
  dealPieces();
  renderBoard();
  renderPieces();
  updateUI();
  if (window.PW) {
    window.PW.sound.stopBgm();
    window.PW.sound.startBgm('blocblast');
  }
}

/* ══════════════════════════════════════
   PIÈCES
══════════════════════════════════════ */
function randomPiece() {
  const def   = PIECE_DEFS[Math.floor(Math.random() * PIECE_DEFS.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { def, color, used: false };
}

function dealPieces() {
  pieces = [randomPiece(), randomPiece(), randomPiece()];
}

/* ══════════════════════════════════════
   PLACEMENT
══════════════════════════════════════ */
function canPlace(def, row, col) {
  for (let r = 0; r < def.shape.length; r++) {
    for (let c = 0; c < def.shape[r].length; c++) {
      if (!def.shape[r][c]) continue;
      const gr = row + r, gc = col + c;
      if (gr < 0 || gr >= ROWS || gc < 0 || gc >= COLS) return false;
      if (grid[gr][gc] !== null) return false;
    }
  }
  return true;
}

function placePiece(def, color, row, col) {
  for (let r = 0; r < def.shape.length; r++) {
    for (let c = 0; c < def.shape[r].length; c++) {
      if (def.shape[r][c]) {
        grid[row + r][col + c] = color;
      }
    }
  }
}

/* ══════════════════════════════════════
   DÉTECTION ET CLEAR LIGNES/COLONNES
══════════════════════════════════════ */
function checkAndClear() {
  const fullRows = [];
  const fullCols = [];

  for (let r = 0; r < ROWS; r++) {
    if (grid[r].every(c => c !== null)) fullRows.push(r);
  }
  for (let c = 0; c < COLS; c++) {
    if (grid.every(row => row[c] !== null)) fullCols.push(c);
  }

  const cleared = fullRows.length + fullCols.length;
  if (!cleared) return 0;

  // Animer avant d'effacer
  const cells = boardEl.querySelectorAll('.cell');
  const toAnimate = new Set();
  fullRows.forEach(r => {
    for (let c = 0; c < COLS; c++) toAnimate.add(r * COLS + c);
  });
  fullCols.forEach(c => {
    for (let r = 0; r < ROWS; r++) toAnimate.add(r * COLS + c);
  });
  toAnimate.forEach(idx => cells[idx].classList.add('clear-anim'));

  // Effacer après l'animation
  setTimeout(() => {
    fullRows.forEach(r => { grid[r] = Array(COLS).fill(null); });
    fullCols.forEach(c => { grid.forEach(row => { row[c] = null; }); });
    renderBoard();
  }, 250);

  // Score : points exponentiels par combo
  const combo = cleared;
  const pts   = combo === 1 ? 100
              : combo === 2 ? 300
              : combo === 3 ? 600
              : combo === 4 ? 1000
              : 1000 + (combo - 4) * 400;

  score      += pts;
  totalLines += cleared;
  if (score > best) { best = score; localStorage.setItem('blocblastBest', best); }
  updateUI();

  // Son
  if (window.PW) window.PW.sound.clear();
  if (combo >= 2) {
    setTimeout(() => {
      if (window.PW) window.PW.sound.levelUp();
      showCombo(combo);
    }, 80);
  }

  return cleared;
}

/* ══════════════════════════════════════
   VÉRIFICATION GAME OVER
══════════════════════════════════════ */
function checkGameOver() {
  // Peut-on encore placer AU MOINS UNE pièce non utilisée ?
  const remaining = pieces.filter(p => !p.used);
  for (const p of remaining) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (canPlace(p.def, r, c)) return false; // encore possible
      }
    }
  }
  return true; // plus aucune pièce ne peut être placée
}

function triggerGameOver() {
  gameOver = true;
  ovScore.textContent = 'SCORE : ' + score.toLocaleString();
  overlay.classList.remove('hidden');
  if (window.PW) {
    window.PW.sound.stopBgm();
    window.PW.sound.gameOverSfx();
  }
  if (window.PixelWave && window.PixelWave.submitScore) window.PixelWave.submitScore(score);
}

/* ══════════════════════════════════════
   RENDER BOARD
══════════════════════════════════════ */
function renderBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell' + (grid[r][c] ? ' filled' : '');
      if (grid[r][c]) {
        cell.style.background = grid[r][c];
        cell.style.color      = grid[r][c];
      }
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener('click',  onCellClick);
      cell.addEventListener('mouseover', onCellHover);
      cell.addEventListener('touchstart', onCellTouch, {passive:true});
      boardEl.appendChild(cell);
    }
  }
}

/* ══════════════════════════════════════
   RENDER PIÈCES
══════════════════════════════════════ */
function renderPieces() {
  piecesRow.innerHTML = '';
  pieces.forEach((p, i) => {
    const slot = document.createElement('div');
    slot.className = 'piece-slot' + (p.used ? ' used' : '') + (i === selected ? ' selected' : '');

    const rows = p.def.shape.length;
    const cols = p.def.shape[0].length;
    const pg   = document.createElement('div');
    pg.className = 'piece-grid';
    pg.style.gridTemplateColumns = `repeat(${cols}, 16px)`;
    pg.style.gridTemplateRows    = `repeat(${rows}, 16px)`;

    p.def.shape.forEach(row => {
      row.forEach(v => {
        const pc = document.createElement('div');
        pc.className = 'piece-cell' + (v ? '' : ' empty');
        if (v) pc.style.background = p.color;
        pg.appendChild(pc);
      });
    });

    slot.appendChild(pg);
    slot.addEventListener('click', () => selectPiece(i));
    // Touch sur mobile
    slot.addEventListener('touchend', (e) => { e.preventDefault(); selectPiece(i); }, {passive:false});
    piecesRow.appendChild(slot);
  });

  // Griser pièces non plaçables
  updateCantPlace();
}

function updateCantPlace() {
  const slots = piecesRow.querySelectorAll('.piece-slot');
  pieces.forEach((p, i) => {
    if (p.used) return;
    let possible = false;
    outer: for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (canPlace(p.def, r, c)) { possible = true; break outer; }
      }
    }
    if (!possible) slots[i]?.classList.add('cant-place');
    else           slots[i]?.classList.remove('cant-place');
  });
}

/* ══════════════════════════════════════
   SÉLECTION
══════════════════════════════════════ */
function selectPiece(i) {
  if (gameOver || pieces[i].used) return;
  selected = (selected === i) ? -1 : i;
  clearGhost();
  renderPieces();
  msgEl.textContent = selected >= 0
    ? 'CLIQUE SUR LA GRILLE POUR POSER LA PIÈCE !'
    : 'SÉLECTIONNE UNE PIÈCE !';
  msgEl.style.color = '';
  if (selected >= 0 && window.PW) window.PW.sound.flip();
}

/* ══════════════════════════════════════
   GHOST (aperçu placement)
══════════════════════════════════════ */
let ghostCells = [];
function clearGhost() {
  ghostCells.forEach(cell => {
    cell.classList.remove('ghost', 'invalid-ghost');
    cell.style.background = cell.dataset.origBg || '';
    cell.style.color      = cell.dataset.origBg || '';
    cell.style.borderColor = '';
  });
  ghostCells = [];
}

function showGhost(row, col) {
  clearGhost();
  if (selected < 0) return;
  const p   = pieces[selected];
  const valid = canPlace(p.def, row, col);
  const cells = boardEl.querySelectorAll('.cell');

  p.def.shape.forEach((r_, ri) => {
    r_.forEach((v, ci) => {
      if (!v) return;
      const gr = row + ri, gc = col + ci;
      if (gr < 0 || gr >= ROWS || gc < 0 || gc >= COLS) return;
      const idx  = gr * COLS + gc;
      const cell = cells[idx];
      if (!cell) return;
      if (!cell.dataset.origBg) cell.dataset.origBg = cell.style.background || '';
      if (valid) {
        cell.classList.add('ghost');
        cell.style.background = p.color;
        cell.style.color      = p.color;
      } else {
        cell.classList.add('invalid-ghost');
      }
      ghostCells.push(cell);
    });
  });
}

/* ══════════════════════════════════════
   EVENTS GRILLE
══════════════════════════════════════ */
function onCellHover(e) {
  if (selected < 0 || gameOver) return;
  const r = +e.currentTarget.dataset.r;
  const c = +e.currentTarget.dataset.c;
  showGhost(r, c);
}

function onCellClick(e) {
  if (selected < 0 || gameOver) return;
  const r = +e.currentTarget.dataset.r;
  const c = +e.currentTarget.dataset.c;
  tryPlace(r, c);
}

function onCellTouch(e) {
  if (selected < 0 || gameOver) return;
  const r = +e.currentTarget.dataset.r;
  const c = +e.currentTarget.dataset.c;
  showGhost(r, c);
  tryPlace(r, c);
}

/* ══════════════════════════════════════
   PLACEMENT EFFECTIF
══════════════════════════════════════ */
function tryPlace(row, col) {
  const p = pieces[selected];
  if (!canPlace(p.def, row, col)) {
    msgEl.textContent = 'IMPOSSIBLE ICI !';
    msgEl.style.color = '#ff3c3c';
    if (window.PW) window.PW.sound.wrong();
    return;
  }

  clearGhost();
  placePiece(p.def, p.color, row, col);
  p.used = true;

  // Score de placement : nombre de blocs posés
  const blocks = p.def.shape.flat().filter(v => v).length;
  score += blocks * 5;
  if (score > best) { best = score; localStorage.setItem('blocblastBest', best); }

  if (window.PW) window.PW.sound.hit();

  selected = -1;
  renderBoard();
  updateUI();

  // Effacer les lignes/colonnes complètes
  setTimeout(() => {
    checkAndClear();

    // Toutes les pièces utilisées ? Distribuer de nouvelles
    if (pieces.every(p => p.used)) {
      setTimeout(() => {
        dealPieces();
        renderPieces();
        msgEl.textContent = 'NOUVELLES PIÈCES !';
        msgEl.style.color = '#00ff88';
        setTimeout(() => {
          msgEl.textContent = 'SÉLECTIONNE UNE PIÈCE ET PLACE-LA !';
          msgEl.style.color = '';
        }, 900);
      }, 300);
    } else {
      renderPieces();
      msgEl.textContent = 'SÉLECTIONNE UNE PIÈCE ET PLACE-LA !';
      msgEl.style.color = '';
      // Game over check (légèrement différé pour laisser le clear s'appliquer)
      setTimeout(() => {
        if (checkGameOver()) triggerGameOver();
      }, 320);
    }
  }, 30);
}

/* ══════════════════════════════════════
   COMBO POPUP
══════════════════════════════════════ */
function showCombo(n) {
  const el = document.createElement('div');
  el.className = 'combo-pop';
  el.textContent = n + 'x COMBO !';
  el.style.left = (window.innerWidth / 2 - 60) + 'px';
  el.style.top  = (document.getElementById('boardWrap').getBoundingClientRect().top + 60) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

/* ══════════════════════════════════════
   UI
══════════════════════════════════════ */
function updateUI() {
  scoreEl.textContent = score.toLocaleString();
  bestEl.textContent  = best.toLocaleString();
  linesEl.textContent = totalLines;
}

/* ══════════════════════════════════════
   BOUTONS
══════════════════════════════════════ */
document.getElementById('resetBtn').addEventListener('click', () => {
  clearGhost();
  init();
});
ovBtn.addEventListener('click', () => {
  clearGhost();
  init();
});

/* ══════════════════════════════════════
   VIDER GHOST QUAND SOURIS SORT
══════════════════════════════════════ */
boardEl.addEventListener('mouseleave', clearGhost);

/* ══════════════════════════════════════
   DÉMARRAGE
══════════════════════════════════════ */
init();

})(); // fin IIFE

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('boardWrap', 'fsBtn');
      window.PixelWave.init('blocblast', '#b44fff');

      // Popup pseudo avant le premier score
      var _origTrigger = document.getElementById('resetBtn');
      // On hook le game over btn aussi
      document.getElementById('ovBtn').addEventListener('click', function(e) {
        if (!localStorage.getItem('pw_pseudo')) {
          e.stopImmediatePropagation();
          e.preventDefault();
          window.PixelWave.promptPseudo('blocblast', function() {
            setTimeout(function() { document.getElementById('ovBtn').click(); }, 50);
          });
        }
      }, true);

      // Bouton mute
      (function(){
        var mb = document.getElementById('muteBtn');
        if (!mb) return;
        function sync(){ var m = window.PW && window.PW.sound.isMuted(); mb.textContent = m ? '🔇' : '🔊'; mb.classList.toggle('muted', !!m); }
        mb.addEventListener('click', function(){ if(window.PW) window.PW.sound.toggleMute(); sync(); });
        sync();
      })();
    });
