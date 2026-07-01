(() => {
  "use strict";
  window.addEventListener("load", async () => {
    if ("serviceWorker" in navigator) {
      try { await navigator.serviceWorker.register("./sw.js"); } catch (_) {}
    }
    if (window.K9Editor) window.K9Editor.init();
    if (window.K9Archive) window.K9Archive.init();
  });
})();
