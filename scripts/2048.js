// Appliquer le thème sauvegardé immédiatement
    (function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

(function(){
    const SIZE=4;
    let grid, score, best, moves, prevGrid, prevScore;
    const msgEl=document.getElementById('msgEl');
    let paused = false;

    /* ── Helpers ── */
    function empty(){ return Array.from({length:SIZE},()=>Array(SIZE).fill(0)); }
    function clone(g){ return g.map(r=>[...r]); }

    function addTile(g){
      const cells=[];
      for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if(!g[r][c]) cells.push([r,c]);
      if(!cells.length) return;
      const [r,c]=cells[Math.floor(Math.random()*cells.length)];
      g[r][c]=Math.random()<0.9?2:4;
    }

    /* ── Slide one row left, return {row, gained} ── */
    function slideLeft(row){
      let r=row.filter(v=>v), gained=0;
      for(let i=0;i<r.length-1;i++){
        if(r[i]===r[i+1]){ r[i]*=2; gained+=r[i]; r.splice(i+1,1); }
      }
      while(r.length<SIZE) r.push(0);
      return {row:r, gained};
    }

    function rotateRight(g){
      return Array.from({length:SIZE},(_,r)=>Array.from({length:SIZE},(_,c)=>g[SIZE-1-c][r]));
    }
    function rotateLeft(g){
      return Array.from({length:SIZE},(_,r)=>Array.from({length:SIZE},(_,c)=>g[c][SIZE-1-r]));
    }

    function move(dir){
      if (paused) return false;
      let g=clone(grid);
      let gained=0, moved=false;
      // Rotate so we always slide left
      if(dir==='right') g=rotateRight(rotateRight(g));
      if(dir==='up')    g=rotateLeft(g);
      if(dir==='down')  g=rotateRight(g);

      const newG=g.map(row=>{ const res=slideLeft(row); gained+=res.gained; if(res.row.join()!==row.join()) moved=true; return res.row; });

      // Rotate back
      let final=newG;
      if(dir==='right') final=rotateLeft(rotateLeft(newG));
      if(dir==='up')    final=rotateRight(newG);
      if(dir==='down')  final=rotateLeft(newG);

      if(!moved) return false;
      if(window.PW) window.PW.sound.move();
      prevGrid=clone(grid); prevScore=score;
      grid=final; score+=gained; moves++;
      if(gained>0 && window.PW) window.PW.sound.bonus();
      if(score>best){ best=score; localStorage.setItem('2048best',best); }
      addTile(grid);
      render();
      checkEnd();
      return true;
    }

    function checkEnd(){
      // Win
      for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if(grid[r][c]===2048){
        if(window.PW){ window.PW.sound.stopBgm(); window.PW.sound.win(); }
        msgEl.textContent='🎉 2048 ATTEINT !'; msgEl.style.color='#ffe44e';
        if(window.PixelWave&&window.PixelWave.submitScore) window.PixelWave.submitScore(score);
        return;
      }
      // Can still move?
      for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
        if(!grid[r][c]) return;
        if(c<SIZE-1&&grid[r][c]===grid[r][c+1]) return;
        if(r<SIZE-1&&grid[r][c]===grid[r+1][c]) return;
      }
      if(window.PW){ window.PW.sound.stopBgm(); window.PW.sound.gameOverSfx(); }
      msgEl.textContent='GAME OVER — PLUS DE MOUVEMENTS'; msgEl.style.color='#ff3c3c';
      if(window.PixelWave&&window.PixelWave.submitScore) window.PixelWave.submitScore(score);
    }

    /* ── Render ── */
    function render(){
      const board=document.getElementById('board');
      board.innerHTML='';
      for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
        const v=grid[r][c];
        const cell=document.createElement('div');
        cell.className='cell'+(v?' t'+v:'');
        cell.textContent=v||'';
        board.appendChild(cell);
      }
      document.getElementById('scoreEl').textContent=score.toLocaleString();
      document.getElementById('bestEl').textContent=best.toLocaleString();
      document.getElementById('movesEl').textContent=moves;
    }

    /* ── New game ── */
    function newGame(){
      grid=empty(); score=0; moves=0;
      best=parseInt(localStorage.getItem('2048best')||'0');
      prevGrid=null; prevScore=0;
      addTile(grid); addTile(grid);
      msgEl.textContent=''; msgEl.style.color='';
      render();
      if(window.PW){ window.PW.sound.stopBgm(); window.PW.sound.startBgm('2048'); }
    }

    /* ── Undo ── */
    document.getElementById('undoBtn').addEventListener('click',()=>{
      if(!prevGrid) return;
      grid=clone(prevGrid); score=prevScore; moves=Math.max(0,moves-1);
      prevGrid=null;
      msgEl.textContent=''; msgEl.style.color='';
      render();
    });

    document.getElementById('newBtn').addEventListener('click', newGame);

    /* ── Keyboard ── */
    document.addEventListener('keydown',e=>{
      if (paused) return;
      const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
      const d=map[e.key]; if(d){e.preventDefault();move(d);}
    });

    /* ── Touch swipe ── */
    let tx=0,ty=0;
    const bw=document.getElementById('boardWrap');
    bw.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
    bw.addEventListener('touchend',e=>{
      if (paused) return;
      const dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
      if(Math.abs(dx)<20&&Math.abs(dy)<20) return;
      if(Math.abs(dx)>Math.abs(dy)) move(dx>0?'right':'left');
      else move(dy>0?'down':'up');
    },{passive:true});

    newGame();
  })();

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('boardWrap', 'fsBtn');
      window.PixelWave.init('2048', '#ffe44e');
      (function(){
        var mb=document.getElementById('muteBtn'); if(!mb) return;
        function sync(){ var m=window.PW&&window.PW.sound.isMuted(); mb.textContent=m?'🔇':'🔊'; mb.classList.toggle('muted',!!m); }
        mb.addEventListener('click',function(){ if(window.PW) window.PW.sound.toggleMute(); sync(); });
        sync();
      })();

      // Popup pseudo à chaque clic sur Jouer (si pas encore de pseudo)
      var _btn = document.getElementById('newBtn');
      if (_btn) {
        _btn.addEventListener('click', function(e) {
          if (!localStorage.getItem('pw_pseudo')) {
            e.stopImmediatePropagation();
            e.preventDefault();
            window.PixelWave.promptPseudo('2048', function() {
              // Relancer le clic après validation
              setTimeout(function() { _btn.click(); }, 50);
            });
          }
        }, true); // capture phase
      }
    });
