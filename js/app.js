(() => {
  "use strict";

  function initTabs(){
    document.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        const panel = document.getElementById("tab-" + tab);
        if (panel) panel.classList.add("active");
      });
    });
  }

  function quickButtonsFallback(){
    const quickLayers = document.getElementById("quickLayers");
    const quickProps = document.getElementById("quickProps");
    const quickAdd = document.getElementById("quickAddElement");
    const quickFit = document.getElementById("quickFit");

    if (quickLayers) quickLayers.onclick = () => document.querySelector('[data-tab="muovi"]')?.click();
    if (quickProps) quickProps.onclick = () => document.querySelector('[data-tab="muovi"]')?.click();
    if (quickAdd) quickAdd.onclick = () => document.querySelector('[data-tab="elementi"]')?.click();
    if (quickFit) quickFit.onclick = () => {
      if (window.K9Editor && typeof window.K9Editor.draw === "function") window.K9Editor.draw();
      const s = document.getElementById("status");
      if (s) s.textContent = "Anteprima aggiornata.";
    };
  }

  window.addEventListener("DOMContentLoaded", async () => {
    initTabs();
    quickButtonsFallback();

    if (window.K9Editor && typeof window.K9Editor.init === "function") {
      try {
        await window.K9Editor.init();
        const s = document.getElementById("status");
        if (s && /Errore inizializzazione/.test(s.textContent)) s.textContent = "Pronto.";
      } catch (err) {
        console.error("K9Editor init error:", err);
        const s = document.getElementById("status");
        if (s) s.textContent = "Editor avviato in modalità sicura.";
      }
    }
  });

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });

  window.K9InstallApp = async function () {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    deferredPrompt = null;
    return true;
  };

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(console.warn);
    });
  }
})();
