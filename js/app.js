(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const canvas = $("certificateCanvas");
  let ctx = canvas.getContext("2d", { alpha: false });
  let pdfTextOps = null;
  let layoutWarnings = [];
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
    certificateCode: "", courseHours: "", courseOutcome: "",
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
    activeLogoIndex: -1,
    backgroundBlob: null,
    leftSignatureImage: null, leftSignatureBlob: null,
    signatureImage: null, signatureBlob: null,
    currentProjectId: null, initialized: false, exporting: false
  };

  const textIds = ["recipientName", "bodyText", "courseName", "place", "leftSignatureRole", "leftSignatureName", "signatureRole", "signatureName", "certificateCode", "courseHours"];
  const designIds = ["designTheme", "accentColor", "inkColor", "frameStyle", "fontScale"];
  const formIds = ["documentType", "certificateDate", ...textIds, "courseOutcome", "leftSignatureMode", "signatureMode", ...designIds.filter(id => id !== "designTheme")];
  const themePalettes = {
    classic: { accent: "#735a2f", ink: "#26231f", frame: "double" },
    navy: { accent: "#193b6b", ink: "#182a41", frame: "double" },
    forest: { accent: "#32664e", ink: "#253e31", frame: "corners" },
    burgundy: { accent: "#7b3548", ink: "#3b252d", frame: "double" },
    minimal: { accent: "#343f50", ink: "#263341", frame: "none" }
  };
  let selectedTheme = "classic";
  const MAX_IMAGE_MB = 15;
  const MAX_BATCH = 30;
  const DB_NAME = "k9-certificati-progetti-v2";
  let dbPromise;
  let autosaveTimer;
  let lastBatchUrl = null;
  let showGuides = false;
  const saveIndicator = $("saveIndicator");
  function setSaveIndicator(message, kind = "") {
    saveIndicator.textContent = message;
    saveIndicator.className = `save-indicator ${kind}`.trim();
  }
  function localClock() {
    return new Intl.DateTimeFormat("it-IT",{hour:"2-digit",minute:"2-digit"}).format(new Date());
  }


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
      $("courseOutcome").value = escapeStored(saved.courseOutcome, "");
      for (const id of designIds.filter(k => k !== "designTheme")) {
        if (saved[id] !== undefined) $(id).value = saved[id];
      }
      selectedTheme = saved.designTheme === "custom" ? "custom" : themePalettes[saved.designTheme] ? saved.designTheme : "classic";
      syncDesignUI();
    } catch {
      $("certificateDate").value = todayISO();
    }
  }

  function saveSettings() {
    const data = { documentType: $("documentType").value, certificateDate: $("certificateDate").value };
    textIds.forEach(id => { data[id] = $(id).value; });
    data.courseOutcome = $("courseOutcome").value;
    data.designTheme = selectedTheme;
    designIds.filter(id => id !== "designTheme").forEach(id => data[id] = $(id).value);
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

  function designColor(id, fallback) {
    const color = $(id).value;
    return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
  }

  function fontRatio() { return Number($("fontScale").value || 100) / 100; }

  function syncDesignUI() {
    document.querySelectorAll(".theme-choice").forEach(btn => {
      const chosen = btn.dataset.theme === selectedTheme;
      btn.setAttribute("aria-pressed", String(chosen));
      btn.classList.toggle("selected", chosen);
    });
    $("fontScaleValue").value = `${$("fontScale").value}%`;
  }

  function drawBase() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    if (state.backgroundImage) {
      const scale = state.backgroundFitScale * (state.backgroundScale / 100);
      drawImagePositioned(state.backgroundImage, scale, state.backgroundOpacity / 100, state.backgroundX, state.backgroundY);
    }

    const accent = designColor("accentColor", "#735a2f");
    const style = $("frameStyle").value;
    if (style === "none") return;
    ctx.save();
    ctx.strokeStyle = accent;
    if (style === "double") {
      ctx.globalAlpha = .85; ctx.lineWidth = 4.5;
      ctx.strokeRect(38, 38, W - 76, H - 76);
      ctx.globalAlpha = .40; ctx.lineWidth = 2;
      ctx.strokeRect(55, 55, W - 110, H - 110);
    } else if (style === "single") {
      ctx.globalAlpha = .7; ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, W - 80, H - 80);
    } else if (style === "corners") {
      ctx.globalAlpha = .82; ctx.lineWidth = 5;
      const m = 43, arm = 158;
      for (const [sx, sy] of [[1,1],[-1,1],[1,-1],[-1,-1]]) {
        const x = sx === 1 ? m : W - m, y = sy === 1 ? m : H - m;
        ctx.beginPath();ctx.moveTo(x+sx*arm,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*arm);ctx.stroke();
      }
    }
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
    const minSize = Math.max(22, Math.round(size * .43));
    size = fitFont(text, maxWidth, size, minSize, family, weight);
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (ctx.measureText(text).width > maxWidth + .5) layoutWarnings.push(`Il testo «${String(text).slice(0, 28)}…» supera lo spazio disponibile.`);
    drawText(text, W / 2, y);
  }

  function drawText(text, x, y, mode = "bold") {
    ctx.fillText(text, x, y);
    if (pdfTextOps && text) {
      const match = ctx.font.match(/([\d.]+)px/);
      pdfTextOps.push({ text: String(text), x, y, size: match ? Number(match[1]) : 24,
        width: ctx.measureText(text).width, color: ctx.fillStyle,
        font: mode === "italic" ? "italic" : /\b(700|800|900|bold)\b/.test(ctx.font) ? "bold" : "regular" });
    }
  }

  function wrapLines(text, maxWidth, font) {
    ctx.font = font;
    const lines = [];
    const paragraphs = String(text || "").replace(/\r/g, "").split("\n");
    for (const paragraph of paragraphs) {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (!words.length) { if (paragraphs.length > 1) lines.push(""); continue; }
      let line = "";
      for (const word of words) {
        if (ctx.measureText(word).width > maxWidth) {
          if (line) { lines.push(line); line = ""; }
          let piece = "";
          for (const character of Array.from(word)) {
            if (piece && ctx.measureText(piece + character).width > maxWidth) { lines.push(piece); piece = ""; }
            piece += character;
          }
          line = piece;
          continue;
        }
        const candidate = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(candidate).width > maxWidth) { lines.push(line); line = word; }
        else line = candidate;
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  function bodyLayout() {
    const text = $("bodyText").value;
    const family = 'Georgia, "Times New Roman", serif';
    const top = 605, bottom = 705;
    for (let size = Math.round(32 * fontRatio()); size >= 17; size--) {
      const font = `500 ${size}px ${family}`;
      const lines = wrapLines(text, 1220, font);
      const spacing = size + 8;
      if (lines.length * spacing <= bottom - top + spacing) return { lines, size, spacing, top, bottom, fits: true };
    }
    const lines = wrapLines(text, 1220, `500 18px ${family}`);
    return { lines, size: 18, spacing: 24, top, bottom, fits: false };
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

  function signatureForX(centerX) {
    return centerX < W / 2
      ? { mode: $("leftSignatureMode").value, image: state.leftSignatureImage }
      : { mode: $("signatureMode").value, image: state.signatureImage };
  }

  function drawSignatureArtwork(centerX, name) {
    const { mode, image } = signatureForX(centerX);
    const maxWidth = 405;
    const lineY = 980;
    if (mode === "image" && image) {
      const ratio = image.naturalWidth / image.naturalHeight;
      const w = Math.min(maxWidth, 115 * ratio);
      const h = w / ratio;
      ctx.drawImage(image, centerX - w / 2, lineY - h - 3, w, h);
    } else if (mode === "auto" && name) {
      const signatureFamily = '"Brush Script MT", "Segoe Script", "Snell Roundhand", "URW Chancery L", cursive';
      const sigSize = fitSignatureFont(name, maxWidth, 54, 25);
      ctx.font = `500 ${sigSize}px ${signatureFamily}`;
      ctx.fillStyle = "#25221d";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, centerX, lineY - 14);
    }
  }

  function drawSignatureLines() {
    for (const x of [375, 1309]) {
      ctx.save();
      ctx.strokeStyle = "rgba(50,45,36,.62)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - 215, 980);
      ctx.lineTo(x + 215, 980);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSignatureBlock(centerX, role, name) {
    const maxWidth = 412;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#55524c";
    const roleSize = fitFont(role, maxWidth, 26, 18, 'Georgia, "Times New Roman", serif', "700");
    ctx.font = `700 ${roleSize}px Georgia, "Times New Roman", serif`;
    if (ctx.measureText(role).width > maxWidth) layoutWarnings.push("Una qualifica firma è troppo lunga.");
    drawText(role, centerX, 900);
    if (name) {
      const printedFamily = 'Georgia, "Times New Roman", serif';
      const printedSize = fitFont(name, maxWidth, 25, 18, printedFamily, "900");
      ctx.font = `900 ${printedSize}px ${printedFamily}`;
      ctx.fillStyle = "#3d3a35";
      if (ctx.measureText(name).width > maxWidth) layoutWarnings.push("Un nome firmatario è troppo lungo.");
      drawText(name, centerX, 1025);
    }
    ctx.restore();
  }

  function drawTextLayout() {
    const [title, subtitle] = $("documentType").value.split("|");
    const ink = designColor("inkColor", "#26231f");
    const gold = designColor("accentColor", "#735a2f");
    const fontAdj = fontRatio();

    // Fascia superiore ampia e realmente libera per il logo.
    // I testi iniziano più in basso e con dimensioni equilibrate da attestato.
    drawCentered(title, 370, Math.round(82 * fontAdj), 'Georgia, "Times New Roman", serif', gold, "900", 1380);
    drawCentered(subtitle, 438, Math.round(40 * fontAdj), 'Georgia, "Times New Roman", serif', ink, "700", 1260);

    ctx.save();
    ctx.strokeStyle = gold;
    ctx.globalAlpha = .55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(560, 482);
    ctx.lineTo(1124, 482);
    ctx.stroke();
    ctx.restore();

    const recipient = $("recipientName").value.trim().toUpperCase();
    drawCentered(recipient, 555, Math.round(72 * fontAdj), 'Georgia, "Times New Roman", serif', ink, "900", 1340);

    const body = bodyLayout();
    if (!body.fits) layoutWarnings.push("Testo centrale troppo lungo: riducilo prima di creare il PDF.");
    ctx.font = `500 ${body.size}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const bodyStart = (body.top + body.bottom) / 2 - (body.lines.length - 1) * body.spacing / 2;
    body.lines.forEach((line, i) => drawText(line, W / 2, bodyStart + i * body.spacing, "regular"));

    drawCentered($("courseName").value.trim().toUpperCase(), 745, Math.round(48 * fontAdj), 'Georgia, "Times New Roman", serif', gold, "900", 1280);

    const locationDate = [$("place").value.trim(), formatDate($("certificateDate").value)].filter(Boolean).join(" · ");
    drawCentered(locationDate, 812, Math.round(28 * fontAdj), 'Georgia, "Times New Roman", serif', ink, "700", 1160);

    const metadata = [];
    const code = $("certificateCode").value.trim();
    const hours = $("courseHours").value.trim();
    const outcome = $("courseOutcome").value;
    if (code) metadata.push(`N. ${code}`);
    if (hours) metadata.push(`Durata: ${hours}`);
    if (outcome) metadata.push(`Esito: ${outcome}`);
    if (metadata.length) {
      drawCentered(metadata.join("   •   "), 853, Math.round(23 * fontAdj), 'Georgia, "Times New Roman", serif', ink, "700", 1320);
    }

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

  function drawGraphics() {
    drawBase();
    drawSignatureLines();
    ctx.save();
    drawSignatureArtwork(375, $("leftSignatureName").value.trim());
    drawSignatureArtwork(1309, $("signatureName").value.trim());
    ctx.restore();
    drawLogos();
  }

  function drawSafetyGuides() {
    ctx.save();
    ctx.strokeStyle = "rgba(198,73,53,.65)";
    ctx.lineWidth = 2;
    ctx.setLineDash([13, 9]);
    ctx.strokeRect(74, 74, W - 148, H - 148);
    ctx.setLineDash([]);
    ctx.restore();
  }

  function documentProblems() {
    const issues = [...new Set(layoutWarnings)];
    if (!$("recipientName").value.trim()) issues.push("Inserisci il nominativo del corsista");
    if (!$("courseName").value.trim()) issues.push("Inserisci il corso o la qualifica");
    if (window.K9PDF?.canEncode) {
      for (const id of ["recipientName", "bodyText", "courseName", "place", "certificateCode", "courseHours", "leftSignatureRole", "leftSignatureName", "signatureRole", "signatureName"]) {
        const content = $(id).value;
        if (content && !window.K9PDF.canEncode(content)) {
          issues.push(`Il campo «${$(id).closest("label")?.firstChild?.textContent?.trim() || id}» contiene caratteri non supportati dal PDF`);
          break;
        }
      }
    }
    return issues;
  }

  function updatePrintCheck() {
    const issues = documentProblems();
    const box = $("printCheck");
    box.classList.toggle("needs-attention", !!issues.length);
    box.textContent = issues.length ? `Prima della stampa: ${issues.slice(0, 2).join(" · ")}${issues.length > 2 ? ` · altri ${issues.length-2} controlli` : ""}` : "Verifica stampa: nessuna anomalia rilevata";
  }

  function render() {
    if (!state.exporting) invalidateReadyBatch();
    layoutWarnings = [];
    drawGraphics();
    drawTextLayout();
    if (showGuides) drawSafetyGuides(); // Solo anteprima, mai nel PDF o nel PNG.
    const warning = $("layoutWarning");
    warning.classList.toggle("hidden", !layoutWarnings.length);
    warning.textContent = [...new Set(layoutWarnings)].join(" ");
    updatePrintCheck();
    if (state.initialized && !state.exporting) scheduleAutosave();
  }

  function imageFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Immagine non leggibile")); };
      img.src = url;
    });
  }

  async function loadImage(file, onLoad) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > MAX_IMAGE_MB * 1048576) {
      setStatus(`Usa PNG, JPG o WEBP (massimo ${MAX_IMAGE_MB} MB)`);
      return;
    }
    try { onLoad(await imageFromBlob(file), file); render(); }
    catch (err) { console.error(err); setStatus("Immagine non leggibile"); }
  }

  function setBackground(img, blob) {
    state.backgroundImage = img;
    state.backgroundBlob = blob;
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

  function setLogo(img, blob) {
    const logo = {
      image: img, blob,
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

  function imageToJpeg(canvasRef, quality = .93) {
    const data = canvasRef.toDataURL("image/jpeg", quality).split(",")[1];
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function composePage() {
    // Solo sfondi, loghi, cornici e firme grafiche sono rasterizzati a 300 DPI;
    // i testi vengono scritti separatamente come oggetti vettoriali PDF.
    const outW = 3508, outH = 2480;
    const high = document.createElement("canvas");
    high.width = outW; high.height = outH;
    const previous = ctx;
    try {
      ctx = high.getContext("2d", { alpha: false });
      ctx.scale(outW / W, outH / H);
      drawGraphics();
      return imageToJpeg(high);
    } finally {
      ctx = previous;
      high.width = 1; high.height = 1;
    }
  }

  function recordPage(sharedGraphics = null) {
    pdfTextOps = [];
    try {
      render();
      const problems = documentProblems();
      if (problems.length) throw new Error(problems[0]);
      const ops = pdfTextOps.slice();
      pdfTextOps = null;
      const jpg = sharedGraphics || composePage();
      return { image: jpg, width: 3508, height: 2480, texts: ops };
    } finally { pdfTextOps = null; }
  }

  function invalidateReadyBatch() {
    if (lastBatchUrl) { URL.revokeObjectURL(lastBatchUrl); lastBatchUrl = null; }
    $("readyBatchLink").classList.add("hidden");
    $("readyBatchLink").removeAttribute("href");
  }

  function offerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function downloadPng() {
    if (state.exporting) return;
    state.exporting = true;
    const oldCtx = ctx;
    const oldOps = pdfTextOps;
    let high;
    try {
      render();
      const problems = documentProblems().filter(s => !s.includes("caratteri non supportati"));
      if (problems.length) throw new Error(problems[0]);
      setStatus("Preparazione PNG 300 DPI…");
      high = document.createElement("canvas");
      high.width = 3508; high.height = 2480;
      ctx = high.getContext("2d", {alpha:false});
      ctx.scale(high.width/W,high.height/H);
      pdfTextOps = null;
      drawGraphics();
      drawTextLayout();
      if (layoutWarnings.length) throw new Error(layoutWarnings[0]);
      ctx = oldCtx;
      pdfTextOps = oldOps;
      const blob = await new Promise((resolve,reject) => high.toBlob(b=>b ? resolve(b) : reject(new Error("Esportazione PNG non disponibile")), "image/png"));
      offerDownload(blob, `${safeFilename()}.png`);
      setStatus("PNG 300 DPI pronto");
    } catch (err) {console.error(err);setStatus(err.message || "Errore PNG");}
    finally {
      ctx = oldCtx;pdfTextOps = oldOps;
      if (high) {high.width=1;high.height=1;}
      state.exporting=false;render();
    }
  }

  async function downloadPdf() {
    if (state.exporting) return;
    state.exporting = true;
    try {
      setStatus("Creazione PDF...");
      const page = recordPage();
      offerDownload(window.K9PDF.create([page]), `${safeFilename()}.pdf`);
      setStatus("PDF A4 creato");
    } catch (err) { console.error(err); setStatus(err.message || "Errore PDF"); }
    finally { state.exporting = false; render(); }
  }

  function parseBatchNames(raw) {
    const names = String(raw).replace(/\r/g, "").split("\n").map(line => line.trim())
      .filter(Boolean).map(line => line.replace(/^\s*["']|["']\s*$/g, ""));
    return names.filter((name, index) => !(index === 0 && /^(nome[;,\t ]+cognome|nome\s+e\s+cognome)$/i.test(name)))
      .map(name => name.replace(/[;,\t]+/g, " ").replace(/\s{2,}/g, " ").trim());
  }

  function duplicateNames(names) {
    const observed = new Set(), duplicates = new Set();
    for (const name of names) {
      const key = name.toLocaleLowerCase("it-IT").replace(/\s+/g, " ").trim();
      if (observed.has(key)) duplicates.add(name);
      observed.add(key);
    }
    return Array.from(duplicates);
  }

  function updateBatchCount() {
    invalidateReadyBatch();
    const names = parseBatchNames($("batchNames").value);
    const count = names.length;
    $("batchCount").textContent = `${count} corsisti inseriti · massimo ${MAX_BATCH} per PDF`;
    const notes = [];
    if (count > MAX_BATCH) notes.push(`Superato il limite: ${MAX_BATCH} corsisti per documento`);
    const duplicates = duplicateNames(names);
    if (duplicates.length) notes.push(`Nominativi ripetuti: ${duplicates.slice(0,3).join(", ")}${duplicates.length > 3 ? "…" : ""}`);
    if (names.some(n => n.length > 160)) notes.push("Almeno un nominativo è troppo lungo");
    if (window.K9PDF?.canEncode && names.some(n => !window.K9PDF.canEncode(n))) notes.push("Sono presenti caratteri non supportati dal PDF");
    const warnings = $("batchValidation");
    warnings.classList.toggle("hidden", !notes.length);
    warnings.textContent = notes.join(" · ");
  }

  async function downloadBatch() {
    if (state.exporting) return;
    const names = parseBatchNames($("batchNames").value);
    if (!names.length) { setStatus("Inserisci almeno un corsista"); return; }
    if (names.length > MAX_BATCH) { setStatus(`Massimo ${MAX_BATCH} corsisti per PDF`); return; }
    if (names.some(n => n.length > 160)) { setStatus("Un nominativo è troppo lungo"); return; }
    const oldName = $("recipientName").value;
    const oldCode = $("certificateCode").value;
    const numbered = $("batchAutoNumber").checked && !!oldCode.trim();
    state.exporting = true;
    const pages = [];
    try {
      if (names.some(n => !window.K9PDF.canEncode(n))) throw new Error("Un nominativo contiene caratteri non supportati dal PDF");
      const repeated = duplicateNames(names);
      if (repeated.length && !confirm(`Sono presenti ${repeated.length} nominativi ripetuti. Continuare?`)) return;
      if (names.length > 1 && oldCode.trim() && !numbered && !confirm("La numerazione è disattivata: tutti gli attestati avranno lo stesso codice. Continuare?")) return;
      // La grafica delle pagine è identica: la preparo una volta sola.
      // Nominali e codici rimangono testo PDF indipendente per pagina.
      const sharedGraphics = composePage();
      for (let i = 0; i < names.length; i++) {
        $("recipientName").value = names[i];
        if (numbered) $("certificateCode").value = `${oldCode.trim().replace(/-+$/, "")}-${String(i+1).padStart(3,"0")}`;
        $("status").textContent = `Pagina ${i + 1}/${names.length}`;
        pages.push(recordPage(sharedGraphics));
        // Cede il controllo all'interfaccia (soprattutto su smartphone).
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const date = $("certificateDate").value || todayISO();
      const pdf = window.K9PDF.create(pages);
      invalidateReadyBatch();
      lastBatchUrl = URL.createObjectURL(pdf);
      const ready = $("readyBatchLink");
      ready.href = lastBatchUrl;
      ready.download = `Attestati_corsisti_${date}.pdf`;
      ready.classList.remove("hidden");
      setStatus(`PDF pronto: ${names.length} pagine. Tocca Scarica.`);
    } catch (err) { console.error(err); setStatus(`PDF non creato: ${err.message}`); }
    finally {
      try {
        $("recipientName").value = oldName;
        $("certificateCode").value = oldCode;
        // Mantiene valido il link del PDF multipagina già generato.
        render();
      } finally {
        state.exporting = false;
      }
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
    scheduleAutosave();
    setStatus(state.backgroundLocked ? "Sfondo bloccato" : "Sfondo sbloccato");
  });

  $("removeBackground").addEventListener("click", () => {
    state.backgroundImage = null;
    state.backgroundBlob = null;
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
    scheduleAutosave();
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
  $("downloadPng").addEventListener("click", downloadPng);
  $("showGuides").addEventListener("change", e => {
    showGuides = !!e.target.checked;
    try { localStorage.setItem("k9-certificati-guide", String(showGuides)); } catch {}
    render();
  });
  $("openPreview").addEventListener("click", () => {
    const zoomCanvas = $("zoomCanvas");
    zoomCanvas.getContext("2d").drawImage(canvas,0,0);
    const dialog = $("zoomDialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open","");
  });
  $("closePreview").addEventListener("click", () => {
    const dialog = $("zoomDialog");
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  });
  // Archivio progetti IndexedDB: Blob originali, niente servizio esterno.
  function openDb() {
    if (!window.indexedDB) return Promise.reject(new Error("Browser senza IndexedDB"));
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("projects", { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function dbTask(mode, executor) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("projects", mode);
      const req = executor(tx.objectStore("projects"));
      let output;
      req.onsuccess = () => { output = req.result; if (mode === "readonly") resolve(output); };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => { if (mode === "readwrite") resolve(output); };
      tx.onabort = () => reject(tx.error || new Error("Transazione interrotta"));
    });
  }
  const dbGet = id => dbTask("readonly", store => store.get(id));
  const dbAll = () => dbTask("readonly", store => store.getAll());
  const dbPut = item => dbTask("readwrite", store => store.put(item));
  const dbDelete = id => dbTask("readwrite", store => store.delete(id));

  function snapshot(id = "__workspace__", name = "") {
    const form = {};
    formIds.forEach(key => form[key] = $(key).value);
    return {
      version: 2, id, name, updatedAt: new Date().toISOString(), form,
      designTheme: selectedTheme,
      background: state.backgroundImage ? {
        blob: state.backgroundBlob, scale: state.backgroundScale,
        opacity: state.backgroundOpacity, x: state.backgroundX,
        y: state.backgroundY, locked: state.backgroundLocked
      } : null,
      logos: state.logos.map(logo => ({
        blob: logo.blob, scale: logo.scale, x: logo.x, y: logo.y, locked: logo.locked
      })),
      activeLogoIndex: state.activeLogoIndex,
      leftSignature: state.leftSignatureBlob,
      rightSignature: state.signatureBlob,
      workingName: $("projectName").value,
      currentProjectId: state.currentProjectId
    };
  }

  function scheduleAutosave() {
    if (!state.initialized || state.exporting) return;
    setSaveIndicator("Modifiche in salvataggio…", "saving");
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(async () => {
      try {
        await dbPut(snapshot());
        setSaveIndicator(`Salvato alle ${localClock()}`);
      } catch (err) {
        console.warn("Autosave:", err);
        setSaveIndicator("Salvataggio non disponibile", "error");
        setStatus("Memoria non disponibile: esporta backup JSON");
      }
    }, 650);
  }

  function goodNumber(value, fallback, min, max) {
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  }

  async function restoreSnapshot(data) {
    if (!data || data.version !== 2 || !data.form || !Array.isArray(data.logos)) throw new Error("Backup non valido");
    state.initialized = false;
    clearTimeout(autosaveTimer);
    try {
    for (const id of formIds) {
      if (typeof data.form[id] === "string") $(id).value = data.form[id];
      else if (id === "accentColor") $(id).value = themePalettes.classic.accent;
      else if (id === "inkColor") $(id).value = themePalettes.classic.ink;
      else if (id === "frameStyle") $(id).value = themePalettes.classic.frame;
      else if (id === "fontScale") $(id).value = "100";
      else if (["certificateCode", "courseHours", "courseOutcome"].includes(id)) $(id).value = "";
    }
    selectedTheme = data.designTheme === "custom" ? "custom" : themePalettes[data.designTheme] ? data.designTheme : "classic";
    syncDesignUI();
    for (const id of ["leftSignatureMode", "signatureMode"]) {
      if (!["auto", "image", "none"].includes($(id).value)) $(id).value = "auto";
    }
    state.backgroundImage = null; state.backgroundBlob = null;
    if (data.background?.blob instanceof Blob) {
      state.backgroundBlob = data.background.blob;
      state.backgroundImage = await imageFromBlob(data.background.blob);
      state.backgroundScale = goodNumber(data.background.scale, 100, 50, 180);
      state.backgroundOpacity = goodNumber(data.background.opacity, 100, 10, 100);
      state.backgroundX = goodNumber(data.background.x, W / 2, 0, W);
      state.backgroundY = goodNumber(data.background.y, H / 2, 0, H);
      state.backgroundFitScale = coverScale(state.backgroundImage);
      state.backgroundLocked = !!data.background.locked;
    }
    state.logos = [];
    for (const entry of data.logos.slice(0, 20)) {
      if (!(entry.blob instanceof Blob)) continue;
      const image = await imageFromBlob(entry.blob);
      state.logos.push({ image, blob: entry.blob, scale: goodNumber(entry.scale, 100, 20, 300),
        x: goodNumber(entry.x, W / 2, 0, W), y: goodNumber(entry.y, 150, 0, H), locked: !!entry.locked });
    }
    state.activeLogoIndex = state.logos.length ? Math.min(state.logos.length - 1, Math.max(0, Number(data.activeLogoIndex) || 0)) : -1;
    for (const [key, prop] of [["leftSignature", "leftSignature"], ["rightSignature", "signature"]]) {
      state[`${prop}Blob`] = data[key] instanceof Blob ? data[key] : null;
      state[`${prop}Image`] = state[`${prop}Blob`] ? await imageFromBlob(state[`${prop}Blob`]) : null;
      const modeId = prop === "signature" ? "signatureMode" : "leftSignatureMode";
      if ($(modeId).value === "image" && !state[`${prop}Image`]) $(modeId).value = "none";
    }
    $("projectName").value = String(data.workingName || data.name || "");
    state.currentProjectId = data.currentProjectId || (data.id !== "__workspace__" ? data.id : null);
    saveSettings();
    syncAllControls();
    state.initialized = true;
    render();
    } finally { state.initialized = true; }
  }

  function syncAllControls() {
    const hasBg = !!state.backgroundImage;
    $("backgroundTools").classList.toggle("hidden", !hasBg);
    $("backgroundScale").value = state.backgroundScale;
    $("backgroundOpacity").value = state.backgroundOpacity;
    $("backgroundX").value = Math.round(state.backgroundX / W * 100);
    $("backgroundY").value = Math.round(state.backgroundY / H * 100);
    for (const [id, value] of [
      ["backgroundScaleValue", `${state.backgroundScale}%`],
      ["backgroundOpacityValue", `${state.backgroundOpacity}%`],
      ["backgroundXValue", `${Math.round(state.backgroundX / W * 100)}%`],
      ["backgroundYValue", `${Math.round(state.backgroundY / H * 100)}%`]
    ]) $(id).value = value;
    applyBackgroundLockUI();
    syncLogoControls();
    syncDesignUI();
  }

  async function refreshProjectList() {
    const selector = $("projectSelector");
    const chosen = selector.value;
    const entries = (await dbAll()).filter(p => p.id !== "__workspace__")
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    selector.replaceChildren(new Option("Seleziona un progetto salvato", ""));
    for (const entry of entries) selector.add(new Option(entry.name || "Senza nome", entry.id));
    selector.value = entries.some(p => p.id === chosen) ? chosen : state.currentProjectId || "";
  }

  async function saveProject(duplicate) {
    const name = $("projectName").value.trim();
    if (!name) { setStatus("Assegna un nome al progetto"); $("projectName").focus(); return; }
    try {
      const id = !duplicate && state.currentProjectId ? state.currentProjectId : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      if (!duplicate && state.currentProjectId && !confirm(`Aggiornare il progetto «${name}»?`)) return;
      const data = snapshot(id, name);
      data.currentProjectId = id;
      await dbPut(data);
      state.currentProjectId = id;
      await refreshProjectList();
      $("projectSelector").value = id;
      scheduleAutosave();
      setSaveIndicator(`Salvato alle ${localClock()}`);
      setStatus(duplicate ? "Copia progetto salvata" : "Progetto completo salvato");
    } catch (err) { console.error(err); setStatus("Salvataggio impossibile: esporta un backup"); }
  }

  async function openProject() {
    const id = $("projectSelector").value;
    if (!id) { setStatus("Seleziona un progetto"); return; }
    if (!confirm("Aprire il progetto scelto? Le modifiche non salvate del modello corrente saranno sostituite.")) return;
    try {
      const data = await dbGet(id);
      if (!data) throw new Error("Progetto non trovato");
      await restoreSnapshot(data);
      scheduleAutosave();
      setStatus("Progetto aperto");
    } catch (err) { console.error(err); setStatus("Impossibile aprire il progetto"); }
  }

  async function deleteProject() {
    const id = $("projectSelector").value;
    if (!id) { setStatus("Seleziona un progetto"); return; }
    if (!confirm("Eliminare definitivamente questo progetto salvato? Il modello aperto non cambia.")) return;
    try {
      await dbDelete(id);
      if (state.currentProjectId === id) state.currentProjectId = null;
      await refreshProjectList();
      scheduleAutosave();
      setStatus("Progetto salvato eliminato");
    } catch (err) { console.error(err); setStatus("Eliminazione non riuscita"); }
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function dataURLToBlob(data) {
    if (!data) return null;
    if (typeof data !== "string" || !/^data:image\/(png|jpeg|webp);base64,/.test(data) || data.length > MAX_IMAGE_MB * 1400000) {
      throw new Error("Immagine backup non valida");
    }
    const response = await fetch(data);
    const blob = await response.blob();
    if (blob.size > MAX_IMAGE_MB * 1048576) throw new Error("Immagine troppo grande");
    return blob;
  }

  async function exportProject() {
    try {
      const current = snapshot(state.currentProjectId || "export", $("projectName").value.trim());
      const backup = {
        ...current,
        background: current.background ? { ...current.background, blob: await blobToDataURL(current.background.blob) } : null,
        logos: await Promise.all(current.logos.map(async logo => ({ ...logo, blob: await blobToDataURL(logo.blob) }))),
        leftSignature: current.leftSignature ? await blobToDataURL(current.leftSignature) : null,
        rightSignature: current.rightSignature ? await blobToDataURL(current.rightSignature) : null
      };
      const json = new Blob([JSON.stringify(backup)], { type: "application/json" });
      offerDownload(json, `K9_progetto_${safeProjectName(current.name || "certificato")}.json`);
      setStatus("Backup completo esportato");
    } catch (err) { console.error(err); setStatus("Impossibile esportare il backup"); }
  }

  function safeProjectName(value) {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  }

  async function importProject(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 80 * 1048576) { setStatus("Backup troppo grande"); return; }
    try {
      const item = JSON.parse(await file.text());
      if (item.version !== 2 || !item.form || !Array.isArray(item.logos) || item.logos.length > 20) throw new Error("Formato non supportato");
      const data = {
        ...item, id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: String(item.name || "Backup importato").slice(0, 100),
        workingName: String(item.name || "Backup importato").slice(0, 100),
        updatedAt: new Date().toISOString(),
        background: item.background ? { ...item.background, blob: await dataURLToBlob(item.background.blob) } : null,
        logos: await Promise.all(item.logos.map(async logo => ({ ...logo, blob: await dataURLToBlob(logo.blob) }))),
        leftSignature: await dataURLToBlob(item.leftSignature),
        rightSignature: await dataURLToBlob(item.rightSignature)
      };
      data.currentProjectId = data.id;
      // Conserva il progetto importato senza sostituire quello corrente.
      await dbPut(data);
      await refreshProjectList();
      $("projectSelector").value = data.id;
      setStatus("Backup importato: premi Apri progetto");
    } catch (err) { console.error(err); setStatus("Backup non valido o memoria insufficiente"); }
  }

  // Backup completo portabile: i progetti vengono aggiunti senza sovrascrivere
  // quelli già esistenti sul dispositivo di destinazione.
  async function portableProject(item) {
    return {
      ...item,
      background: item.background ? {...item.background, blob: await blobToDataURL(item.background.blob)} : null,
      logos: await Promise.all(item.logos.map(async l => ({...l, blob: await blobToDataURL(l.blob)}))),
      leftSignature: item.leftSignature ? await blobToDataURL(item.leftSignature) : null,
      rightSignature: item.rightSignature ? await blobToDataURL(item.rightSignature) : null
    };
  }

  async function exportArchive() {
    try {
      setStatus("Creazione archivio…");
      const saved = (await dbAll()).filter(item => item.id !== "__workspace__");
      if (!saved.length) {setStatus("Non ci sono progetti salvati");return;}
      if (saved.length > 100) throw new Error("Troppi progetti per un singolo backup");
      const projects = [];
      for (const item of saved) projects.push(await portableProject(item));
      const doc = {kind:"k9-certificati-archive",archiveVersion:1,createdAt:new Date().toISOString(),projects};
      offerDownload(new Blob([JSON.stringify(doc)],{type:"application/json"}),`K9_archivio_${todayISO()}.json`);
      setStatus(`Backup di ${projects.length} progetti creato`);
    } catch (err) {console.error(err);setStatus("Archivio non esportato: spazio insufficiente?");}
  }

  async function importArchive(event) {
    const file = event.target.files[0];event.target.value="";
    if (!file) return;
    if (file.size > 180 * 1048576) {setStatus("Archivio troppo grande (max 180 MB)");return;}
    try {
      const archive = JSON.parse(await file.text());
      if (archive.kind !== "k9-certificati-archive" || archive.archiveVersion !== 1 || !Array.isArray(archive.projects) || archive.projects.length > 100) throw new Error("Formato archivio non valido");
      if (!archive.projects.length) {setStatus("Archivio vuoto");return;}
      if (!confirm(`Importare ${archive.projects.length} progetti? I progetti attuali non saranno cancellati.`)) return;
      const items = [];
      for (const entry of archive.projects) {
        if (entry.version !== 2 || !entry.form || !Array.isArray(entry.logos) || entry.logos.length > 20) throw new Error("Progetto non valido");
        const name = String(entry.name || "Progetto importato").slice(0,100);
        const id = `p_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        items.push({ ...entry,id,name,workingName:name,currentProjectId:id,updatedAt:new Date().toISOString(),
          background:entry.background ? {...entry.background,blob:await dataURLToBlob(entry.background.blob)} : null,
          logos:await Promise.all(entry.logos.map(async l=>({...l,blob:await dataURLToBlob(l.blob)}))),
          leftSignature:await dataURLToBlob(entry.leftSignature),rightSignature:await dataURLToBlob(entry.rightSignature)});
      }
      for (const item of items) await dbPut(item);
      await refreshProjectList();
      setStatus(`${items.length} progetti importati: seleziona Apri`);
    } catch (err) {console.error(err);setStatus("Archivio non importato: formato o spazio insufficiente");}
  }
  $("exportArchive").addEventListener("click", exportArchive);
  $("importArchive").addEventListener("change", importArchive);

  $("resetAll").addEventListener("click", async () => {
    if (!confirm("Ripristinare il modello iniziale? I progetti salvati rimangono disponibili.")) return;
    state.initialized = false;
    clearTimeout(autosaveTimer);
    localStorage.removeItem("k9-certificati-settings");
    $("documentType").value = defaults.documentType;
    textIds.forEach(id => { $(id).value = defaults[id]; });
    $("certificateDate").value = todayISO();
    $("leftSignatureMode").value = "auto";
    $("signatureMode").value = "auto";
    $("courseOutcome").value = "";
    selectedTheme = "classic";
    $("accentColor").value = themePalettes.classic.accent;
    $("inkColor").value = themePalettes.classic.ink;
    $("frameStyle").value = themePalettes.classic.frame;
    $("fontScale").value = "100";
    state.backgroundImage = null; state.backgroundBlob = null;
    state.backgroundScale = 100; state.backgroundOpacity = 100;
    state.backgroundX = W / 2; state.backgroundY = H / 2; state.backgroundLocked = false;
    state.leftSignatureBlob = null; state.leftSignatureImage = null;
    state.signatureBlob = null; state.signatureImage = null;
    state.logos = []; state.activeLogoIndex = -1; state.currentProjectId = null;
    $("projectName").value = ""; $("projectSelector").value = "";
    $("backgroundFile").value = ""; $("logoFile").value = "";
    ["leftSignatureFile", "signatureFile"].forEach(id => $(id).value = "");
    syncAllControls();
    try { await dbDelete("__workspace__"); } catch (e) { console.warn(e); }
    state.initialized = true;
    render(); setStatus("Modello ripristinato");
  });

  for (const [side, fileId, modeId, removeId] of [
    ["left", "leftSignatureFile", "leftSignatureMode", "removeLeftSignature"],
    ["right", "signatureFile", "signatureMode", "removeSignature"]
  ]) {
    $(fileId).addEventListener("change", e => loadImage(e.target.files[0], (image, blob) => {
      const prefix = side === "left" ? "leftSignature" : "signature";
      state[`${prefix}Image`] = image;
      state[`${prefix}Blob`] = blob;
      $(modeId).value = "image";
      $(fileId).value = "";
      render();
      setStatus("Firma grafica caricata");
    }));
    $(modeId).addEventListener("change", () => {
      if ($(modeId).value === "image" && !(side === "left" ? state.leftSignatureImage : state.signatureImage)) {
        $(modeId).value = "none";
        setStatus("Carica prima un'immagine firma");
      }
      render();
    });
    $(removeId).addEventListener("click", () => {
      const prefix = side === "left" ? "leftSignature" : "signature";
      state[`${prefix}Image`] = null;
      state[`${prefix}Blob`] = null;
      $(modeId).value = "none";
      render(); setStatus("Immagine firma rimossa");
    });
  }

  document.querySelectorAll(".theme-choice").forEach(btn => btn.addEventListener("click", () => {
    const theme = themePalettes[btn.dataset.theme];
    if (!theme) return;
    selectedTheme = btn.dataset.theme;
    $("accentColor").value = theme.accent;
    $("inkColor").value = theme.ink;
    $("frameStyle").value = theme.frame;
    syncDesignUI();saveSettings();render();setStatus("Tema applicato");
  }));
  for (const id of ["accentColor", "inkColor", "frameStyle", "fontScale", "courseOutcome"]) {
    $(id).addEventListener("input", () => {
      if (["accentColor", "inkColor", "frameStyle"].includes(id)) selectedTheme = "custom";
      syncDesignUI();saveSettings();render();
    });
    $(id).addEventListener("change", () => { saveSettings(); render(); });
  }

  document.querySelectorAll(".quick-link").forEach(btn => btn.addEventListener("click", () => {
    const panels = document.querySelectorAll(".controls > details.panel");
    const panel = panels[Number(btn.dataset.panelIndex)];
    if (!panel) return;
    panel.open = true;
    const headerHeight = document.querySelector(".topbar")?.getBoundingClientRect().height || 60;
    const stickyHeight = innerWidth < 900 ? document.querySelector(".preview-panel")?.getBoundingClientRect().height || 0 : 0;
    const top = window.scrollY + panel.getBoundingClientRect().top - headerHeight - stickyHeight - 14;
    window.scrollTo({top:Math.max(0,top),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
  }));

  $("collapseSections").addEventListener("click", () => {
    const panels = Array.from(document.querySelectorAll(".controls > details.panel"));
    const anyOpen = panels.some(p => p.open);
    panels.forEach(p => p.open = !anyOpen);
    $("collapseSections").textContent = anyOpen ? "Apri pannelli" : "Chiudi pannelli";
  });
  document.querySelectorAll(".controls > details.panel").forEach(details => {
    details.addEventListener("toggle", () => {
      const panels = Array.from(document.querySelectorAll(".controls > details.panel"));
      $("collapseSections").textContent = panels.some(p => p.open) ? "Chiudi pannelli" : "Apri pannelli";
    });
  });

  function parseRosterCSV(data) {
    const raw = String(data).replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
    if (!raw) return [];
    const firstLine = raw.split("\n",1)[0];
    const delimiter = [";", ",", "\t"].sort((a,b) => firstLine.split(b).length - firstLine.split(a).length)[0];
    if (!firstLine.includes(delimiter)) return parseBatchNames(raw);
    const rows = [], row = [];
    let value = "", inQuote = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '"') { if (inQuote && raw[i+1] === '"') {value+='"';i++;} else inQuote=!inQuote; }
      else if (ch === delimiter && !inQuote) {row.push(value.trim());value="";}
      else if (ch === "\n" && !inQuote) {row.push(value.trim());rows.push([...row]);row.length=0;value="";}
      else value += ch;
    }
    row.push(value.trim()); rows.push([...row]);
    const headers = rows[0].map(x => x.toLocaleLowerCase("it-IT").trim());
    const first = headers.findIndex(h=>["nome", "first name"].includes(h));
    const last = headers.findIndex(h=>["cognome", "surname", "last name"].includes(h));
    const full = headers.findIndex(h=>["nome e cognome", "nominativo", "corsista", "nome completo"].includes(h));
    const dataRows = (first >= 0 || full >= 0) ? rows.slice(1) : rows;
    return dataRows.map(parts => {
      if (full >= 0) return parts[full] || "";
      if (first >= 0) return `${parts[first] || ""} ${last >= 0 ? parts[last] || "" : ""}`.trim();
      return parts.filter(Boolean).slice(0, 2).join(" ").trim();
    }).filter(Boolean).map(x=>x.replace(/\s+/g," "));
  }

  $("rosterFile").addEventListener("change", async event => {
    const file = event.target.files[0]; event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1048576) {setStatus("Elenco troppo grande (massimo 2 MB)");return;}
    try {
      const names = parseRosterCSV(await file.text());
      if (!names.length) {setStatus("Nessun nominativo trovato nel file");return;}
      $("batchNames").value = names.join("\n");
      updateBatchCount();
      setStatus(`${names.length} nominativi importati`);
    } catch(err) {console.error(err);setStatus("Impossibile leggere l'elenco");}
  });
  $("clearRoster").addEventListener("click", () => {$("batchNames").value="";updateBatchCount();});

  $("batchNames").addEventListener("input", updateBatchCount);
  $("downloadBatch").addEventListener("click", downloadBatch);
  $("saveProject").addEventListener("click", () => saveProject(false));
  $("duplicateProject").addEventListener("click", () => saveProject(true));
  $("openProject").addEventListener("click", openProject);
  $("deleteProject").addEventListener("click", deleteProject);
  $("exportProject").addEventListener("click", exportProject);
  $("importProject").addEventListener("change", importProject);
  $("projectName").addEventListener("input", scheduleAutosave);

  async function initialize() {
    try {showGuides = localStorage.getItem("k9-certificati-guide") === "true";} catch {}
    $("showGuides").checked = showGuides;
    loadSettings();
    $("leftSignatureMode").value = "auto";
    $("signatureMode").value = "auto";
    let archiveAvailable = false;
    try {
      const saved = await dbGet("__workspace__");
      if (saved) {
        try { await restoreSnapshot(saved); }
        catch (err) { console.warn("Recupero ultimo lavoro non riuscito:", err); }
      }
      await refreshProjectList();
      archiveAvailable = true;
    } catch (e) { console.warn("Archivio locale non disponibile", e); setStatus("Archivio non disponibile: usa backup JSON"); }
    state.initialized = true;
    syncAllControls();
    render();
    updateBatchCount();
    setSaveIndicator(archiveAvailable ? "Archivio locale pronto" : "Archivio non disponibile", archiveAvailable ? "" : "error");
  }
  initialize();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
