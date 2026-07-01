(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  function defaultProject(){
    return {
      id:"project-"+Date.now(), name:"Nuovo certificato",
      clientName:"Mario Rossi", dogName:"Kira", course:"Dogsitter", courseCustom:"",
      mainText:"hanno partecipato con successo al corso", dateMode:"auto", dateManual:"",
      instructor:"Napoletano Giovanni", baseImage:"", subjectImage:"", logoImage:"",
      qrVisible:true, qrText:"K9 Template Studio - certificato",
      photo:{x:320,y:580,scale:100,opacity:100,feather:30,rotate:0,effect:"normal"},
      logo:{x:800,y:120,scale:100}, qr:{x:1400,y:150,scale:100},
      offsets:{title:{x:0,y:0},subtitle:{x:0,y:0},names:{x:0,y:0},text:{x:0,y:0},course:{x:0,y:0},date:{x:0,y:0},signature:{x:0,y:0}},
      textStyle:{title:{size:54,color:"#123d28"},subtitle:{size:32,color:"#123d28"},names:{size:58,color:"#123d28"},text:{size:28,color:"#8b6416"},course:{size:34,color:"#123d28"},date:{size:22,color:"#111111"},signature:{size:26,color:"#111111"}}
    };
  }

  let project = defaultProject();
  let canvas, ctx, status, drag = null;
  let images = {base:null, subject:null, logo:null};

  const baseText = {
    title:{x:800,y:225,text:"ATTESTATO",font:"Georgia",weight:"700",align:"center"},
    subtitle:{x:800,y:280,text:"DI PARTECIPAZIONE",font:"Georgia",weight:"500",align:"center"},
    names:{x:800,y:445,text:"",font:"cursive",weight:"400",align:"center"},
    text:{x:800,y:550,text:"",font:"Georgia",weight:"400",align:"center"},
    course:{x:800,y:620,text:"",font:"Georgia",weight:"700",align:"center"},
    date:{x:320,y:820,text:"",font:"Georgia",weight:"700",align:"center"},
    signature:{x:1120,y:820,text:"",font:"cursive",weight:"400",align:"center"}
  };

  function setStatus(t){status.textContent=t}
  function todayIt(){return new Date().toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"})}
  function readFile(file){return new Promise(r=>{if(!file)return r("");const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(file)})}
  function loadImage(src){return new Promise(r=>{if(!src)return r(null);const img=new Image();img.onload=()=>r(img);img.onerror=()=>r(null);img.src=src})}
  async function reloadImages(){images.base=await loadImage(project.baseImage);images.subject=await loadImage(project.subjectImage);images.logo=await loadImage(project.logoImage)}

  function syncProject(){
    project.name = $("projectName").value.trim() || "Nuovo certificato";
    project.clientName = $("clientName").value.trim();
    project.dogName = $("dogName").value.trim();
    project.course = $("course").value === "Altro..." ? ($("courseCustom").value.trim() || "Altro") : $("course").value;
    project.courseCustom = $("courseCustom").value.trim();
    project.mainText = $("mainText").value.trim();
    project.dateMode = $("dateMode").value;
    project.dateManual = $("dateManual").value;
    project.instructor = $("instructor").value.trim();
    project.qrText = $("qrText").value.trim();
    project.photo.scale = Number($("photoScale").value);
    project.photo.opacity = Number($("photoOpacity").value);
    project.photo.feather = Number($("photoFeather").value);
    project.photo.rotate = Number($("photoRotate").value);
    project.photo.effect = $("photoEffect").value;
  }

  function fillForm(){
    $("projectName").value=project.name;$("clientName").value=project.clientName;$("dogName").value=project.dogName;
    const preset=["Dogsitter","Mantrailing Base","Mantrailing Avanzato","HRDD","Educazione Cinofila","Puppy Class","Dog Walking"];
    $("course").value=preset.includes(project.course)?project.course:"Altro...";
    $("courseCustom").classList.toggle("hidden",$("course").value!=="Altro...");
    $("courseCustom").value=$("course").value==="Altro..."?project.course:(project.courseCustom||"");
    $("mainText").value=project.mainText;$("dateMode").value=project.dateMode;$("dateManual").classList.toggle("hidden",project.dateMode!=="manual");$("dateManual").value=project.dateManual;
    $("instructor").value=project.instructor;$("qrText").value=project.qrText;
    $("photoScale").value=project.photo.scale;$("photoOpacity").value=project.photo.opacity;$("photoFeather").value=project.photo.feather;$("photoRotate").value=project.photo.rotate;$("photoEffect").value=project.photo.effect||"normal";
    updateTextControls();
  }

  function certDate(){return project.dateMode==="manual"&&project.dateManual?new Date(project.dateManual).toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"}):todayIt()}

  function drawBase(){
    if(images.base){ctx.drawImage(images.base,0,0,1600,1000);return}
    const g=ctx.createLinearGradient(0,0,1600,1000);g.addColorStop(0,"#fff7de");g.addColorStop(.55,"#fffdf3");g.addColorStop(1,"#f2dfac");
    ctx.fillStyle=g;ctx.fillRect(0,0,1600,1000);ctx.strokeStyle="#06401f";ctx.lineWidth=20;ctx.strokeRect(32,32,1536,936);ctx.strokeStyle="#d2a847";ctx.lineWidth=5;ctx.strokeRect(52,52,1496,896);
    ctx.fillStyle="rgba(6,64,31,.10)";ctx.font="160px Arial";ctx.fillText("🐾",160,210);ctx.fillText("🐾",1220,260);
    ctx.font="42px Georgia";ctx.fillStyle="#c49a38";ctx.textAlign="center";ctx.fillText("—  🐾  —",800,150);ctx.fillText("—  🐾  —",800,760);
  }

  function makeSoftImage(img,w,h,feather,effect){
    const c=document.createElement("canvas");c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(img,0,0,c.width,c.height);
    if(feather>0||effect==="fade"){const data=x.getImageData(0,0,c.width,c.height),d=data.data,edge=Math.max(1,Math.round(Math.min(c.width,c.height)*(feather/100)*.32));
      for(let yy=0;yy<c.height;yy++)for(let xx=0;xx<c.width;xx++){const i=(yy*c.width+xx)*4,dist=Math.min(xx,yy,c.width-1-xx,c.height-1-yy);let a=edge?Math.min(1,dist/edge):1;if(effect==="fade"){const b=(d[i]+d[i+1]+d[i+2])/3;if(b>225)a*=.35;else if(b>205)a*=.65}d[i+3]=Math.round(d[i+3]*a)}
      x.putImageData(data,0,0)
    }
    return c;
  }

  function drawPhoto(){
    if(!images.subject)return;
    const img=images.subject,maxW=420*(project.photo.scale/100),w=maxW,h=w*(img.height/img.width),p=project.photo,soft=makeSoftImage(img,w,h,p.feather,p.effect);
    ctx.save();ctx.globalAlpha=p.opacity/100;ctx.translate(p.x,p.y);ctx.rotate((p.rotate*Math.PI)/180);
    if(p.effect==="soft"){ctx.shadowColor="rgba(0,0,0,.25)";ctx.shadowBlur=28;ctx.shadowOffsetX=8;ctx.shadowOffsetY=10}
    ctx.drawImage(soft,-w/2,-h/2,w,h);ctx.restore();
  }

  function drawLogo(){if(!images.logo)return;const w=220*(project.logo.scale/100),h=w*(images.logo.height/images.logo.width);ctx.drawImage(images.logo,project.logo.x-w/2,project.logo.y-h/2,w,h)}
  function drawQr(){if(!project.qrVisible)return;const s=115*(project.qr.scale/100);ctx.fillStyle="#fff";ctx.fillRect(project.qr.x-s/2,project.qr.y-s/2,s,s);ctx.strokeStyle="#111";ctx.lineWidth=3;ctx.strokeRect(project.qr.x-s/2,project.qr.y-s/2,s,s);ctx.fillStyle="#111";ctx.font="18px monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("QR",project.qr.x,project.qr.y)}

  function textValue(id){if(id==="names")return `${project.clientName}${project.dogName?" e "+project.dogName:""}`;if(id==="text")return project.mainText;if(id==="course")return project.course.toUpperCase();if(id==="date")return certDate();if(id==="signature")return project.instructor;return baseText[id].text}
  function drawText(id){const b=baseText[id],o=project.offsets[id]||{x:0,y:0},s=project.textStyle[id];ctx.font=`${b.weight} ${s.size}px ${b.font}`;ctx.fillStyle=s.color;ctx.textAlign=b.align;ctx.textBaseline="middle";ctx.fillText(textValue(id),b.x+o.x,b.y+o.y)}
  function draw(){syncProject();canvas.width=1600;canvas.height=1000;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1600,1000);drawBase();drawPhoto();drawLogo();["title","subtitle","names","text","course","date","signature"].forEach(drawText);drawQr();setStatus("Anteprima aggiornata.")}

  function pos(id){if(id==="photo")return project.photo;if(id==="logo")return project.logo;if(id==="qr")return project.qr;const b=baseText[id],o=project.offsets[id]||{x:0,y:0};return{x:b.x+o.x,y:b.y+o.y}}
  function pick(pt){for(const id of ["photo","logo","qr","signature","date","course","text","names","subtitle","title"]){const p=pos(id),rx=id==="photo"?260:id==="qr"?75:330,ry=id==="photo"?190:id==="qr"?75:55;if(Math.abs(pt.x-p.x)<rx&&Math.abs(pt.y-p.y)<ry)return id}return "photo"}
  function move(id,dx,dy){if(id==="photo"){project.photo.x+=dx;project.photo.y+=dy}else if(id==="logo"){project.logo.x+=dx;project.logo.y+=dy}else if(id==="qr"){project.qr.x+=dx;project.qr.y+=dy}else{project.offsets[id]=project.offsets[id]||{x:0,y:0};project.offsets[id].x+=dx;project.offsets[id].y+=dy}}
  function cpt(e){const r=canvas.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*(1600/r.width),y:(t.clientY-r.top)*(1000/r.height)}}
  function start(e){const pt=cpt(e),id=pick(pt);$("selectedElement").value=id;updateTextControls();drag={id,pt};e.preventDefault()}
  function dragMove(e){if(!drag)return;const pt=cpt(e);move(drag.id,pt.x-drag.pt.x,pt.y-drag.pt.y);drag.pt=pt;e.preventDefault();draw()}
  function end(){drag=null}

  function updateTextControls(){const id=$("selectedElement").value,s=project.textStyle[id];$("textSize").disabled=!s;$("textColor").disabled=!s;if(s){$("textSize").value=s.size;$("textColor").value=s.color}}
  function exportPng(){draw();const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=(project.name||"certificato")+".png";a.click()}
  function exportPdf(){draw();const w=window.open("");if(!w)return alert("Consenti popup per PDF.");w.document.write(`<img src="${canvas.toDataURL("image/png")}" style="width:100%">`);w.document.close();w.print()}
  async function setProject(p){project=JSON.parse(JSON.stringify(p));fillForm();await reloadImages();draw()}
  function getProject(){syncProject();return JSON.parse(JSON.stringify(project))}
  function newProject(){project=defaultProject();images={base:null,subject:null,logo:null};fillForm();draw()}

  function bind(){
    document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab,.tab-panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("tab-"+b.dataset.tab).classList.add("active")});
    ["projectName","clientName","dogName","courseCustom","mainText","instructor","qrText"].forEach(id=>$(id).addEventListener("input",draw));
    $("course").onchange=()=>{$("courseCustom").classList.toggle("hidden",$("course").value!=="Altro...");draw()};$("dateMode").onchange=()=>{$("dateManual").classList.toggle("hidden",$("dateMode").value!=="manual");draw()};$("dateManual").onchange=draw;
    $("subjectFile").onchange=async e=>{project.subjectImage=await readFile(e.target.files[0]);images.subject=await loadImage(project.subjectImage);draw()};$("baseFile").onchange=async e=>{project.baseImage=await readFile(e.target.files[0]);images.base=await loadImage(project.baseImage);draw()};$("logoFile").onchange=async e=>{project.logoImage=await readFile(e.target.files[0]);images.logo=await loadImage(project.logoImage);draw()};
    ["photoScale","photoOpacity","photoFeather","photoRotate","photoEffect"].forEach(id=>$(id).addEventListener("input",draw));
    $("clearPhoto").onclick=()=>{project.subjectImage="";images.subject=null;draw()};$("clearBase").onclick=()=>{project.baseImage="";images.base=null;draw()};$("clearLogo").onclick=()=>{project.logoImage="";images.logo=null;draw()};$("toggleQr").onclick=()=>{project.qrVisible=!project.qrVisible;draw()};$("defaultBase").onclick=()=>{project.baseImage="";images.base=null;draw()};
    $("fitPhoto").onclick=()=>{project.photo={x:320,y:580,scale:100,opacity:100,feather:30,rotate:0,effect:"normal"};fillForm();draw()};
    $("presetDogsitter").onclick=()=>{project.course="Dogsitter";project.mainText="hanno partecipato come clienti nel corso";fillForm();draw()};$("presetMantrailing").onclick=()=>{project.course="Mantrailing Base";project.mainText="hanno partecipato con successo al corso";fillForm();draw()};
    document.querySelectorAll("[data-nudge]").forEach(b=>b.onclick=()=>{const step=Number($("moveStep").value),id=$("selectedElement").value,map={up:[0,-step],down:[0,step],left:[-step,0],right:[step,0]},m=map[b.dataset.nudge];move(id,m[0],m[1]);draw()});
    $("selectedElement").onchange=updateTextControls;$("textSize").oninput=()=>{const id=$("selectedElement").value;if(project.textStyle[id])project.textStyle[id].size=Number($("textSize").value);draw()};$("textColor").oninput=()=>{const id=$("selectedElement").value;if(project.textStyle[id])project.textStyle[id].color=$("textColor").value;draw()};
    $("resetElement").onclick=()=>{const id=$("selectedElement").value;if(id==="photo")project.photo={x:320,y:580,scale:100,opacity:100,feather:30,rotate:0,effect:"normal"};else if(id==="logo")project.logo={x:800,y:120,scale:100};else if(id==="qr")project.qr={x:1400,y:150,scale:100};else project.offsets[id]={x:0,y:0};fillForm();draw()};
    canvas.addEventListener("mousedown",start);canvas.addEventListener("mousemove",dragMove);window.addEventListener("mouseup",end);canvas.addEventListener("touchstart",start,{passive:false});canvas.addEventListener("touchmove",dragMove,{passive:false});canvas.addEventListener("touchend",end);
    $("btnPng").onclick=exportPng;$("btnPdf").onclick=exportPdf;$("btnSave").onclick=() => window.K9Archive.saveProject(getProject());$("btnSave2").onclick=() => window.K9Archive.saveProject(getProject());
    $("btnDuplicate").onclick=async()=>{const p=getProject();p.id="project-"+Date.now();p.name=p.name+" - copia";await setProject(p);window.K9Archive.saveProject(getProject())};$("btnNew").onclick=newProject;$("btnReset").onclick=()=>{if(confirm("Reset progetto?"))newProject()};
    $("projectSearch").oninput=()=>window.K9Archive.renderProjects();
    $("exportBackup").onclick=()=>window.K9Archive.exportBackup();$("importBackup").onclick=()=>$("backupFile").click();$("backupFile").onchange=e=>window.K9Archive.importBackup(e.target.files[0]);
  }
  function init(){canvas=$("canvas");ctx=canvas.getContext("2d");status=$("status");fillForm();bind();draw()}
  window.K9Editor={init,draw,setProject,getProject,newProject};
})();
