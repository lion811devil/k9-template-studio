(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const canvas = $("certificateCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const W = canvas.width;
  const H = canvas.height;

  const defaults = {
    documentType: "ATTESTATO|DI PARTECIPAZIONE",
    recipientName: "Mario Rossi",
    bodyText: "ha partecipato con profitto al percorso formativo",
    courseName: "CORSO DOGSITTER",
    place: "San Giuliano Milanese",
    signatureRole: "Il Responsabile del Corso",
    signatureName: "Giovanni Napoletano",
    backgroundOpacity: 100,
    backgroundScale: 100,
    logoScale: 100,
    logoX: W / 2,
    logoY: 150
  };

  const state = {
    ...defaults,
    backgroundImage: null,
    logoImage: null,
    backgroundFitScale: 1
  };

  const textIds = ["recipientName", "bodyText", "courseName", "place", "signatureRole", "signatureName"];

  function todayISO() {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function setStatus(text) {
    $("status").textContent = text;
    clearTimeout(setStatus.timer);
    setStatus.timer = setTimeout(() => { $("status").textContent = "Pronto"; }, 1800);
  }

  function escapeStored(value, fallback = "") {
    return typeof value === "string" ? value : fallback;
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("k9-certificati-settings") || "{}");
      $("documentType").value = escapeStored(saved.documentType, defaults.documentType);
      textIds.forEach(id => { $(id).value = escapeStored(saved[id], defaults[id]); });
      $("certificateDate").value = escapeStored(saved.certificateDate, todayISO());
    } catch {
      $("certificateDate").value = todayISO();
    }
  }

  function saveSettings() {
    const data = { documentType: $("documentType").value, certificateDate: $("certificateDate").value };
    textIds.forEach(id => { data[id] = $(id).value; });
    try { localStorage.setItem("k9-certificati-settings", JSON.stringify(data)); } catch {}
  }

  function formatDate(value) {
    if (!value) return "";
    const [y, m, d] = value.split("-");
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}`;
  }

  function coverScale(img) {
    return Math.max(W / img.naturalWidth, H / img.naturalHeight);
  }

  function drawImageCentered(img, scale, opacity = 1) {
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
    ctx.restore();
  }

  function drawBase() {
    ctx.fillStyle = "#fffdfa";
    ctx.fillRect(0, 0, W, H);

    if (state.backgroundImage) {
      const scale = state.backgroundFitScale * (state.backgroundScale / 100);
      drawImageCentered(state.backgroundImage, scale, state.backgroundOpacity / 100);
    }

    // Cornice predefinita elegante e leggera.
    ctx.save();
    ctx.strokeStyle = "rgba(105,82,44,.88)";
    ctx.lineWidth = 5;
    ctx.strokeRect(38, 38, W - 76, H - 76);
    ctx.strokeStyle = "rgba(105,82,44,.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(55, 55, W - 110, H - 110);
    ctx.restore();
  }

  function fitFont(text, maxWidth, startSize, minSize, family, weight = "700") {
    let size = startSize;
    do {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    } while (size > minSize);
    return minSize;
  }

  function drawCentered(text, y, size, family, color, weight = "700", maxWidth = 1320) {
    if (!text) return;
    size = fitFont(text, maxWidth, size, Math.max(22, Math.round(size * .55)), family, weight);
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, W / 2, y);
  }

  function wrapLines(text, maxWidth, font) {
    ctx.font = font;
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = `${line} ${words[i]}`;
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else { lines.push(line); line = words[i]; }
    }
    lines.push(line);
    return lines.slice(0, 3);
  }

  function drawTextLayout() {
    const [title, subtitle] = $("documentType").value.split("|");
    const ink = "#25221d";
    const gold = "#765d32";

    drawCentered(title, 250, 86, "Georgia, serif", gold, "700");
    drawCentered(subtitle, 326, 42, "Arial, sans-serif", ink, "600");

    ctx.save();
    ctx.strokeStyle = "rgba(118,93,50,.55)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(550, 375); ctx.lineTo(1050, 375); ctx.stroke();
    ctx.restore();

    drawCentered($("recipientName").value.trim(), 475, 68, "Georgia, serif", ink, "700", 1250);

    const bodyFont = "400 31px Arial, sans-serif";
    const lines = wrapLines($("bodyText").value, 1120, bodyFont);
    ctx.font = bodyFont; ctx.fillStyle = "#4b4a46"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lines.forEach((line, i) => ctx.fillText(line, W / 2, 560 + i * 40));

    drawCentered($("courseName").value.trim(), 700, 47, "Arial, sans-serif", gold, "800", 1240);

    const locationDate = [$("place").value.trim(), formatDate($("certificateDate").value)].filter(Boolean).join(" · ");
    drawCentered(locationDate, 807, 26, "Arial, sans-serif", "#5f5d58", "500", 1100);

    // Firma predefinita a destra.
    ctx.textAlign = "center";
    ctx.fillStyle = "#55524c";
    ctx.font = "500 22px Arial, sans-serif";
    ctx.fillText($("signatureRole").value.trim(), 1245, 900);
    ctx.strokeStyle = "rgba(50,45,36,.50)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(1050, 954); ctx.lineTo(1440, 954); ctx.stroke();
    const sig = $("signatureName").value.trim();
    const sigSize = fitFont(sig, 390, 27, 19, "Georgia, serif", "600");
    ctx.font = `600 ${sigSize}px Georgia, serif`;
    ctx.fillStyle = ink;
    ctx.fillText(sig, 1245, 992);
  }

  function drawLogo() {
    if (!state.logoImage) return;
    const img = state.logoImage;
    const baseWidth = 200;
    const ratio = img.naturalHeight / img.naturalWidth;
    const width = baseWidth * (state.logoScale / 100);
    const height = width * ratio;
    ctx.save();
    ctx.drawImage(img, state.logoX - width / 2, state.logoY - height / 2, width, height);
    ctx.restore();
  }

  function render() {
    drawBase();
    drawTextLayout();
    drawLogo();
  }

  function loadImage(file, onLoad) {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("File immagine non valido");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      onLoad(img);
      URL.revokeObjectURL(url);
      render();
    };
    img.onerror = () => { URL.revokeObjectURL(url); setStatus("Immagine non leggibile"); };
    img.src = url;
  }

  function setBackground(img) {
    state.backgroundImage = img;
    state.backgroundFitScale = coverScale(img);
    state.backgroundScale = 100;
    state.backgroundOpacity = 100;
    $("backgroundScale").value = 100;
    $("backgroundOpacity").value = 100;
    $("backgroundScaleValue").value = "100%";
    $("backgroundOpacityValue").value = "100%";
    $("backgroundTools").classList.remove("hidden");
    setStatus("Sfondo caricato");
  }

  function setLogo(img) {
    state.logoImage = img;
    state.logoScale = 100;
    state.logoX = W / 2;
    state.logoY = 150;
    $("logoScale").value = 100;
    $("logoScaleValue").value = "100%";
    $("logoTools").classList.remove("hidden");
    setStatus("Logo caricato");
  }

  function safeFilename() {
    const raw = `Attestato_${$("recipientName").value || "certificato"}_${$("certificateDate").value || ""}`;
    return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "certificato";
  }

  function buildPdfBlob() {
    // PDF A4 landscape (842 x 595 pt), JPEG del canvas adattato senza deformazione.
    const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
    const binary = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pageW = 842, pageH = 595;
    const imageRatio = W / H;
    const pageRatio = pageW / pageH;
    let drawW, drawH, drawX, drawY;
    if (imageRatio > pageRatio) {
      drawW = pageW; drawH = pageW / imageRatio; drawX = 0; drawY = (pageH - drawH) / 2;
    } else {
      drawH = pageH; drawW = pageH * imageRatio; drawY = 0; drawX = (pageW - drawW) / 2;
    }

    const enc = new TextEncoder();
    const chunks = [];
    let length = 0;
    const offsets = [0];
    const push = part => {
      const arr = typeof part === "string" ? enc.encode(part) : part;
      chunks.push(arr); length += arr.length;
    };
    const obj = (n, content) => { offsets[n] = length; push(`${n} 0 obj\n${content}\nendobj\n`); };

    push("%PDF-1.4\n%K9\n");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
    const stream = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/Im0 Do\nQ`;
    obj(4, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    offsets[5] = length;
    push(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
    push(bytes);
    push("\nendstream\nendobj\n");

    const xref = length;
    push("xref\n0 6\n0000000000 65535 f \n");
    for (let i = 1; i <= 5; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(chunks, { type: "application/pdf" });
  }

  function downloadPdf() {
    render();
    try {
      const blob = buildPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFilename()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setStatus("PDF creato");
    } catch (err) {
      console.error(err);
      setStatus("Errore nella creazione PDF");
    }
  }

  function moveLogo(direction, amount = 18) {
    if (!state.logoImage) return;
    if (direction === "up") state.logoY -= amount;
    if (direction === "down") state.logoY += amount;
    if (direction === "left") state.logoX -= amount;
    if (direction === "right") state.logoX += amount;
    state.logoX = Math.max(0, Math.min(W, state.logoX));
    state.logoY = Math.max(0, Math.min(H, state.logoY));
    render();
  }

  function addPressMove(button) {
    const direction = button.dataset.move;
    let interval = null;
    const start = e => {
      e.preventDefault();
      moveLogo(direction);
      interval = setInterval(() => moveLogo(direction, 12), 85);
    };
    const stop = () => { clearInterval(interval); interval = null; };
    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointerleave", stop);
    button.addEventListener("pointercancel", stop);
  }

  $("backgroundFile").addEventListener("change", e => loadImage(e.target.files[0], setBackground));
  $("logoFile").addEventListener("change", e => loadImage(e.target.files[0], setLogo));

  $("backgroundOpacity").addEventListener("input", e => {
    state.backgroundOpacity = Number(e.target.value);
    $("backgroundOpacityValue").value = `${state.backgroundOpacity}%`;
    render();
  });
  $("backgroundScale").addEventListener("input", e => {
    state.backgroundScale = Number(e.target.value);
    $("backgroundScaleValue").value = `${state.backgroundScale}%`;
    render();
  });
  $("fitBackground").addEventListener("click", () => {
    state.backgroundScale = 100;
    $("backgroundScale").value = 100;
    $("backgroundScaleValue").value = "100%";
    render();
  });
  $("removeBackground").addEventListener("click", () => {
    state.backgroundImage = null;
    $("backgroundFile").value = "";
    $("backgroundTools").classList.add("hidden");
    render();
  });

  $("logoScale").addEventListener("input", e => {
    state.logoScale = Number(e.target.value);
    $("logoScaleValue").value = `${state.logoScale}%`;
    render();
  });
  document.querySelectorAll("[data-move]").forEach(addPressMove);
  $("centerLogo").addEventListener("click", () => { state.logoX = W / 2; state.logoY = 150; render(); });
  $("removeLogo").addEventListener("click", () => {
    state.logoImage = null;
    $("logoFile").value = "";
    $("logoTools").classList.add("hidden");
    render();
  });

  ["documentType", "certificateDate", ...textIds].forEach(id => {
    $(id).addEventListener("input", () => { saveSettings(); render(); });
    $(id).addEventListener("change", () => { saveSettings(); render(); });
  });

  $("downloadPdf").addEventListener("click", downloadPdf);
  $("downloadPdfBottom").addEventListener("click", downloadPdf);
  $("resetAll").addEventListener("click", () => {
    if (!confirm("Ripristinare il modello iniziale? Sfondo e logo verranno rimossi.")) return;
    localStorage.removeItem("k9-certificati-settings");
    $("documentType").value = defaults.documentType;
    textIds.forEach(id => { $(id).value = defaults[id]; });
    $("certificateDate").value = todayISO();
    state.backgroundImage = null; state.logoImage = null;
    state.backgroundScale = 100; state.backgroundOpacity = 100;
    state.logoScale = 100; state.logoX = W / 2; state.logoY = 150;
    $("backgroundTools").classList.add("hidden");
    $("logoTools").classList.add("hidden");
    $("backgroundFile").value = ""; $("logoFile").value = "";
    render(); setStatus("Modello ripristinato");
  });

  loadSettings();
  render();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
