(function(){
  "use strict";
  const LS="k9_template_studio_v2";

  function load(){try{return JSON.parse(localStorage.getItem(LS)||'{"models":[],"issued":[]}')}catch(e){return {models:[],issued:[]}}}
  function save(data){localStorage.setItem(LS,JSON.stringify(data))}
  function download(name,content,type="application/json"){
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([content],{type}));
    a.download=name;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function init(){renderStats()}

  function renderStats(){
    const box=document.getElementById("archiveStats");
    if(!box)return;
    const db=load();
    const last=db.issued.length?db.issued[db.issued.length-1].id:"-";
    box.innerHTML=`📁 Modelli: ${db.models.length}<br>🏅 Certificati emessi: ${db.issued.length}<br>🆔 Ultimo ID: ${last}`;
  }

  function addModel(model){
    const db=load();
    db.models.push({...model,id:"model-"+Date.now(),createdAt:new Date().toISOString()});
    save(db);renderStats();renderList();
  }

  function addIssued(item){
    const db=load();
    db.issued.push({...item,id:"K9-"+new Date().getFullYear()+"-"+String(db.issued.length+1).padStart(5,"0"),createdAt:new Date().toISOString()});
    save(db);renderStats();renderList();
  }

  function backup(){
    const db=load();
    download("k9-template-studio-backup.json",JSON.stringify(db,null,2));
  }

  function restore(file){
    const r=new FileReader();
    r.onload=()=>{try{save(JSON.parse(r.result));renderStats();renderList();alert("Archivio ripristinato.")}catch(e){alert("JSON non valido.")}};
    r.readAsText(file);
  }

  function renderList(){
    const box=document.getElementById("archiveList");
    if(!box)return;
    const db=load();
    box.innerHTML=db.models.slice().reverse().map(m=>`<div class="archive-item"><b>${m.name||"Modello"}</b><br><small>${m.createdAt||""}</small></div>`).join("");
  }

  window.K9Archive={init,load,save,addModel,addIssued,backup,restore,renderStats,renderList};
})();
