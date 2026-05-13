(function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

// country code (ISO 3166-1 alpha-2 lowercase) → used for flagcdn.com
    const countries = [
      { name:'Afrique du Sud',     code:'za' },
      { name:'Algérie',            code:'dz' },
      { name:'Angola',             code:'ao' },
      { name:'Bénin',              code:'bj' },
      { name:'Botswana',           code:'bw' },        
      { name:'Burkina Faso',       code:'bf' },
      { name:'Burundi',            code:'bi' },
      { name:'Cap-Vert',           code:'cv' },
      { name:'Cameroun',           code:'cm' },
      { name:'République centrafricaine', code:'cf' },
      { name:'Tchad',              code:'td' },
      { name:'Comores',            code:'km' },
      { name:'République du Congo', code:'cg' },
      { name:'République démocratique du Congo', code:'cd' },
      { name:'Côte d’Ivoire',      code:'ci' },
      { name:'Djibouti',           code:'dj' },
      { name:'Égypte',             code:'eg' },
      { name:'Guinée équatoriale', code:'gq' },
      { name:'Érythrée',           code:'er' },        
      { name:'Eswatini',           code:'sz' },
      { name:'Éthiopie',           code:'et' },
      { name:'Gabon',              code:'ga' },
      { name:'Gambie',             code:'gm' },
      { name:'Ghana',              code:'gh' },
      { name:'Guinée',             code:'gn' },
      { name:'Guinée-Bissau',      code:'gw' },
      { name:'Kenya',              code:'ke' },
      { name:'Lesotho',            code:'ls' },        
      { name:'Libéria',            code:'lr' },
      { name:'Libye',              code:'ly' },
      { name:'Madagascar',         code:'mg' },
      { name:'Malawi',             code:'mw' },
      { name:'Mali',               code:'ml' },
      { name:'Mauritanie',         code:'mr' },
      { name:'Maurice',            code:'mu' },
      { name:'Maroc',              code:'ma' },
      { name:'Mozambique',         code:'mz' },
      { name:'Namibie',            code:'na' },
      { name:'Niger',              code:'ne' },
      { name:'Nigeria',            code:'ng' },
      { name:'Rwanda',             code:'rw' },        
      { name:'Sao Tomé-et-Principe', code:'st' },
      { name:'Sénégal',            code:'sn' },
      { name:'Seychelles',         code:'sc' },
      { name:'Sierra Leone',       code:'sl' },
      { name:'Somalie',            code:'so' },
      { name:'Soudan',             code:'sd' },
      { name:'Soudan du Sud',      code:'ss' },
      { name:'Tanzanie',           code:'tz' },
      { name:'Togo',               code:'tg' },
      { name:'Tunisie',            code:'tn' },
      { name:'Ouganda',            code:'ug' },
      { name:'Zambie',             code:'zm' },
      { name:'Zimbabwe',           code:'zw' },
    ];

    function flagUrl(code) {
      // flagcdn.com provides free flag images
      return `https://flagcdn.com/w320/${code}.png`;
    }

    const TOTAL_Q  = 20;
    let questions  = [];
    let current    = 0;
    let score      = 0;
    let streak     = 0;
    let answered   = false;

    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length-1; i>0; i--) {
        const j = Math.floor(Math.random()*(i+1));
        [a[i],a[j]] = [a[j],a[i]];
      }
      return a;
    }

    function generateQuestions() {
      if (window.PW) {
        window.PW.sound.stopBgm();
        window.PW.sound.startBgm('flags_af');
      }
      const pool = shuffle(countries).slice(0, TOTAL_Q);
      questions = pool.map(correct => {
        const distractors = shuffle(countries.filter(c => c.code !== correct.code)).slice(0, 3);
        const options = shuffle([correct, ...distractors]);
        return { correct, options };
      });
    }

    function renderQuestion() {
      const q = questions[current];
      answered = false;

      // Update flag image
      const img    = document.getElementById('flagImg');
      const loader = document.getElementById('flagLoader');
      const box    = document.getElementById('flagBox');

      box.className = 'flag-box';
      loader.classList.remove('hidden');
      img.src = '';

      img.onload = () => { loader.classList.add('hidden'); };
      img.onerror = () => {
        loader.textContent = '🏳️ IMAGE INDISPONIBLE';
      };
      img.src = flagUrl(q.correct.code);
      img.alt = `Drapeau de ${q.correct.name}`;

      document.getElementById('feedback').textContent = '';
      document.getElementById('feedback').className = 'feedback';
      document.getElementById('nextBtn').classList.remove('visible');
      document.getElementById('qNum').textContent = `${current+1} / ${TOTAL_Q}`;
      document.getElementById('progressFill').style.width = `${(current/TOTAL_Q)*100}%`;

      const grid = document.getElementById('answerGrid');
      grid.innerHTML = '';
      q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'ans-btn';
        btn.textContent = opt.name;
        btn.addEventListener('click', () => handleAnswer(btn, opt.name, q.correct.name));
        grid.appendChild(btn);
      });
    }

    function handleAnswer(btn, chosen, correct) {
      if (answered) return;
      answered = true;

      document.querySelectorAll('.ans-btn').forEach(b => {
        b.disabled = true;
        if (b.textContent === correct) b.classList.add('correct');
      });

      const fb  = document.getElementById('feedback');
      const box = document.getElementById('flagBox');

      if (chosen === correct) {
        if (window.PW) window.PW.sound.correct();
        score++;
        streak++;
        btn.classList.add('correct');
        fb.textContent = `✓ CORRECT !${streak > 1 ? ` STREAK ${streak}🔥` : ''}`;
        fb.className = 'feedback correct';
        box.classList.add('correct');
      } else {
        if (window.PW) window.PW.sound.gameOverSfx();
        streak = 0;
        btn.classList.add('wrong');
        fb.textContent = `✗ RATÉ — C'était ${correct}`;
        fb.className = 'feedback wrong';
        box.classList.add('wrong');
      }

      document.getElementById('scoreEl').textContent  = score;
      document.getElementById('streakEl').textContent = `${streak}🔥`;
      document.getElementById('nextBtn').classList.add('visible');
    }

    document.getElementById('nextBtn').addEventListener('click', () => {
      current++;
      if (current >= TOTAL_Q) return showResult();
      renderQuestion();
    });

    function showResult() {
      if (window.PW) window.PW.sound.stopBgm();
      document.getElementById('quizArea').style.display = 'none';
      const rs = document.getElementById('resultScreen');
      rs.classList.add('show');
      document.getElementById('finalScore').textContent = score;
      const pct = score / TOTAL_Q;
      document.getElementById('medal').textContent = pct>=.9?'🥇':pct>=.7?'🥈':pct>=.5?'🥉':'😅';
      document.getElementById('progressFill').style.width = '100%';
      if (window.PixelWave && window.PixelWave.submitScore) window.PixelWave.submitScore(score);
      if (window.PixelWave && window.PixelWave.submitScoreAnon) window.PixelWave.submitScoreAnon(score);
    }

    document.getElementById('restartBtn').addEventListener('click', () => {
      document.getElementById('quizArea').style.display = 'flex';
      document.getElementById('resultScreen').classList.remove('show');
      current=0; score=0; streak=0;
      document.getElementById('scoreEl').textContent  = 0;
      document.getElementById('streakEl').textContent = '0🔥';
      generateQuestions();
      renderQuestion();
    });

    generateQuestions();
    renderQuestion();

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('quizArea', 'fsBtn');
      window.PixelWave.init('flags_af', '#b44fff');
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
            window.PixelWave.promptPseudo('flags_af', function() {});
          }
        }, 100);
      }
    });
