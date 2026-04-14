/* ===========================
   PIXELWAVE — main.js  v3
   =========================== */

const games = [
  { id:'snake',     title:'Snake Game',      desc:'Le classique ! Mange les pommes, grandis, ne te mords pas la queue.',       icon:'🐍', bg:'snake-bg',     tag:'Arcade', stars:'★★★★★', badge:'HOT', badgeClass:'hot', href:'snake.html',     category:'arcade' },
  { id:'pacman',    title:'Pac-Man',          desc:'Mange les pac-dots, fuis les fantômes. WAKA WAKA !',                         icon:'👾', bg:'pacman-bg',    tag:'Arcade', stars:'★★★★★', badge:'HOT', badgeClass:'hot', href:'pacman.html',    category:'arcade' },
  { id:'geodash',   title:'Geometry Dash',   desc:'Saute par-dessus les obstacles. Un cube, des spikes, du skill !',             icon:'🔷', bg:'geodash-bg',   tag:'Arcade', stars:'★★★★★', badge:'NEW', badgeClass:'new', href:'geodash.html',   category:'arcade' },
  { id:'flappy',    title:'Flappy Bird',      desc:'Guide l\'oiseau entre les tuyaux. Plus dur qu\'il n\'y paraît !',            icon:'🐤', bg:'flappy-bg',    tag:'Arcade', stars:'★★★★☆', badge:'NEW', badgeClass:'new', href:'flappy.html',    category:'arcade' },
  { id:'dino',      title:'Dino Runner',      desc:'Saute par-dessus les cactus, esquive les ptérodactyles. Cours !',             icon:'🦕', bg:'dino-bg',      tag:'Arcade', stars:'★★★★☆', badge:'NEW', badgeClass:'new', href:'dino.html',      category:'arcade' },
  { id:'breakout',  title:'Breakout',         desc:'Casse les briques, ne laisse pas la balle tomber.',                           icon:'🧱', bg:'breakout-bg',  tag:'Arcade', stars:'★★★☆☆', badge:null,  badgeClass:'',    href:'breakout.html',  category:'arcade' },
  { id:'tetris',    title:'Tetris',           desc:'Empile les pièces, complète les lignes. La musique hypnotise.',               icon:'🟦', bg:'tetris-bg',    tag:'Puzzle', stars:'★★★★☆', badge:null,  badgeClass:'',    href:'tetris.html',    category:'puzzle' },
  { id:'2048',      title:'2048',             desc:'Combine les tuiles, atteins 2048 ! Facile à apprendre, dur à maîtriser.',    icon:'🔢', bg:'2048-bg',      tag:'Puzzle', stars:'★★★★★', badge:'NEW', badgeClass:'new', href:'2048.html',      category:'puzzle' },
  { id:'memory',    title:'Memory Cards',    desc:'Retourne les cartes, trouve les paires. Entraîne ta mémoire !',               icon:'🃏', bg:'memory-bg',    tag:'Puzzle', stars:'★★★★☆', badge:null,  badgeClass:'',    href:'memory.html',    category:'puzzle' },
  { id:'flags-eu',  title:'Drapeaux Europe', desc:'Connais-tu les 44 drapeaux européens ? Prouve-le !',                          icon:'🇪🇺', bg:'flag-bg',   tag:'Quiz',   stars:'★★★★☆', badge:null,  badgeClass:'',    href:'flags-eu.html',  category:'quiz'   },
  { id:'flags-af',  title:'Drapeaux Afrique',desc:'Connais-tu les 54 drapeaux africains ? Prouve-le !',                          icon:'🌍', bg:'flag-bg',      tag:'Quiz',   stars:'★★★★☆', badge:null,  badgeClass:'',    href:'flags-af.html',  category:'quiz'   },
  { id:'capitales', title:'Quiz Capitales',  desc:'Europe, Afrique, Asie, Amériques — connais-tu les capitales du monde ?',      icon:'🌐', bg:'capitales-bg', tag:'Quiz',   stars:'★★★★☆', badge:null,  badgeClass:'',    href:'capitales.html', category:'quiz'   },
];

let activeFilter = 'all';

function buildCard(game, delay) {
  const card = document.createElement('a');
  card.href  = game.href;
  card.className = 'game-card';
  card.style.animationDelay = delay + 'ms';
  card.dataset.category = game.category;
  const badge = game.badge ? '<span class="badge ' + game.badgeClass + '">' + game.badge + '</span>' : '';
  card.innerHTML =
    '<div class="card-thumb ' + game.bg + '">' +
      '<span class="thumb-icon">' + game.icon + '</span>' +
      badge +
      '<div class="play-overlay"><div class="play-btn">▶ JOUER</div></div>' +
    '</div>' +
    '<div class="card-body">' +
      '<h3>' + game.title + '</h3>' +
      '<p>' + game.desc + '</p>' +
      '<div class="card-meta">' +
        '<span class="tag">' + game.tag + '</span>' +
        '<span class="stars">' + game.stars + '</span>' +
      '</div>' +
    '</div>';
  return card;
}

function renderGrid(filter) {
  filter = filter || 'all';
  const grid = document.getElementById('gameGrid');
  grid.innerHTML = '';
  const list = filter === 'all' ? games : games.filter(function(g){ return g.category === filter; });
  list.forEach(function(g, i){ grid.appendChild(buildCard(g, i * 70)); });
}

function handleSearch(e) {
  const q = e.target.value.toLowerCase().trim();
  const grid = document.getElementById('gameGrid');
  grid.innerHTML = '';
  const res = q
    ? games.filter(function(g){ return g.title.toLowerCase().includes(q) || g.tag.toLowerCase().includes(q) || g.category.toLowerCase().includes(q); })
    : games;
  res.forEach(function(g, i){ grid.appendChild(buildCard(g, i * 70)); });
}

function initChips() {
  document.querySelectorAll('.chip').forEach(function(chip){
    chip.addEventListener('click', function(){
      document.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('active'); });
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderGrid(activeFilter);
    });
  });
}

document.addEventListener('DOMContentLoaded', function(){
  renderGrid();
  initChips();
  var s = document.getElementById('searchInput');
  if (s) s.addEventListener('input', handleSearch);
});
