(function(){
  "use strict";

  const state={
    base:null,
    baseImage:null,
    subject:null,
    subjectImage:null,
    textBlock:{x:0,y:0},
    textOffsets:{},
    graphicOffsets:{subject:{x:0,y:0},qr:{x:0,y:0},logo:{x:0,y:0}},
    values:{},
    positions:{
      title:{x:.50,y:.23,size:54,font:"Georgia",weight:"700",color:"#173f2b",align:"center"},
      subtitle:{x:.50,y:.29,size:34,font:"Georgia",weight:"500",color:"#173f2b",align:"center"},
      intro:{x:.50,y:.36,size:24,font:"Georgia",weight:"400",color:"#7a5a12",align:"center"},
      name:{x:.50,y:.45,size:64,font:"cursive",weight:"400",color:"#0a4229",align:"center"},
      description:{x:.50,y:.56,size:28,font:"Georgia",weight:"400",color:"#8a6510",align:"center"},
      course:{x:.50,y:.62,size:34,font:"Georgia",weight:"700",color:"#173f2b",align:"center"},
      date:{x:.22,y:.82,size:22,font:"Georgia",weight:"700",color:"#111",align:"center"},
      instructor:{x:.72,y:.82,size:28,font:"cursive",weight:"400",color:"#111",align:"center"}
    },
    graphics:{
      subject:{x:.23,y:.58,w:.34,h:.54},
      qr:{x:.89,y:.14,w:.08,h:.12},
      logo:{x:.50,y:.12,w:.16,h:.08}
    }
  };

  let canvas,ctx,status;

  function el(id){return document.getElementById(id)}
  function todayIt(){
    return new Date().toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"});
  }
  function readAsDataUrl(file){
    return new Promise(resolve=>{
      const r=new FileReader();
      r.onload=()=>resolve(r.result);
      r.readAsDataURL(file);
    });
  }
  function loadImage(src){
    return new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>resolve(null);
      img.src=src;
    });
  }

  function setStatus(t){if(status)status.textContent=t}

  async function loadBase(file){
    state.base=await readAsDataUrl(file);
    state.baseImage=await loadImage(state.base);
    draw();
  }

  async function loadSubject(file){
    state.subject=await readAsDataUrl(file);
    state.subjectImage=await loadImage(state.subject);
    draw();
  }

  function collectValues(){
    document.querySelectorAll(".text-input").forEach(i=>state.values[i.dataset.text]=i.value);
    const courseSelect=el("courseSelect");
    const custom=el("courseCustom");
    state.values.course=courseSelect.value==="ALTRO..."?custom.value:courseSelect.value;
    state.values.date=el("dateText").value;
  }

  function drawText(id){
    const p=state.positions[id];
    if(!p)return;
    const off=state.textOffsets[id]||{x:0,y:0};
    const text=state.values[id]||"";
    ctx.save();
    ctx.font=`${p.weight||400} ${p.size}px ${p.font}`;
    ctx.fillStyle=p.color;
    ctx.textAlign=p.align||"center";
    ctx.textBaseline="middle";
    ctx.fillText(text, p.x*canvas.width+state.textBlock.x+off.x, p.y*canvas.height+state.textBlock.y+off.y);
    ctx.restore();
  }

  function drawPlaceholder(){
    ctx.fillStyle="#fff";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#777";
    ctx.font="28px Arial";
    ctx.textAlign="center";
    ctx.fillText("Nessun modello caricato",canvas.width/2,canvas.height/2-20);
    ctx.font="18px Arial";
    ctx.fillText("Carica un attestato base",canvas.width/2,canvas.height/2+16);
  }

  function drawFrameFallback(){
    const g=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    g.addColorStop(0,"#f8f0d8");g.addColorStop(1,"#fff8e8");
    ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle="#0b4b28";ctx.lineWidth=18;ctx.strokeRect(20,20,canvas.width-40,canvas.height-40);
    ctx.strokeStyle="#d5ad58";ctx.lineWidth=4;ctx.strokeRect(34,34,canvas.width-68,canvas.height-68);
  }

  function photoSettings(){
    return {
      removeLight:el("photoRemoveLight").checked,
      softEdges:el("photoSoftEdges").checked,
      feather:Number(el("photoFeather").value),
      opacity:Number(el("photoOpacity").value),
      scale:Number(el("photoScale").value),
      rotate:Number(el("photoRotate").value)
    };
  }

  function drawSubject(){
    if(!state.subjectImage)return;
    const g=state.graphics.subject;
    const off=state.graphicOffsets.subject||{x:0,y:0};
    const s=photoSettings();

    const box={x:g.x*canvas.width+off.x,y:g.y*canvas.height+off.y,w:g.w*canvas.width,h:g.h*canvas.height};
    let sc=Math.min(box.w/state.subjectImage.width, box.h/state.subjectImage.height);
    let w=state.subjectImage.width*sc*(s.scale/100);
    let h=state.subjectImage.height*sc*(s.scale/100);
    let x=box.x-w/2;
    let y=box.y-h/2;

    const processed=window.K9Photo.processPhoto(state.subjectImage,w,h,s);

    ctx.save();
    ctx.globalAlpha=s.opacity/100;
    ctx.translate(x+w/2,y+h/2);
    ctx.rotate((s.rotate*Math.PI)/180);
    ctx.drawImage(processed,-w/2,-h/2,w,h);
    ctx.restore();
  }

  function drawQr(){
    const id="qr";
    const off=state.graphicOffsets.qr||{x:0,y:0};
    const g=state.graphics.qr;
    const x=g.x*canvas.width+off.x,y=g.y*canvas.height+off.y,w=g.w*canvas.width,h=g.h*canvas.height;
    ctx.save();
    ctx.fillStyle="#fff";ctx.fillRect(x,y,w,h);
    ctx.strokeStyle="#111";ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);
    ctx.fillStyle="#111";ctx.font="18px monospace";ctx.textAlign="center";ctx.fillText("QR",x+w/2,y+h/2);
    ctx.restore();
  }

  function draw(){
    collectValues();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);

    if(state.baseImage){
      if(canvas.width!==state.baseImage.width || canvas.height!==state.baseImage.height){
        canvas.width=state.baseImage.width;canvas.height=state.baseImage.height;
      }
      ctx.drawImage(state.baseImage,0,0,canvas.width,canvas.height);
    }else{
      canvas.width=1600;canvas.height=1000;
      drawFrameFallback();
    }

    drawSubject();

    ["title","subtitle","intro","name","description","course","date","instructor"].forEach(drawText);
    drawQr();

    setStatus("Anteprima aggiornata.");
  }

  function moveTextBlock(dir){
    const step=Number(el("textBlockStep").value);
    if(dir==="up")state.textBlock.y-=step;
    if(dir==="down")state.textBlock.y+=step;
    if(dir==="left")state.textBlock.x-=step;
    if(dir==="right")state.textBlock.x+=step;
    draw();
  }

  function moveSingleText(dir){
    const id=el("singleTextTarget").value;
    const step=Number(el("singleTextStep").value);
    state.textOffsets[id]=state.textOffsets[id]||{x:0,y:0};
    if(dir==="up")state.textOffsets[id].y-=step;
    if(dir==="down")state.textOffsets[id].y+=step;
    if(dir==="left")state.textOffsets[id].x-=step;
    if(dir==="right")state.textOffsets[id].x+=step;
    draw();
  }

  function moveSingleGraphic(dir){
    const id=el("singleGraphicTarget").value;
    const step=Number(el("singleGraphicStep").value);
    state.graphicOffsets[id]=state.graphicOffsets[id]||{x:0,y:0};
    if(dir==="up")state.graphicOffsets[id].y-=step;
    if(dir==="down")state.graphicOffsets[id].y+=step;
    if(dir==="left")state.graphicOffsets[id].x-=step;
    if(dir==="right")state.graphicOffsets[id].x+=step;
    draw();
  }

  function exportPng(){
    const a=document.createElement("a");
    a.href=canvas.toDataURL("image/png");
    a.download="certificato.png";
    a.click();
  }

  function exportPdf(){
    const w=window.open("");
    if(!w){alert("Consenti popup per esportare/stampare in PDF.");return}
    w.document.write(`<img src="${canvas.toDataURL("image/png")}" style="width:100%">`);
    w.document.close();
    w.print();
  }

  function bind(){
    el("baseFile").onchange=e=>loadBase(e.target.files[0]);
    el("subjectFile").onchange=e=>loadSubject(e.target.files[0]);

    document.querySelectorAll(".text-input").forEach(i=>i.addEventListener("input",draw));
    ["photoRemoveLight","photoSoftEdges","photoFeather","photoOpacity","photoScale","photoRotate"].forEach(id=>el(id).addEventListener("input",draw));

    el("courseSelect").onchange=()=>{
      el("courseCustom").hidden=el("courseSelect").value!=="ALTRO...";
      draw();
    };
    el("courseCustom").oninput=draw;

    el("dateMode").onchange=()=>{
      const manual=el("dateMode").value==="manual";
      el("dateManual").hidden=!manual;
      if(!manual){el("dateText").value=todayIt();draw()}
    };
    el("dateManual").onchange=()=>{
      if(el("dateManual").value){
        el("dateText").value=new Date(el("dateManual").value).toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"});
        draw();
      }
    };

    document.querySelectorAll("[data-move-text-block]").forEach(b=>b.onclick=()=>moveTextBlock(b.dataset.moveTextBlock));
    document.querySelectorAll("[data-move-single-text]").forEach(b=>b.onclick=()=>moveSingleText(b.dataset.moveSingleText));
    document.querySelectorAll("[data-move-single-graphic]").forEach(b=>b.onclick=()=>moveSingleGraphic(b.dataset.moveSingleGraphic));

    el("resetTextBlock").onclick=()=>{state.textBlock={x:0,y:0};draw()};
    el("resetSingleText").onclick=()=>{delete state.textOffsets[el("singleTextTarget").value];draw()};
    el("resetSingleGraphic").onclick=()=>{state.graphicOffsets[el("singleGraphicTarget").value]={x:0,y:0};draw()};

    el("exportPng").onclick=exportPng;
    el("exportPdf").onclick=exportPdf;

    el("clearAll").onclick=()=>{if(confirm("Reset completo?"))location.reload()};
    el("loadExample").onclick=()=>{state.baseImage=null;state.base=null;draw();setStatus("Esempio grafico generato.")};

    el("saveModel").onclick=()=>window.K9Archive.addModel({name:state.values.name||"Modello",state});
    el("saveIssued").onclick=()=>window.K9Archive.addIssued({name:state.values.name||"Certificato",values:state.values});
    el("backupJson").onclick=()=>window.K9Archive.backup();
    el("restoreJson").onclick=()=>el("restoreFile").click();
    el("restoreFile").onchange=e=>window.K9Archive.restore(e.target.files[0]);
  }

  function init(){
    canvas=el("certificateCanvas");
    ctx=canvas.getContext("2d");
    status=el("status");
    el("dateText").value=todayIt();
    bind();
    draw();
  }

  window.K9Editor={init,state,draw};
})();
