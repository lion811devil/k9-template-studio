(() => {
  "use strict";

  const LS_KEY = "k9-template-studio-v8-3-projects";
  const ACTIVE_KEY = "k9-template-studio-v8-3-active-project";

  function readProjects(){
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch { return []; }
  }

  function writeProjects(projects){
    localStorage.setItem(LS_KEY, JSON.stringify(projects));
  }

  function currentProject(){
    if (!window.K9Editor || typeof window.K9Editor.getProject !== "function") return null;
    return window.K9Editor.getProject();
  }

  function saveProject(project){
    if (!project) project = currentProject();
    if (!project) return;
    const projects = readProjects();
    const id = project.id || ("p-" + Date.now());
    project.id = id;
    const index = projects.findIndex(p => p.id === id);
    const copy = JSON.parse(JSON.stringify(project));
    if (index >= 0) projects[index] = copy;
    else projects.unshift(copy);
    writeProjects(projects);
    localStorage.setItem(ACTIVE_KEY, id);
    renderProjects();
    const s = document.getElementById("status");
    if (s) s.textContent = "Progetto salvato.";
  }

  async function openProject(id){
    const p = readProjects().find(x => x.id === id);
    if (!p || !window.K9Editor || typeof window.K9Editor.setProject !== "function") return;
    await window.K9Editor.setProject(JSON.parse(JSON.stringify(p)));
    localStorage.setItem(ACTIVE_KEY, id);
    renderProjects();
  }

  function deleteProject(id){
    const projects = readProjects().filter(p => p.id !== id);
    writeProjects(projects);
    renderProjects();
  }

  function renderProjects(){
    const box = document.getElementById("projectList");
    if (!box) return;
    const q = (document.getElementById("projectSearch")?.value || "").toLowerCase().trim();
    const projects = readProjects().filter(p => {
      const hay = [p.name,p.clientName,p.dogName,p.course,p.courseCustom,p.instructor].join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
    if (!projects.length){
      box.innerHTML = '<p class="hint">Nessun progetto salvato.</p>';
      return;
    }
    box.innerHTML = projects.map(p => `
      <div class="project-item">
        <button type="button" data-open-project="${p.id}">
          <strong>${escapeHtml(p.name || "Progetto")}</strong><br>
          <small>${escapeHtml([p.clientName,p.dogName,p.courseCustom || p.course].filter(Boolean).join(" · "))}</small>
        </button>
        <button type="button" class="red" data-delete-project="${p.id}">Elimina</button>
      </div>
    `).join("");
    box.querySelectorAll("[data-open-project]").forEach(b => b.onclick = () => openProject(b.dataset.openProject));
    box.querySelectorAll("[data-delete-project]").forEach(b => b.onclick = () => {
      if (confirm("Eliminare questo progetto?")) deleteProject(b.dataset.deleteProject);
    });
  }

  function exportBackup(){
    const payload = {
      app: "K9 Template Studio",
      version: "8.3",
      exportedAt: new Date().toISOString(),
      projects: readProjects()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "backup-k9-template-studio-v8-3.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importBackup(file){
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        const incoming = Array.isArray(data) ? data : (data.projects || []);
        if (!Array.isArray(incoming)) throw new Error("Formato non valido");
        const existing = readProjects();
        const byId = new Map(existing.map(p => [p.id, p]));
        incoming.forEach(p => {
          p.id = p.id || ("p-" + Date.now() + "-" + Math.random().toString(36).slice(2,6));
          byId.set(p.id, p);
        });
        writeProjects([...byId.values()]);
        renderProjects();
        alert("Backup importato.");
      } catch (e) {
        alert("Backup non valido.");
      }
    };
    r.readAsText(file);
  }

  function escapeHtml(s){
    return String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  window.K9Archive = {saveProject, renderProjects, exportBackup, importBackup, readProjects};
})();
