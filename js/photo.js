(function(){
  "use strict";
  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function processPhoto(img,w,h,settings){
    const c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(w)); c.height=Math.max(1,Math.round(h));
    const cx=c.getContext("2d",{willReadFrequently:true});
    cx.clearRect(0,0,c.width,c.height); cx.drawImage(img,0,0,c.width,c.height);
    let data; try{data=cx.getImageData(0,0,c.width,c.height)}catch(e){return c}
    const d=data.data;
    if(settings.removeLight||settings.autoCutout) removeBg(d,c.width,c.height,settings);
    if(settings.softEdges) feather(d,c.width,c.height,settings);
    cx.putImageData(data,0,0);
    if(settings.shadow) return shadow(c,settings);
    return c;
  }
  function removeBg(d,w,h,settings){
    const samples=[],step=Math.max(1,Math.floor(Math.min(w,h)/80));
    for(let x=0;x<w;x+=step){samples.push(px(d,w,x,0));samples.push(px(d,w,x,h-1))}
    for(let y=0;y<h;y+=step){samples.push(px(d,w,0,y));samples.push(px(d,w,w-1,y))}
    let br=0,bg=0,bb=0; samples.forEach(p=>{br+=p.r;bg+=p.g;bb+=p.b});
    br/=samples.length; bg/=samples.length; bb/=samples.length;
    const tolerance=Number(settings.cutTolerance||42);
    const cx=w/2,cy=h/2,maxD=Math.hypot(cx,cy);
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2];
        const max=Math.max(r,g,b),min=Math.min(r,g,b),diff=max-min,bright=(r+g+b)/3;
        const colorDist=Math.hypot(r-br,g-bg,b-bb);
        const edgeDist=Math.hypot(x-cx,y-cy)/maxD;
        const nearEdgeColor=colorDist<tolerance;
        const veryLight=bright>235&&diff<70;
        const lightNeutral=bright>218&&diff<38;
        const warmLight=r>198&&g>182&&b>155&&diff<65;
        let cut=0;
        if(nearEdgeColor) cut=edgeDist>.40?245:150;
        if(veryLight) cut=Math.max(cut,230);
        if(lightNeutral) cut=Math.max(cut,170);
        if(warmLight) cut=Math.max(cut,120);
        if(cut>0)d[i+3]=Math.max(0,d[i+3]-cut);
      }
    }
    for(let i=3;i<d.length;i+=4){ if(d[i]<32)d[i]=0; else if(d[i]<110)d[i]=Math.round(d[i]*.72); }
  }
  function feather(d,w,h,settings){
    const amount=clamp(Number(settings.feather||45),5,100);
    const edge=Math.max(2,Math.round(Math.min(w,h)*(amount/100)*.30));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const dist=Math.min(x,y,w-1-x,h-1-y);
      const a=clamp(dist/edge,0,1);
      const idx=(y*w+x)*4+3;
      d[idx]=Math.round(d[idx]*a);
    }
  }
  function shadow(source){
    const pad=Math.round(Math.min(source.width,source.height)*.06);
    const out=document.createElement("canvas");
    out.width=source.width+pad*2; out.height=source.height+pad*2;
    const o=out.getContext("2d");
    o.save(); o.shadowColor="rgba(0,0,0,.30)"; o.shadowBlur=pad; o.shadowOffsetX=Math.round(pad*.22); o.shadowOffsetY=Math.round(pad*.32);
    o.drawImage(source,pad,pad); o.restore(); o.drawImage(source,pad,pad);
    return out;
  }
  function px(d,w,x,y){const i=(y*w+x)*4;return{r:d[i],g:d[i+1],b:d[i+2],a:d[i+3]}}
  window.K9Photo={processPhoto};
})();
