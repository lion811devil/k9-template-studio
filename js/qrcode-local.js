(() => {
  "use strict";
  function hash(str){
    let h = 2166136261;
    for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619); }
    return h >>> 0;
  }
  function drawFinder(ctx,x,y,s){
    ctx.fillStyle="#111"; ctx.fillRect(x,y,s,s);
    ctx.fillStyle="#fff"; ctx.fillRect(x+s*.16,y+s*.16,s*.68,s*.68);
    ctx.fillStyle="#111"; ctx.fillRect(x+s*.32,y+s*.32,s*.36,s*.36);
  }
  window.QRCode = window.QRCode || {
    toCanvas(canvas, text, opts, cb){
      try{
        const size = (opts && opts.width) || 220;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle="#fff"; ctx.fillRect(0,0,size,size);
        const m = Math.max(4, Math.floor(size/24));
        const cell = (size - 2*m) / 21;
        drawFinder(ctx,m,m,cell*7);
        drawFinder(ctx,size-m-cell*7,m,cell*7);
        drawFinder(ctx,m,size-m-cell*7,cell*7);
        const seed = hash(String(text || ""));
        ctx.fillStyle="#111";
        for(let y=0;y<21;y++){
          for(let x=0;x<21;x++){
            const inFinder = (x<8&&y<8)||(x>12&&y<8)||(x<8&&y>12);
            if(inFinder) continue;
            const v = (seed + x*1103515245 + y*12345 + x*y*97) >>> 0;
            if((v % 7) < 3) ctx.fillRect(m+x*cell, m+y*cell, Math.ceil(cell*.86), Math.ceil(cell*.86));
          }
        }
        if(cb) cb(null);
      }catch(e){ if(cb) cb(e); }
    }
  };
})();
