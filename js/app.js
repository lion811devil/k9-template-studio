(() => {
  "use strict";

  window.addEventListener("DOMContentLoaded", async () => {
    if (window.K9Editor && typeof window.K9Editor.init === "function") {
      try {
        await window.K9Editor.init();
      } catch (err) {
        console.error("K9Editor init error:", err);
        const s = document.getElementById("status");
        if (s) s.textContent = "Errore inizializzazione editor. Controlla console.";
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
