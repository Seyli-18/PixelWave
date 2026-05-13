/**
 * PixelWave — audio MP3 uniquement
 * Chemins depuis pages/*.html : ../assets/music/  ../assets/sounds/
 *
 * Fichiers dans assets/sounds/ :
 * bonus, correct, gameover, tap, jump, move, merge, win, wrong, flip,
 * eat, dot, power, bounce, hit, place, clear, levelup, die, laser, explode, crash
 *
 * Fichiers dans assets/music/ : 2048, snake, pacman, breakout, tetris,
 * flappy, geodash, dino, memory, flags-eu, flags-af, capitales, asteroids, blocblast
 */
(function () {
  'use strict';

  /* ── Clés localStorage ── */
  var MUTE_KEY     = 'pw_sfx_muted';   // SFX on/off
  var MUSIC_VOL_KEY = 'pw_music_vol';  // 0-1

  /* ── Valeurs par défaut ── */
  var DEFAULT_MUSIC_VOL = 0.35;
  var SFX_VOL           = 0.62;

  var baseMusic  = '../assets/music/';
  var baseSounds = '../assets/sounds/';

  var BGM_FILE = {
    '2048': '2048', snake: 'snake', pacman: 'pacman',
    breakout: 'breakout', tetris: 'tetris', flappy: 'flappy',
    geodash: 'geodash', dino: 'dino', memory: 'memory',
    flags_eu: 'flags-eu', 'flags-eu': 'flags-eu',
    flags_af: 'flags-af', 'flags-af': 'flags-af',
    capitales: 'capitales', asteroids: 'asteroids', blocblast: 'blocblast'
  };

  var bgmEl = null;

  /* ══════════════════════════════════════════
     PERSISTANCE
  ══════════════════════════════════════════ */
  function isSfxMuted() {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch(e) { return false; }
  }
  function setSfxMuted(m) {
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch(e) {}
  }
  function getMusicVol() {
    try {
      var v = parseFloat(localStorage.getItem(MUSIC_VOL_KEY));
      return isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_MUSIC_VOL;
    } catch(e) { return DEFAULT_MUSIC_VOL; }
  }
  function saveMusicVol(v) {
    var nv = Math.min(1, Math.max(0, isFinite(v) ? v : DEFAULT_MUSIC_VOL));
    try { localStorage.setItem(MUSIC_VOL_KEY, String(nv)); } catch(e) {}
    return nv;
  }

  /* ══════════════════════════════════════════
     MUSIQUE DE FOND
  ══════════════════════════════════════════ */
  function syncBgmVolume() {
    if (bgmEl) bgmEl.volume = getMusicVol();
  }

  function stopBgm() {
    if (!bgmEl) return;
    bgmEl.pause();
    try { bgmEl.currentTime = 0; } catch(e) {}
    bgmEl.removeAttribute('src');
    bgmEl.load();
    bgmEl = null;
  }

  function startBgm(gameId) {
    var stem = BGM_FILE[gameId] || gameId;
    stopBgm();
    bgmEl = new Audio(baseMusic + encodeURIComponent(stem) + '.mp3');
    bgmEl.loop = true;
    bgmEl.setAttribute('playsinline', '');
    bgmEl.preload = 'auto';
    syncBgmVolume();
    bgmEl.addEventListener('error', stopBgm, { once: true });
    var p = bgmEl.play();
    if (p && p.catch) p.catch(stopBgm);
  }

  /* ══════════════════════════════════════════
     SFX
  ══════════════════════════════════════════ */
  function playOneOfMp3(stems, vol, onExhausted) {
    if (isSfxMuted()) { if (onExhausted) onExhausted(); return; }
    if (!stems || !stems.length) { if (onExhausted) onExhausted(); return; }
    vol = (vol == null) ? SFX_VOL : vol;
    var idx = 0;
    function next() {
      if (idx >= stems.length) { if (onExhausted) onExhausted(); return; }
      var a = new Audio(baseSounds + encodeURIComponent(stems[idx++]) + '.mp3');
      a.volume = vol;
      a.setAttribute('playsinline', '');
      a.preload = 'auto';
      var settled = false;
      function fail() { if (settled) return; settled = true; next(); }
      a.addEventListener('error', fail, { once: true });
      var p = a.play();
      if (p && p.catch) p.catch(fail);
    }
    next();
  }

  /* ── Fallbacks quand le fichier exact manque ── */
  function playBonusDistorted(rate, volMult) {
    if (isSfxMuted()) return;
    var a = new Audio(baseSounds + 'bonus.mp3');
    a.volume = SFX_VOL * (volMult || 0.6);
    a.playbackRate = rate || 0.45;
    a.setAttribute('playsinline', '');
    a.preload = 'auto';
    var p = a.play();
    if (p && p.catch) p.catch(function(){});
  }

  /* ══════════════════════════════════════════
     API PUBLIQUE
  ══════════════════════════════════════════ */
  window.PW = window.PW || {};
  window.PW.sound = {
    /* ── État ── */
    isMuted      : function () { return isSfxMuted(); },
    getMusicVolume: function () { return getMusicVol(); },
    setMusicVolume: function (v) { var nv = saveMusicVol(v); syncBgmVolume(); return nv; },

    /* ── Toggles ── */
    toggleMute: function () {
      var m = !isSfxMuted(); setSfxMuted(m); return m;
    },

    /* ── BGM ── */
    startBgm: startBgm,
    stopBgm : stopBgm,

    /* ── SFX ── */
    playSfx  : function (s) { if (typeof s === 'string') s = [s]; playOneOfMp3(s, SFX_VOL); },
    bonus    : function () { playOneOfMp3(['bonus'],   SFX_VOL); },
    correct  : function () { playOneOfMp3(['correct'], SFX_VOL); },

    gameOverSfx: function () {
      // Supporte aussi game-over.mp3 (fichier courant chez toi)
      playOneOfMp3(['gameover', 'game-over'], SFX_VOL,
        function () { playBonusDistorted(0.42, 0.55); }
      );
    },

    tap    : function () { playOneOfMp3(['tap'],   SFX_VOL * 0.75); },
    jump   : function () { playOneOfMp3(['jump'],  SFX_VOL); },
    move   : function () { playOneOfMp3(['move'],  SFX_VOL * 0.45); },
    merge  : function () { playOneOfMp3(['merge'], SFX_VOL * 0.65); },
    win    : function () { playOneOfMp3(['win'],   SFX_VOL); },
    wrong  : function () { playOneOfMp3(['wrong'], SFX_VOL); },
    flip   : function () { playOneOfMp3(['flip'],  SFX_VOL * 0.55); },
    eat    : function () { playOneOfMp3(['eat'],   SFX_VOL); },
    dot    : function () { playOneOfMp3(['dot'],   SFX_VOL * 0.4); },
    power  : function () { playOneOfMp3(['power'], SFX_VOL); },
    bounce : function () { playOneOfMp3(['bounce'],SFX_VOL * 0.55); },
    hit    : function () { playOneOfMp3(['hit'],   SFX_VOL); },
    place  : function () { playOneOfMp3(['place'], SFX_VOL * 0.45); },
    clear  : function () { playOneOfMp3(['clear'], SFX_VOL); },
    levelUp: function () {
      playOneOfMp3(['levelup'], SFX_VOL * 0.92,
        function () { playBonusDistorted(0.78, 0.78); }
      );
    },
    die      : function () { playOneOfMp3(['die', 'gameover', 'game-over'], SFX_VOL, function () { playBonusDistorted(0.42, 0.55); }); },
    shoot    : function () { playOneOfMp3(['laser'],  SFX_VOL); },
    explode  : function () { playOneOfMp3(['explode'],SFX_VOL); },
    shipCrash: function () { playOneOfMp3(['crash'],  SFX_VOL); }
  };

  /* ══════════════════════════════════════════
     PANEL AUDIO (injecté automatiquement)
     S'affiche quand l'utilisateur clique sur
     le bouton #audioBtn (présent sur chaque page).
  ══════════════════════════════════════════ */
  function buildAudioPanel() {
    /* ── Styles ── */
    var css = [
      '#pw-audio-panel{',
        'position:fixed;top:56px;right:10px;z-index:9999;',
        'background:#12122a;border:1px solid #2a2a5a;border-radius:14px;',
        'padding:14px 16px;min-width:210px;',
        'box-shadow:0 8px 32px #00000088;',
        'font-family:"Press Start 2P",monospace;font-size:.44rem;',
        'color:#e8e8ff;display:none;flex-direction:column;gap:10px;',
        'user-select:none;',
      '}',
      '#pw-audio-panel.open{display:flex;}',
      '#pw-audio-panel .pw-ap-row{display:flex;align-items:center;gap:8px;}',
      '#pw-audio-panel .pw-ap-label{flex:0 0 70px;color:#a0a0cc;font-size:.4rem;}',
      '#pw-audio-panel input[type=range]{',
        'flex:1;-webkit-appearance:none;appearance:none;',
        'height:5px;border-radius:4px;outline:none;cursor:pointer;',
        'background:linear-gradient(90deg,#b44fff var(--val,35%),#2a2a5a var(--val,35%));',
      '}',
      '#pw-audio-panel input[type=range]::-webkit-slider-thumb{',
        '-webkit-appearance:none;width:14px;height:14px;',
        'border-radius:50%;background:#b44fff;cursor:pointer;',
        'box-shadow:0 0 6px #b44fff88;',
      '}',
      '#pw-audio-panel .pw-ap-val{min-width:30px;text-align:right;color:#ffe44e;font-size:.44rem;}',
      '#pw-audio-panel .pw-ap-toggle{',
        'display:flex;align-items:center;justify-content:space-between;',
        'cursor:pointer;padding:4px 0;',
      '}',
      '#pw-ap-sfx-dot{',
        'width:11px;height:11px;border-radius:50%;background:#00ff88;',
        'box-shadow:0 0 6px #00ff88;transition:background .2s,box-shadow .2s;',
      '}',
      '#pw-ap-sfx-dot.off{background:#ff3c3c;box-shadow:0 0 6px #ff3c3c;}',
      '#pw-audio-panel .pw-ap-sep{height:1px;background:#2a2a5a;}'
    ].join('');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    /* ── Panneau DOM ── */
    var panel = document.createElement('div');
    panel.id = 'pw-audio-panel';
    panel.innerHTML = [
      /* Volume musique */
      '<div class="pw-ap-row">',
        '<span class="pw-ap-label">🎵 MUSIQUE</span>',
        '<input type="range" id="pw-ap-music" min="0" max="100" step="1" value="35">',
        '<span class="pw-ap-val" id="pw-ap-music-val">35%</span>',
      '</div>',
      '<div class="pw-ap-sep"></div>',
      /* Toggle SFX */
      '<div class="pw-ap-toggle" id="pw-ap-sfx-row">',
        '<span>🔔 EFFETS SONORES</span>',
        '<span id="pw-ap-sfx-dot"></span>',
      '</div>'
    ].join('');
    document.body.appendChild(panel);

    /* ── Références ── */
    var slider   = document.getElementById('pw-ap-music');
    var sliderVal = document.getElementById('pw-ap-music-val');
    var sfxRow   = document.getElementById('pw-ap-sfx-row');
    var sfxDot   = document.getElementById('pw-ap-sfx-dot');

    /* ── Fonctions d'affichage ── */
    function pct(v) { return Math.round(v * 100); }
    function updateSlider(v) {
      var p = pct(v);
      slider.value = p;
      sliderVal.textContent = p + '%';
      slider.style.setProperty('--val', p + '%');
    }
    function updateSfxDot() {
      sfxDot.classList.toggle('off', isSfxMuted());
    }

    /* ── Init ── */
    updateSlider(getMusicVol());
    updateSfxDot();

    /* ── Événements ── */
    slider.addEventListener('input', function () {
      var v = parseInt(this.value, 10) / 100;
      saveMusicVol(v);
      syncBgmVolume();
      updateSlider(v);
    });

    sfxRow.addEventListener('click', function () {
      setSfxMuted(!isSfxMuted());
      updateSfxDot();
      /* Mettre à jour le bouton muteBtn existant si présent */
      var mb = document.getElementById('muteBtn');
      if (mb) {
        mb.textContent = isSfxMuted() ? '🔇' : '🔊';
        mb.classList.toggle('muted', isSfxMuted());
      }
    });

    /* Fermer si clic dehors */
    document.addEventListener('click', function (e) {
      var btn = document.getElementById('audioBtn');
      if (!panel.contains(e.target) && btn && !btn.contains(e.target)) {
        panel.classList.remove('open');
      }
    });

    return panel;
  }

  function initAudioUI() {
    var panel = buildAudioPanel();

    /* ── Bouton #audioBtn → ouvre le panel ── */
    var audioBtn = document.getElementById('audioBtn');
    if (audioBtn) {
      audioBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        panel.classList.toggle('open');
      });
      /* Sync icône au démarrage */
      function syncAudioBtn() {
        var sfxOff = isSfxMuted();
        var vol    = getMusicVol();
        var icon   = sfxOff ? '🔇' : (vol === 0 ? '🎵🚫' : '🎵');
        audioBtn.textContent = icon;
        audioBtn.classList.toggle('muted', sfxOff);
      }
      syncAudioBtn();
    }

    /* ── Rétro-compat : ancien bouton muteBtn (toggle SFX seul) ── */
    var muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
      /* Sync état initial */
      muteBtn.textContent = isSfxMuted() ? '🔇' : '🔊';
      muteBtn.classList.toggle('muted', isSfxMuted());
      muteBtn.addEventListener('click', function () {
        if (window.PW && window.PW.sound) window.PW.sound.toggleMute();
        muteBtn.textContent = isSfxMuted() ? '🔇' : '🔊';
        muteBtn.classList.toggle('muted', isSfxMuted());
        /* Sync dot dans le panel */
        var dot = document.getElementById('pw-ap-sfx-dot');
        if (dot) dot.classList.toggle('off', isSfxMuted());
      });
    }

    /* ── Rétro-compat : ancien bouton musicVolBtn (maintenant ouvre le panel) ── */
    var musicVolBtn = document.getElementById('musicVolBtn');
    if (musicVolBtn) {
      musicVolBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        panel.classList.toggle('open');
      });
      function syncMusicBtn() {
        musicVolBtn.textContent = '🎵 ' + Math.round(getMusicVol() * 100) + '%';
        musicVolBtn.classList.toggle('muted', getMusicVol() === 0);
      }
      syncMusicBtn();
      /* Mettre à jour le bouton quand le slider change */
      var sl = document.getElementById('pw-ap-music');
      if (sl) sl.addEventListener('input', syncMusicBtn);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudioUI);
  } else {
    initAudioUI();
  }
})();
