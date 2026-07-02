(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const TEMPLATE_LS = "k9-template-studio-v5-templates";
  const presets = ["Dogsitter","Mantrailing Base","Mantrailing Avanzato","HRDD","Detection","Educazione Cinofila","Puppy Class","Dog Walking"];

  let canvas, ctx, status;
  let drag = null;
  let qrCanvas = null;
  let qrPayloadCache = "";
  let qrBusy = false;
  let templateFileData = "";
  let graphicFileData = "";
  let templateManifest = [];
  let elementManifest = [];

  let img = {base:null, subject:null, logo:null};

  function def(){
    return {
      id:"p-"+Date.now(),
      name:"Nuovo certificato",
      clientName:"Mario Rossi",
      dogName:"Kira",
      course:"Detection",
      courseCustom:"",
      mainText:"hanno partecipato con successo al corso",
      dateMode:"auto",
      dateManual:"",
      instructor:"Napoletano Giovanni",
      baseImage:"",
      subjectImage:"",
      logoImage:"",
      qrVisible:true,
      qrText:"K9 Template Studio - certificato",
      certId:"",
      graphics:[],
      textBlock:{x:0,y:0},
      photo:{x:320,y:580,scale:100,opacity:100,feather:30,rotate:0,effect:"soft"},
      logo:{x:800,y:120,scale:100,opacity:100,rotate:0},
      qr:{x:1400,y:150,scale:100,opacity:100,rotate:0},
      offsets:{
        title:{x:0,y:0},subtitle:{x:0,y:0},names:{x:0,y:0},text:{x:0,y:0},course:{x:0,y:0},date:{x:0,y:0},signature:{x:0,y:0}
      },
      textStyle:{
        title:{size:54,color:"#123d28"},subtitle:{size:32,color:"#123d28"},names:{size:58,color:"#123d28"},text:{size:28,color:"#8b6416"},course:{size:34,color:"#123d28"},date:{size:22,color:"#111111"},signature:{size:26,color:"#111111"}
      }
    };
  }

  let p = def();

  const tb = {
    title:{x:800,y:225,text:"ATTESTATO",font:"Georgia",weight:"700",align:"center"},
    subtitle:{x:800,y:280,text:"DI PARTECIPAZIONE",font:"Georgia",weight:"500",align:"center"},
    names:{x:800,y:445,font:"cursive",weight:"400",align:"center"},
    text:{x:800,y:550,font:"Georgia",weight:"400",align:"center"},
    course:{x:800,y:620,font:"Georgia",weight:"700",align:"center"},
    date:{x:320,y:820,font:"Georgia",weight:"700",align:"center"},
    signature:{x:1120,y:820,font:"cursive",weight:"400",align:"center"}
  };

  function st(t){ if(status) status.textContent = t; }
  function today(){ return new Date().toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"}); }
  function cdate(){ return p.dateMode==="manual" && p.dateManual ? new Date(p.dateManual).toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"}) : today(); }
  function makeCertId(){ return "K9-"+new Date().getFullYear()+"-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,6).toUpperCase(); }
  function ensureCertId(){ if(!p.certId) p.certId = makeCertId(); return p.certId; }
  function qrPayload(){ ensureCertId(); return "K9_CERT|ID="+p.certId+"|CLIENTE="+p.clientName+"|CANE="+p.dogName+"|CORSO="+p.course+"|DATA="+cdate()+"|ISTRUTTORE="+p.instructor+"|NOTE="+p.qrText; }

  function escHtml(s){ return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }
  function read(f){ return new Promise(r=>{ if(!f) return r(""); const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(f); }); }
  function load(src){ return new Promise(r=>{ if(!src) return r(null); const im=new Image(); im.onload=()=>r(im); im.onerror=()=>r(null); im.src=src; }); }

  async function reload(){
    img.base = await load(p.baseImage);
    img.subject = await load(p.subjectImage);
    img.logo = await load(p.logoImage);
    for(const g of (p.graphics||[])){
      if(g.src && !g._img) g._img = await load(g.src);
    }
  }

  function updateQrImage(){
    if(!p.qrVisible || typeof QRCode==="undefined" || !QRCode.toCanvas) return;
    const payload = qrPayload();
    if(payload===qrPayloadCache || qrBusy) return;
    qrBusy = true;
    const c = document.createElement("canvas");
    QRCode.toCanvas(c, payload, {width:300, margin:1, errorCorrectionLevel:"M"}, err=>{
      qrBusy = false;
      if(!err){
        qrCanvas = c;
        qrPayloadCache = payload;
        draw();
      } else {
        qrCanvas = null;
        qrPayloadCache = "";
        st("Errore QR: non generato.");
      }
    });
  }

  function sync(){
    if($("projectName")) p.name = $("projectName").value.trim() || "Nuovo certificato";
    p.clientName = $("clientName").value.trim();
    p.dogName = $("dogName").value.trim();
    p.course = $("course").value==="Altro..." ? ($("courseCustom").value.trim() || "Altro") : $("course").value;
    p.courseCustom = $("courseCustom").value.trim();
    p.mainText = $("mainText").value.trim();
    p.dateMode = $("dateMode").value;
    p.dateManual = $("dateManual").value;
    p.instructor = $("instructor").value.trim();
    p.qrText = $("qrText").value.trim();
    p.photo.scale = +$("photoScale").value;
    p.photo.opacity = +$("photoOpacity").value;
    p.photo.feather = +$("photoFeather").value;
    p.photo.rotate = +$("photoRotate").value;
    p.photo.effect = $("photoEffect").value;
  }

  function fill(){
    $("projectName").value = p.name;
    $("clientName").value = p.clientName;
    $("dogName").value = p.dogName;
    $("course").value = presets.includes(p.course) ? p.course : "Altro...";
    $("courseCustom").classList.toggle("hidden", $("course").value!=="Altro...");
    $("courseCustom").value = $("course").value==="Altro..." ? p.course : (p.courseCustom||"");
    $("mainText").value = p.mainText;
    $("dateMode").value = p.dateMode;
    $("dateManual").classList.toggle("hidden", p.dateMode!=="manual");
    $("dateManual").value = p.dateManual;
    $("instructor").value = p.instructor;
    $("qrText").value = p.qrText;
    $("photoScale").value = p.photo.scale;
    $("photoOpacity").value = p.photo.opacity;
    $("photoFeather").value = p.photo.feather;
    $("photoRotate").value = p.photo.rotate;
    $("photoEffect").value = p.photo.effect || "normal";
    refreshGraphicOptions();
    textCtl();
  }

  function drawBase(){
    if(img.base){ ctx.drawImage(img.base,0,0,1600,1000); return; }
    let g=ctx.createLinearGradient(0,0,1600,1000);
    g.addColorStop(0,"#fff7de"); g.addColorStop(.55,"#fffdf3"); g.addColorStop(1,"#f2dfac");
    ctx.fillStyle=g; ctx.fillRect(0,0,1600,1000);
    ctx.strokeStyle="#06401f"; ctx.lineWidth=20; ctx.strokeRect(32,32,1536,936);
    ctx.strokeStyle="#d2a847"; ctx.lineWidth=5; ctx.strokeRect(52,52,1496,896);
    ctx.fillStyle="rgba(6,64,31,.10)"; ctx.font="150px Arial"; ctx.fillText("🐾",150,210); ctx.fillText("🐾",1220,260);
    ctx.font="42px Georgia"; ctx.fillStyle="#c49a38"; ctx.textAlign="center"; ctx.fillText("—  🐾  —",800,150); ctx.fillText("—  🐾  —",800,760);
  }

  function softImage(im,w,h,fe,e){
    const c=document.createElement("canvas");
    c.width=Math.max(1,w|0); c.height=Math.max(1,h|0);
    const x=c.getContext("2d",{willReadFrequently:true});
    x.drawImage(im,0,0,c.width,c.height);
    if(fe>0 || e==="fade"){
      const data=x.getImageData(0,0,c.width,c.height), d=data.data;
      const edge=Math.max(1,Math.round(Math.min(c.width,c.height)*(fe/100)*.32));
      for(let yy=0; yy<c.height; yy++){
        for(let xx=0; xx<c.width; xx++){
          const i=(yy*c.width+xx)*4;
          const dist=Math.min(xx,yy,c.width-1-xx,c.height-1-yy);
          let a=edge?Math.min(1,dist/edge):1;
          if(e==="fade"){
            const b=(d[i]+d[i+1]+d[i+2])/3;
            if(b>225)a*=.35; else if(b>205)a*=.65;
          }
          d[i+3]=Math.round(d[i+3]*a);
        }
      }
      x.putImageData(data,0,0);
    }
    return c;
  }

  function drawPhoto(){
    if(!img.subject) return;
    const im=img.subject, w=420*(p.photo.scale/100), h=w*(im.height/im.width), s=softImage(im,w,h,p.photo.feather,p.photo.effect);
    ctx.save();
    ctx.globalAlpha=p.photo.opacity/100;
    ctx.translate(p.photo.x,p.photo.y);
    ctx.rotate((p.photo.rotate||0)*Math.PI/180);
    if(p.photo.effect==="soft"){ ctx.shadowColor="rgba(0,0,0,.25)"; ctx.shadowBlur=28; ctx.shadowOffsetX=8; ctx.shadowOffsetY=10; }
    ctx.drawImage(s,-w/2,-h/2,w,h);
    ctx.restore();
  }

  function drawLogo(){
    if(!img.logo) return;
    const w=220*(p.logo.scale/100), h=w*(img.logo.height/img.logo.width);
    ctx.save();
    ctx.globalAlpha=(p.logo.opacity||100)/100;
    ctx.translate(p.logo.x,p.logo.y);
    ctx.rotate((p.logo.rotate||0)*Math.PI/180);
    ctx.drawImage(img.logo,-w/2,-h/2,w,h);
    ctx.restore();
  }

  function drawQr(){
    if(!p.qrVisible) return;
    ensureCertId();
    updateQrImage();
    const s=115*(p.qr.scale/100);
    ctx.save();
    ctx.globalAlpha=(p.qr.opacity||100)/100;
    ctx.translate(p.qr.x,p.qr.y);
    ctx.rotate((p.qr.rotate||0)*Math.PI/180);
    ctx.fillStyle="#fff"; ctx.fillRect(-s/2,-s/2,s,s);
    ctx.strokeStyle="#111"; ctx.lineWidth=3; ctx.strokeRect(-s/2,-s/2,s,s);
    if(qrCanvas) ctx.drawImage(qrCanvas,-s/2+5,-s/2+5,s-10,s-10);
    else { ctx.fillStyle="#111"; ctx.font="12px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("QR in caricamento",0,0); }
    ctx.restore();
  }

  function drawRosette(g){
    const r=45*(g.scale/100);
    ctx.save(); ctx.translate(g.x,g.y); ctx.rotate((g.rotate||0)*Math.PI/180); ctx.globalAlpha=(g.opacity||100)/100;
    ctx.fillStyle="#0b5a32"; ctx.beginPath(); ctx.moveTo(-r*.35,r*.35); ctx.lineTo(-r*.75,r*1.65); ctx.lineTo(0,r*1.15); ctx.lineTo(r*.75,r*1.65); ctx.lineTo(r*.35,r*.35); ctx.fill();
    ctx.fillStyle="#d6a52f"; for(let i=0;i<18;i++){ ctx.rotate(Math.PI/9); ctx.beginPath(); ctx.ellipse(0,-r*.72,r*.22,r*.42,0,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle="#f3c94e"; ctx.beginPath(); ctx.arc(0,0,r*.62,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="#9b741a"; ctx.lineWidth=4; ctx.stroke();
    ctx.fillStyle="#9b741a"; ctx.font=(r*.7)+"px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("🐾",0,2);
    ctx.restore();
  }

  function drawVectorGraphic(g){
    ctx.save(); ctx.translate(g.x,g.y); ctx.rotate((g.rotate||0)*Math.PI/180); ctx.globalAlpha=(g.opacity||100)/100;
    const s=(g.scale||100)/100;
    ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle="#d6a52f"; ctx.strokeStyle="#d6a52f"; ctx.lineWidth=5*s;

    if(g.type==="paw"){ ctx.font=(80*s)+"px Arial"; ctx.fillText("🐾",0,0); }
    else if(g.type==="bone"){ ctx.font=(92*s)+"px Arial"; ctx.fillText("🦴",0,0); }
    else if(g.type==="dogSilhouette"){ ctx.fillStyle="#123d28"; ctx.font=(90*s)+"px Arial"; ctx.fillText("🐕",0,0); }
    else if(g.type==="laurel"){ ctx.font=(96*s)+"px Arial"; ctx.fillText("🏅",0,0); }
    else if(g.type==="seal"){ ctx.font=(90*s)+"px Arial"; ctx.fillText("🏵️",0,0); }
    else if(g.type==="ribbon"){ ctx.font=(90*s)+"px Arial"; ctx.fillText("🎖️",0,0); }
    else if(g.type==="line" || g.type==="divider"){ ctx.beginPath(); ctx.moveTo(-120*s,0); ctx.lineTo(-25*s,0); ctx.moveTo(25*s,0); ctx.lineTo(120*s,0); ctx.stroke(); ctx.font=(42*s)+"px Arial"; ctx.fillText("🐾",0,0); }
    else if(g.type==="corner"){ ctx.strokeStyle="#d6a52f"; ctx.lineWidth=7*s; ctx.beginPath(); ctx.moveTo(-80*s,-40*s); ctx.quadraticCurveTo(-80*s,-80*s,-40*s,-80*s); ctx.moveTo(80*s,40*s); ctx.quadraticCurveTo(80*s,80*s,40*s,80*s); ctx.stroke(); ctx.font=(45*s)+"px Arial"; ctx.fillText("❧",0,0); }
    else if(g.type==="frame" || g.type==="frameGold"){ const w=420*s,h=260*s; ctx.strokeStyle=g.type==="frameGold"?"#d6a52f":"#06401f"; ctx.lineWidth=8*s; ctx.strokeRect(-w/2,-h/2,w,h); ctx.strokeStyle="#d6a52f"; ctx.lineWidth=4*s; ctx.strokeRect(-w/2+14*s,-h/2+14*s,w-28*s,h-28*s); }
    ctx.restore();
  }

  function drawGraphic(g){
    if(g.src){
      if(!g._img){ g._img=new Image(); g._img.onload=()=>draw(); g._img.src=g.src; return; }
      const im=g._img, w=220*(g.scale/100), h=w*((im.height||220)/(im.width||220));
      ctx.save(); ctx.globalAlpha=(g.opacity||100)/100; ctx.translate(g.x,g.y); ctx.rotate((g.rotate||0)*Math.PI/180);
      ctx.drawImage(im,-w/2,-h/2,w,h); ctx.restore(); return;
    }
    if(g.type==="rosette") drawRosette(g); else drawVectorGraphic(g);
  }

  function drawGraphics(){ (p.graphics||[]).forEach(drawGraphic); }

  function textValue(id){
    if(id==="names") return `${p.clientName}${p.dogName?" e "+p.dogName:""}`;
    if(id==="text") return p.mainText;
    if(id==="course") return p.course.toUpperCase();
    if(id==="date") return cdate();
    if(id==="signature") return p.instructor;
    return tb[id].text;
  }

  function drawText(id){
    const b=tb[id], o=p.offsets[id]||{x:0,y:0}, bl=p.textBlock||{x:0,y:0}, s=p.textStyle[id];
    ctx.font=`${b.weight} ${s.size}px ${b.font}`;
    ctx.fillStyle=s.color; ctx.textAlign=b.align; ctx.textBaseline="middle";
    ctx.fillText(textValue(id), b.x+o.x+bl.x, b.y+o.y+bl.y);
  }

  function draw(){
    sync();
    canvas.width=1600; canvas.height=1000;
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,1600,1000);
    drawBase(); drawPhoto(); drawLogo(); drawGraphics();
    ["title","subtitle","names","text","course","date","signature"].forEach(drawText);
    drawQr();
    st("Anteprima aggiornata.");
  }

  function graphicById(id){ return (p.graphics||[]).find(g=>g.id===id); }
  function addGraphic(type,name,src){
    p.graphics=p.graphics||[];
    const g={id:"g-"+Date.now()+"-"+Math.random().toString(36).slice(2,5),type,name:name||type,src:src||"",x:800,y:500,scale:100,rotate:0,opacity:100};
    p.graphics.push(g); refreshGraphicOptions(g.id); draw();
  }

  function refreshGraphicOptions(selected){
    const sel=$("selectedElement"); if(!sel) return;
    [...sel.querySelectorAll("option[data-graphic-option]")].forEach(o=>o.remove());
    (p.graphics||[]).forEach((g,i)=>{ const o=document.createElement("option"); o.value="graphic:"+g.id; o.dataset.graphicOption="1"; o.textContent="Elemento "+(i+1)+" · "+(g.name||g.type); sel.appendChild(o); });
    if(selected) sel.value="graphic:"+selected;
    textCtl();
  }

  function pos(id){
    if(id && id.startsWith("graphic:")) return graphicById(id.split(":")[1]) || {x:0,y:0};
    if(id==="photo") return p.photo;
    if(id==="logo") return p.logo;
    if(id==="qr") return p.qr;
    const b=tb[id], o=p.offsets[id]||{x:0,y:0}, bl=p.textBlock||{x:0,y:0};
    return {x:b.x+o.x+bl.x, y:b.y+o.y+bl.y};
  }

  function move(id,dx,dy){
    if(id && id.startsWith("graphic:")){ const g=graphicById(id.split(":")[1]); if(g){g.x+=dx; g.y+=dy;} }
    else if(id==="photo"){ p.photo.x+=dx; p.photo.y+=dy; }
    else if(id==="logo"){ p.logo.x+=dx; p.logo.y+=dy; }
    else if(id==="qr"){ p.qr.x+=dx; p.qr.y+=dy; }
    else { p.offsets[id]=p.offsets[id]||{x:0,y:0}; p.offsets[id].x+=dx; p.offsets[id].y+=dy; }
  }

  function canvasPoint(e){
    const r=canvas.getBoundingClientRect(), t=e.touches?e.touches[0]:e;
    return {x:(t.clientX-r.left)*(1600/r.width), y:(t.clientY-r.top)*(1000/r.height)};
  }

  function pick(pt){
    const ids=[...(p.graphics||[]).map(g=>"graphic:"+g.id),"photo","logo","qr","signature","date","course","text","names","subtitle","title"];
    for(const id of ids){
      const pp=pos(id), rx=id==="photo"?260:id==="qr"?75:id.startsWith("graphic:")?150:330, ry=id==="photo"?190:id==="qr"?75:id.startsWith("graphic:")?150:55;
      if(Math.abs(pt.x-pp.x)<rx && Math.abs(pt.y-pp.y)<ry) return id;
    }
    return "photo";
  }

  function startDrag(e){ const pt=canvasPoint(e), id=pick(pt); $("selectedElement").value=id; textCtl(); drag={id,pt}; e.preventDefault(); }
  function moveDrag(e){ if(!drag) return; const pt=canvasPoint(e); move(drag.id,pt.x-drag.pt.x,pt.y-drag.pt.y); drag.pt=pt; e.preventDefault(); draw(); }
  function endDrag(){ drag=null; }

  function textCtl(){
    const id=$("selectedElement").value, s=p.textStyle[id];
    $("textSize").disabled=!s; $("textColor").disabled=!s;
    if(s){ $("textSize").value=s.size; $("textColor").value=s.color; }
    let scale=100, rot=0, op=100;
    if(id && id.startsWith("graphic:")){ const g=graphicById(id.split(":")[1]); scale=g?g.scale:100; rot=g?(g.rotate||0):0; op=g?(g.opacity||100):100; }
    else if(id==="photo"){ scale=p.photo.scale; rot=p.photo.rotate||0; op=p.photo.opacity||100; }
    else if(id==="logo"){ scale=p.logo.scale; rot=p.logo.rotate||0; op=p.logo.opacity||100; }
    else if(id==="qr"){ scale=p.qr.scale; rot=p.qr.rotate||0; op=p.qr.opacity||100; }
    else if(s) scale=s.size;
    if($("elementScale")) $("elementScale").value=scale;
    if($("elementRotate")) $("elementRotate").value=rot;
    if($("elementOpacity")) $("elementOpacity").value=op;
  }

  function cleanProject(obj){
    const c=JSON.parse(JSON.stringify(obj));
    (c.graphics||[]).forEach(g=>delete g._img);
    return c;
  }

  function getProject(){ sync(); return cleanProject(p); }

  async function setProject(x){
    p=JSON.parse(JSON.stringify(x));
    p.graphics=p.graphics||[];
    if(!p.logo) p.logo={x:800,y:120,scale:100,opacity:100,rotate:0};
    if(!p.qr) p.qr={x:1400,y:150,scale:100,opacity:100,rotate:0};
    fill(); await reload(); refreshGraphicOptions(); draw();
  }

  function newProject(){ p=def(); img={base:null,subject:null,logo:null}; qrCanvas=null; qrPayloadCache=""; fill(); refreshGraphicOptions(); draw(); }

  function exportPng(){ draw(); const a=document.createElement("a"); a.href=canvas.toDataURL("image/png"); a.download=(p.name||"certificato")+".png"; a.click(); }

  function strBytes(s){ const a=new Uint8Array(s.length); for(let i=0;i<s.length;i++) a[i]=s.charCodeAt(i)&255; return a; }
  function dataUrlBytes(dataUrl){ const b=atob(dataUrl.split(",")[1]), a=new Uint8Array(b.length); for(let i=0;i<b.length;i++) a[i]=b.charCodeAt(i); return a; }

  function pdfBlobFromCanvas(){
    draw();
    const jpg=dataUrlBytes(canvas.toDataURL("image/jpeg",0.95));
    let chunks=[],len=0,offs=[];
    function add(x){ const b=typeof x==="string"?strBytes(x):x; chunks.push(b); len+=b.length; }
    function obj(n,body){ offs[n]=len; add(n+" 0 obj\n"+body+"\nendobj\n"); }
    add("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    obj(1,"<< /Type /Catalog /Pages 2 0 R >>");
    obj(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
    offs[4]=len;
    add("4 0 obj\n<< /Type /XObject /Subtype /Image /Width "+canvas.width+" /Height "+canvas.height+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+jpg.length+" >>\nstream\n");
    add(jpg); add("\nendstream\nendobj\n");
    const cmd="q\n841.89 0 0 595.28 0 0 cm\n/Im0 Do\nQ\n";
    obj(5,"<< /Length "+cmd.length+" >>\nstream\n"+cmd+"endstream");
    const xref=len;
    add("xref\n0 6\n0000000000 65535 f \n");
    for(let i=1;i<=5;i++) add(String(offs[i]).padStart(10,"0")+" 00000 n \n");
    add("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF");
    return new Blob(chunks,{type:"application/pdf"});
  }

  function exportPdf(){ const blob=pdfBlobFromCanvas(); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=(p.name||"certificato")+".pdf"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }

  function cuturl(){
    const t=$("cutoutTool").value;
    const u={removebg:"https://www.remove.bg/upload",adobe:"https://www.adobe.com/express/feature/image/remove-background",canva:"https://www.canva.com/features/background-remover/",photoroom:"https://www.photoroom.com/tools/background-remover"};
    return t==="custom" ? ($("customCutoutUrl").value.trim() || u.removebg) : u[t];
  }

  async function openPhoneAppForCutout(){
    if(!p.subjectImage) return alert("Prima carica una foto, poi potrai inviarla a un'app installata.");
    if(!navigator.share) return alert("Il browser non permette di aprire il selettore app. Usa remove.bg, Adobe, Canva o PhotoRoom.");
    try{
      const blob=await (await fetch(p.subjectImage)).blob();
      const file=new File([blob],"foto-soggetto.png",{type:blob.type||"image/png"});
      if(navigator.canShare && navigator.canShare({files:[file]})) await navigator.share({title:"Foto soggetto",text:"Apri con un'app di ritaglio/sfondo",files:[file]});
      else await navigator.share({title:"Foto soggetto",text:"Apri con un'app di ritaglio/sfondo"});
    }catch(e){ alert("Non posso aprire direttamente il selettore app. Usa un programma esterno dal menu."); }
  }

  function localTemplates(){ try{return JSON.parse(localStorage.getItem(TEMPLATE_LS)||"[]")}catch{return[]} }
  function saveLocalTemplates(list){ localStorage.setItem(TEMPLATE_LS,JSON.stringify(list)); }

  async function loadTemplateManifest(){
    try{ const r=await fetch("assets/templates/templates.json?ts="+Date.now()); if(!r.ok) throw new Error(); const data=await r.json(); templateManifest=Array.isArray(data)?data:(data.templates||[]); }
    catch(e){ templateManifest=[]; }
  }

  function allTemplates(){ return [...templateManifest.map(t=>({...t,source:"cartella"})),...localTemplates().map(t=>({...t,source:"locale"}))]; }

  function renderTemplateLibrary(){
    const box=$("templateList"); if(!box) return;
    const q=($("templateSearch").value||"").toLowerCase();
    const list=allTemplates().filter(t=>JSON.stringify(t).toLowerCase().includes(q));
    if(!list.length){ box.innerHTML='<p class="hint">Nessun modello disponibile.</p>'; return; }
    box.innerHTML=list.map(t=>`<div class="template-item"><h3>${escHtml(t.name||"Modello")}</h3><p>${escHtml(t.category||"Generale")} · ${escHtml(t.source||"")}</p>${t.src?`<img class="template-thumb" src="${escHtml(t.src)}">`:""}<div class="template-actions"><button class="green" data-use-template="${escHtml(t.id)}" data-source="${escHtml(t.source)}">Usa ora</button><button data-preview-template="${escHtml(t.id)}" data-source="${escHtml(t.source)}">Anteprima</button></div></div>`).join("");
    box.querySelectorAll("[data-use-template]").forEach(b=>b.onclick=()=>useTemplateById(b.dataset.useTemplate,b.dataset.source));
    box.querySelectorAll("[data-preview-template]").forEach(b=>b.onclick=()=>previewTemplateById(b.dataset.previewTemplate,b.dataset.source));
  }

  function findTemplate(id,source){ return allTemplates().find(t=>String(t.id)===String(id)&&String(t.source)===String(source)); }

  async function useTemplateById(id,source){
    const t=findTemplate(id,source); if(!t) return;
    if(!t.src){ p.baseImage=""; img.base=null; draw(); return; }
    p.baseImage=t.src; img.base=await load(p.baseImage); draw(); st("Modello applicato: "+(t.name||"modello"));
  }

  function previewTemplateById(id,source){
    const t=findTemplate(id,source); if(!t) return;
    alert((t.name||"Modello")+"\nCategoria: "+(t.category||"Generale")+"\nOrigine: "+(t.source||""));
  }

  async function saveTemplateFromPhone(){
    if(!templateFileData) return alert("Prima scegli un file modello.");
    const list=localTemplates();
    const name=($("templateName").value||"Modello personale").trim();
    const category=$("templateCategory").value||"Generale";
    list.push({id:"tpl-"+Date.now(),name,category,src:templateFileData,createdAt:new Date().toISOString()});
    saveLocalTemplates(list); $("templateName").value=""; templateFileData=""; renderTemplateLibrary(); alert("Modello salvato in libreria locale.");
  }

  async function loadElementManifest(){
    try{ const r=await fetch("assets/elements/elements.json?ts="+Date.now()); if(!r.ok) throw new Error(); const data=await r.json(); elementManifest=Array.isArray(data)?data:(data.elements||[]); }
    catch(e){ elementManifest=[]; }
  }

  function renderFolderElements(){
    const box=$("folderElementList"); if(!box) return;
    const cat=($("graphicCategory")&&$("graphicCategory").value)||"all";
    const list=(elementManifest||[]).filter(el=>cat==="all"||el.category===cat);
    if(!list.length){ box.innerHTML='<p class="hint">Nessun elemento dalla cartella. Puoi caricare PNG in assets/elements e registrarli in elements.json.</p>'; return; }
    box.innerHTML=list.map(el=>`<div class="folder-element-item"><h3>${escHtml(el.name||el.id||"Elemento")}</h3>${el.src?`<img src="${escHtml(el.src)}">`:""}<button class="green" data-folder-element="${escHtml(el.id)}">Aggiungi</button></div>`).join("");
    box.querySelectorAll("[data-folder-element]").forEach(b=>b.onclick=()=>{ const el=elementManifest.find(x=>String(x.id)===String(b.dataset.folderElement)); if(el) addGraphic(el.type||"image",el.name||el.id,el.src||""); });
  }

  function filterGraphicButtons(){
    const cat=($("graphicCategory")&&$("graphicCategory").value)||"all";
    document.querySelectorAll("[data-add-graphic]").forEach(b=>b.classList.toggle("hidden-cat",!(cat==="all"||b.dataset.cat===cat)));
    renderFolderElements();
  }

  function moveGraphicLayer(dir){
    const id=$("selectedElement").value;
    if(!id || !id.startsWith("graphic:")) return alert("Seleziona un elemento grafico.");
    const gid=id.split(":")[1], arr=p.graphics||[], i=arr.findIndex(g=>g.id===gid);
    if(i<0) return;
    const j=dir>0?Math.min(arr.length-1,i+1):Math.max(0,i-1);
    if(i===j) return;
    [arr[i],arr[j]]=[arr[j],arr[i]];
    refreshGraphicOptions(gid);
    draw();
  }

  function bind(){
    document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{ document.querySelectorAll(".tab,.tab-panel").forEach(x=>x.classList.remove("active")); b.classList.add("active"); $("tab-"+b.dataset.tab).classList.add("active"); });

    ["projectName","clientName","dogName","courseCustom","mainText","instructor","qrText"].forEach(id=>$(id).addEventListener("input",draw));
    $("course").onchange=()=>{ $("courseCustom").classList.toggle("hidden",$("course").value!=="Altro..."); draw(); };
    $("dateMode").onchange=()=>{ $("dateManual").classList.toggle("hidden",$("dateMode").value!=="manual"); draw(); };
    $("dateManual").onchange=draw;

    $("subjectFile").onchange=async e=>{ p.subjectImage=await read(e.target.files[0]); img.subject=await load(p.subjectImage); draw(); };
    $("baseFile").onchange=async e=>{ p.baseImage=await read(e.target.files[0]); img.base=await load(p.baseImage); draw(); };
    $("logoFile").onchange=async e=>{ p.logoImage=await read(e.target.files[0]); img.logo=await load(p.logoImage); draw(); };

    ["photoScale","photoOpacity","photoFeather","photoRotate","photoEffect"].forEach(id=>$(id).addEventListener("input",draw));

    $("cutoutTool").onchange=()=>{ $("customCutoutUrl").classList.toggle("hidden",$("cutoutTool").value!=="custom"); };
    $("openCutout").onclick=()=>{ $("cutoutTool").value==="phoneapp" ? openPhoneAppForCutout() : window.open(cuturl(),"_blank","noopener,noreferrer"); };
    $("loadCutoutPng").onclick=()=>$("subjectFile").click();

    $("fitPhoto").onclick=()=>{ p.photo={x:320,y:580,scale:100,opacity:100,feather:30,rotate:0,effect:"soft"}; fill(); draw(); };
    $("clearPhoto").onclick=()=>{ p.subjectImage=""; img.subject=null; draw(); };
    $("defaultBase").onclick=()=>{ p.baseImage=""; img.base=null; draw(); };
    $("clearBase").onclick=()=>{ p.baseImage=""; img.base=null; draw(); };
    $("clearLogo").onclick=()=>{ p.logoImage=""; img.logo=null; draw(); };
    $("toggleQr").onclick=()=>{ p.qrVisible=!p.qrVisible; draw(); };

    $("presetDogsitter").onclick=()=>{ p.course="Dogsitter"; p.mainText="hanno partecipato come clienti nel corso"; fill(); draw(); };
    $("presetMantrailing").onclick=()=>{ p.course="Mantrailing Base"; p.mainText="hanno partecipato con successo al corso"; fill(); draw(); };

    document.querySelectorAll("[data-nudge]").forEach(b=>b.onclick=()=>{ const step=+$("moveStep").value, id=$("selectedElement").value, m={up:[0,-step],down:[0,step],left:[-step,0],right:[step,0]}[b.dataset.nudge]; move(id,m[0],m[1]); draw(); });

    $("selectedElement").onchange=textCtl;
    $("elementScale").oninput=()=>{ const id=$("selectedElement").value, v=+$("elementScale").value; if(id.startsWith("graphic:")){ const g=graphicById(id.split(":")[1]); if(g)g.scale=v; } else if(id==="photo"){ p.photo.scale=v; $("photoScale").value=v; } else if(id==="logo")p.logo.scale=v; else if(id==="qr")p.qr.scale=v; else if(p.textStyle[id]){ p.textStyle[id].size=v; $("textSize").value=v; } draw(); };
    if($("elementRotate")) $("elementRotate").oninput=()=>{ const id=$("selectedElement").value, v=+$("elementRotate").value; if(id.startsWith("graphic:")){ const g=graphicById(id.split(":")[1]); if(g)g.rotate=v; } else if(id==="photo"){ p.photo.rotate=v; $("photoRotate").value=v; } else if(id==="logo")p.logo.rotate=v; else if(id==="qr")p.qr.rotate=v; draw(); };
    if($("elementOpacity")) $("elementOpacity").oninput=()=>{ const id=$("selectedElement").value, v=+$("elementOpacity").value; if(id.startsWith("graphic:")){ const g=graphicById(id.split(":")[1]); if(g)g.opacity=v; } else if(id==="photo"){ p.photo.opacity=v; $("photoOpacity").value=v; } else if(id==="logo")p.logo.opacity=v; else if(id==="qr")p.qr.opacity=v; draw(); };
    if($("bringForward")) $("bringForward").onclick=()=>moveGraphicLayer(1);
    if($("sendBackward")) $("sendBackward").onclick=()=>moveGraphicLayer(-1);

    $("textSize").oninput=()=>{ const id=$("selectedElement").value; if(p.textStyle[id]){ p.textStyle[id].size=+$("textSize").value; $("elementScale").value=$("textSize").value; } draw(); };
    $("textColor").oninput=()=>{ const id=$("selectedElement").value; if(p.textStyle[id])p.textStyle[id].color=$("textColor").value; draw(); };

    document.querySelectorAll("[data-text-block]").forEach(b=>b.onclick=()=>{ const step=+$("textBlockStep").value, m={up:[0,-step],down:[0,step],left:[-step,0],right:[step,0]}[b.dataset.textBlock]; p.textBlock=p.textBlock||{x:0,y:0}; p.textBlock.x+=m[0]; p.textBlock.y+=m[1]; draw(); });
    $("resetTextBlock").onclick=()=>{ p.textBlock={x:0,y:0}; draw(); };
    $("resetElement").onclick=()=>{ const id=$("selectedElement").value; if(id.startsWith("graphic:")){ const g=graphicById(id.split(":")[1]); if(g){g.x=800;g.y=500;g.scale=100;g.rotate=0;g.opacity=100;} } else if(id==="photo")p.photo={x:320,y:580,scale:100,opacity:100,feather:30,rotate:0,effect:"soft"}; else if(id==="logo")p.logo={x:800,y:120,scale:100,rotate:0,opacity:100}; else if(id==="qr")p.qr={x:1400,y:150,scale:100,rotate:0,opacity:100}; else p.offsets[id]={x:0,y:0}; fill(); textCtl(); draw(); };

    canvas.addEventListener("mousedown",startDrag);
    canvas.addEventListener("mousemove",moveDrag);
    window.addEventListener("mouseup",endDrag);
    canvas.addEventListener("touchstart",startDrag,{passive:false});
    canvas.addEventListener("touchmove",moveDrag,{passive:false});
    canvas.addEventListener("touchend",endDrag);

    $("exportPng").onclick=exportPng;
    $("exportPdf").onclick=exportPdf;
    $("saveProject").onclick=()=>window.K9Archive.saveProject(getProject());
    $("saveProject2").onclick=()=>window.K9Archive.saveProject(getProject());
    $("duplicateProject").onclick=async()=>{ const x=getProject(); x.id="p-"+Date.now(); x.certId=""; x.name=x.name+" - copia"; await setProject(x); window.K9Archive.saveProject(getProject()); };
    $("newProject").onclick=newProject;
    $("resetProject").onclick=()=>{ if(confirm("Reset progetto?")) newProject(); };
    $("projectSearch").oninput=()=>window.K9Archive.renderProjects();

    if($("openTemplateTab")) $("openTemplateTab").onclick=()=>{ document.querySelectorAll(".tab,.tab-panel").forEach(x=>x.classList.remove("active")); document.querySelector('[data-tab="modelli"]').classList.add("active"); $("tab-modelli").classList.add("active"); };
    if($("templateSearch")) $("templateSearch").oninput=renderTemplateLibrary;
    if($("refreshTemplates")) $("refreshTemplates").onclick=async()=>{ await loadTemplateManifest(); renderTemplateLibrary(); alert("Libreria aggiornata."); };
    if($("useBlankTemplate")) $("useBlankTemplate").onclick=()=>{ p.baseImage=""; img.base=null; draw(); };
    if($("templateFile")) $("templateFile").onchange=async e=>{ templateFileData=await read(e.target.files[0]); if(!$("templateName").value&&e.target.files[0])$("templateName").value=e.target.files[0].name.replace(/\.[^.]+$/,""); };
    if($("saveTemplateLocal")) $("saveTemplateLocal").onclick=saveTemplateFromPhone;
    if($("clearLocalTemplates")) $("clearLocalTemplates").onclick=()=>{ if(confirm("Eliminare tutti i modelli locali salvati su questo telefono?")){ saveLocalTemplates([]); renderTemplateLibrary(); } };

    if($("graphicCategory")) $("graphicCategory").onchange=filterGraphicButtons;
    if($("refreshFolderElements")) $("refreshFolderElements").onclick=async()=>{ await loadElementManifest(); renderFolderElements(); alert("Elementi aggiornati dalla cartella."); };
    if($("clearGraphicSelection")) $("clearGraphicSelection").onclick=()=>{ $("selectedElement").value="photo"; textCtl(); };
    document.querySelectorAll("[data-add-graphic]").forEach(b=>b.onclick=()=>addGraphic(b.dataset.addGraphic,b.textContent.trim(),""));
    if($("graphicFile")) $("graphicFile").onchange=async e=>{ graphicFileData=await read(e.target.files[0]); if(!$("graphicName").value&&e.target.files[0])$("graphicName").value=e.target.files[0].name.replace(/\.[^.]+$/,""); };
    if($("addGraphicImage")) $("addGraphicImage").onclick=()=>{ if(!graphicFileData)return alert("Prima scegli un PNG o un'immagine."); addGraphic("image",($("graphicName").value||"PNG personale").trim(),graphicFileData); graphicFileData=""; $("graphicName").value=""; };
    if($("deleteSelectedGraphic")) $("deleteSelectedGraphic").onclick=()=>{ const id=$("selectedElement").value; if(!id.startsWith("graphic:"))return alert("Seleziona prima un elemento grafico nella scheda Muovi."); p.graphics=(p.graphics||[]).filter(g=>g.id!==id.split(":")[1]); refreshGraphicOptions(); draw(); };

    if($("newQrId")) $("newQrId").onclick=()=>{ p.certId=makeCertId(); qrPayloadCache=""; draw(); alert("Nuovo ID QR generato."); };
    if($("copyQrPayload")) $("copyQrPayload").onclick=async()=>{ try{ await navigator.clipboard.writeText(qrPayload()); alert("Dati QR copiati."); }catch(e){ alert(qrPayload()); } };

    $("exportBackup").onclick=()=>window.K9Archive.exportBackup();
    $("importBackup").onclick=()=>$("backupFile").click();
    $("backupFile").onchange=e=>window.K9Archive.importBackup(e.target.files[0]);
  }

  async function init(){
    canvas=$("canvas"); ctx=canvas.getContext("2d"); status=$("status");
    fill(); bind(); refreshGraphicOptions();
    await loadTemplateManifest(); renderTemplateLibrary();
    await loadElementManifest(); filterGraphicButtons();
    await reload();
    draw();
  }

  window.K9Editor={init,draw,setProject,getProject,newProject};
})();
