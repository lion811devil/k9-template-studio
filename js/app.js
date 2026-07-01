/*
K9 Template Studio - app.js
Avvio PWA, service worker e inizializzazione generale.
*/
(function(){
  "use strict";

  window.K9App = {
    version: "1.0-modulare",
    startedAt: new Date().toISOString()
  };

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
