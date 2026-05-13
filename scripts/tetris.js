(function(){var t=localStorage.getItem('pw_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

(function(){
    const COLS=10, ROWS=20, CELL=20;
    const canvas=document.getElementById('tetrisCanvas');
    const ctx=canvas.getContext('2d');
    const nCanvas=document.getElementById('nextCanvas');
    const nCtx=nCanvas.getContext('2d');
    const msgEl=document.getElementById('msgEl');

    // Tetromino shapes [rotations][rows][cols]
    const PIECES = {
      I:{ color:'#00f0ff', shape:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
      O:{ color:'#ffe44e', shape:[[1,1],[1,1]] },
      T:{ color:'#b44fff', shape:[[0,1,0],[1,1,1],[0,0,0]] },
      S:{ color:'#00ff88', shape:[[0,1,1],[1,1,0],[0,0,0]] },
      Z:{ color:'#ff3c3c', shape:[[1,1,0],[0,1,1],[0,0,0]] },
      J:{ color:'#ff9900', shape:[[1,0,0],[1,1,1],[0,0,0]] },
      L:{ color:'#0033ff', shape:[[0,0,1],[1,1,1],[0,0,0]] },
    };
    const PIECE_NAMES = Object.keys(PIECES);

    // Scoring
    const LINE_SCORES = [0,100,300,500,800];

    let board, current, next, score, best, level, lines, running, dropTimer, dropInterval, rafId, lastTs;
    let _wasRunningBeforePause = false;

    function randPiece() {
      const name = PIECE_NAMES[Math.floor(Math.random()*PIECE_NAMES.length)];
      const p = PIECES[name];
      return { name, color: p.color, shape: p.shape.map(r=>[...r]), x: Math.floor(COLS/2)-Math.floor(p.shape[0].length/2), y:0 };
    }

    function rotate(shape) {
      const rows=shape.length, cols=shape[0].length;
      const rotated=Array.from({length:cols},()=>Array(rows).fill(0));
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) rotated[c][rows-1-r]=shape[r][c];
      return rotated;
    }

    function valid(shape, ox, oy) {
      for(let r=0;r<shape.length;r++){
        for(let c=0;c<shape[r].length;c++){
          if(!shape[r][c]) continue;
          const nx=ox+c, ny=oy+r;
          if(nx<0||nx>=COLS||ny>=ROWS) return false;
          if(ny>=0 && board[ny][nx]) return false;
        }
      }
      return true;
    }

    function place() {
      current.shape.forEach((row,r)=>row.forEach((v,c)=>{
        if(v && current.y+r>=0) board[current.y+r][current.x+c]=current.color;
      }));

      // Clear lines
      let cleared=0;
      for(let r=ROWS-1;r>=0;r--){
        if(board[r].every(c=>c)){
          board.splice(r,1);
          board.unshift(Array(COLS).fill(0));
          cleared++; r++;
        }
      }
      if(cleared){
        if(window.PW) window.PW.sound.clear();
        const pts = LINE_SCORES[cleared] * level;
        score += pts;
        lines += cleared;
        const _prevLvl = level;
        level = Math.floor(lines/10)+1;
        if(level > _prevLvl && window.PW) window.PW.sound.levelUp();
        if(score>best){ best=score; localStorage.setItem('tetrisBest',best); }
      }

      if(window.PW) window.PW.sound.place();
      current = next;
      next = randPiece();

      // Check game over
      if(!valid(current.shape,current.x,current.y)){
        running=false; gameEnded=true; cancelAnimationFrame(rafId);
        if(window.PW){ window.PW.sound.stopBgm(); window.PW.sound.gameOverSfx(); }
        msgEl.textContent=`GAME OVER — SCORE ${score}`;
        msgEl.style.color='#ff3c3c';
        if(window.PixelWave&&window.PixelWave.submitScore) window.PixelWave.submitScore(score);
        if(window.PixelWave&&window.PixelWave.submitScoreAnon) window.PixelWave.submitScoreAnon(score);
      }
      updateUI();
    }

    function drawBoard() {
      ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);

      // Grid lines
      ctx.strokeStyle='#0a0a2a'; ctx.lineWidth=.5;
      for(let r=0;r<=ROWS;r++){ ctx.beginPath(); ctx.moveTo(0,r*CELL); ctx.lineTo(COLS*CELL,r*CELL); ctx.stroke(); }
      for(let c=0;c<=COLS;c++){ ctx.beginPath(); ctx.moveTo(c*CELL,0); ctx.lineTo(c*CELL,ROWS*CELL); ctx.stroke(); }

      // Board cells
      board.forEach((row,r)=>row.forEach((col,c)=>{
        if(!col) return;
        drawCell(ctx,c,r,col,CELL);
      }));

      // Ghost piece
      let ghostY=current.y;
      while(valid(current.shape,current.x,ghostY+1)) ghostY++;
      current.shape.forEach((row,r)=>row.forEach((v,c)=>{
        if(!v) return;
        ctx.fillStyle=current.color+'33';
        ctx.fillRect((current.x+c)*CELL+1,(ghostY+r)*CELL+1,CELL-2,CELL-2);
      }));

      // Current piece
      current.shape.forEach((row,r)=>row.forEach((v,c)=>{
        if(!v||current.y+r<0) return;
        drawCell(ctx,current.x+c,current.y+r,current.color,CELL);
      }));
    }

    function drawCell(c2d,col,row,color,size){
      c2d.fillStyle=color;
      c2d.shadowColor=color; c2d.shadowBlur=6;
      c2d.fillRect(col*size+1,row*size+1,size-2,size-2);
      // Highlight
      c2d.fillStyle='rgba(255,255,255,.2)';
      c2d.fillRect(col*size+2,row*size+2,size-4,4);
      c2d.shadowBlur=0;
    }

    function drawNext() {
      nCtx.fillStyle='#000'; nCtx.fillRect(0,0,nCanvas.width,nCanvas.height);
      const s=next.shape, cellSize=16;
      const offX=Math.floor((nCanvas.width - s[0].length*cellSize)/2);
      const offY=Math.floor((nCanvas.height - s.length*cellSize)/2);
      s.forEach((row,r)=>row.forEach((v,c)=>{
        if(!v) return;
        nCtx.fillStyle=next.color; nCtx.shadowColor=next.color; nCtx.shadowBlur=5;
        nCtx.fillRect(offX+c*cellSize+1,offY+r*cellSize+1,cellSize-2,cellSize-2);
        nCtx.shadowBlur=0;
      }));
    }

    function draw(){ drawBoard(); drawNext(); }

    /* ── Game loop ── */
    function loop(ts){
      if(!running) return;
      rafId=requestAnimationFrame(loop);
      const dt=ts-lastTs; lastTs=ts;
      dropTimer+=dt;
      if(dropTimer>=dropInterval){
        dropTimer=0;
        if(valid(current.shape,current.x,current.y+1)) current.y++;
        else place();
      }
      draw();
    }

    function calcInterval(){ return Math.max(80, 800 - (level-1)*70); }

    function updateUI(){
      document.getElementById('scoreEl').textContent=score.toLocaleString();
      document.getElementById('bestEl').textContent=best.toLocaleString();
      document.getElementById('levelEl').textContent=level;
      document.getElementById('linesEl').textContent=lines;
      dropInterval=calcInterval();
    }

    function init(){
      board=Array.from({length:ROWS},()=>Array(COLS).fill(0));
      score=0; level=1; lines=0; dropTimer=0;
      best=parseInt(localStorage.getItem('tetrisBest')||'0');
      running=false; gameEnded=false; cancelAnimationFrame(rafId);
      current=randPiece(); next=randPiece();
      dropInterval=calcInterval();
      updateUI(); draw();
      msgEl.textContent='APPUIE SUR START !'; msgEl.style.color='';
      if(window.PW) window.PW.sound.stopBgm();
    }

    /* ── Controls ── */
    document.getElementById('startBtn').addEventListener('click',()=>{
      if(running||gameEnded) return;
      running=true; lastTs=performance.now(); dropTimer=0;
      msgEl.textContent='';
      if(window.PW){ window.PW.sound.stopBgm(); window.PW.sound.startBgm('tetris'); }
      rafId=requestAnimationFrame(loop);
    });
    document.getElementById('resetBtn').addEventListener('click',()=>{ running=false; cancelAnimationFrame(rafId); init(); });

    document.addEventListener('keydown',e=>{
      if(!running) return;
      switch(e.key){
        case 'ArrowLeft': case 'a':
          if(valid(current.shape,current.x-1,current.y)) current.x--; break;
        case 'ArrowRight': case 'd':
          if(valid(current.shape,current.x+1,current.y)) current.x++; break;
        case 'ArrowDown': case 's':
          if(valid(current.shape,current.x,current.y+1)) current.y++; else place();
          dropTimer=0; break;
        case 'ArrowUp': case 'z': case 'Z': {
          const rot=rotate(current.shape);
          // Wall kick: try center, left, right
          for(const kick of [0,-1,1,-2,2]){
            if(valid(rot,current.x+kick,current.y)){ current.shape=rot; current.x+=kick; break; }
          }
          break;
        }
        case ' ':
          e.preventDefault();
          while(valid(current.shape,current.x,current.y+1)) current.y++;
          place(); dropTimer=0; break;
      }
      draw();
    });

    // Mobile buttons
    document.getElementById('mLeft').addEventListener('click',()=>{ if(running&&valid(current.shape,current.x-1,current.y)) current.x--; draw(); });
    document.getElementById('mRight').addEventListener('click',()=>{ if(running&&valid(current.shape,current.x+1,current.y)) current.x++; draw(); });
    document.getElementById('mDown').addEventListener('click',()=>{ if(!running)return; if(valid(current.shape,current.x,current.y+1)) current.y++; else place(); dropTimer=0; draw(); });
    document.getElementById('mRotate').addEventListener('click',()=>{
      if(!running)return;
      const rot=rotate(current.shape);
      for(const kick of [0,-1,1,-2,2]){ if(valid(rot,current.x+kick,current.y)){ current.shape=rot; current.x+=kick; break; } }
      draw();
    });
    document.getElementById('mDrop').addEventListener('click',()=>{
      if(!running)return;
      while(valid(current.shape,current.x,current.y+1)) current.y++;
      place(); dropTimer=0; draw();
    });

    // Touch swipe
    let tx=0,ty=0;
    canvas.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
    canvas.addEventListener('touchend',e=>{
      const dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
      if(!running)return;
      if(Math.abs(dy)>Math.abs(dx)){
        if(dy>30){ while(valid(current.shape,current.x,current.y+1)) current.y++; place(); }
        else if(dy<-30){ const rot=rotate(current.shape); for(const k of [0,-1,1]) if(valid(rot,current.x+k,current.y)){current.shape=rot;current.x+=k;break;} }
      } else {
        if(dx>20&&valid(current.shape,current.x+1,current.y)) current.x++;
        else if(dx<-20&&valid(current.shape,current.x-1,current.y)) current.x--;
      }
      draw();
    },{passive:true});

    setInterval(()=>{ if(!running) draw(); },100);
    init();

    window.PixelWave.initPause({
      isRunning: function(){ return !!running; },
      pause: function(){
        _wasRunningBeforePause = running;
        running = false;
        cancelAnimationFrame(rafId);
      },
      resume: function(){
        if (!_wasRunningBeforePause) return;
        running = true;
        lastTs = performance.now();
        dropTimer = 0;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(loop);
      }
    });
  })();

window.addEventListener('DOMContentLoaded', function() {
      window.PixelWave.initFullscreen('tetrisPlayZone', 'fsBtn');
      window.PixelWave.init('tetris', '#00f0ff');
      (function(){
        var mb=document.getElementById('muteBtn'); if(!mb) return;
        function sync(){ var m=window.PW&&window.PW.sound.isMuted(); mb.textContent=m?'🔇':'🔊'; mb.classList.toggle('muted',!!m); }
        mb.addEventListener('click',function(){ if(window.PW) window.PW.sound.toggleMute(); sync(); });
        sync();
      })();

      // Popup pseudo à chaque clic sur Jouer (si pas encore de pseudo)
      var _btn = document.getElementById('startBtn');
      if (_btn) {
        _btn.addEventListener('click', function(e) {
          if (!localStorage.getItem('pw_pseudo')) {
            e.stopImmediatePropagation();
            e.preventDefault();
            window.PixelWave.promptPseudo('tetris', function() {
              // Relancer le clic après validation
              setTimeout(function() { _btn.click(); }, 50);
            });
          }
        }, true); // capture phase
      }
    });
