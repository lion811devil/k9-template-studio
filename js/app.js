(function(){
  "use strict";
  window.K9App = {version:"2.0"};
  window.addEventListener("load", () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(()=>{});
    }
    if (window.K9Editor) window.K9Editor.init();
    if (window.K9Archive) window.K9Archive.init();
  });
})();
