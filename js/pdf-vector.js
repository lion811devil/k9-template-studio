/* K9 PDF: generazione PDF A4 verticale e orizzontale, testi vettoriali con font standard
   e grafica JPEG 300 DPI. Nessuna dipendenza esterna e nessun dato inviato online. */
(() => {
  "use strict";
  const FONT_WIDTHS = {"Times-Roman":[761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,250,333,408,500,500,833,778,180,333,333,500,564,250,333,250,278,500,500,500,500,500,500,500,500,500,500,278,278,564,564,564,444,921,722,667,667,722,611,556,722,722,333,389,722,611,889,722,722,556,722,667,556,611,722,722,944,722,722,611,333,278,333,469,500,333,444,500,444,500,444,333,500,500,278,278,500,278,778,500,500,500,500,333,389,278,500,500,722,500,500,444,480,200,480,541,761,500,444,333,500,444,1000,500,500,333,1000,556,333,889,444,611,444,444,333,333,444,444,350,500,1000,333,980,389,333,722,444,444,722,250,333,500,500,500,500,200,500,333,760,276,500,564,333,760,333,400,564,300,300,333,500,453,250,333,300,310,500,750,750,750,444,722,722,722,722,722,722,889,667,611,611,611,611,333,333,333,333,722,722,722,722,722,722,722,564,722,722,722,722,722,722,556,500,444,444,444,444,444,444,667,444,444,444,444,444,278,278,278,278,500,500,500,500,500,500,500,564,500,500,500,500,500,500,500,500],"Times-Bold":[761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,250,333,555,500,500,1000,833,278,333,333,500,570,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,570,570,570,500,930,722,667,722,722,667,611,778,778,389,500,778,667,944,722,778,611,778,722,556,667,722,722,1000,722,722,667,333,278,333,581,500,333,500,556,444,556,444,333,500,556,278,333,556,278,833,556,500,556,556,444,389,333,556,500,722,500,500,444,394,220,394,520,761,500,500,333,500,500,1000,500,500,333,1000,556,333,1000,500,667,500,500,333,333,500,500,350,500,1000,333,1000,389,333,722,500,444,722,250,333,500,500,500,500,220,500,333,747,300,500,570,333,747,333,400,570,300,300,333,556,540,250,333,300,330,500,750,750,750,500,722,722,722,722,722,722,1000,722,667,667,667,667,389,389,389,389,722,722,778,778,778,778,778,570,778,722,722,722,722,722,611,556,500,500,500,500,500,500,722,444,444,444,444,444,278,278,278,278,500,556,500,500,500,500,500,570,500,556,556,556,556,500,556,500],"Times-Italic":[761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,250,333,420,500,500,833,778,214,333,333,500,675,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,675,675,675,500,920,611,611,667,722,611,611,722,722,333,444,667,556,833,667,722,611,722,611,500,556,722,611,833,611,556,556,389,278,389,422,500,333,500,500,444,500,444,278,500,500,278,278,444,278,722,500,500,500,500,389,389,278,500,444,667,444,444,389,400,275,400,541,761,500,500,333,500,556,889,500,500,333,1000,500,333,944,500,556,500,500,333,333,556,556,350,500,889,333,980,389,333,667,500,389,556,250,389,500,500,500,500,275,500,333,760,276,500,675,333,760,333,400,675,300,300,333,500,523,250,333,300,310,500,750,750,750,500,611,611,611,611,611,611,889,667,611,611,611,611,333,333,333,333,722,667,722,722,722,722,722,675,722,722,722,722,722,556,611,500,500,500,500,500,500,500,667,444,444,444,444,444,278,278,278,278,500,500,500,500,500,500,500,675,500,500,500,500,500,444,500,444]};
  Object.assign(FONT_WIDTHS,{"Helvetica":[556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,350,556,350,222,556,333,1000,556,556,333,1000,667,333,1000,350,611,350,350,222,222,333,333,350,556,1000,333,1000,500,333,944,350,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],"Helvetica-Bold":[556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,350,556,350,278,556,500,1000,556,556,333,1000,667,333,1000,350,611,350,350,278,278,500,500,350,556,1000,333,1000,556,333,944,350,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556]});
  const encoder = new TextEncoder();
  const A4 = Object.freeze({
    landscape: {width:841.8898, height:595.2756},
    portrait: {width:595.2756, height:841.8898}
  });
  const cp1252Extra = new Map([
    [0x20ac,0x80],[0x201a,0x82],[0x0192,0x83],[0x201e,0x84],
    [0x2026,0x85],[0x2020,0x86],[0x2021,0x87],[0x02c6,0x88],
    [0x2030,0x89],[0x0160,0x8a],[0x2039,0x8b],[0x0152,0x8c],
    [0x017d,0x8e],[0x2018,0x91],[0x2019,0x92],[0x201c,0x93],
    [0x201d,0x94],[0x2022,0x95],[0x2013,0x96],[0x2014,0x97],
    [0x02dc,0x98],[0x2122,0x99],[0x0161,0x9a],[0x203a,0x9b],
    [0x0153,0x9c],[0x017e,0x9e],[0x0178,0x9f]
  ]);

  function encodeWinAnsi(text) {
    const out = [];
    for (const ch of text) {
      const v = ch.codePointAt(0);
      const b = (v >= 32 && v <= 126) || (v >= 160 && v <= 255) ? v : cp1252Extra.get(v);
      if (b === undefined) {
        throw new Error(`Il PDF vettoriale non supporta il carattere «${ch}». Sostituiscilo con un carattere latino.`);
      }
      out.push(b);
    }
    return out;
  }

  function pdfHex(bytes) {
    return bytes.map(b => b.toString(16).padStart(2,"0")).join("").toUpperCase();
  }

  function colorRGB(color) {
    const match = /^#([a-f\d]{6})$/i.exec(color || "");
    if (!match) return "0 0 0";
    const n = parseInt(match[1],16);
    return [n>>16&255,n>>8&255,n&255].map(v=>(v/255).toFixed(4)).join(" ");
  }

  function textInstructions(texts, PAGE_W, PAGE_H, STAGE_W, STAGE_H) {
    const commands = [];
    for (const op of texts) {
      if (!op.text) continue;
      const font = op.font === "sans-bold" ? "Helvetica-Bold" : op.font === "sans-regular" ? "Helvetica" : op.font === "bold" ? "Times-Bold" : op.font === "italic" ? "Times-Italic" : "Times-Roman";
      const fontRef = op.font === "sans-bold" ? "/F5" : op.font === "sans-regular" ? "/F4" : op.font === "bold" ? "/F2" : op.font === "italic" ? "/F3" : "/F1";
      const bytes = encodeWinAnsi(op.text);
      const fontSize = Math.max(1,Number(op.size)) * PAGE_W/STAGE_W;
      const widthAt1000 = bytes.reduce((v, b) => v + FONT_WIDTHS[font][b], 0);
      const standardWidth = widthAt1000/1000*fontSize;
      const wantedWidth = Number(op.width)*PAGE_W/STAGE_W;
      const scaleX = standardWidth > 0 ? Math.min(250,Math.max(45,wantedWidth/standardWidth*100)) : 100;
      const x = (Number(op.x) - Number(op.width)/2) * PAGE_W/STAGE_W;
      // canvas textBaseline="middle" -> approssimazione su em-box standard PDF.
      const y = PAGE_H - (Number(op.y) + Number(op.size)*.31)*PAGE_H/STAGE_H;
      commands.push(`BT ${colorRGB(op.color)} rg ${fontRef} ${fontSize.toFixed(3)} Tf ${scaleX.toFixed(3)} Tz 1 0 0 1 ${x.toFixed(3)} ${y.toFixed(3)} Tm <${pdfHex(bytes)}> Tj ET`);
    }
    return commands.join("\n");
  }

  function create(pages) {
    if (!Array.isArray(pages) || !pages.length) throw new Error("Nessuna pagina da esportare");
    if (pages.length > 30) throw new Error("Massimo 30 pagine per PDF");
    const objs = [null];
    const add = pieces => (objs.push(pieces), objs.length-1);
    const streamObj = (bytes, prefix="") => {
      const length = bytes.byteLength;
      return add([`<< ${prefix} /Length ${length} >>\nstream\n`, bytes, "\nendstream"]);
    };
    const catalog = add("");
    const rootPages = add("");
    const regular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>");
    const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>");
    const italic = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>");
    const sans = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const sansBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const pageIds = [];
    // Il PDF multipagina riutilizza un'unica grafica per tutte le pagine
    // con lo stesso sfondo, cornice, loghi e firme.
    const imageRefs = new WeakMap();
    pages.forEach(page => {
      if (!(page.image instanceof Uint8Array)) throw new Error("Dati grafici PDF non validi");
      let imageId = imageRefs.get(page.image);
      if (imageId === undefined) {
        imageId = streamObj(page.image,`/Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`);
        imageRefs.set(page.image,imageId);
      }
      // I progetti precedenti, senza orientamento, restano A4 orizzontali.
      const {width:PAGE_W, height:PAGE_H} = A4[page.orientation === "portrait" ? "portrait" : "landscape"];
      const STAGE_W = Number(page.stageWidth) || (page.orientation === "portrait" ? 1190 : 1683);
      const STAGE_H = Number(page.stageHeight) || (page.orientation === "portrait" ? 1683 : 1190);
      const content = `q\n${PAGE_W.toFixed(4)} 0 0 ${PAGE_H.toFixed(4)} 0 0 cm\n/Im0 Do\nQ\n${textInstructions(page.texts, PAGE_W, PAGE_H, STAGE_W, STAGE_H)}\n`;
      const contentsId = streamObj(encoder.encode(content));
      const pageId = add(`<< /Type /Page /Parent ${rootPages} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /XObject << /Im0 ${imageId} 0 R >> /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R /F3 ${italic} 0 R /F4 ${sans} 0 R /F5 ${sansBold} 0 R >> >> /Contents ${contentsId} 0 R >>`);
      pageIds.push(pageId);
    });
    objs[catalog] = `<< /Type /Catalog /Pages ${rootPages} 0 R >>`;
    objs[rootPages] = `<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
    const chunks = [];
    const offsets = new Array(objs.length).fill(0);
    let size = 0;
    const push = part => {
      const bytes = typeof part === "string" ? encoder.encode(part) : part;
      chunks.push(bytes); size += bytes.byteLength;
    };
    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    for (let i = 1; i < objs.length; i++) {
      offsets[i] = size;
      push(`${i} 0 obj\n`);
      for (const part of Array.isArray(objs[i]) ? objs[i] : [objs[i]]) push(part);
      push("\nendobj\n");
    }
    const xrefOffset = size;
    push(`xref\n0 ${objs.length}\n0000000000 65535 f \n`);
    for (let i = 1; i < objs.length; i++) push(`${String(offsets[i]).padStart(10,"0")} 00000 n \n`);
    push(`trailer\n<< /Size ${objs.length} /Root ${catalog} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
    return new Blob(chunks,{type:"application/pdf"});
  }
  function canEncode(text) {
    try { encodeWinAnsi(String(text || "").replace(/[\r\n\t]/g, " ")); return true; }
    catch { return false; }
  }
  window.K9PDF = Object.freeze({create, canEncode});
})();
