/* ===========================
   PIXELWAVE — main.js
   =========================== */
 
const games = [
  {
    id: 'snake',
    title: 'Snake Game',
    desc: 'Le classique ! Mange les pommes, grandis, ne te mords pas la queue.',
    icon: '🐍',
    bg: 'snake-bg',
    tag: 'Arcade',
    stars: '★★★★★',
    badge: 'HOT',
    badgeClass: 'hot',
    href: 'snake.html',
    category: 'arcade',
  },
  {
    id: 'flags',
    title: 'Drapeaux Europe',
    desc: 'Connais-tu les 44 drapeaux européens ? Prouve-le !',
    icon: '🏳️',
    bg: 'flag-bg',
    tag: 'Quiz',
    stars: '★★★★☆',
    badge: 'NEW',
    badgeClass: 'new',
    href: 'flags-eu.html',
    category: 'quiz',
  },
  {
    id: 'flags',
    title: 'Drapeaux Afrique',
    desc: 'Connais-tu les 54 drapeaux africains ? Prouve-le !',
    icon: '🏳️',
    bg: 'flag-bg',
    tag: 'Quiz',
    stars: '★★★★☆',
    badge: 'NEW',
    badgeClass: 'new',
    href: 'flags-af.html',
    category: 'quiz',
  },
  {
    id: 'pacman',
    title: 'Pac-Man',
    desc: 'Mange les pac-dots, fuis les fantômes. WAKA WAKA !',
    icon: '👾',
    bg: 'pacman-bg',
    tag: 'Arcade',
    stars: '★★★★★',
    badge: 'HOT',
    badgeClass: 'hot',
    href: 'pacman.html',
    category: 'arcade',
  },
  {
    id: 'tetris',
    title: 'Tetris',
    desc: 'Empile les pièces, complète les lignes. La musique hypnotise.',
    icon: '🟦',
    bg: 'tetris-bg',
    tag: 'Puzzle',
    stars: '★★★★☆',
    badge: 'NEW',
    badgeClass: 'new',
    href: 'tetris.html',
    category: 'puzzle',
    comingSoon: false,
  },
  {
    id: 'breakout',
    title: 'Breakout',
    desc: 'Casse les briques, ne laisse pas la balle tomber.',
    icon: '🧱',
    bg: 'breakout-bg',
    tag: 'Arcade',
    stars: '★★★☆☆',
    badge: null,
    href: 'breakout.html',
    category: 'arcade',
    comingSoon: false,
  },
  {
    id: 'memory',
    title: 'Memory Cards',
    desc: 'Retourne les cartes, trouve les paires. Entraîne ta mémoire !',
    icon: '🃏',
    bg: 'memory-bg',
    tag: 'Puzzle',
    stars: '★★★★☆',
    badge: 'NEW',
    badgeClass: 'new',
    href: 'memory.html',
    category: 'puzzle',
    comingSoon: false,
  },
  {
    id: 'flappy',
    title: 'Flappy Bird',
    desc: 'Guide l\'oiseau entre les tuyaux. C\'est plus dur qu\'il n\'y paraît !',
    icon: '🐤',
    bg: 'flappy-bg',
    tag: 'Arcade',
    stars: '★★★★★',
    badge: 'NEW',
    badgeClass: 'new',
    href: 'flappy.html',
    category: 'arcade',
    comingSoon: false,
  },
  {
    id: 'capitales',
    title: 'Quiz Capitales',
    desc: 'Connais-tu les capitales du monde ? Europe, Afrique, Asie, Amériques…',
    icon: '🌍',
    bg: 'capitales-bg',
    tag: 'Quiz',
    stars: '★★★★☆',
    badge: null,
    href: 'capitales.html',
    category: 'quiz',
    comingSoon: false,
  },
];
 
let activeFilter = 'all';
 
/* ── Build a single card ──────────────────── */
function buildCard(game, delay) {
  const isLink = game.href && !game.comingSoon;
  const card = document.createElement(isLink ? 'a' : 'div');
  if (isLink) { card.href = game.href; }
  card.className = 'game-card';
  card.style.animationDelay = `${delay}ms`;
  card.dataset.category = game.category;
 
  const comingLabel = game.comingSoon
    ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;">
         <span style="font-family:'Press Start 2P',monospace;font-size:.5rem;color:#7070a0;letter-spacing:2px">BIENTÔT</span>
       </div>`
    : `<div class="play-overlay"><div class="play-btn">▶ JOUER</div></div>`;
 
  const badge = game.badge
    ? `<span class="badge ${game.badgeClass}">${game.badge}</span>`
    : '';
 
  card.innerHTML = `
    <div class="card-thumb ${game.bg}">
      <span class="thumb-icon">${game.icon}</span>
      ${badge}
      ${comingLabel}
    </div>
    <div class="card-body">
      <h3>${game.title}</h3>
      <p>${game.desc}</p>
      <div class="card-meta">
        <span class="tag">${game.tag}</span>
        <span class="stars">${game.stars}</span>
      </div>
    </div>
  `;
 
  return card;
}
 
/* ── Render grid ──────────────────────────── */
function renderGrid(filter = 'all') {
  const grid = document.getElementById('gameGrid');
  grid.innerHTML = '';
 
  const filtered = filter === 'all'
    ? games
    : games.filter(g => g.category === filter);
 
  filtered.forEach((game, i) => {
    grid.appendChild(buildCard(game, i * 80));
  });
}
 
/* ── Search ───────────────────────────────── */
function handleSearch(e) {
  const q = e.target.value.toLowerCase().trim();
  const grid = document.getElementById('gameGrid');
  grid.innerHTML = '';
 
  const results = q
    ? games.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.tag.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
      )
    : games;
 
  results.forEach((game, i) => grid.appendChild(buildCard(game, i * 80)));
}
 
/* ── Category chips ───────────────────────── */
function initChips() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderGrid(activeFilter);
    });
  });
}
 
/* ── Init ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderGrid();
  initChips();
 
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.addEventListener('input', handleSearch);
});
