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
    leftSignatureRole: "Il Docente",
    leftSignatureName: "Nome Cognome",
    signatureRole: "Il Responsabile del Corso",
    signatureName: "Giovanni Napoletano",
    backgroundOpacity: 100,
    backgroundScale: 100,
    backgroundX: W / 2,
    backgroundY: H / 2,
    backgroundLocked: false,
    logoScale: 100,
    logoX: W / 2,
    logoY: 145,
    logoLocked: false
  };

  const state = {
    ...defaults,
    backgroundImage: null,
    backgroundFitScale: 1,
    logos: [],
    activeLogoIndex: -1
  };

  const textIds = ["recipientName", "bodyText", "courseName", "place", "leftSignatureRole", "leftSignatureName", "signatureRole", "signatureName"];

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

  function applyBackgroundLockUI() {
    const locked = !!state.backgroundLocked;
    ["backgroundOpacity","backgroundScale","backgroundX","backgroundY","fitBackground"].forEach(id => {
      const el = $(id);
      if (el) el.disabled = locked;
    });
    const btn = $("lockBackground");
    if (btn) {
      btn.setAttribute("aria-pressed", String(locked));
      btn.textContent = locked ? "Sblocca sfondo" : "Blocca sfondo";
      btn.classList.toggle("is-locked", locked);
    }
  }

  function getActiveLogo() {
    return state.activeLogoIndex >= 0 ? state.logos[state.activeLogoIndex] || null : null;
  }

  function updateLogoManagerUI() {
    const selector = $("logoSelector");
    const count = state.logos.length;
    selector.innerHTML = "";
    state.logos.forEach((logo, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `Logo ${index + 1}${logo.locked ? " · bloccato" : ""}`;
      selector.appendChild(option);
    });
    if (state.activeLogoIndex >= 0 && state.activeLogoIndex < count) {
      selector.value = String(state.activeLogoIndex);
    }
    $("logoManager").classList.toggle("hidden", count === 0);
    $("logoCount").textContent = count === 1 ? "1 logo inserito" : `${count} loghi inseriti`;
    $("logoUploadLabel").textContent = count ? "Carica un altro logo" : "Carica logo";
  }

  function syncLogoControls() {
    const logo = getActiveLogo();
    if (!logo) {
      $("logoTools").classList.add("hidden");
      updateLogoManagerUI();
      return;
    }
    $("logoScale").value = logo.scale;
    $("logoScaleValue").value = `${Math.round(logo.scale)}%`;
    const xPct = Math.round((logo.x / W) * 100);
    const yPct = Math.round((logo.y / H) * 100);
    $("logoX").value = xPct;
    $("logoY").value = yPct;
    $("logoXValue").value = `${xPct}%`;
    $("logoYValue").value = `${yPct}%`;
    $("logoTools").classList.remove("hidden");
    updateLogoManagerUI();
    applyLogoLockUI();
  }

  function applyLogoLockUI() {
    const logo = getActiveLogo();
    const locked = !!(logo && logo.locked);
    ["logoScale","logoX","logoY","centerLogo"].forEach(id => {
      const el = $(id);
      if (el) el.disabled = !logo || locked;
    });
    const btn = $("lockLogo");
    if (btn) {
      btn.disabled = !logo;
      btn.setAttribute("aria-pressed", String(locked));
      btn.textContent = locked ? "Sblocca logo" : "Blocca logo";
      btn.classList.toggle("is-locked", locked);
    }
    const removeBtn = $("removeLogo");
    if (removeBtn) removeBtn.disabled = !logo;
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

  function drawImagePositioned(img, scale, opacity = 1, centerX = W / 2, centerY = H / 2) {
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, centerX - iw / 2, centerY - ih / 2, iw, ih);
    ctx.restore();
  }

  function drawBase() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    if (state.backgroundImage) {
      const scale = state.backgroundFitScale * (state.backgroundScale / 100);
      drawImagePositioned(state.backgroundImage, scale, state.backgroundOpacity / 100, state.backgroundX, state.backgroundY);
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

  function fitItalicFont(text, maxWidth, startSize, minSize, weight = "600") {
    const family = '"Palatino Linotype", "Book Antiqua", Georgia, serif';
    let size = startSize;
    do {
      ctx.font = `italic ${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    } while (size > minSize);
    return minSize;
  }

  function drawCenteredItalic(text, y, size, color, weight = "600", maxWidth = 1320) {
    if (!text) return;
    const family = '"Palatino Linotype", "Book Antiqua", Georgia, serif';
    size = fitItalicFont(text, maxWidth, size, Math.max(24, Math.round(size * .55)), weight);
    ctx.font = `italic ${weight} ${size}px ${family}`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, W / 2, y);
  }

  function fitSignatureFont(text, maxWidth, startSize, minSize) {
    const family = '"Brush Script MT", "Segoe Script", "Snell Roundhand", "URW Chancery L", cursive';
    let size = startSize;
    do {
      ctx.font = `500 ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    } while (size > minSize);
    return minSize;
  }

  function drawSignatureBlock(centerX, role, name) {
    const ink = "#25221d";
    const lineHalf = 215;
    const maxWidth = lineHalf * 2 - 18;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Qualifica professionale sopra il blocco firma.
    ctx.fillStyle = "#55524c";
    const roleSize = fitFont(role, maxWidth, 26, 20, 'Georgia, "Times New Roman", serif', "700");
    ctx.font = `700 ${roleSize}px Georgia, "Times New Roman", serif`;
    ctx.fillText(role, centerX, 900);

    // Riga firma.
    const lineY = 980;
    ctx.strokeStyle = "rgba(50,45,36,.62)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(centerX - lineHalf, lineY);
    ctx.lineTo(centerX + lineHalf, lineY);
    ctx.stroke();

    if (name) {
      // Lo stesso nome viene reso automaticamente come firma manoscritta sulla riga.
      const signatureFamily = '"Brush Script MT", "Segoe Script", "Snell Roundhand", "URW Chancery L", cursive';
      const sigSize = fitSignatureFont(name, maxWidth, 54, 32);
      ctx.font = `500 ${sigSize}px ${signatureFamily}`;
      ctx.fillStyle = ink;
      ctx.fillText(name, centerX, lineY - 14);

      // Nome leggibile sotto la firma: deriva dallo stesso campo, nessun doppio inserimento.
      const printedFamily = 'Georgia, "Times New Roman", serif';
      const printedSize = fitFont(name, maxWidth, 25, 19, printedFamily, "900");
      ctx.font = `900 ${printedSize}px ${printedFamily}`;
      ctx.fillStyle = "#3d3a35";
      ctx.fillText(name, centerX, 1025);
    }
    ctx.restore();
  }

  function drawTextLayout() {
    const [title, subtitle] = $("documentType").value.split("|");
    const ink = "#26231f";
    const gold = "#735a2f";

    // Fascia superiore ampia e realmente libera per il logo.
    // I testi iniziano più in basso e con dimensioni equilibrate da attestato.
    drawCentered(title, 370, 82, 'Georgia, "Times New Roman", serif', gold, "900", 1380);
    drawCentered(subtitle, 438, 40, 'Georgia, "Times New Roman", serif', ink, "700", 1260);

    ctx.save();
    ctx.strokeStyle = "rgba(115,90,47,.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(560, 482);
    ctx.lineTo(1124, 482);
    ctx.stroke();
    ctx.restore();

    const recipient = $("recipientName").value.trim().toUpperCase();
    drawCentered(recipient, 555, 72, 'Georgia, "Times New Roman", serif', ink, "900", 1340);

    const bodyFont = '500 32px Georgia, "Times New Roman", serif';
    const lines = wrapLines($("bodyText").value, 1220, bodyFont);
    ctx.font = bodyFont;
    ctx.fillStyle = "#4b4740";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, i) => ctx.fillText(line, W / 2, 635 + i * 40));

    drawCentered($("courseName").value.trim().toUpperCase(), 745, 48, 'Georgia, "Times New Roman", serif', gold, "900", 1280);

    const locationDate = [$("place").value.trim(), formatDate($("certificateDate").value)].filter(Boolean).join(" · ");
    drawCentered(locationDate, 812, 28, 'Georgia, "Times New Roman", serif', "#4c4841", "700", 1160);

    drawSignatureBlock(375, $("leftSignatureRole").value.trim(), $("leftSignatureName").value.trim());
    drawSignatureBlock(1309, $("signatureRole").value.trim(), $("signatureName").value.trim());
  }

  function drawLogos() {
    state.logos.forEach(logo => {
      if (!logo || !logo.image) return;
      const img = logo.image;
      const baseWidth = 180;
      const ratio = img.naturalHeight / img.naturalWidth;
      const width = baseWidth * (logo.scale / 100);
      const height = width * ratio;
      ctx.save();
      ctx.drawImage(img, logo.x - width / 2, logo.y - height / 2, width, height);
      ctx.restore();
    });
  }

  function render() {
    drawBase();
    drawTextLayout();
    drawLogos();
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
    state.backgroundLocked = false;
    state.backgroundX = W / 2;
    state.backgroundY = H / 2;
    $("backgroundScale").value = 100;
    $("backgroundOpacity").value = 100;
    $("backgroundScaleValue").value = "100%";
    $("backgroundOpacityValue").value = "100%";
    $("backgroundX").value = 50;
    $("backgroundY").value = 50;
    $("backgroundXValue").value = "50%";
    $("backgroundYValue").value = "50%";
    $("backgroundTools").classList.remove("hidden");
    applyBackgroundLockUI();
    setStatus("Sfondo caricato");
  }

  function setLogo(img) {
    const logo = {
      image: img,
      scale: 100,
      x: W / 2,
      y: 150,
      locked: false
    };
    state.logos.push(logo);
    state.activeLogoIndex = state.logos.length - 1;
    $("logoFile").value = "";
    syncLogoControls();
    setStatus(`Logo ${state.activeLogoIndex + 1} caricato`);
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
  $("backgroundX").addEventListener("input", e => {
    const value = Number(e.target.value);
    state.backgroundX = (value / 100) * W;
    $("backgroundXValue").value = `${value}%`;
    render();
  });
  $("backgroundY").addEventListener("input", e => {
    const value = Number(e.target.value);
    state.backgroundY = (value / 100) * H;
    $("backgroundYValue").value = `${value}%`;
    render();
  });
  $("fitBackground").addEventListener("click", () => {
    state.backgroundScale = 100;
    state.backgroundX = W / 2;
    state.backgroundY = H / 2;
    $("backgroundScale").value = 100;
    $("backgroundScaleValue").value = "100%";
    $("backgroundX").value = 50;
    $("backgroundY").value = 50;
    $("backgroundXValue").value = "50%";
    $("backgroundYValue").value = "50%";
    render();
  });
  $("lockBackground").addEventListener("click", () => {
    state.backgroundLocked = !state.backgroundLocked;
    applyBackgroundLockUI();
    setStatus(state.backgroundLocked ? "Sfondo bloccato" : "Sfondo sbloccato");
  });

  $("removeBackground").addEventListener("click", () => {
    state.backgroundImage = null;
    state.backgroundLocked = false;
    $("backgroundFile").value = "";
    $("backgroundTools").classList.add("hidden");
    render();
  });

  $("logoScale").addEventListener("input", e => {
    const logo = getActiveLogo();
    if (!logo || logo.locked) return;
    logo.scale = Number(e.target.value);
    $("logoScaleValue").value = `${logo.scale}%`;
    render();
  });

  $("logoX").addEventListener("input", e => {
    const logo = getActiveLogo();
    if (!logo || logo.locked) return;
    const value = Number(e.target.value);
    logo.x = (value / 100) * W;
    $("logoXValue").value = `${value}%`;
    render();
  });

  $("logoY").addEventListener("input", e => {
    const logo = getActiveLogo();
    if (!logo || logo.locked) return;
    const value = Number(e.target.value);
    logo.y = (value / 100) * H;
    $("logoYValue").value = `${value}%`;
    render();
  });

  $("centerLogo").addEventListener("click", () => {
    const logo = getActiveLogo();
    if (!logo || logo.locked) return;
    logo.x = W / 2;
    logo.y = 150;
    syncLogoControls();
    render();
  });

  $("lockLogo").addEventListener("click", () => {
    const logo = getActiveLogo();
    if (!logo) return;
    logo.locked = !logo.locked;
    syncLogoControls();
    setStatus(logo.locked ? `Logo ${state.activeLogoIndex + 1} bloccato` : `Logo ${state.activeLogoIndex + 1} sbloccato`);
  });

  $("removeLogo").addEventListener("click", () => {
    if (!getActiveLogo()) return;
    const removedNumber = state.activeLogoIndex + 1;
    state.logos.splice(state.activeLogoIndex, 1);
    if (!state.logos.length) {
      state.activeLogoIndex = -1;
    } else {
      state.activeLogoIndex = Math.min(state.activeLogoIndex, state.logos.length - 1);
    }
    syncLogoControls();
    render();
    setStatus(`Logo ${removedNumber} rimosso`);
  });

  $("logoSelector").addEventListener("change", e => {
    state.activeLogoIndex = Number(e.target.value);
    syncLogoControls();
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
    state.backgroundImage = null;
    state.backgroundScale = 100; state.backgroundOpacity = 100;
    state.logos = []; state.activeLogoIndex = -1;
    $("backgroundTools").classList.add("hidden");
    $("logoTools").classList.add("hidden");
    $("logoManager").classList.add("hidden");
    $("backgroundFile").value = ""; $("logoFile").value = "";
    updateLogoManagerUI();
    render(); setStatus("Modello ripristinato");
  });

  loadSettings();
  render();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
