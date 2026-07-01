(() => {
  "use strict";
  const LS="k9-template-studio-v4-projects";
  const $=id=>document.getElementById(id);
  function all(){try{return JSON.parse(localStorage.getItem(LS)||"[]")}catch{return[]}}
  function write(list){localStorage.setItem(LS,JSON.stringify(list))}
  function escape(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
  function saveProject(p){const list=all(),i=list.findIndex(x=>x.id===p.id);p.updatedAt=new Date().toISOString();if(i>=0)list[i]=p;else list.push(p);write(list);renderProjects();alert("Progetto salvato.")}
  async function openProject(id){const p=all().find(x=>x.id===id);if(p&&window.K9Editor)await window.K9Editor.setProject(p)}
  async function duplicateProject(id){const p=all().find(x=>x.id===id);if(!p)return;const c=JSON.parse(JSON.stringify(p));c.id="project-"+Date.now();c.name=(c.name||"Progetto")+" - copia";saveProject(c);if(window.K9Editor)await window.K9Editor.setProject(c)}
  function deleteProject(id){if(!confirm("Eliminare progetto?"))return;write(all().filter(p=>p.id!==id));renderProjects()}
  function renderProjects(){const box=$("projectList");if(!box)return;const q=($("projectSearch").value||"").toLowerCase();const list=all().filter(p=>JSON.stringify({n:p.name,c:p.clientName,d:p.dogName,co:p.course}).toLowerCase().includes(q)).reverse();if(!list.length){box.innerHTML='<p class="hint">Nessun progetto salvato.</p>';return}box.innerHTML=list.map(p=>`<div class="project-item"><h3>${escape(p.name)}</h3><p>${escape(p.clientName)} ${p.dogName?"· "+escape(p.dogName):""}<br>${escape(p.course)}</p><div class="project-actions"><button class="green" data-open="${p.id}">Apri</button><button data-dup="${p.id}">Duplica</button><button class="red" data-del="${p.id}">Elimina</button></div></div>`).join("");box.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openProject(b.dataset.open));box.querySelectorAll("[data-dup]").forEach(b=>b.onclick=()=>duplicateProject(b.dataset.dup));box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>deleteProject(b.dataset.del))}
  function exportBackup(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(all(),null,2)],{type:"application/json"}));a.download="k9-template-studio-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function importBackup(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!Array.isArray(data))throw new Error();write(data);renderProjects();alert("Backup importato.")}catch{alert("File backup non valido.")}};r.readAsText(file)}
  function init(){renderProjects()}
  window.K9Archive={init,saveProject,renderProjects,exportBackup,importBackup,all};
})();
