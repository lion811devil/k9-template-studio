(function(){
  "use strict";

  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

  function processPhoto(img, w, h, settings){
    const c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(w));
    c.height=Math.max(1,Math.round(h));
    const cx=c.getContext("2d",{willReadFrequently:true});
    cx.drawImage(img,0,0,c.width,c.height);

    let data;
    try{data=cx.getImageData(0,0,c.width,c.height)}catch(e){return c}
    const d=data.data;

    if(settings.removeLight){
      for(let i=0;i<d.length;i+=4){
        const r=d[i],g=d[i+1],b=d[i+2];
        const max=Math.max(r,g,b),min=Math.min(r,g,b),diff=max-min;
        const bright=(r+g+b)/3;
        const neutral=diff<38;
        const warm=r>198&&g>182&&b>155&&diff<65;
        const veryLight=bright>235&&diff<70;
        if(veryLight || (bright>218&&neutral) || warm){
          let cut=bright>245?255:bright>235?220:bright>225?165:90;
          d[i+3]=Math.max(0,d[i+3]-cut);
        }
      }
    }

    if(settings.softEdges){
      const feather=clamp(Number(settings.feather||45),5,100);
      const edge=Math.max(2,Math.round(Math.min(c.width,c.height)*(feather/100)*0.35));
      for(let y=0;y<c.height;y++){
        for(let x=0;x<c.width;x++){
          const dist=Math.min(x,y,c.width-1-x,c.height-1-y);
          const a=clamp(dist/edge,0,1);
          const idx=(y*c.width+x)*4+3;
          d[idx]=Math.round(d[idx]*a);
        }
      }
    }

    cx.putImageData(data,0,0);
    return c;
  }

  window.K9Photo = {processPhoto};
})();
