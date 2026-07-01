/*
K9 Template Studio - photo.js
Modulo Foto Soggetto V1.3
*/

(function () {
  "use strict";

  const MODULE_VERSION = "1.3";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function getPhotoSettingsSafe() {
    const fallback = {
      removeBg: false,
      soft: true,
      softAmount: 35,
      opacity: 100,
      scale: 100
    };

    try {
      if (typeof window.getPhotoSettings === "function") {
        return { ...fallback, ...window.getPhotoSettings() };
      }
    } catch (_) {}

    return {
      removeBg: !!(getEl("photoRemoveBg") && getEl("photoRemoveBg").checked),
      soft: !!(getEl("photoSoftEdges") && getEl("photoSoftEdges").checked),
      softAmount: Number(getEl("photoSoftAmount") ? getEl("photoSoftAmount").value : 35),
      opacity: Number(getEl("photoOpacity") ? getEl("photoOpacity").value : 100),
      scale: Number(getEl("photoScale") ? getEl("photoScale").value : 100)
    };
  }

  function preparePhotoCanvas(image, width, height, settings) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(width));
    c.height = Math.max(1, Math.round(height));

    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.clearRect(0, 0, c.width, c.height);
    cx.drawImage(image, 0, 0, c.width, c.height);

    let data;
    try {
      data = cx.getImageData(0, 0, c.width, c.height);
    } catch (_) {
      return c;
    }

    const d = data.data;
    const removeBg = !!settings.removeBg;
    const soft = settings.soft !== false;
    const softAmount = clamp(Number(settings.softAmount || 35), 5, 100);

    if (removeBg) {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        const bright = (r + g + b) / 3;

        const isNeutral = diff < 34;
        const isWarmLight = r > 200 && g > 188 && b > 165 && diff < 58;
        const isVeryLight = bright > 235 && diff < 60;
        const isLightNeutral = bright > 218 && isNeutral;
        const isNearWhite = r > 225 && g > 225 && b > 225;

        if (isVeryLight || isNearWhite || isLightNeutral || isWarmLight) {
          let alphaCut = 0;

          if (bright > 245) alphaCut = 255;
          else if (bright > 235) alphaCut = 220;
          else if (bright > 225) alphaCut = 165;
          else alphaCut = 90;

          d[i + 3] = Math.max(0, d[i + 3] - alphaCut);
        }
      }
    }

    if (soft) {
      const edge = Math.max(
        2,
        Math.round(Math.min(c.width, c.height) * (softAmount / 100) * 0.32)
      );

      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const dist = Math.min(x, y, c.width - 1 - x, c.height - 1 - y);
          const edgeAlpha = clamp(dist / edge, 0, 1);
          const idx = (y * c.width + x) * 4 + 3;
          d[idx] = Math.round(d[idx] * edgeAlpha);
        }
      }
    }

    cx.putImageData(data, 0, 0);
    return c;
  }

  function drawPhotoToBox(ctx, canvas, image, graphicBox, settings, offset) {
    const box = {
      x: graphicBox.x * canvas.width + (offset ? offset.x : 0),
      y: graphicBox.y * canvas.height + (offset ? offset.y : 0),
      w: graphicBox.w * canvas.width,
      h: graphicBox.h * canvas.height
    };

    let scale = Math.min(box.w / image.width, box.h / image.height);
    let w = image.width * scale;
    let h = image.height * scale;
    let x = box.x + (box.w - w) / 2;
    let y = box.y + (box.h - h) / 2;

    const mult = clamp(Number(settings.scale || 100), 20, 220) / 100;
    const centerX = x + w / 2;
    const centerY = y + h / 2;

    w *= mult;
    h *= mult;
    x = centerX - w / 2;
    y = centerY - h / 2;

    const processed = preparePhotoCanvas(image, w, h, settings);

    ctx.save();
    ctx.globalAlpha = clamp(Number(settings.opacity || 100), 0, 100) / 100;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.drawImage(processed, x, y, w, h);
    ctx.restore();
  }

  function installPhotoRenderer() {
    if (window.__k9PhotoV13Installed) return true;

    if (
      typeof window.drawImageToBox !== "function" ||
      typeof window.off !== "function" ||
      typeof window.canvas === "undefined" ||
      typeof window.ctx === "undefined"
    ) {
      return false;
    }

    const originalDrawImageToBox = window.drawImageToBox;

    window.drawImageToBox = function patchedDrawImageToBox(image, graphicBox, isPhoto) {
      if (!isPhoto || !graphicBox || graphicBox.id !== "photo") {
        return originalDrawImageToBox.apply(this, arguments);
      }

      try {
        const settings = getPhotoSettingsSafe();
        const offset = window.off("g:" + graphicBox.id);
        drawPhotoToBox(window.ctx, window.canvas, image, graphicBox, settings, offset);
      } catch (err) {
        console.warn("K9 photo renderer fallback:", err);
        return originalDrawImageToBox.apply(this, arguments);
      }
    };

    window.__k9PhotoV13Installed = true;
    return true;
  }

  function enhancePhotoUi() {
    const note = Array.from(document.querySelectorAll(".logic-card"))
      .find(card => card.textContent && card.textContent.includes("Foto / soggetto"));

    if (note && !document.getElementById("k9PhotoModuleNote")) {
      const box = document.createElement("div");
      box.id = "k9PhotoModuleNote";
      box.className = "hint";
      box.innerHTML =
        "<b>Modulo Foto Soggetto V1.3 attivo.</b><br>" +
        "Usa il menu Grafica → Foto / soggetto per caricare la foto, rimuovere sfondo chiaro, sfumare bordi, regolare opacità e dimensione. " +
        "Per spostarla: seleziona Foto / soggetto in Elemento singolo e usa le frecce.";
      note.appendChild(box);
    }

    ["photoRemoveBg", "photoSoftEdges", "photoSoftAmount", "photoOpacity", "photoScale"].forEach(id => {
      const input = getEl(id);
      if (input && !input.__k9PhotoBound) {
        input.__k9PhotoBound = true;
        input.addEventListener("input", () => {
          if (typeof window.draw === "function") window.draw();
        });
        input.addEventListener("change", () => {
          if (typeof window.draw === "function") window.draw();
        });
      }
    });
  }

  function start() {
    let attempts = 0;
    const maxAttempts = 80;

    const timer = setInterval(() => {
      attempts += 1;

      const installed = installPhotoRenderer();
      enhancePhotoUi();

      if (installed || attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.K9PhotoModule = {
    version: MODULE_VERSION,
    ready: true,
    installPhotoRenderer,
    preparePhotoCanvas,
    drawPhotoToBox
  };
})();
