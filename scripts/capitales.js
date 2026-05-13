// Appliquer le thème sauvegardé immédiatement
    (function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

(function(){
    const COUNTRIES = [
      // Europe
      {country:'France',      capital:'Paris',       region:'🇪🇺 Europe'},
      {country:'Allemagne',   capital:'Berlin',      region:'🇪🇺 Europe'},
      {country:'Italie',      capital:'Rome',        region:'🇪🇺 Europe'},
      {country:'Espagne',     capital:'Madrid',      region:'🇪🇺 Europe'},
      {country:'Portugal',    capital:'Lisbonne',    region:'🇪🇺 Europe'},
      {country:'Pays-Bas',    capital:'Amsterdam',   region:'🇪🇺 Europe'},
      {country:'Suède',       capital:'Stockholm',   region:'🇪🇺 Europe'},
      {country:'Norvège',     capital:'Oslo',        region:'🇪🇺 Europe'},
      {country:'Danemark',    capital:'Copenhague',  region:'🇪🇺 Europe'},
      {country:'Finlande',    capital:'Helsinki',    region:'🇪🇺 Europe'},
      {country:'Pologne',     capital:'Varsovie',    region:'🇪🇺 Europe'},
      {country:'Autriche',    capital:'Vienne',      region:'🇪🇺 Europe'},
      {country:'Suisse',      capital:'Berne',       region:'🇪🇺 Europe'},
      {country:'Grèce',       capital:'Athènes',     region:'🇪🇺 Europe'},
      {country:'Roumanie',    capital:'Bucarest',    region:'🇪🇺 Europe'},
      {country:'Hongrie',     capital:'Budapest',    region:'🇪🇺 Europe'},
      // Africa
      {country:'Maroc',       capital:'Rabat',       region:'🌍 Afrique'},
      {country:'Égypte',      capital:'Le Caire',    region:'🌍 Afrique'},
      {country:'Nigeria',     capital:'Abuja',       region:'🌍 Afrique'},
      {country:'Kenya',       capital:'Nairobi',     region:'🌍 Afrique'},
      {country:'Afrique du Sud',capital:'Pretoria',  region:'🌍 Afrique'},
      {country:'Ghana',       capital:'Accra',       region:'🌍 Afrique'},
      {country:'Éthiopie',    capital:'Addis-Abeba', region:'🌍 Afrique'},
      {country:'Tanzanie',    capital:'Dodoma',      region:'🌍 Afrique'},
      {country:'Sénégal',     capital:'Dakar',       region:'🌍 Afrique'},
      {country:'Algérie',     capital:'Alger',       region:'🌍 Afrique'},
      // Asia
      {country:'Japon',       capital:'Tokyo',       region:'🌏 Asie'},
      {country:'Chine',       capital:'Pékin',       region:'🌏 Asie'},
      {country:'Inde',        capital:'New Delhi',   region:'🌏 Asie'},
      {country:'Corée du Sud',capital:'Séoul',       region:'🌏 Asie'},
      {country:'Thaïlande',   capital:'Bangkok',     region:'🌏 Asie'},
      {country:'Vietnam',     capital:'Hanoï',       region:'🌏 Asie'},
      {country:'Indonésie',   capital:'Jakarta',     region:'🌏 Asie'},
      {country:'Pakistan',    capital:'Islamabad',   region:'🌏 Asie'},
      {country:'Turquie',     capital:'Ankara',      region:'🌏 Asie'},
      {country:'Arabie Saoudite',capital:'Riyad',    region:'🌏 Asie'},
      // Americas
      {country:'Brésil',      capital:'Brasilia',    region:'🌎 Amériques'},
      {country:'Argentine',   capital:'Buenos Aires',region:'🌎 Amériques'},
      {country:'Mexique',     capital:'Mexico',      region:'🌎 Amériques'},
      {country:'Canada',      capital:'Ottawa',      region:'🌎 Amériques'},
      {country:'Colombie',    capital:'Bogotá',      region:'🌎 Amériques'},
      {country:'Pérou',       capital:'Lima',        region:'🌎 Amériques'},
      {country:'Chili',       capital:'Santiago',    region:'🌎 Amériques'},
      {country:'Venezuela',   capital:'Caracas',     region:'🌎 Amériques'},
      {country:'Cuba',        capital:'La Havane',   region:'🌎 Amériques'},
      // Oceania
      {country:'Australie',   capital:'Canberra',    region:'🌏 Océanie'},
      {country:'Nouvelle-Zélande',capital:'Wellington',region:'🌏 Océanie'},
      {country:'Papouasie',   capital:'Port Moresby',region:'🌏 Océanie'},
    ];

    const TOTAL_Q  = 20;
    const TIME_PER_Q = 20; // seconds

    let questions=[], current=0, score=0, streak=0, answered=false;
    let timerInt=null, timeLeft=TIME_PER_Q;

    function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

    function generate() {
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.startBgm('capitales');
      }
      const pool = shuffle(COUNTRIES).slice(0, TOTAL_Q);
      questions = pool.map(correct => {
        const distractors = shuffle(COUNTRIES.filter(c => c.capital !== correct.capital)).slice(0, 3);
        const options = shuffle([correct, ...distractors]);
        return { correct, options };
      });
    }

    function renderQ() {
      const q = questions[current];
      answered = false;
      clearInterval(timerInt); timeLeft = TIME_PER_Q;
      _startTimer(q);

      document.getElementById('regionBadge').textContent   = q.correct.region;
      document.getElementById('questionText').textContent  = q.correct.country;
      document.getElementById('questionSub').textContent   = 'Quelle est sa capitale ?';
      document.getElementById('questionCard').className    = 'question-card';
      document.getElementById('feedback').textContent      = '';
      document.getElementById('feedback').className        = 'feedback';
      document.getElementById('nextBtn').classList.remove('visible');
      document.getElementById('qNum').textContent          = (current+1) + '/' + TOTAL_Q;
      document.getElementById('progressFill').style.width  = (current/TOTAL_Q*100) + '%';

      const grid = document.getElementById('answerGrid');
      grid.innerHTML = '';
      q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'ans-btn';
        btn.textContent = opt.capital;
        btn.addEventListener('click', () => handleAnswer(btn, opt.capital, q.correct.capital));
        grid.appendChild(btn);
      });
    }

    function _startTimer(q) {
      document.getElementById('timerFill').style.transition = 'none';
      document.getElementById('timerFill').style.width = '100%';
      setTimeout(() => {
        document.getElementById('timerFill').style.transition = `width ${TIME_PER_Q}s linear`;
        document.getElementById('timerFill').style.width = '0%';
      }, 50);

      timerInt = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(timerInt);
          if (!answered) handleAnswer(null, null, q.correct.capital);
        }
      }, 1000);
    }

    function handleAnswer(btn, chosen, correct) {
      if (answered) return;
      answered = true;
      clearInterval(timerInt);

      document.querySelectorAll('.ans-btn').forEach(b => {
        b.disabled = true;
        if (b.textContent === correct) b.classList.add('correct');
      });

      const fb   = document.getElementById('feedback');
      const card = document.getElementById('questionCard');

      if (chosen === correct) {
        if (window.PW) window.PW.sound.correct();
        score++;
        streak++;
        if(btn) btn.classList.add('correct');
        fb.textContent = '✓ CORRECT !' + (streak > 1 ? ' STREAK ' + streak + '🔥' : '');
        fb.className = 'feedback correct';
        card.classList.add('correct');
      } else {
        if (window.PW) window.PW.sound.gameOverSfx();
        streak = 0;
        if (btn) btn.classList.add('wrong');
        fb.textContent = chosen ? '✗ RATÉ — C\'était ' + correct : '⏱ TEMPS ÉCOULÉ — ' + correct;
        fb.className = 'feedback wrong';
        card.classList.add('wrong');
      }

      document.getElementById('scoreEl').textContent  = score;
      document.getElementById('streakEl').textContent = streak + '🔥';
      document.getElementById('nextBtn').classList.add('visible');
    }

    document.getElementById('nextBtn').addEventListener('click', () => {
      current++;
      if (current >= TOTAL_Q) return showResult();
      renderQ();
    });

    function showResult() {
      clearInterval(timerInt);
      if (window.PW) window.PW.sound.stopBgm();
      document.getElementById('quizArea').style.display = 'none';
      document.getElementById('resultScreen').classList.add('show');
      document.getElementById('finalScore').textContent = score;
      const pct = score / TOTAL_Q;
      document.getElementById('medal').textContent = pct>=.9?'🥇':pct>=.7?'🥈':pct>=.5?'🥉':'😅';
      document.getElementById('progressFill').style.width = '100%';
      if (window.PixelWave && window.PixelWave.submitScore)     window.PixelWave.submitScore(score);
    }

    document.getElementById('restartBtn').addEventListener('click', () => {
      document.getElementById('quizArea').style.display = 'flex';
      document.getElementById('resultScreen').classList.remove('show');
      current=0; score=0; streak=0;
      document.getElementById('scoreEl').textContent  = 0;
      document.getElementById('streakEl').textContent = '0🔥';
      generate(); renderQ();
    });

    generate();
    renderQ();
  })();

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('quizArea', 'fsBtn');
      window.PixelWave.init('capitales', '#00f0ff');
      (function(){
        var mb=document.getElementById('muteBtn'); if(!mb) return;
        function sync(){ var m=window.PW&&window.PW.sound.isMuted(); mb.textContent=m?'🔇':'🔊'; mb.classList.toggle('muted',!!m); }
        mb.addEventListener('click',function(){ if(window.PW) window.PW.sound.toggleMute(); sync(); });
        sync();
      })();

      // Popup pseudo au chargement si pas encore renseigné
      if (!localStorage.getItem('pw_pseudo')) {
        var _iv = setInterval(function() {
          if (window.PixelWave && window.PixelWave.promptPseudo) {
            clearInterval(_iv);
            window.PixelWave.promptPseudo('capitales', function() {});
          }
        }, 100);
      }
    });
