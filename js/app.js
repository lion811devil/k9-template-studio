(() => {
  const canvas = document.getElementById("certCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  let project = {
    template: "premium-park",
    objects: [],
    selectedId: null
  };

  const status = (msg) => document.getElementById("status").textContent = msg;

  const uid = () => "obj_" + Math.random().toString(36).slice(2, 10);

  function defaultObjects() {
    return [
      {id:uid(), type:"text", role:"title", text:"ATTESTATO DI PARTECIPAZIONE", x:800, y:230, size:64, color:"#17324d", align:"center", weight:"900", rot:0},
      {id:uid(), type:"text", role:"name", text:"Nome Cognome e Nome Cane", x:800, y:425, size:58, color:"#111111", align:"center", weight:"900", rot:0},
      {id:uid(), type:"text", role:"desc", text:"hanno partecipato come clienti nel corso dogsitter anno 2026", x:800, y:520, size:34, color:"#2d2d2d", align:"center", weight:"600", rot:0, maxWidth:1050},
      {id:uid(), type:"text", role:"sign", text:"Napoletano Academy", x:800, y:860, size:34, color:"#17324d", align:"center", weight:"800", rot:0},
      {id:uid(), type:"seal", x:1290, y:800, r:92, color:"#d7a84d", label:"2026"},
      {id:uid(), type:"qr", x:178, y:792, size:150}
    ];
  }

  function resetProject() {
    project = { template:"premium-park", objects: defaultObjects(), selectedId:null };
    saveLocal();
    render();
    status("Progetto V8 inizializzato.");
  }

  function drawTemplate(name) {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0,0,W,H);

    if (name === "premium-park") {
      const g = ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,"#f8fff7"); g.addColorStop(.55,"#ffffff"); g.addColorStop(1,"#eef8ec");
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      frame("#355f3a","#d7a84d");
      ribbon("#2d7a42","#d7a84d");
      pawPattern("#e6f2e5");
    }

    if (name === "tactical-gold") {
      const g = ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,"#0a121b"); g.addColorStop(1,"#182536");
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      frame("#d7a84d","#7d5b20");
      cornerTech("#d7a84d");
      ctx.fillStyle = "rgba(255,255,255,.94)";
      roundRect(130,145,W-260,H-290,34,true,false);
    }

    if (name === "clean-white") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0,0,W,H);
      frame("#111111","#d7a84d");
      ctx.fillStyle = "#f4f4f4";
      roundRect(110,118,W-220,H-236,28,true,false);
      ctx.fillStyle = "#ffffff";
      roundRect(140,148,W-280,H-296,22,true,false);
    }

    if (name === "orange-neon") {
      const g = ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,"#130b05"); g.addColorStop(.55,"#fffaf3"); g.addColorStop(1,"#1d0f05");
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      frame("#ff7a1a","#d7a84d");
      neonLines();
      ctx.fillStyle = "rgba(255,255,255,.95)";
      roundRect(125,140,W-250,H-280,34,true,false);
    }
  }

  function frame(a,b){
    ctx.lineWidth = 8; ctx.strokeStyle = a; roundRect(42,42,W-84,H-84,28,false,true);
    ctx.lineWidth = 3; ctx.strokeStyle = b; roundRect(72,72,W-144,H-144,24,false,true);
    ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(0,0,0,.28)"; roundRect(96,96,W-192,H-192,18,false,true);
  }

  function ribbon(a,b){
    ctx.fillStyle = a; roundRect(215,120,W-430,78,24,true,false);
    ctx.fillStyle = b; roundRect(300,110,W-600,16,8,true,false);
    ctx.fillStyle = b; roundRect(300,192,W-600,16,8,true,false);
  }

  function pawPattern(color){
    ctx.fillStyle = color;
    for(let x=130;x<W;x+=185){
      for(let y=130;y<H;y+=160){
        ctx.globalAlpha=.28;
        ctx.beginPath(); ctx.arc(x,y,12,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x-18,y-18,7,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x,y-23,7,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+18,y-18,7,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      }
    }
  }

  function cornerTech(color){
    ctx.strokeStyle=color; ctx.lineWidth=5;
    [[95,95,240,95,95,240],[W-95,95,W-240,95,W-95,240],[95,H-95,240,H-95,95,H-240],[W-95,H-95,W-240,H-95,W-95,H-240]].forEach(p=>{
      ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[2],p[3]);ctx.moveTo(p[0],p[1]);ctx.lineTo(p[4],p[5]);ctx.stroke();
    });
  }

  function neonLines(){
    ctx.save();
    ctx.strokeStyle = "rgba(255,122,26,.55)";
    ctx.lineWidth = 5;
    for(let i=0;i<8;i++){
      ctx.beginPath(); ctx.moveTo(120+i*90,92); ctx.lineTo(40+i*90,270); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W-120-i*90,H-92); ctx.lineTo(W-40-i*90,H-270); ctx.stroke();
    }
    ctx.restore();
  }

  function roundRect(x,y,w,h,r,fill,stroke){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
    if(fill) ctx.fill();
    if(stroke) ctx.stroke();
  }

  function drawObject(o) {
    ctx.save();
    ctx.translate(o.x,o.y);
    ctx.rotate((o.rot || 0) * Math.PI / 180);

    if(o.type === "text"){
      ctx.fillStyle = o.color || "#111";
      ctx.font = `${o.weight || "700"} ${o.size || 36}px Georgia, 'Times New Roman', serif`;
      ctx.textAlign = o.align || "center";
      ctx.textBaseline = "middle";
      wrapText(o.text || "", 0, 0, o.maxWidth || 1200, (o.size || 36)*1.25);
    }

    if(o.type === "image" && o.img){
      ctx.drawImage(o.img, -o.w/2, -o.h/2, o.w, o.h);
    }

    if(o.type === "photoFrame"){
      ctx.strokeStyle=o.color || "#d7a84d"; ctx.lineWidth=8;
      roundRect(-o.w/2,-o.h/2,o.w,o.h,22,false,true);
    }

    if(o.type === "logoCircle"){
      ctx.strokeStyle=o.color || "#17324d"; ctx.lineWidth=6;
      ctx.beginPath(); ctx.arc(0,0,o.r,0,Math.PI*2); ctx.stroke();
      ctx.font="800 30px Arial"; ctx.fillStyle=o.color || "#17324d"; ctx.textAlign="center"; ctx.fillText("LOGO",0,10);
    }

    if(o.type === "badge" || o.type === "seal"){
      const r=o.r || 80;
      ctx.fillStyle=o.color || "#d7a84d";
      ctx.beginPath();
      for(let i=0;i<32;i++){
        const ang=i*Math.PI/16, rad=i%2? r*0.92:r*1.08;
        ctx.lineTo(Math.cos(ang)*rad, Math.sin(ang)*rad);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(0,0,r*.7,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=o.color || "#d7a84d"; ctx.lineWidth=5; ctx.stroke();
      ctx.fillStyle="#17324d"; ctx.font="900 34px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(o.label || "K9",0,0);
    }

    if(o.type === "qr"){
      const s=o.size || 150;
      ctx.fillStyle="#fff"; ctx.fillRect(-s/2,-s/2,s,s);
      ctx.strokeStyle="#111"; ctx.lineWidth=3; ctx.strokeRect(-s/2,-s/2,s,s);
      ctx.fillStyle="#111";
      for(let i=0;i<7;i++) for(let j=0;j<7;j++) if((i*j+j)%3===0) ctx.fillRect(-s/2+12+i*18,-s/2+12+j*18,13,13);
      ctx.font="700 18px Arial"; ctx.textAlign="center"; ctx.fillText("QR",0,s/2-15);
    }

    if(o.type === "line"){
      ctx.strokeStyle=o.color || "#d7a84d"; ctx.lineWidth=o.h || 4;
      ctx.beginPath(); ctx.moveTo(-o.w/2,0); ctx.lineTo(o.w/2,0); ctx.stroke();
    }

    if(project.selectedId === o.id){
      ctx.strokeStyle="#ff7a1a"; ctx.lineWidth=3; ctx.setLineDash([10,7]);
      const b = bounds(o);
      ctx.strokeRect(b.x-o.x,b.y-o.y,b.w,b.h);
    }

    ctx.restore();
  }

  function wrapText(text, x, y, maxWidth, lineHeight){
    const words = String(text).split(" ");
    let line = "", lines = [];
    for(const w of words){
      const test = line ? line + " " + w : w;
      if(ctx.measureText(test).width > maxWidth && line){
        lines.push(line); line = w;
      } else line = test;
    }
    lines.push(line);
    const startY = y - ((lines.length-1)*lineHeight)/2;
    lines.forEach((l,i)=>ctx.fillText(l,x,startY+i*lineHeight));
  }

  function bounds(o){
    if(o.type==="text") return {x:o.x-(o.maxWidth||900)/2,y:o.y-(o.size||36),w:o.maxWidth||900,h:(o.size||36)*2};
    if(o.type==="image" || o.type==="photoFrame") return {x:o.x-o.w/2,y:o.y-o.h/2,w:o.w,h:o.h};
    if(o.type==="qr") return {x:o.x-o.size/2,y:o.y-o.size/2,w:o.size,h:o.size};
    if(o.type==="line") return {x:o.x-o.w/2,y:o.y-10,w:o.w,h:20};
    const r=o.r||80; return {x:o.x-r,y:o.y-r,w:r*2,h:r*2};
  }

  function render(){
    drawTemplate(project.template);
    project.objects.forEach(drawObject);
    updateLayers();
    updateProps();
  }

  function objectAt(x,y){
    for(let i=project.objects.length-1;i>=0;i--){
      const b=bounds(project.objects[i]);
      if(x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h) return project.objects[i];
    }
    return null;
  }

  let dragging = null;
  function canvasPoint(e){
    const rect=canvas.getBoundingClientRect();
    const t=e.touches ? e.touches[0] : e;
    return {x:(t.clientX-rect.left)*W/rect.width, y:(t.clientY-rect.top)*H/rect.height};
  }
  canvas.addEventListener("pointerdown", e=>{
    const p=canvasPoint(e), o=objectAt(p.x,p.y);
    project.selectedId = o ? o.id : null;
    dragging = o ? {id:o.id, dx:p.x-o.x, dy:p.y-o.y} : null;
    render();
  });
  canvas.addEventListener("pointermove", e=>{
    if(!dragging) return;
    const p=canvasPoint(e), o=selected();
    if(!o) return;
    o.x=p.x-dragging.dx; o.y=p.y-dragging.dy;
    render();
  });
  canvas.addEventListener("pointerup", ()=>{ dragging=null; saveLocal(); });
  canvas.addEventListener("pointerleave", ()=>{ dragging=null; });

  function selected(){ return project.objects.find(o=>o.id===project.selectedId); }

  function addObject(type){
    if(type==="text") project.objects.push({id:uid(),type:"text",text:"Nuovo testo",x:800,y:610,size:40,color:"#111111",align:"center",weight:"800",rot:0,maxWidth:900});
    if(type==="badge") project.objects.push({id:uid(),type:"badge",x:1320,y:260,r:72,color:"#d7a84d",label:"K9"});
    if(type==="seal") project.objects.push({id:uid(),type:"seal",x:800,y:735,r:62,color:"#17324d",label:"OK"});
    if(type==="qr") project.objects.push({id:uid(),type:"qr",x:175,y:790,size:150});
    if(type==="line") project.objects.push({id:uid(),type:"line",x:800,y:650,w:720,h:4,color:"#d7a84d"});
    if(type==="photoFrame") project.objects.push({id:uid(),type:"photoFrame",x:800,y:610,w:360,h:250,color:"#d7a84d"});
    if(type==="logoCircle") project.objects.push({id:uid(),type:"logoCircle",x:205,y:220,r:72,color:"#17324d"});
    project.selectedId=project.objects[project.objects.length-1].id;
    saveLocal(); render();
  }

  function updateLayers(){
    const box=document.getElementById("layersList");
    box.innerHTML="";
    [...project.objects].reverse().forEach((o, idx)=>{
      const div=document.createElement("div");
      div.className="layer"+(o.id===project.selectedId?" active":"");
      div.innerHTML=`<span>${o.type} ${o.role ? "· "+o.role : ""}</span><small>${project.objects.length-idx}</small>`;
      div.onclick=()=>{project.selectedId=o.id;render();};
      box.appendChild(div);
    });
  }

  function updateProps(){
    const o=selected();
    document.getElementById("propText").value = o?.text || o?.label || "";
    document.getElementById("propSize").value = o?.size || o?.r || o?.h || "";
    document.getElementById("propColor").value = toHex(o?.color || "#111111");
    document.getElementById("propRotate").value = o?.rot || 0;
  }
  function toHex(c){ return /^#/.test(c) ? c : "#111111"; }

  function applyProps(){
    const o=selected(); if(!o) return status("Nessun elemento selezionato.");
    const txt=document.getElementById("propText").value;
    if(o.type==="text") o.text=txt;
    if(o.type==="badge" || o.type==="seal") o.label=txt || o.label;
    const size=parseInt(document.getElementById("propSize").value,10);
    if(!isNaN(size)){
      if(o.type==="text") o.size=size;
      else if(o.type==="line") o.h=size;
      else if(o.type==="qr") o.size=size;
      else o.r=size;
    }
    o.color=document.getElementById("propColor").value;
    o.rot=parseInt(document.getElementById("propRotate").value,10)||0;
    saveLocal(); render(); status("Proprietà applicate.");
  }

  function applyTexts(){
    const map = {
      title:document.getElementById("titleInput").value,
      name:document.getElementById("nameInput").value,
      desc:document.getElementById("descInput").value,
      sign:document.getElementById("signInput").value
    };
    Object.entries(map).forEach(([role,text])=>{
      const o=project.objects.find(x=>x.role===role);
      if(o) o.text=text;
    });
    saveLocal(); render(); status("Testi aggiornati.");
  }

  function saveLocal(){ localStorage.setItem("k9-template-studio-v8", JSON.stringify(stripImages(project))); }
  function loadLocal(){
    const raw=localStorage.getItem("k9-template-studio-v8");
    if(!raw) return false;
    try{ project=JSON.parse(raw); return true; }catch{return false;}
  }
  function stripImages(p){
    return {...p, objects:p.objects.map(o=>{
      const copy={...o}; delete copy.img; delete copy.src; return copy;
    })};
  }

  function exportPNG(){
    const a=document.createElement("a");
    a.download="attestato-k9-v8.png";
    a.href=canvas.toDataURL("image/png",1);
    a.click();
    status("PNG esportato.");
  }

  function exportPDF(){
    const img=canvas.toDataURL("image/png",1);
    const { jsPDF } = window.jspdf || {};
    if(!jsPDF){ status("Modulo PDF non caricato. Prova PNG o ricarica la pagina."); return; }
    const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    pdf.addImage(img,"PNG",0,0,297,210);
    pdf.save("attestato-k9-v8.pdf");
    status("PDF esportato.");
  }

  document.querySelectorAll(".tab").forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll(".tab,.panel").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-"+btn.dataset.tab).classList.add("active");
    };
  });
  document.querySelectorAll("[data-template]").forEach(b=>b.onclick=()=>{project.template=b.dataset.template;saveLocal();render();status("Modello applicato.");});
  document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>addObject(b.dataset.add));

  document.getElementById("applyTexts").onclick=applyTexts;
  document.getElementById("applyProps").onclick=applyProps;
  document.getElementById("deleteSelected").onclick=()=>{ if(!selected()) return; project.objects=project.objects.filter(o=>o.id!==project.selectedId); project.selectedId=null; saveLocal(); render(); };
  document.getElementById("duplicateSelected").onclick=()=>{ const o=selected(); if(!o) return status("Seleziona prima un elemento."); const n={...o,id:uid(),x:o.x+35,y:o.y+35}; project.objects.push(n); project.selectedId=n.id; saveLocal(); render(); };
  document.getElementById("bringForward").onclick=()=>{ const i=project.objects.findIndex(o=>o.id===project.selectedId); if(i>=0&&i<project.objects.length-1){ [project.objects[i],project.objects[i+1]]=[project.objects[i+1],project.objects[i]]; saveLocal(); render(); }};
  document.getElementById("sendBackward").onclick=()=>{ const i=project.objects.findIndex(o=>o.id===project.selectedId); if(i>0){ [project.objects[i],project.objects[i-1]]=[project.objects[i-1],project.objects[i]]; saveLocal(); render(); }};
  document.getElementById("saveProject").onclick=()=>{saveLocal();status("Progetto salvato nel browser.");};
  document.getElementById("resetProject").onclick=()=>{ if(confirm("Reset del progetto V8?")) resetProject(); };
  document.getElementById("fitContent").onclick=()=>{ render(); status("Anteprima adattata."); };
  document.getElementById("exportPng").onclick=exportPNG;
  document.getElementById("exportPdf").onclick=exportPDF;

  document.getElementById("photoUpload").onchange=(e)=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const ratio=img.width/img.height;
        const h=340, w=h*ratio;
        const o={id:uid(),type:"image",x:800,y:615,w, h, img};
        project.objects.push(o); project.selectedId=o.id; render(); saveLocal(); status("Foto caricata.");
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  };

  document.getElementById("downloadJson").onclick=()=>{
    const blob=new Blob([JSON.stringify(stripImages(project),null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="progetto-k9-v8.json"; a.click();
  };
  document.getElementById("importJson").onchange=(e)=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{ try{ project=JSON.parse(r.result); saveLocal(); render(); status("JSON importato."); } catch{ status("JSON non valido."); } };
    r.readAsText(f);
  };

  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", e=>{
    e.preventDefault(); deferredPrompt=e;
    const b=document.getElementById("installBtn"); b.classList.remove("hidden");
    b.onclick=async()=>{ deferredPrompt.prompt(); deferredPrompt=null; b.classList.add("hidden"); };
  });

  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
  }

  if(!loadLocal()) resetProject(); else render();
})();
