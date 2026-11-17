/* Original material-inspired frame artwork, drawn at output resolution. */
window.K9_FRAME_VERSION = "4.9.5";
window.K9PremiumFrames = (()=>{
  const materials={
    aurum:{base:['#58340e','#e9c16e','#fff0b0','#a46b20','#e7bd65','#402305'],kind:'engrave',width:48,trim:'#e7bf68'},
    silver:{base:['#424b54','#adb7bf','#f5f8fc','#8b969f','#dbe2e8','#303a43'],kind:'brush',width:37,trim:'#dce6ed'},
    regal:{base:['#070e20','#233e70','#4b6a9c','#10234a','#294a78','#060c19'],kind:'enamel',width:58,trim:'#e2b660'},
    walnut:{base:['#321b11','#89512c','#bc8851','#5e351c','#9b6237','#29160c'],kind:'wood',width:56,trim:'#c9a56e'},
    carbon:{base:['#131c1e','#3b4648','#5d6966','#202b2c','#43514c','#101718'],kind:'carbon',width:47,trim:'#a6b599'},
    bronze:{base:['#39251b','#96623c','#dbac77','#6a4830','#b37c50','#301d16'],kind:'patina',width:49,trim:'#d6ae78'},
    forensic:{base:['#26313b','#6e7f8d','#c0ccd3','#4e5f6d','#8699a5','#24303b'],kind:'ruler',width:51,trim:'#d5b56a'},
    signal:{base:['#081524','#23506f','#4ba4be','#16374e','#2f728f','#07121d'],kind:'circuit',width:44,trim:'#8edcf0'},
    leather:{base:['#372117','#87573b','#b77e54','#633e29','#9c6849','#27170e'],kind:'stitch',width:53,trim:'#f2d2a3'},
    marble:{base:['#b5b8b8','#e1e1dc','#faf9f1','#c4c4bf','#ece8dd','#989d9c'],kind:'vein',width:58,trim:'#b28b4e'},
    laurel:{base:['#3e4732','#6b7652','#a3a67a','#4d583c','#7b865d','#283224'],kind:'leaves',width:47,trim:'#e7c879'},
    porcelain:{base:['#a99089','#e5d3cb','#fff4eb','#c9aaa1','#f3ded6','#8e6b62'],kind:'petal',width:46,trim:'#bc8172'},
    rescue:{base:['#4d5259','#aab5bd','#f6fafb','#849199','#d6dfe3','#333b43'],kind:'rescue',width:46,trim:'#9f2c36'},
    obsidian:{base:['#05070a','#272d37','#555e68','#15191f','#343e49','#030507'],kind:'lacquer',width:55,trim:'#d4dbe4'}
  };
  const line=(g,x,y,x2,y2,c,w=1)=>{g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();};
  const poly=(g,pts,fill)=>{g.fillStyle=fill;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
  function draw(g,W,H,id){
    const m=materials[id];if(!m)return;
    const d=12,b=m.width,edge=d+b;g.save();g.lineJoin='miter';g.lineCap='round';
    // Four miter-cut strips with independently lit bevels; the center is never painted.
    const sides=[{L:W,transform:()=>{}},{L:H,transform:()=>{g.translate(W,0);g.rotate(Math.PI/2);}},{L:W,transform:()=>{g.translate(W,H);g.rotate(Math.PI);}},{L:H,transform:()=>{g.translate(0,H);g.rotate(-Math.PI/2);}}];
    const rng=(n)=>{let t=Math.imul(n+37,2654435761)>>>0;t^=t>>>15;return (t>>>0)/4294967295;};
    for(let side=0;side<4;side++){
      const {L,transform}=sides[side];g.save();transform();
      g.beginPath();g.moveTo(d,d);g.lineTo(L-d,d);g.lineTo(L-edge,edge);g.lineTo(edge,edge);g.closePath();g.clip();
      const gr=g.createLinearGradient(0,d,0,edge);m.base.forEach((c,i)=>gr.addColorStop([0,.12,.25,.48,.74,1][i],c));g.fillStyle=gr;g.fillRect(d,d,L-2*d,b);
      // Microstructure follows each material instead of repeating a generic ornament.
      const y=d+b*.5;
      if(m.kind==='wood'||m.kind==='vein'){
        for(let i=0;i<(m.kind==='wood'?21:9);i++){
          const yy=d+4+(b-8)*rng(i+side*50);g.strokeStyle=m.kind==='wood'?'#2e170d55':'#646f7655';g.lineWidth=m.kind==='wood'?1.2:1.8;
          g.beginPath();g.moveTo(d,yy);for(let x=d;x<L;x+=100){const z=yy+Math.sin(x*.018+i)*3+Math.sin(x*.006+i*2)*6;g.quadraticCurveTo(x+50,z+4,x+100,z);}g.stroke();
        }
      }else if(m.kind==='carbon'){
        for(let x=d;x<L;x+=13)for(let yy=d+6;yy<edge-5;yy+=10){g.fillStyle=((Math.floor((x-d)/13)+Math.floor((yy-d)/10))%2)?'#b7c6bd26':'#00000045';g.fillRect(x,yy,12,8);line(g,x+2,yy+2,x+10,yy+2,'#d8e7d220',.9);}
      }else if(m.kind==='brush'||m.kind==='ruler'||m.kind==='rescue'||m.kind==='patina'){
        for(let i=0;i<95;i++){const yy=d+3+rng(i+side*100)* (b-6),x=d+rng(i*3+side*51)*(L-d*2);line(g,x,yy,Math.min(L-d,x+20+rng(i*5)*140),yy,i%2?'#ffffff22':'#00000021',.7);}
      }else if(m.kind==='stitch'){
        for(let i=0;i<L/5;i++){const x=d+rng(i+side*1000)*(L-2*d),yy=d+5+rng(i*2+8)*(b-10);g.fillStyle='#1b100d30';g.beginPath();g.arc(x,yy,1.15,0,Math.PI*2);g.fill();}
      }
      // Fine inner / outer metal edges.
      line(g,d,d+2,L-d,d+2,'#ffffff88',1.8);line(g,d,d+5,L-d,d+5,m.trim,2);line(g,d,edge-5,L-d,edge-5,m.trim,2.5);line(g,d,edge-1,L-d,edge-1,'#00000077',1.5);
      const start=edge+18,end=L-edge-18;
      switch(m.kind){
        case 'engrave':case 'leaves':
          line(g,start,y,end,y,m.trim,1.7);
          for(let x=start+9;x<end-10;x+=29){g.save();g.translate(x,y);for(const k of [-1,1]){g.save();g.scale(1,k);const leaf=g.createLinearGradient(0,-13,0,4);leaf.addColorStop(0,'#fff3ba');leaf.addColorStop(.5,m.trim);leaf.addColorStop(1,'#725019');g.fillStyle=leaf;g.beginPath();g.moveTo(-10,0);g.quadraticCurveTo(2,-18,17,-10);g.quadraticCurveTo(9,1,-10,0);g.fill();g.restore();}g.restore();}break;
        case 'enamel':case 'lacquer':
          for(let x=start+16;x<end-15;x+=70){poly(g,[[x-9,y],[x,y-10],[x+9,y],[x,y+10]],m.trim);poly(g,[[x-5,y],[x,y-6],[x+5,y],[x,y+6]],m.base[0]);}line(g,start,y,end,y,m.trim+'99',1);break;
        case 'wood':
          for(let x=start+15;x<end-15;x+=38){poly(g,[[x-14,y],[x,y-10],[x+14,y],[x,y+10]],'#d3b17e');poly(g,[[x-8,y],[x,y-5],[x+8,y],[x,y+5]],'#3f2519');}break;
        case 'ruler':
          for(let x=start;x<end;x+=12){const tick=Math.round((x-start)/12);line(g,x,edge-9,x,edge-(tick%5===0?27:18),m.trim,tick%5===0?2.2:1);if(tick%10===0){g.fillStyle='#e8eef1';g.font='10px Arial';g.textAlign='center';g.fillText(String(tick),x,d+16);}}break;
        case 'circuit':
          for(let x=start+12;x<end-36;x+=83){line(g,x,y-10,x+22,y-10,m.trim,2);line(g,x+22,y-10,x+33,y+7,m.trim,2);line(g,x+33,y+7,x+63,y+7,m.trim,2);g.fillStyle=m.trim;g.beginPath();g.arc(x+63,y+7,3,0,Math.PI*2);g.fill();}break;
        case 'stitch':
          g.setLineDash([8,6]);line(g,start,d+13,end,d+13,m.trim,2);line(g,start,edge-13,end,edge-13,m.trim,2);g.setLineDash([]);break;
        case 'petal':
          for(let x=start+18;x<end-18;x+=56){g.fillStyle='#fdf2e6';g.strokeStyle=m.trim;g.lineWidth=1.3;for(let a=0;a<4;a++){g.save();g.translate(x,y);g.rotate(a*Math.PI/2);g.beginPath();g.ellipse(0,-7,4,9,0,0,Math.PI*2);g.fill();g.stroke();g.restore();}g.fillStyle=m.trim;g.beginPath();g.arc(x,y,3,0,Math.PI*2);g.fill();}break;
        case 'rescue':
          for(let x=start;x<end-30;x+=108){poly(g,[[x,y-10],[x+44,y-10],[x+29,y+10],[x-15,y+10]],m.trim);line(g,x+50,y,x+82,y,'#dfe6ec',2);}break;
        case 'carbon':case 'patina':case 'brush':
          for(let x=start+24;x<end-20;x+=130){g.fillStyle='#10191a';g.beginPath();g.arc(x,y,6,0,Math.PI*2);g.fill();const r=g.createRadialGradient(x-2,y-2,0,x,y,5);r.addColorStop(0,'#f7f8ee');r.addColorStop(1,m.base[3]);g.fillStyle=r;g.beginPath();g.arc(x,y,4.5,0,Math.PI*2);g.fill();line(g,x-2.5,y+1,x+2.5,y-1,'#333333',1);}break;
      }
      g.restore();
    }
    // Corner joints and small metallic rivets / inlays. No drawing beyond 76 units.
    for(const [x,y,sx,sy] of [[d,d,1,1],[W-d,d,-1,1],[W-d,H-d,-1,-1],[d,H-d,1,-1]]){
      g.save();g.translate(x,y);g.scale(sx,sy);
      if(['carbon','forensic','signal','rescue','silver'].includes(id)){
        poly(g,[[0,0],[b+8,0],[b*.72,13],[13,b*.72],[0,b+8]],m.base[0]);line(g,4,4,b+1,4,m.trim,2);line(g,4,4,4,b+1,m.trim,2);
        for(const [cx,cy] of [[13,13],[b*.65,9],[9,b*.65]]){const r=g.createRadialGradient(cx-1.5,cy-1.5,0,cx,cy,4.5);r.addColorStop(0,'#ffffff');r.addColorStop(1,'#393e40');g.fillStyle=r;g.beginPath();g.arc(cx,cy,4.5,0,Math.PI*2);g.fill();}
      }else{
        const c=g.createLinearGradient(0,0,b,b);c.addColorStop(0,m.trim);c.addColorStop(.5,m.base[2]);c.addColorStop(1,m.base[0]);poly(g,[[0,0],[b,0],[b*.70,b*.70],[0,b]],c);
        g.strokeStyle=m.trim;g.lineWidth=2;g.beginPath();g.moveTo(6,b*.8);g.quadraticCurveTo(b*.70,b*.72,b*.8,6);g.stroke();
        if(['aurum','regal','laurel','porcelain','bronze','obsidian'].includes(id)){
          g.strokeStyle=m.trim;g.lineWidth=1.7;for(let k=0;k<3;k++){g.beginPath();g.moveTo(9+k*4,b-5);g.bezierCurveTo(7,b*.28,b*.28,7,b-5,9+k*4);g.stroke();}
        }
      }
      g.restore();
    }
    g.restore();
  }
  return Object.freeze({draw,ids:Object.keys(materials)});
})();
