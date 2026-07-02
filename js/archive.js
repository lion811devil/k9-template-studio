(() => {
  "use strict";
  const LS="k9-template-studio-v5-projects";
  const TEMPLATE_LS="k9-template-studio-v5-templates";
  const $=id=>document.getElementById(id);

  function safeParse(key, fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}
    catch{return fallback}
  }
  function all(){return safeParse(LS,[])}
  function write(x){localStorage.setItem(LS,JSON.stringify(x))}
  function templates(){return safeParse(TEMPLATE_LS,[])}
  function writeTemplates(x){localStorage.setItem(TEMPLATE_LS,JSON.stringify(x))}
  function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

  function saveProject(p){
    let list=all(),i=list.findIndex(x=>x.id===p.id);
    p.updatedAt=new Date().toISOString();
    if(i>=0)list[i]=p;else list.push(p);
    write(list);renderProjects();alert("Progetto salvato.");
  }

  async function openProject(id){
    let p=all().find(x=>x.id===id);
    if(p&&window.K9Editor)await window.K9Editor.setProject(p);
  }

  async function duplicateProject(id){
    let p=all().find(x=>x.id===id);
    if(!p)return;
    let c=JSON.parse(JSON.stringify(p));
    c.id="p-"+Date.now();
    c.certId="";
    c.name=(c.name||"Progetto")+" - copia";
    saveProject(c);
    if(window.K9Editor)await window.K9Editor.setProject(c);
  }

  function deleteProject(id){
    if(!confirm("Eliminare progetto?"))return;
    write(all().filter(p=>p.id!==id));renderProjects();
  }

  function renderProjects(){
    let box=$("projectList");if(!box)return;
    let q=($("projectSearch").value||"").toLowerCase();
    let list=all().filter(p=>JSON.stringify({n:p.name,c:p.clientName,d:p.dogName,co:p.course}).toLowerCase().includes(q)).reverse();
    if(!list.length){box.innerHTML='<p class="hint">Nessun progetto salvato.</p>';return}
    box.innerHTML=list.map(p=>`<div class="project-item"><h3>${esc(p.name)}</h3><p>${esc(p.clientName)} ${p.dogName?"· "+esc(p.dogName):""}<br>${esc(p.course)}<br>Elementi: ${(p.graphics||[]).length}</p><div class="project-actions"><button class="green" data-open="${p.id}">Apri</button><button data-dup="${p.id}">Duplica</button><button class="red" data-del="${p.id}">Elimina</button></div></div>`).join("");
    box.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openProject(b.dataset.open));
    box.querySelectorAll("[data-dup]").forEach(b=>b.onclick=()=>duplicateProject(b.dataset.dup));
    box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>deleteProject(b.dataset.del));
  }

  function exportBackup(){
    const backup={
      app:"K9 Template Studio",
      version:"5.7",
      exportedAt:new Date().toISOString(),
      projects:all(),
      localTemplates:templates()
    };
    let a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}));
    a.download="k9-template-studio-backup-completo.json";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function importBackup(file){
    if(!file)return;
    let r=new FileReader();
    r.onload=()=>{
      try{
        let d=JSON.parse(r.result);
        if(Array.isArray(d)){write(d)}
        else{
          if(!Array.isArray(d.projects))throw new Error();
          write(d.projects);
          if(Array.isArray(d.localTemplates))writeTemplates(d.localTemplates);
        }
        renderProjects();
        alert("Backup completo importato.");
      }catch{alert("Backup non valido.")}
    };
    r.readAsText(file);
  }

  function init(){renderProjects()}
  window.K9Archive={init,saveProject,renderProjects,exportBackup,importBackup,all};
})();
