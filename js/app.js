(() => {
  "use strict";

  const STUDIO_VERSION = "4.9.19-precision-controls";
  const FRAME_LIBRARY_VERSION = "4.9.17-a4-personal"; // asset invariati, versione indipendente
  const $ = id => document.getElementById(id);
  if ($("studioVersion")) $("studioVersion").textContent = ` · v${STUDIO_VERSION}`;
  const canvas = $("certificateCanvas");
  let ctx = canvas.getContext("2d", { alpha: false });
  let pdfTextOps = null;
  let rasterUnsupportedOnly = false;
  let layoutWarnings = [];
  let textBounds = [];
  let W = canvas.width;
  let H = canvas.height;
  const EXPORT_DPI = 600;
  const A4_STAGE = Object.freeze({
    landscape: {w:1683,h:1190,outputW:7016,outputH:4961},
    portrait: {w:1190,h:1683,outputW:4961,outputH:7016}
  });
  const currentOrientation = () => $("pageOrientation").value === "portrait" ? "portrait" : "landscape";
  const pageSize = () => A4_STAGE[currentOrientation()];

  const defaults = {
    documentType: "ATTESTATO|DI PARTECIPAZIONE",
    pageOrientation: "landscape",
    recipientName: "Mario Rossi",
    bodyText: "ha partecipato con profitto al percorso formativo",
    courseName: "CORSO DOGSITTER",
    place: "San Giuliano Milanese",
    leftSignatureRole: "Il Docente",
    leftSignatureName: "Nome Cognome",
    signatureRole: "Il Responsabile del Corso",
    signatureName: "Giovanni Napoletano",
    thirdSignatureRole: "", thirdSignatureName: "",
    certificateCode: "", certificateDiscipline: "", courseHours: "", courseOutcome: "",
    themeBackgroundOpacity: "100",
    frameOpacity: "100",
    themeBackgroundId: "classic",
    themeBackgroundLocked: false,
    frameLocked: false,
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
    personalFrameImage: null, personalFrameBlob: null, personalFrameName: "",
    leftSignatureImage: null, leftSignatureBlob: null,
    signatureImage: null, signatureBlob: null,
    thirdSignatureImage: null, thirdSignatureBlob: null,
    signatureBlockLocked: false,
    importSourceKey: null,
    currentProjectId: null, initialized: false, exporting: false
  };

  const textIds = ["recipientName", "bodyText", "courseName", "place", "leftSignatureRole", "leftSignatureName", "signatureRole", "signatureName", "thirdSignatureRole", "thirdSignatureName", "certificateCode", "certificateDiscipline", "courseHours"];
  const designIds = ["designTheme", "accentColor", "inkColor", "frameStyle", "ornamentStyle", "fontScale", "themeBackgroundOpacity", "themeBackgroundId", "frameOpacity"];
  const signatureControlDefaults = {signatureBlockScale: "100", signatureBlockX: "0", signatureBlockY: "0"};
  const signatureControlIds = Object.keys(signatureControlDefaults);
  const formIds = ["pageOrientation", "documentType", "certificateDate", ...textIds, "courseOutcome", "leftSignatureMode", "signatureMode", "thirdSignatureMode", ...signatureControlIds, ...designIds.filter(id => id !== "designTheme")];
  const themePalettes = {
    classic: { label: "Classico", detail: "Oro", category: "Base", accent: "#735a2f", ink: "#26231f", frame: "double", ornament: "none" },
    navy: { label: "Istituzionale", detail: "Blu", category: "Base", accent: "#193b6b", ink: "#182a41", frame: "double", ornament: "none" },
    forest: { label: "Naturale", detail: "Verde", category: "Base", accent: "#32664e", ink: "#253e31", frame: "corners", ornament: "none" },
    burgundy: { label: "Prestigio", detail: "Bordeaux", category: "Base", accent: "#7b3548", ink: "#3b252d", frame: "double", ornament: "none" },
    minimal: { label: "Minimal", detail: "Grafite", category: "Base", accent: "#343f50", ink: "#263341", frame: "none", ornament: "none" },
    champagne: { label: "Champagne", detail: "Sabbia e oro", category: "Eleganti", accent: "#a4793f", ink: "#4b3728", frame: "double", ornament: "topline" },
    platinum: { label: "Platino", detail: "Argento freddo", category: "Eleganti", accent: "#6c7c89", ink: "#283542", frame: "double", ornament: "arch" },
    rosegold: { label: "Rosa dorato", detail: "Rame rosato", category: "Eleganti", accent: "#ae6f70", ink: "#513b42", frame: "single", ornament: "petals" },
    royal: { label: "Reale", detail: "Blu e oro", category: "Eleganti", accent: "#174c8a", ink: "#172c48", frame: "double", ornament: "crown" },
    midnight: { label: "Mezzanotte", detail: "Blu profondo", category: "Eleganti", accent: "#30446a", ink: "#22304e", frame: "single", ornament: "rays" },
    heritage: { label: "Tradizione", detail: "Antico bronzo", category: "Eleganti", accent: "#89643b", ink: "#40342c", frame: "double", ornament: "laurel" },
    ivory: { label: "Avorio", detail: "Crema classica", category: "Eleganti", accent: "#a58b65", ink: "#524939", frame: "single", ornament: "filigree" },
    bronze: { label: "Bronzo", detail: "Rame elegante", category: "Eleganti", accent: "#9b684d", ink: "#453029", frame: "corners", ornament: "rings" },
    onyx: { label: "Onice", detail: "Nero e grigio", category: "Eleganti", accent: "#55565d", ink: "#272b32", frame: "double", ornament: "columns" },
    emerald: { label: "Smeraldo", detail: "Verde cerimonia", category: "Eleganti", accent: "#267b67", ink: "#244538", frame: "double", ornament: "diamonds" },
    academic: { label: "Accademico", detail: "Blu accademia", category: "Professionali", accent: "#204c76", ink: "#263544", frame: "double", ornament: "topline" },
    executive: { label: "Executive", detail: "Antracite", category: "Professionali", accent: "#485969", ink: "#26313b", frame: "single", ornament: "stripes" },
    civic: { label: "Civico", detail: "Blu istituzionale", category: "Professionali", accent: "#27648b", ink: "#1b374d", frame: "single", ornament: "steps" },
    technical: { label: "Tecnico", detail: "Acciaio", category: "Professionali", accent: "#397185", ink: "#263f4a", frame: "corners", ornament: "network" },
    blueprint: { label: "Progetto", detail: "Blu tecnico", category: "Professionali", accent: "#3b74a3", ink: "#27425a", frame: "single", ornament: "grid" },
    atlas: { label: "Atlante", detail: "Petrolio", category: "Professionali", accent: "#27727b", ink: "#25434a", frame: "corners", ornament: "radial" },
    nordic: { label: "Nordico", detail: "Grigio chiaro", category: "Professionali", accent: "#70838b", ink: "#3d4954", frame: "none", ornament: "sideband" },
    conference: { label: "Convegno", detail: "Blu notte", category: "Professionali", accent: "#3b5e9a", ink: "#273d63", frame: "single", ornament: "diagonal" },
    metropolitan: { label: "Metropolitano", detail: "Grafite e blu", category: "Professionali", accent: "#427089", ink: "#283b49", frame: "corners", ornament: "lines" },
    smart: { label: "Contemporaneo", detail: "Indaco", category: "Professionali", accent: "#5064a2", ink: "#363c61", frame: "none", ornament: "tiles" },
    sage: { label: "Salvia", detail: "Verde tenue", category: "Natura e K9", accent: "#68836c", ink: "#3f584b", frame: "single", ornament: "petals" },
    olive: { label: "Ulivo", detail: "Verde oliva", category: "Natura e K9", accent: "#7f8750", ink: "#414d35", frame: "double", ornament: "laurel" },
    earth: { label: "Terra", detail: "Marrone naturale", category: "Natura e K9", accent: "#896247", ink: "#483b2f", frame: "corners", ornament: "contours" },
    sand: { label: "Deserto", detail: "Ocra sabbia", category: "Natura e K9", accent: "#bd8b47", ink: "#4e4230", frame: "single", ornament: "waves" },
    alpine: { label: "Alpino", detail: "Verde montagna", category: "Natura e K9", accent: "#41796e", ink: "#264a42", frame: "corners", ornament: "rays" },
    ocean: { label: "Oceano", detail: "Blu marino", category: "Natura e K9", accent: "#2b7a9e", ink: "#26475b", frame: "single", ornament: "waves" },
    moss: { label: "Bosco", detail: "Verde muschio", category: "Natura e K9", accent: "#547b52", ink: "#324938", frame: "double", ornament: "filigree" },
    copper: { label: "Rame", detail: "Rame e sabbia", category: "Natura e K9", accent: "#b46e4e", ink: "#543b31", frame: "single", ornament: "diagonal" },
    bark: { label: "Corteccia", detail: "Terra scura", category: "Natura e K9", accent: "#796552", ink: "#403931", frame: "corners", ornament: "columns" },
    coastal: { label: "Costa", detail: "Acqua marina", category: "Natura e K9", accent: "#3c8f94", ink: "#265058", frame: "none", ornament: "radial" },
    lavender: { label: "Lavanda", detail: "Viola tenue", category: "Creativi", accent: "#7969a8", ink: "#48405d", frame: "single", ornament: "diamonds" },
    coral: { label: "Corallo", detail: "Rosso caldo", category: "Creativi", accent: "#b86b65", ink: "#593d42", frame: "corners", ornament: "petals" },
    amber: { label: "Ambra", detail: "Giallo caldo", category: "Creativi", accent: "#bb8b32", ink: "#58412a", frame: "single", ornament: "ribbon" },
    ice: { label: "Ghiaccio", detail: "Azzurro polare", category: "Creativi", accent: "#6e9fba", ink: "#334b5c", frame: "none", ornament: "grid" },
    dusk: { label: "Crepuscolo", detail: "Viola profondo", category: "Creativi", accent: "#75608e", ink: "#473a53", frame: "double", ornament: "rings" },
    imperialGold: {"label": "Imperiale oro", "detail": "Nero, oro e avorio", "category": "Premium", "accent": "#a17b38", "ink": "#25272d", "frame": "none", "ornament": "imperial", "profile": "classic"},
    imperialNavy: {"label": "Imperiale blu", "detail": "Blu notte e oro", "category": "Premium", "accent": "#ad8740", "ink": "#172b49", "frame": "none", "ornament": "imperial", "profile": "classic"},
    baroqueGold: {"label": "Gran cerimonia", "detail": "Oro antico e crema", "category": "Cerimoniali", "accent": "#987137", "ink": "#3b2c24", "frame": "none", "ornament": "baroque", "profile": "ceremony"},
    baroqueRuby: {"label": "Gran cerimonia rubino", "detail": "Bordeaux e oro", "category": "Cerimoniali", "accent": "#9f7949", "ink": "#592b3b", "frame": "none", "ornament": "baroque", "profile": "ceremony"},
    artDeco: {"label": "Art déco", "detail": "Nero e ottone", "category": "Premium", "accent": "#9b7938", "ink": "#20252b", "frame": "none", "ornament": "deco", "profile": "editorial"},
    artDecoTeal: {"label": "Art déco petrolio", "detail": "Petrolio e ottone", "category": "Premium", "accent": "#a18344", "ink": "#21464b", "frame": "none", "ornament": "deco", "profile": "editorial"},
    academyBlue: {"label": "Accademia blu", "detail": "Blu reale e argento", "category": "Accademici", "accent": "#32618d", "ink": "#173052", "frame": "none", "ornament": "academy", "profile": "modern"},
    academyCrimson: {"label": "Accademia cremisi", "detail": "Cremisi istituzionale", "category": "Accademici", "accent": "#8c394b", "ink": "#402b38", "frame": "none", "ornament": "academy", "profile": "modern"},
    executiveNavy: {"label": "Executive premium", "detail": "Blu notte e azzurro", "category": "Professionali", "accent": "#366898", "ink": "#142b43", "frame": "none", "ornament": "sash", "profile": "modern"},
    executiveTeal: {"label": "Executive petrolio", "detail": "Petrolio e menta", "category": "Professionali", "accent": "#268279", "ink": "#1c4143", "frame": "none", "ornament": "sash", "profile": "modern"},
    corporateBlue: {"label": "Corporate geometrico", "detail": "Blu e acciaio", "category": "Professionali", "accent": "#2876ad", "ink": "#203b50", "frame": "none", "ornament": "facet", "profile": "modern"},
    corporateGraphite: {"label": "Corporate grafite", "detail": "Grafite e rame", "category": "Professionali", "accent": "#a3674a", "ink": "#303940", "frame": "none", "ornament": "facet", "profile": "modern"},
    k9Tactical: {"label": "K9 tattico", "detail": "Oliva e antracite", "category": "K9 operativo", "accent": "#697747", "ink": "#26352b", "frame": "none", "ornament": "tactical", "profile": "tactical"},
    k9Urban: {"label": "K9 urban", "detail": "Grafite e acciaio", "category": "K9 operativo", "accent": "#58778a", "ink": "#26313a", "frame": "none", "ornament": "tactical", "profile": "tactical"},
    sarRescue: {"label": "SAR ricerca e soccorso", "detail": "Rosso e grafite", "category": "K9 operativo", "accent": "#a6473b", "ink": "#313b43", "frame": "none", "ornament": "rescue", "profile": "tactical"},
    sarField: {"label": "SAR unità cinofile", "detail": "Verde e ardesia", "category": "K9 operativo", "accent": "#44765a", "ink": "#293d3b", "frame": "none", "ornament": "rescue", "profile": "tactical"},
    detectionPro: {"label": "Detection professionale", "detail": "Blu tecnico e ciano", "category": "K9 operativo", "accent": "#307e92", "ink": "#203747", "frame": "none", "ornament": "techpro", "profile": "tactical"},
    hrddPro: {"label": "HRDD specialistico", "detail": "Ardesia e bronzo", "category": "K9 operativo", "accent": "#956e49", "ink": "#35414a", "frame": "none", "ornament": "techpro", "profile": "tactical"},
    editorialIvory: {"label": "Editoriale avorio", "detail": "Sabbia e grafite", "category": "Accademici", "accent": "#9d805b", "ink": "#39352d", "frame": "none", "ornament": "editorial", "profile": "editorial"},
    editorialBlue: {"label": "Editoriale blu", "detail": "Blu polvere e ardesia", "category": "Accademici", "accent": "#627f9e", "ink": "#2d3d54", "frame": "none", "ornament": "editorial", "profile": "editorial"},
    honorGold: {"label": "Albo d’onore", "detail": "Oro e verde bosco", "category": "Cerimoniali", "accent": "#a28342", "ink": "#253e33", "frame": "none", "ornament": "medallion", "profile": "ceremony"},
    honorBlue: {"label": "Albo d’onore blu", "detail": "Oro e blu reale", "category": "Cerimoniali", "accent": "#a38442", "ink": "#253955", "frame": "none", "ornament": "medallion", "profile": "ceremony"},
    diplomaFine: {"label": "Diploma fine", "detail": "Nero e sabbia", "category": "Accademici", "accent": "#9a805b", "ink": "#35312b", "frame": "none", "ornament": "folio", "profile": "classic"},
    diplomaSilver: {"label": "Diploma argento", "detail": "Argento e blu", "category": "Accademici", "accent": "#73889c", "ink": "#293d53", "frame": "none", "ornament": "folio", "profile": "classic"},
    regalia: {"label": "Regalia", "detail": "Oro brunito e notte", "category": "Premium", "accent": "#ad8846", "ink": "#1c2839", "frame": "none", "ornament": "regalia", "profile": "ceremony"},
    guilloche: {"label": "Guilloché", "detail": "Incisione fine e ottone", "category": "Premium", "accent": "#a18148", "ink": "#37322b", "frame": "none", "ornament": "guilloche", "profile": "classic"},
    rosette: {"label": "Rosone d’autore", "detail": "Oro e prugna", "category": "Cerimoniali", "accent": "#aa804a", "ink": "#513345", "frame": "none", "ornament": "rosette", "profile": "ceremony"},
    venetian: {"label": "Veneziano", "detail": "Bronzo e bordeaux", "category": "Cerimoniali", "accent": "#a17d48", "ink": "#643345", "frame": "none", "ornament": "venetian", "profile": "ceremony"},
    renaissance: {"label": "Rinascimento", "detail": "Avorio, oro e bosco", "category": "Cerimoniali", "accent": "#a08550", "ink": "#304b40", "frame": "none", "ornament": "renaissance", "profile": "classic"},
    laurelSeal: {"label": "Laurea d’onore", "detail": "Alloro inciso e blu", "category": "Accademici", "accent": "#927a43", "ink": "#213e5b", "frame": "none", "ornament": "laurelSeal", "profile": "ceremony"},
    engraved: {"label": "Incisione nobile", "detail": "Oro antico e grafite", "category": "Premium", "accent": "#96723f", "ink": "#292a32", "frame": "none", "ornament": "engraved", "profile": "classic"},
    cameo: {"label": "Cammeo", "detail": "Rame rosato e cacao", "category": "Cerimoniali", "accent": "#ad7867", "ink": "#543a38", "frame": "none", "ornament": "cameo", "profile": "ceremony"},
    lattice: {"label": "Merletto geometrico", "detail": "Ottone e petrolio", "category": "Premium", "accent": "#ae8b4d", "ink": "#21454c", "frame": "none", "ornament": "lattice", "profile": "editorial"},
    fanDeco: {"label": "Déco ventaglio", "detail": "Oro e antracite", "category": "Premium", "accent": "#b18c44", "ink": "#242c35", "frame": "none", "ornament": "fanDeco", "profile": "editorial"},
    pearl: {"label": "Perla", "detail": "Argento e ardesia", "category": "Eleganti", "accent": "#8397a5", "ink": "#354453", "frame": "none", "ornament": "pearl", "profile": "classic"},
    ribbonSeal: {"label": "Nastro d’onore", "detail": "Oro e cremisi", "category": "Cerimoniali", "accent": "#aa8645", "ink": "#743044", "frame": "none", "ornament": "ribbonSeal", "profile": "ceremony"},
    aurora: {"label": "Aurora", "detail": "Blu notte e azzurro", "category": "Professionali", "accent": "#477f9f", "ink": "#203a59", "frame": "none", "ornament": "aurora", "profile": "modern"},
    prism: {"label": "Prisma", "detail": "Indaco e grafite", "category": "Professionali", "accent": "#626fa9", "ink": "#293447", "frame": "none", "ornament": "prism", "profile": "modern"},
    horizon: {"label": "Orizzonte", "detail": "Petrolio e ciano", "category": "Professionali", "accent": "#388c95", "ink": "#254d59", "frame": "none", "ornament": "horizon", "profile": "modern"},
    origami: {"label": "Origami", "detail": "Acciaio e rame", "category": "Professionali", "accent": "#aa7457", "ink": "#34414b", "frame": "none", "ornament": "origami", "profile": "modern"},
    monolith: {"label": "Monolite", "detail": "Grafite e oro", "category": "Premium", "accent": "#b49555", "ink": "#252a32", "frame": "none", "ornament": "monolith", "profile": "modern"},
    ascent: {"label": "Ascesa", "detail": "Blu reale e ardesia", "category": "Professionali", "accent": "#426d9a", "ink": "#26384c", "frame": "none", "ornament": "ascent", "profile": "modern"},
    folioModern: {"label": "Portfolio", "detail": "Sabbia e grafite", "category": "Accademici", "accent": "#b39a77", "ink": "#373e49", "frame": "none", "ornament": "folioModern", "profile": "editorial"},
    spectrum: {"label": "Spettro", "detail": "Indaco e petrolio", "category": "Professionali", "accent": "#4a858d", "ink": "#344267", "frame": "none", "ornament": "spectrum", "profile": "modern"},
    arcadia: {"label": "Arcadia", "detail": "Verde salvia e ottone", "category": "Eleganti", "accent": "#8e9b76", "ink": "#364d41", "frame": "none", "ornament": "arcadia", "profile": "editorial"},
    bridge: {"label": "Ponte istituzionale", "detail": "Blu e bronzo", "category": "Accademici", "accent": "#a18055", "ink": "#263d5c", "frame": "none", "ornament": "bridge", "profile": "modern"},
    ripple: {"label": "Onde d’acciaio", "detail": "Azzurro e ardesia", "category": "Professionali", "accent": "#588ba4", "ink": "#303f54", "frame": "none", "ornament": "ripple", "profile": "modern"},
    minimalLux: {"label": "Linea esclusiva", "detail": "Nero e champagne", "category": "Premium", "accent": "#b99a63", "ink": "#25282d", "frame": "none", "ornament": "minimalLux", "profile": "editorial"},
    command: {"label": "Comando K9", "detail": "Oliva e nero", "category": "K9 operativo", "accent": "#78835c", "ink": "#26322d", "frame": "none", "ornament": "command", "profile": "tactical"},
    fieldMap: {"label": "Cartografia SAR", "detail": "Sabbia e verde campo", "category": "K9 operativo", "accent": "#a59568", "ink": "#354e42", "frame": "none", "ornament": "fieldMap", "profile": "tactical"},
    radar: {"label": "Radar Detection", "detail": "Ciano e blu profondo", "category": "K9 operativo", "accent": "#3d899d", "ink": "#20394c", "frame": "none", "ornament": "radar", "profile": "tactical"},
    signal: {"label": "Segnale operativo", "detail": "Arancio e grafite", "category": "K9 operativo", "accent": "#b86b3c", "ink": "#333d46", "frame": "none", "ornament": "signal", "profile": "tactical"},
    compass: {"label": "Bussola SAR", "detail": "Bronzo e ardesia", "category": "K9 operativo", "accent": "#a68a59", "ink": "#334855", "frame": "none", "ornament": "compass", "profile": "tactical"},
    trace: {"label": "Traccia olfattiva", "detail": "Verde bosco e salvia", "category": "K9 operativo", "accent": "#668e71", "ink": "#2b483b", "frame": "none", "ornament": "trace", "profile": "tactical"},
    hexTech: {"label": "Esagono tecnico", "detail": "Acciaio e blu", "category": "K9 operativo", "accent": "#54839a", "ink": "#273e51", "frame": "none", "ornament": "hexTech", "profile": "tactical"},
    shieldPro: {"label": "Scudo professionale", "detail": "Oro e verde scuro", "category": "K9 operativo", "accent": "#a58a50", "ink": "#30453a", "frame": "none", "ornament": "shieldPro", "profile": "tactical"},
    pulse: {"label": "Impulso", "detail": "Rosso mattone e acciaio", "category": "K9 operativo", "accent": "#ab5549", "ink": "#33434d", "frame": "none", "ornament": "pulse", "profile": "tactical"},
    gridPro: {"label": "Coordinate", "detail": "Blu e argento", "category": "K9 operativo", "accent": "#6e90a4", "ink": "#293e55", "frame": "none", "ornament": "gridPro", "profile": "tactical"},
    mountain: {"label": "Vetta", "detail": "Verde alpino e grafite", "category": "Natura e K9", "accent": "#698c77", "ink": "#304540", "frame": "none", "ornament": "mountain", "profile": "tactical"},
    current: {"label": "Corrente", "detail": "Blu marino e acqua", "category": "Natura e K9", "accent": "#438da2", "ink": "#27465d", "frame": "none", "ornament": "current", "profile": "modern"},
    signet: {"label": "Sigillo notarile", "detail": "Ottone e inchiostro", "category": "Premium", "accent": "#a18548", "ink": "#303443", "frame": "none", "ornament": "signet", "profile": "ceremony"},
    silk: {"label": "Seta cerimoniale", "detail": "Rame e blu", "category": "Cerimoniali", "accent": "#a57a5d", "ink": "#293d56", "frame": "none", "ornament": "silk", "profile": "ceremony"},
    archivist: {"label": "Archivio storico", "detail": "Sabbia e sepia", "category": "Accademici", "accent": "#9c8057", "ink": "#463b32", "frame": "none", "ornament": "archivist", "profile": "classic"},
    rational: {"label": "Razionalista", "detail": "Grafite e cobalto", "category": "Professionali", "accent": "#406ba2", "ink": "#283b50", "frame": "none", "ornament": "rational", "profile": "modern"},
    brocade: {"label": "Broccato", "detail": "Oro e vinaccia", "category": "Cerimoniali", "accent": "#b28c52", "ink": "#583044", "frame": "none", "ornament": "brocade", "profile": "ceremony"},
    sundial: {"label": "Meridiana", "detail": "Bronzo e blu notte", "category": "Premium", "accent": "#b18c4b", "ink": "#273b52", "frame": "none", "ornament": "sundial", "profile": "classic"},
    inlay: {"label": "Intarsio", "detail": "Ottone e verde scuro", "category": "Premium", "accent": "#ad925e", "ink": "#2a4b40", "frame": "none", "ornament": "inlay", "profile": "editorial"},
    emboss: {"label": "Rilievo nobile", "detail": "Argento e grafite", "category": "Premium", "accent": "#8b9ca4", "ink": "#313a42", "frame": "none", "ornament": "emboss", "profile": "classic"},
    botanical: {"label": "Erbario inciso", "detail": "Verde e avorio", "category": "Natura e K9", "accent": "#6b8c6c", "ink": "#354b3b", "frame": "none", "ornament": "botanical", "profile": "ceremony"},
    bookplate: {"label": "Ex libris", "detail": "Oro antico e blu", "category": "Accademici", "accent": "#ad9158", "ink": "#29394b", "frame": "none", "ornament": "bookplate", "profile": "classic"},
    rivet: {"label": "Rivetto tecnico", "detail": "Acciaio e petrolio", "category": "K9 operativo", "accent": "#508b93", "ink": "#263e4b", "frame": "none", "ornament": "rivet", "profile": "tactical"},
    parallels: {"label": "Parallele", "detail": "Blu accademico e rame", "category": "Professionali", "accent": "#b07a58", "ink": "#263e60", "frame": "none", "ornament": "parallels", "profile": "modern"},
    marquetry: {"label": "Marqueterie", "detail": "Oro e cacao", "category": "Premium", "accent": "#b29a63", "ink": "#493b33", "frame": "none", "ornament": "marquetry", "profile": "editorial"},
    palazzo: {"label": "Palazzo", "detail": "Bronzo e rosso nobile", "category": "Cerimoniali", "accent": "#9e7645", "ink": "#6a3b40", "frame": "none", "ornament": "palazzo", "profile": "classic"},
    cadenza: {"label": "Cadenza", "detail": "Grafite e champagne", "category": "Premium", "accent": "#b29d69", "ink": "#363940", "frame": "none", "ornament": "cadenza", "profile": "editorial"},
    keystone: {"label": "Chiave di volta", "detail": "Blu e acciaio", "category": "Accademici", "accent": "#6c8da2", "ink": "#253b58", "frame": "none", "ornament": "keystone", "profile": "classic"},
    ribbonFold: {"label": "Nastro ripiegato", "detail": "Bordeaux e oro", "category": "Cerimoniali", "accent": "#b59757", "ink": "#693b4b", "frame": "none", "ornament": "ribbonFold", "profile": "ceremony"},
    folioTab: {"label": "Segnalibro", "detail": "Petrolio e menta", "category": "Professionali", "accent": "#538d82", "ink": "#2c4647", "frame": "none", "ornament": "folioTab", "profile": "editorial"},
    chevronRail: {"label": "Binario operativo", "detail": "Oliva e grafite", "category": "K9 operativo", "accent": "#84945c", "ink": "#2e3a36", "frame": "none", "ornament": "chevronRail", "profile": "tactical"},
    relay: {"label": "Relè SAR", "detail": "Arancio e blu scuro", "category": "K9 operativo", "accent": "#bd7646", "ink": "#283b53", "frame": "none", "ornament": "relay", "profile": "tactical"},
    scanline: {"label": "Scansione HRDD", "detail": "Ciano e ardesia", "category": "K9 operativo", "accent": "#5596a7", "ink": "#263b4a", "frame": "none", "ornament": "scanline", "profile": "tactical"},
    ledger: {"label": "Registro d’onore", "detail": "Blu e bronzo", "category": "Accademici", "accent": "#ae8e59", "ink": "#2e455b", "frame": "none", "ornament": "ledger", "profile": "editorial"},
    starChart: {"label": "Carta stellare", "detail": "Blu profondo e oro", "category": "Premium", "accent": "#b2975a", "ink": "#25334a", "frame": "none", "ornament": "starChart", "profile": "classic"},
    quartz: {"label": "Quarzo", "detail": "Prugna e argento", "category": "Professionali", "accent": "#9c95b6", "ink": "#42394f", "frame": "none", "ornament": "quartz", "profile": "modern"},
    weave: {"label": "Trama d’autore", "detail": "Verde petrolio e ottone", "category": "Eleganti", "accent": "#b19964", "ink": "#2d5654", "frame": "none", "ornament": "weave", "profile": "editorial"},
    wreathMedal: {"label": "Medaglia civica", "detail": "Oro e verde", "category": "Cerimoniali", "accent": "#aa8c49", "ink": "#355547", "frame": "none", "ornament": "wreathMedal", "profile": "ceremony"},
    folioRail: {"label": "Margine editoriale", "detail": "Grafite e rame", "category": "Accademici", "accent": "#b78461", "ink": "#333d48", "frame": "none", "ornament": "folioRail", "profile": "editorial"},
    aureole: {label:"Aureola d’onore",detail:"Blu notte e oro satinato",category:"Premium",accent:"#ba985b",ink:"#23364d",frame:"none",ornament:"aureole",profile:"ceremony"},
    magistrale: {label:"Magistrale",detail:"Blu oltremare e oro chiaro",category:"Accademici",accent:"#b79a61",ink:"#233f63",frame:"none",ornament:"magistraleUHD",profile:"classic"},
    senato: {label:"Senato",detail:"Prugna istituzionale e avorio",category:"Cerimoniali",accent:"#b39a63",ink:"#5a3446",frame:"none",ornament:"senatoUHD",profile:"ceremony"},
    prestigioNoir: {label:"Prestigio noir",detail:"Nero satinato e platino",category:"Premium",accent:"#98a5af",ink:"#242a31",frame:"none",ornament:"noirUHD",profile:"classic"},
    atlasPrime: {label:"Atlante prime",detail:"Petrolio e bronzo",category:"Professionali",accent:"#b08656",ink:"#244955",frame:"none",ornament:"atlasUHD",profile:"modern"},
    doge: {label:"Doge",detail:"Rosso veneziano e oro",category:"Cerimoniali",accent:"#b49055",ink:"#6c3742",frame:"none",ornament:"dogeUHD",profile:"classic"},
    vellum: {label:"Pergamena editoriale",detail:"Avorio e seppia",category:"Accademici",accent:"#a68a62",ink:"#4b4036",frame:"none",ornament:"vellumUHD",profile:"editorial"},
    orbitale: {label:"Orbitale",detail:"Cobalto e acciaio",category:"Professionali",accent:"#6a91ad",ink:"#29425c",frame:"none",ornament:"orbitaleUHD",profile:"modern"},
    sentinel: {label:"Sentinella",detail:"Oliva tecnica e acciaio",category:"K9 operativo",accent:"#8d9b68",ink:"#31443c",frame:"none",ornament:"sentinelUHD",profile:"tactical"},
    triage: {label:"Triage SAR",detail:"Arancio soccorso e notte",category:"K9 operativo",accent:"#c07d4e",ink:"#283b52",frame:"none",ornament:"triageUHD",profile:"tactical"},
    forense: {label:"Forense",detail:"Antracite e rame",category:"K9 operativo",accent:"#a57858",ink:"#333e48",frame:"none",ornament:"forenseUHD",profile:"tactical"},
    helios: {label:"Helios",detail:"Oro chiaro e blu avio",category:"Premium",accent:"#c3a464",ink:"#29455d",frame:"none",ornament:"heliosUHD",profile:"classic"},
    prestigeMint: {label:"Prestige mint",detail:"Menta scura e ottone",category:"Eleganti",accent:"#b59d69",ink:"#2f5c56",frame:"none",ornament:"mintUHD",profile:"editorial"},
    arcobalenoTech: {label:"Spectrum tech",detail:"Indaco e turchese",category:"Professionali",accent:"#57a0a5",ink:"#3a4170",frame:"none",ornament:"spectrumUHD",profile:"modern"},
    vettaCivica: {label:"Vetta civica",detail:"Verde alpino e champagne",category:"Natura e K9",accent:"#c1a16a",ink:"#355045",frame:"none",ornament:"vettaUHD",profile:"tactical"},
    marea: {label:"Marea",detail:"Blu oceano e perla",category:"Natura e K9",accent:"#74a8bc",ink:"#2d5068",frame:"none",ornament:"mareaUHD",profile:"modern"},
    opale: {label:"Opale",detail:"Grigio ghiaccio e lilla",category:"Creativi",accent:"#9aa8c8",ink:"#514b68",frame:"none",ornament:"opaleUHD",profile:"modern"},
    florealeNobile: {label:"Floreale nobile",detail:"Avorio e verde salvia",category:"Eleganti",accent:"#96a279",ink:"#425349",frame:"none",ornament:"florealeUHD",profile:"editorial"},
    palinsesto: {label:"Palinsesto",detail:"Blu accademico e bronzo",category:"Accademici",accent:"#ae8b5a",ink:"#29425c",frame:"none",ornament:"palinsestoUHD",profile:"editorial"},
    incisioneBlu: {label:"Incisione blu",detail:"Blu profondo e argento",category:"Premium",accent:"#8ea3b1",ink:"#27405d",frame:"none",ornament:"incisioneUHD",profile:"classic"},
    prismaNobile: {label:"Prisma nobile",detail:"Ametista e platino",category:"Premium",accent:"#b1a5c7",ink:"#433c53",frame:"none",ornament:"prismaUHD",profile:"editorial"},
    notarile: {label:"Notarile",detail:"Grafite e ottone",category:"Accademici",accent:"#b29963",ink:"#2d3947",frame:"none",ornament:"notarileUHD",profile:"ceremony"},
    ducal: {"label": "Ducale", "detail": "Oro brunito e blu notte", "category": "Premium", "accent": "#b49150", "ink": "#203249", "frame": "none", "ornament": "ducalPro", "profile": "classic"},
    silhouette: {"label": "Silhouette", "detail": "Nero e oro caldo", "category": "Premium", "accent": "#b69a5d", "ink": "#27282c", "frame": "none", "ornament": "silhouettePro", "profile": "editorial"},
    arcTriomphe: {"label": "Arco di trionfo", "detail": "Oro e verde imperiale", "category": "Cerimoniali", "accent": "#ac904d", "ink": "#2b493c", "frame": "none", "ornament": "arcTriomphePro", "profile": "ceremony"},
    mosaic: {"label": "Mosaico bizantino", "detail": "Bronzo e lapislazzuli", "category": "Premium", "accent": "#b49458", "ink": "#253e66", "frame": "none", "ornament": "mosaicPro", "profile": "classic"},
    engravedVine: {"label": "Vite ornamentale", "detail": "Verde bosco e bronzo", "category": "Eleganti", "accent": "#9b8356", "ink": "#314c41", "frame": "none", "ornament": "engravedVinePro", "profile": "ceremony"},
    fleur: {"label": "Fleur de lys", "detail": "Bordeaux e champagne", "category": "Cerimoniali", "accent": "#b59a60", "ink": "#64364b", "frame": "none", "ornament": "fleurPro", "profile": "classic"},
    crownRibbon: {"label": "Corona di merito", "detail": "Blu reale e oro", "category": "Accademici", "accent": "#b19451", "ink": "#263c60", "frame": "none", "ornament": "crownRibbonPro", "profile": "ceremony"},
    quill: {"label": "Penna d’autore", "detail": "Sepia e sabbia", "category": "Accademici", "accent": "#a68a63", "ink": "#483a32", "frame": "none", "ornament": "quillPro", "profile": "editorial"},
    laureate: {"label": "Laureato", "detail": "Verde accademico e oro", "category": "Accademici", "accent": "#b29555", "ink": "#2f5145", "frame": "none", "ornament": "laureatePro", "profile": "ceremony"},
    crest: {"label": "Stemma d’onore", "detail": "Indaco e ottone", "category": "Cerimoniali", "accent": "#b28e48", "ink": "#364261", "frame": "none", "ornament": "crestPro", "profile": "classic"},
    terraces: {"label": "Terrazze", "detail": "Blu petrolio e rame", "category": "Professionali", "accent": "#b87959", "ink": "#254955", "frame": "none", "ornament": "terracesPro", "profile": "modern"},
    vectorCut: {"label": "Vettore", "detail": "Cobalto e turchese", "category": "Professionali", "accent": "#4c98aa", "ink": "#23415b", "frame": "none", "ornament": "vectorCutPro", "profile": "modern"},
    foldedPage: {"label": "Piega editoriale", "detail": "Antracite e ocra", "category": "Professionali", "accent": "#b38a49", "ink": "#394149", "frame": "none", "ornament": "foldedPagePro", "profile": "editorial"},
    crescent: {"label": "Luna crescente", "detail": "Indaco e argento", "category": "Creativi", "accent": "#8499b9", "ink": "#3c4670", "frame": "none", "ornament": "crescentPro", "profile": "editorial"},
    modular: {"label": "Modulo", "detail": "Verde petrolio e grafite", "category": "Professionali", "accent": "#4a8b7d", "ink": "#2e4145", "frame": "none", "ornament": "modularPro", "profile": "modern"},
    contourField: {"label": "Profilo di terreno", "detail": "Sabbia e oliva", "category": "K9 operativo", "accent": "#a69a60", "ink": "#3d4a37", "frame": "none", "ornament": "contourFieldPro", "profile": "tactical"},
    rescueBand: {"label": "Unità soccorso", "detail": "Rosso soccorso e blu", "category": "K9 operativo", "accent": "#bd6049", "ink": "#273b50", "frame": "none", "ornament": "rescueBandPro", "profile": "tactical"},
    trackRoute: {"label": "Percorso operativo", "detail": "Verde salvia e carbone", "category": "K9 operativo", "accent": "#7e996d", "ink": "#293b33", "frame": "none", "ornament": "trackRoutePro", "profile": "tactical"},
    sensor: {"label": "Sensore", "detail": "Ciano e blu notte", "category": "K9 operativo", "accent": "#4199ad", "ink": "#20354b", "frame": "none", "ornament": "sensorPro", "profile": "tactical"},
    coordinateL: {"label": "Riferimento forense", "detail": "Rame e ardesia", "category": "K9 operativo", "accent": "#b28666", "ink": "#35434e", "frame": "none", "ornament": "coordinateLPro", "profile": "tactical"},
    cedar: {"label": "Cedro", "detail": "Salvia e ottone", "category": "Natura e K9", "accent": "#8a9b69", "ink": "#3b5447", "frame": "none", "ornament": "cedarPro", "profile": "ceremony"},
    tessera: {"label": "Tessera", "detail": "Ametista e argento", "category": "Creativi", "accent": "#9a8bb5", "ink": "#4b4160", "frame": "none", "ornament": "tesseraPro", "profile": "modern"},
    lacquer: {"label": "Lacca", "detail": "Rubino e grafite", "category": "Premium", "accent": "#ac725d", "ink": "#3d2f3d", "frame": "none", "ornament": "lacquerPro", "profile": "editorial"},
    halftone: {"label": "Mezzatinta", "detail": "Acciaio e blu", "category": "Professionali", "accent": "#7794a9", "ink": "#2b465e", "frame": "none", "ornament": "halftonePro", "profile": "modern"},

    sigApex: {"label": "Apex Command", "detail": "Grafite, bronzo e corazza geometrica", "category": "K9 operativo", "accent": "#97632F", "ink": "#263238", "frame": "none", "ornament": "sigApex", "profile": "tactical"},
    sigTrail: {"label": "K9 Trace", "detail": "Verde bosco, ottone e traccia olfattiva", "category": "K9 operativo", "accent": "#826B37", "ink": "#263E35", "frame": "none", "ornament": "sigTrail", "profile": "tactical"},
    sigRescue: {"label": "Rescue Beacon", "detail": "Rosso segnale, blu ardesia e fasci di ricerca", "category": "K9 operativo", "accent": "#A13C36", "ink": "#23394D", "frame": "none", "ornament": "sigRescue", "profile": "tactical"},
    sigForensic: {"label": "Forensic Evidence", "detail": "Petrolio, rame e stratigrafia", "category": "K9 operativo", "accent": "#94623F", "ink": "#24454E", "frame": "none", "ornament": "sigForensic", "profile": "tactical"},
    sigNight: {"label": "Night Recon", "detail": "Acciaio blu e telemetria notturna", "category": "K9 operativo", "accent": "#456B86", "ink": "#182A3D", "frame": "none", "ornament": "sigNight", "profile": "tactical"},
    sigAurum: {"label": "Aurum Intaglio", "detail": "Oro antico, avorio e incisione a bulino", "category": "Premium", "accent": "#927039", "ink": "#342C24", "frame": "none", "ornament": "sigAurum", "profile": "classic"},
    sigChateau: {"label": "Château", "detail": "Bordeaux, oro e volute architettoniche", "category": "Cerimoniali", "accent": "#9D743B", "ink": "#552D3D", "frame": "none", "ornament": "sigChateau", "profile": "ceremony"},
    sigLumiere: {"label": "Lumière", "detail": "Blu imperiale e raggiera déco", "category": "Premium", "accent": "#8D6E36", "ink": "#203955", "frame": "none", "ornament": "sigLumiere", "profile": "editorial"},
    sigPorcelain: {"label": "Porcellana", "detail": "Cobalto e ornato dipinto", "category": "Eleganti", "accent": "#345B89", "ink": "#283D57", "frame": "none", "ornament": "sigPorcelain", "profile": "ceremony"},
    sigEclipse: {"label": "Eclisse", "detail": "Nero inchiostro, rame e archi orbitali", "category": "Premium", "accent": "#9A6247", "ink": "#23252B", "frame": "none", "ornament": "sigEclipse", "profile": "editorial"},
    sigDiplomat: {"label": "Diplomat", "detail": "Verde petrolio, oro e fregio diplomatico", "category": "Accademici", "accent": "#8A713C", "ink": "#213F42", "frame": "none", "ornament": "sigDiplomat", "profile": "classic"},
    sigAlma: {"label": "Alma Mater", "detail": "Blu accademico e rame, architettura gotica", "category": "Accademici", "accent": "#976747", "ink": "#243D64", "frame": "none", "ornament": "sigAlma", "profile": "classic"},
    sigMonograph: {"label": "Monograph", "detail": "Nero editoriale e rosso ossido", "category": "Professionali", "accent": "#963F35", "ink": "#26282C", "frame": "none", "ornament": "sigMonograph", "profile": "editorial"},
    sigHelix: {"label": "Helix Research", "detail": "Indaco e teal, struttura elicoidale", "category": "Professionali", "accent": "#34746E", "ink": "#324165", "frame": "none", "ornament": "sigHelix", "profile": "modern"},
    sigMarble: {"label": "Marmo di Carrara", "detail": "Grafite, ottone e venature minerali", "category": "Eleganti", "accent": "#8B703E", "ink": "#343B43", "frame": "none", "ornament": "sigMarble", "profile": "editorial"},
    sigHorizon: {"label": "Horizon Relief", "detail": "Blu oceano e incisioni a onde profonde", "category": "Professionali", "accent": "#386E82", "ink": "#1E4556", "frame": "none", "ornament": "sigHorizon", "profile": "modern"},

    k9mt01: {"label": "Trail Command", "detail": "Mantrailing · binomio in traccia · fasce incise", "category": "Mantrailing", "accent": "#496B4C", "ink": "#273B32", "frame": "none", "ornament": "k9mt01", "profile": "tactical", "discipline": "Mantrailing", "layout": 0},
    k9mt02: {"label": "Urban Track", "detail": "Mantrailing · ricerca in bosco · cartigli asimmetrici", "category": "Mantrailing", "accent": "#37596A", "ink": "#283742", "frame": "none", "ornament": "k9mt02", "profile": "tactical", "discipline": "Mantrailing", "layout": 1},
    k9mt03: {"label": "Night Scent", "detail": "Mantrailing · percorso e waypoint · medaglioni gemelli", "category": "Mantrailing", "accent": "#3E536F", "ink": "#263445", "frame": "none", "ornament": "k9mt03", "profile": "ceremony", "discipline": "Mantrailing", "layout": 2},
    k9mt04: {"label": "Forest Line", "detail": "Mantrailing · ricerca urbana · dorso illustrato", "category": "Mantrailing", "accent": "#80623A", "ink": "#3D372E", "frame": "none", "ornament": "k9mt04", "profile": "tactical", "discipline": "Mantrailing", "layout": 3},
    k9mt05: {"label": "Compass Elite", "detail": "Mantrailing · profilo cinofilo e bussola · archi verticali", "category": "Mantrailing", "accent": "#916A34", "ink": "#273B32", "frame": "none", "ornament": "k9mt05", "profile": "tactical", "discipline": "Mantrailing", "layout": 4},
    k9mt06: {"label": "Route of Honor", "detail": "Mantrailing · binomio in traccia · quattro medaglioni", "category": "Mantrailing", "accent": "#496456", "ink": "#283742", "frame": "none", "ornament": "k9mt06", "profile": "ceremony", "discipline": "Mantrailing", "layout": 5},
    k9mt07: {"label": "Alpine Pursuit", "detail": "Mantrailing · ricerca in bosco · scudi e angolari", "category": "Mantrailing", "accent": "#627B55", "ink": "#263445", "frame": "none", "ornament": "k9mt07", "profile": "tactical", "discipline": "Mantrailing", "layout": 6},
    k9mt08: {"label": "Trail Atlas", "detail": "Mantrailing · percorso e waypoint · pannelli illustrati", "category": "Mantrailing", "accent": "#406D69", "ink": "#3D372E", "frame": "none", "ornament": "k9mt08", "profile": "tactical", "discipline": "Mantrailing", "layout": 7},
    k9mt09: {"label": "Scent Corridor", "detail": "Mantrailing · ricerca urbana · medaglione centrale", "category": "Mantrailing", "accent": "#69523B", "ink": "#273B32", "frame": "none", "ornament": "k9mt09", "profile": "editorial", "discipline": "Mantrailing", "layout": 8},
    k9mt10: {"label": "Operational Track", "detail": "Mantrailing · profilo cinofilo e bussola · fregi intrecciati", "category": "Mantrailing", "accent": "#53643E", "ink": "#283742", "frame": "none", "ornament": "k9mt10", "profile": "tactical", "discipline": "Mantrailing", "layout": 9},
    k9mt11: {"label": "Pathfinder", "detail": "Mantrailing · percorso e waypoint · fasce incise", "category": "Mantrailing", "accent": "#496B4C", "ink": "#263445", "frame": "none", "ornament": "k9mt11", "profile": "tactical", "discipline": "Mantrailing", "layout": 10},
    k9mt12: {"label": "K9 Meridian", "detail": "Mantrailing · ricerca urbana · cartigli asimmetrici", "category": "Mantrailing", "accent": "#37596A", "ink": "#3D372E", "frame": "none", "ornament": "k9mt12", "profile": "ceremony", "discipline": "Mantrailing", "layout": 11},
    k9mt13: {"label": "Silent Trail", "detail": "Mantrailing · profilo cinofilo e bussola · medaglioni gemelli", "category": "Mantrailing", "accent": "#3E536F", "ink": "#273B32", "frame": "none", "ornament": "k9mt13", "profile": "editorial", "discipline": "Mantrailing", "layout": 12},
    k9mt14: {"label": "Trail Heritage", "detail": "Mantrailing · binomio in traccia · dorso illustrato", "category": "Mantrailing", "accent": "#80623A", "ink": "#283742", "frame": "none", "ornament": "k9mt14", "profile": "ceremony", "discipline": "Mantrailing", "layout": 13},
    k9mt15: {"label": "Waypoint", "detail": "Mantrailing · ricerca in bosco · archi verticali", "category": "Mantrailing", "accent": "#916A34", "ink": "#263445", "frame": "none", "ornament": "k9mt15", "profile": "ceremony", "discipline": "Mantrailing", "layout": 14},
    k9mt16: {"label": "Terra Incognita", "detail": "Mantrailing · percorso e waypoint · quattro medaglioni", "category": "Mantrailing", "accent": "#496456", "ink": "#3D372E", "frame": "none", "ornament": "k9mt16", "profile": "tactical", "discipline": "Mantrailing", "layout": 15},
    k9mt17: {"label": "Street Grid", "detail": "Mantrailing · ricerca urbana · scudi e angolari", "category": "Mantrailing", "accent": "#627B55", "ink": "#273B32", "frame": "none", "ornament": "k9mt17", "profile": "tactical", "discipline": "Mantrailing", "layout": 16},
    k9mt18: {"label": "Ridge Patrol", "detail": "Mantrailing · profilo cinofilo e bussola · pannelli illustrati", "category": "Mantrailing", "accent": "#406D69", "ink": "#283742", "frame": "none", "ornament": "k9mt18", "profile": "tactical", "discipline": "Mantrailing", "layout": 17},
    k9mt19: {"label": "Trail Compass", "detail": "Mantrailing · binomio in traccia · medaglione centrale", "category": "Mantrailing", "accent": "#69523B", "ink": "#263445", "frame": "none", "ornament": "k9mt19", "profile": "tactical", "discipline": "Mantrailing", "layout": 18},
    k9mt20: {"label": "Scent Navigator", "detail": "Mantrailing · ricerca in bosco · fregi intrecciati", "category": "Mantrailing", "accent": "#53643E", "ink": "#3D372E", "frame": "none", "ornament": "k9mt20", "profile": "tactical", "discipline": "Mantrailing", "layout": 19},
    k9mt21: {"label": "Field Notes", "detail": "Mantrailing · profilo cinofilo e bussola · fasce incise", "category": "Mantrailing", "accent": "#496B4C", "ink": "#273B32", "frame": "none", "ornament": "k9mt21", "profile": "editorial", "discipline": "Mantrailing", "layout": 20},
    k9mt22: {"label": "Trail Ribbon", "detail": "Mantrailing · binomio in traccia · cartigli asimmetrici", "category": "Mantrailing", "accent": "#37596A", "ink": "#283742", "frame": "none", "ornament": "k9mt22", "profile": "tactical", "discipline": "Mantrailing", "layout": 21},
    k9mt23: {"label": "Map of Merit", "detail": "Mantrailing · ricerca in bosco · medaglioni gemelli", "category": "Mantrailing", "accent": "#3E536F", "ink": "#263445", "frame": "none", "ornament": "k9mt23", "profile": "ceremony", "discipline": "Mantrailing", "layout": 22},
    k9mt24: {"label": "Olfactory Journey", "detail": "Mantrailing · percorso e waypoint · dorso illustrato", "category": "Mantrailing", "accent": "#80623A", "ink": "#3D372E", "frame": "none", "ornament": "k9mt24", "profile": "tactical", "discipline": "Mantrailing", "layout": 23},
    k9mt25: {"label": "Search Horizon", "detail": "Mantrailing · ricerca urbana · archi verticali", "category": "Mantrailing", "accent": "#916A34", "ink": "#273B32", "frame": "none", "ornament": "k9mt25", "profile": "editorial", "discipline": "Mantrailing", "layout": 24},
    k9mt26: {"label": "Trail Expedition", "detail": "Mantrailing · profilo cinofilo e bussola · quattro medaglioni", "category": "Mantrailing", "accent": "#496456", "ink": "#283742", "frame": "none", "ornament": "k9mt26", "profile": "tactical", "discipline": "Mantrailing", "layout": 25},
    k9mt27: {"label": "Trace & Honor", "detail": "Mantrailing · binomio in traccia · scudi e angolari", "category": "Mantrailing", "accent": "#627B55", "ink": "#263445", "frame": "none", "ornament": "k9mt27", "profile": "ceremony", "discipline": "Mantrailing", "layout": 26},
    k9mt28: {"label": "K9 Cartographer", "detail": "Mantrailing · ricerca in bosco · pannelli illustrati", "category": "Mantrailing", "accent": "#406D69", "ink": "#3D372E", "frame": "none", "ornament": "k9mt28", "profile": "tactical", "discipline": "Mantrailing", "layout": 27},
    k9mt29: {"label": "Trail Vanguard", "detail": "Mantrailing · percorso e waypoint · medaglione centrale", "category": "Mantrailing", "accent": "#69523B", "ink": "#273B32", "frame": "none", "ornament": "k9mt29", "profile": "tactical", "discipline": "Mantrailing", "layout": 28},
    k9mt30: {"label": "Mantrailing Laureate", "detail": "Mantrailing · ricerca urbana · fregi intrecciati", "category": "Mantrailing", "accent": "#53643E", "ink": "#283742", "frame": "none", "ornament": "k9mt30", "profile": "ceremony", "discipline": "Mantrailing", "layout": 29},
    k9hr01: {"label": "Forensic Command", "detail": "HRDD · cane in ricerca e griglia · fasce incise", "category": "HRDD", "accent": "#79533A", "ink": "#343C42", "frame": "none", "ornament": "k9hr01", "profile": "tactical", "discipline": "HRDD", "layout": 0},
    k9hr02: {"label": "Evidence Archive", "detail": "HRDD · ricerca sul terreno e marcatore · cartigli asimmetrici", "category": "HRDD", "accent": "#4D6571", "ink": "#3E3B37", "frame": "none", "ornament": "k9hr02", "profile": "tactical", "discipline": "HRDD", "layout": 1},
    k9hr03: {"label": "Recovery Grid", "detail": "HRDD · rilievo e documentazione · medaglioni gemelli", "category": "HRDD", "accent": "#4D7070", "ink": "#253D41", "frame": "none", "ornament": "k9hr03", "profile": "ceremony", "discipline": "HRDD", "layout": 2},
    k9hr04: {"label": "Stratigraphy", "detail": "HRDD · fascicolo e unità cinofila · dorso illustrato", "category": "HRDD", "accent": "#745E4C", "ink": "#41464C", "frame": "none", "ornament": "k9hr04", "profile": "tactical", "discipline": "HRDD", "layout": 3},
    k9hr05: {"label": "Forensic Meridian", "detail": "HRDD · cane e marker di ricerca · archi verticali", "category": "HRDD", "accent": "#917044", "ink": "#343C42", "frame": "none", "ornament": "k9hr05", "profile": "tactical", "discipline": "HRDD", "layout": 4},
    k9hr06: {"label": "Site Survey", "detail": "HRDD · cane in ricerca e griglia · quattro medaglioni", "category": "HRDD", "accent": "#53616B", "ink": "#3E3B37", "frame": "none", "ornament": "k9hr06", "profile": "ceremony", "discipline": "HRDD", "layout": 5},
    k9hr07: {"label": "Silent Recovery", "detail": "HRDD · ricerca sul terreno e marcatore · scudi e angolari", "category": "HRDD", "accent": "#755347", "ink": "#253D41", "frame": "none", "ornament": "k9hr07", "profile": "tactical", "discipline": "HRDD", "layout": 6},
    k9hr08: {"label": "Forensic Atlas", "detail": "HRDD · rilievo e documentazione · pannelli illustrati", "category": "HRDD", "accent": "#526B64", "ink": "#41464C", "frame": "none", "ornament": "k9hr08", "profile": "tactical", "discipline": "HRDD", "layout": 7},
    k9hr09: {"label": "Evidence Corridor", "detail": "HRDD · fascicolo e unità cinofila · medaglione centrale", "category": "HRDD", "accent": "#776453", "ink": "#343C42", "frame": "none", "ornament": "k9hr09", "profile": "editorial", "discipline": "HRDD", "layout": 8},
    k9hr10: {"label": "Scene Documentation", "detail": "HRDD · cane e marker di ricerca · fregi intrecciati", "category": "HRDD", "accent": "#455C75", "ink": "#3E3B37", "frame": "none", "ornament": "k9hr10", "profile": "tactical", "discipline": "HRDD", "layout": 9},
    k9hr11: {"label": "Ground Recon", "detail": "HRDD · rilievo e documentazione · fasce incise", "category": "HRDD", "accent": "#79533A", "ink": "#253D41", "frame": "none", "ornament": "k9hr11", "profile": "tactical", "discipline": "HRDD", "layout": 10},
    k9hr12: {"label": "Recovery Protocol", "detail": "HRDD · fascicolo e unità cinofila · cartigli asimmetrici", "category": "HRDD", "accent": "#4D6571", "ink": "#41464C", "frame": "none", "ornament": "k9hr12", "profile": "ceremony", "discipline": "HRDD", "layout": 11},
    k9hr13: {"label": "Forensic Ledger", "detail": "HRDD · cane e marker di ricerca · medaglioni gemelli", "category": "HRDD", "accent": "#4D7070", "ink": "#343C42", "frame": "none", "ornament": "k9hr13", "profile": "editorial", "discipline": "HRDD", "layout": 12},
    k9hr14: {"label": "HRDD Honor", "detail": "HRDD · cane in ricerca e griglia · dorso illustrato", "category": "HRDD", "accent": "#745E4C", "ink": "#3E3B37", "frame": "none", "ornament": "k9hr14", "profile": "ceremony", "discipline": "HRDD", "layout": 13},
    k9hr15: {"label": "Site Marker", "detail": "HRDD · ricerca sul terreno e marcatore · archi verticali", "category": "HRDD", "accent": "#917044", "ink": "#253D41", "frame": "none", "ornament": "k9hr15", "profile": "ceremony", "discipline": "HRDD", "layout": 14},
    k9hr16: {"label": "Layer Analysis", "detail": "HRDD · rilievo e documentazione · quattro medaglioni", "category": "HRDD", "accent": "#53616B", "ink": "#41464C", "frame": "none", "ornament": "k9hr16", "profile": "tactical", "discipline": "HRDD", "layout": 15},
    k9hr17: {"label": "Sector Survey", "detail": "HRDD · fascicolo e unità cinofila · scudi e angolari", "category": "HRDD", "accent": "#755347", "ink": "#343C42", "frame": "none", "ornament": "k9hr17", "profile": "tactical", "discipline": "HRDD", "layout": 16},
    k9hr18: {"label": "Forensic Field", "detail": "HRDD · cane e marker di ricerca · pannelli illustrati", "category": "HRDD", "accent": "#526B64", "ink": "#3E3B37", "frame": "none", "ornament": "k9hr18", "profile": "tactical", "discipline": "HRDD", "layout": 17},
    k9hr19: {"label": "Recovery Compass", "detail": "HRDD · cane in ricerca e griglia · medaglione centrale", "category": "HRDD", "accent": "#776453", "ink": "#253D41", "frame": "none", "ornament": "k9hr19", "profile": "tactical", "discipline": "HRDD", "layout": 18},
    k9hr20: {"label": "Evidence Path", "detail": "HRDD · ricerca sul terreno e marcatore · fregi intrecciati", "category": "HRDD", "accent": "#455C75", "ink": "#41464C", "frame": "none", "ornament": "k9hr20", "profile": "tactical", "discipline": "HRDD", "layout": 19},
    k9hr21: {"label": "Field Register", "detail": "HRDD · cane e marker di ricerca · fasce incise", "category": "HRDD", "accent": "#79533A", "ink": "#343C42", "frame": "none", "ornament": "k9hr21", "profile": "editorial", "discipline": "HRDD", "layout": 20},
    k9hr22: {"label": "Forensic Insignia", "detail": "HRDD · cane in ricerca e griglia · cartigli asimmetrici", "category": "HRDD", "accent": "#4D6571", "ink": "#3E3B37", "frame": "none", "ornament": "k9hr22", "profile": "tactical", "discipline": "HRDD", "layout": 21},
    k9hr23: {"label": "Archive of Merit", "detail": "HRDD · ricerca sul terreno e marcatore · medaglioni gemelli", "category": "HRDD", "accent": "#4D7070", "ink": "#253D41", "frame": "none", "ornament": "k9hr23", "profile": "ceremony", "discipline": "HRDD", "layout": 22},
    k9hr24: {"label": "Subsurface", "detail": "HRDD · rilievo e documentazione · dorso illustrato", "category": "HRDD", "accent": "#745E4C", "ink": "#41464C", "frame": "none", "ornament": "k9hr24", "profile": "tactical", "discipline": "HRDD", "layout": 23},
    k9hr25: {"label": "Recovery Horizon", "detail": "HRDD · fascicolo e unità cinofila · archi verticali", "category": "HRDD", "accent": "#917044", "ink": "#343C42", "frame": "none", "ornament": "k9hr25", "profile": "editorial", "discipline": "HRDD", "layout": 24},
    k9hr26: {"label": "Search Sector", "detail": "HRDD · cane e marker di ricerca · quattro medaglioni", "category": "HRDD", "accent": "#53616B", "ink": "#3E3B37", "frame": "none", "ornament": "k9hr26", "profile": "tactical", "discipline": "HRDD", "layout": 25},
    k9hr27: {"label": "Forensic Distinction", "detail": "HRDD · cane in ricerca e griglia · scudi e angolari", "category": "HRDD", "accent": "#755347", "ink": "#253D41", "frame": "none", "ornament": "k9hr27", "profile": "ceremony", "discipline": "HRDD", "layout": 26},
    k9hr28: {"label": "Evidence Matrix", "detail": "HRDD · ricerca sul terreno e marcatore · pannelli illustrati", "category": "HRDD", "accent": "#526B64", "ink": "#41464C", "frame": "none", "ornament": "k9hr28", "profile": "tactical", "discipline": "HRDD", "layout": 27},
    k9hr29: {"label": "HRDD Vanguard", "detail": "HRDD · rilievo e documentazione · medaglione centrale", "category": "HRDD", "accent": "#776453", "ink": "#343C42", "frame": "none", "ornament": "k9hr29", "profile": "tactical", "discipline": "HRDD", "layout": 28},
    k9hr30: {"label": "Recovery Laureate", "detail": "HRDD · fascicolo e unità cinofila · fregi intrecciati", "category": "HRDD", "accent": "#455C75", "ink": "#3E3B37", "frame": "none", "ornament": "k9hr30", "profile": "ceremony", "discipline": "HRDD", "layout": 29},
    k9dt01: {"label": "Detection Command", "detail": "Detection · cane e postazioni olfattive · fasce incise", "category": "Detection", "accent": "#286A83", "ink": "#21384C", "frame": "none", "ornament": "k9dt01", "profile": "tactical", "discipline": "Detection", "layout": 0},
    k9dt02: {"label": "Target Scent", "detail": "Detection · profilo cinofilo e flussi · cartigli asimmetrici", "category": "Detection", "accent": "#355A88", "ink": "#293A51", "frame": "none", "ornament": "k9dt02", "profile": "tactical", "discipline": "Detection", "layout": 1},
    k9dt03: {"label": "Olfactory Precision", "detail": "Detection · analisi e bersaglio · medaglioni gemelli", "category": "Detection", "accent": "#4F637D", "ink": "#273C43", "frame": "none", "ornament": "k9dt03", "profile": "ceremony", "discipline": "Detection", "layout": 2},
    k9dt04: {"label": "Scent Dynamics", "detail": "Detection · segnalazione e postazioni · dorso illustrato", "category": "Detection", "accent": "#346E64", "ink": "#283345", "frame": "none", "ornament": "k9dt04", "profile": "tactical", "discipline": "Detection", "layout": 3},
    k9dt05: {"label": "Sensor Elite", "detail": "Detection · profilo e campioni olfattivi · archi verticali", "category": "Detection", "accent": "#866137", "ink": "#21384C", "frame": "none", "ornament": "k9dt05", "profile": "tactical", "discipline": "Detection", "layout": 4},
    k9dt06: {"label": "Detection Honors", "detail": "Detection · cane e postazioni olfattive · quattro medaglioni", "category": "Detection", "accent": "#34627A", "ink": "#293A51", "frame": "none", "ornament": "k9dt06", "profile": "ceremony", "discipline": "Detection", "layout": 5},
    k9dt07: {"label": "Signal Vector", "detail": "Detection · profilo cinofilo e flussi · scudi e angolari", "category": "Detection", "accent": "#435484", "ink": "#273C43", "frame": "none", "ornament": "k9dt07", "profile": "tactical", "discipline": "Detection", "layout": 6},
    k9dt08: {"label": "Detection Atlas", "detail": "Detection · analisi e bersaglio · pannelli illustrati", "category": "Detection", "accent": "#246B76", "ink": "#283345", "frame": "none", "ornament": "k9dt08", "profile": "tactical", "discipline": "Detection", "layout": 7},
    k9dt09: {"label": "Scent Channel", "detail": "Detection · segnalazione e postazioni · medaglione centrale", "category": "Detection", "accent": "#7B5145", "ink": "#21384C", "frame": "none", "ornament": "k9dt09", "profile": "editorial", "discipline": "Detection", "layout": 8},
    k9dt10: {"label": "Alert Response", "detail": "Detection · profilo e campioni olfattivi · fregi intrecciati", "category": "Detection", "accent": "#3A6479", "ink": "#293A51", "frame": "none", "ornament": "k9dt10", "profile": "tactical", "discipline": "Detection", "layout": 9},
    k9dt11: {"label": "Precision Array", "detail": "Detection · analisi e bersaglio · fasce incise", "category": "Detection", "accent": "#286A83", "ink": "#273C43", "frame": "none", "ornament": "k9dt11", "profile": "tactical", "discipline": "Detection", "layout": 10},
    k9dt12: {"label": "Detection Meridian", "detail": "Detection · segnalazione e postazioni · cartigli asimmetrici", "category": "Detection", "accent": "#355A88", "ink": "#283345", "frame": "none", "ornament": "k9dt12", "profile": "ceremony", "discipline": "Detection", "layout": 11},
    k9dt13: {"label": "Silent Signal", "detail": "Detection · profilo e campioni olfattivi · medaglioni gemelli", "category": "Detection", "accent": "#4F637D", "ink": "#21384C", "frame": "none", "ornament": "k9dt13", "profile": "editorial", "discipline": "Detection", "layout": 12},
    k9dt14: {"label": "Detection Heritage", "detail": "Detection · cane e postazioni olfattive · dorso illustrato", "category": "Detection", "accent": "#346E64", "ink": "#293A51", "frame": "none", "ornament": "k9dt14", "profile": "ceremony", "discipline": "Detection", "layout": 13},
    k9dt15: {"label": "Target Lock", "detail": "Detection · profilo cinofilo e flussi · archi verticali", "category": "Detection", "accent": "#866137", "ink": "#273C43", "frame": "none", "ornament": "k9dt15", "profile": "ceremony", "discipline": "Detection", "layout": 14},
    k9dt16: {"label": "Scent Spectrum", "detail": "Detection · analisi e bersaglio · quattro medaglioni", "category": "Detection", "accent": "#34627A", "ink": "#283345", "frame": "none", "ornament": "k9dt16", "profile": "tactical", "discipline": "Detection", "layout": 15},
    k9dt17: {"label": "Detection Matrix", "detail": "Detection · segnalazione e postazioni · scudi e angolari", "category": "Detection", "accent": "#435484", "ink": "#21384C", "frame": "none", "ornament": "k9dt17", "profile": "tactical", "discipline": "Detection", "layout": 16},
    k9dt18: {"label": "Signal Field", "detail": "Detection · profilo e campioni olfattivi · pannelli illustrati", "category": "Detection", "accent": "#246B76", "ink": "#293A51", "frame": "none", "ornament": "k9dt18", "profile": "tactical", "discipline": "Detection", "layout": 17},
    k9dt19: {"label": "Olfactory Compass", "detail": "Detection · cane e postazioni olfattive · medaglione centrale", "category": "Detection", "accent": "#7B5145", "ink": "#273C43", "frame": "none", "ornament": "k9dt19", "profile": "tactical", "discipline": "Detection", "layout": 18},
    k9dt20: {"label": "Scent Navigator", "detail": "Detection · profilo cinofilo e flussi · fregi intrecciati", "category": "Detection", "accent": "#3A6479", "ink": "#283345", "frame": "none", "ornament": "k9dt20", "profile": "tactical", "discipline": "Detection", "layout": 19},
    k9dt21: {"label": "Detection Log", "detail": "Detection · profilo e campioni olfattivi · fasce incise", "category": "Detection", "accent": "#286A83", "ink": "#21384C", "frame": "none", "ornament": "k9dt21", "profile": "editorial", "discipline": "Detection", "layout": 20},
    k9dt22: {"label": "Detection Insignia", "detail": "Detection · cane e postazioni olfattive · cartigli asimmetrici", "category": "Detection", "accent": "#355A88", "ink": "#293A51", "frame": "none", "ornament": "k9dt22", "profile": "tactical", "discipline": "Detection", "layout": 21},
    k9dt23: {"label": "Precision Merit", "detail": "Detection · profilo cinofilo e flussi · medaglioni gemelli", "category": "Detection", "accent": "#4F637D", "ink": "#273C43", "frame": "none", "ornament": "k9dt23", "profile": "ceremony", "discipline": "Detection", "layout": 22},
    k9dt24: {"label": "Scent Flow", "detail": "Detection · analisi e bersaglio · dorso illustrato", "category": "Detection", "accent": "#346E64", "ink": "#283345", "frame": "none", "ornament": "k9dt24", "profile": "tactical", "discipline": "Detection", "layout": 23},
    k9dt25: {"label": "Signal Horizon", "detail": "Detection · segnalazione e postazioni · archi verticali", "category": "Detection", "accent": "#866137", "ink": "#21384C", "frame": "none", "ornament": "k9dt25", "profile": "editorial", "discipline": "Detection", "layout": 24},
    k9dt26: {"label": "Detection Lab", "detail": "Detection · profilo e campioni olfattivi · quattro medaglioni", "category": "Detection", "accent": "#34627A", "ink": "#293A51", "frame": "none", "ornament": "k9dt26", "profile": "tactical", "discipline": "Detection", "layout": 25},
    k9dt27: {"label": "Alert & Honor", "detail": "Detection · cane e postazioni olfattive · scudi e angolari", "category": "Detection", "accent": "#435484", "ink": "#273C43", "frame": "none", "ornament": "k9dt27", "profile": "ceremony", "discipline": "Detection", "layout": 26},
    k9dt28: {"label": "Sensor Network", "detail": "Detection · profilo cinofilo e flussi · pannelli illustrati", "category": "Detection", "accent": "#246B76", "ink": "#283345", "frame": "none", "ornament": "k9dt28", "profile": "tactical", "discipline": "Detection", "layout": 27},
    k9dt29: {"label": "Detection Vanguard", "detail": "Detection · analisi e bersaglio · medaglione centrale", "category": "Detection", "accent": "#7B5145", "ink": "#21384C", "frame": "none", "ornament": "k9dt29", "profile": "tactical", "discipline": "Detection", "layout": 28},
    k9dt30: {"label": "Detection Laureate", "detail": "Detection · segnalazione e postazioni · fregi intrecciati", "category": "Detection", "accent": "#3A6479", "ink": "#293A51", "frame": "none", "ornament": "k9dt30", "profile": "ceremony", "discipline": "Detection", "layout": 29},
    k9ds01: {"label": "Canine Care", "detail": "Dogsitter · cane e ambiente domestico · fasce incise", "category": "Dogsitter", "accent": "#8A614C", "ink": "#443A34", "frame": "none", "ornament": "k9ds01", "profile": "modern", "discipline": "Dogsitter", "layout": 0},
    k9ds02: {"label": "Companion Atelier", "detail": "Dogsitter · binomio in passeggiata · cartigli asimmetrici", "category": "Dogsitter", "accent": "#55776B", "ink": "#334C45", "frame": "none", "ornament": "k9ds02", "profile": "modern", "discipline": "Dogsitter", "layout": 1},
    k9ds03: {"label": "Trusted Paws", "detail": "Dogsitter · impronta e alloro · medaglioni gemelli", "category": "Dogsitter", "accent": "#73556B", "ink": "#493B46", "frame": "none", "ornament": "k9ds03", "profile": "ceremony", "discipline": "Dogsitter", "layout": 2},
    k9ds04: {"label": "Garden of Care", "detail": "Dogsitter · profilo e guinzaglio · dorso illustrato", "category": "Dogsitter", "accent": "#796B39", "ink": "#474632", "frame": "none", "ornament": "k9ds04", "profile": "modern", "discipline": "Dogsitter", "layout": 3},
    k9ds05: {"label": "Care Signature", "detail": "Dogsitter · cani e accoglienza · archi verticali", "category": "Dogsitter", "accent": "#9A703F", "ink": "#443A34", "frame": "none", "ornament": "k9ds05", "profile": "modern", "discipline": "Dogsitter", "layout": 4},
    k9ds06: {"label": "Companion Honor", "detail": "Dogsitter · cane e ambiente domestico · quattro medaglioni", "category": "Dogsitter", "accent": "#466E69", "ink": "#334C45", "frame": "none", "ornament": "k9ds06", "profile": "ceremony", "discipline": "Dogsitter", "layout": 5},
    k9ds07: {"label": "Paw Heritage", "detail": "Dogsitter · binomio in passeggiata · scudi e angolari", "category": "Dogsitter", "accent": "#7C5750", "ink": "#493B46", "frame": "none", "ornament": "k9ds07", "profile": "modern", "discipline": "Dogsitter", "layout": 6},
    k9ds08: {"label": "Canine Atelier", "detail": "Dogsitter · impronta e alloro · pannelli illustrati", "category": "Dogsitter", "accent": "#536C82", "ink": "#474632", "frame": "none", "ornament": "k9ds08", "profile": "modern", "discipline": "Dogsitter", "layout": 7},
    k9ds09: {"label": "Gentle Walk", "detail": "Dogsitter · profilo e guinzaglio · medaglione centrale", "category": "Dogsitter", "accent": "#927250", "ink": "#443A34", "frame": "none", "ornament": "k9ds09", "profile": "editorial", "discipline": "Dogsitter", "layout": 8},
    k9ds10: {"label": "Care & Trust", "detail": "Dogsitter · cani e accoglienza · fregi intrecciati", "category": "Dogsitter", "accent": "#606F49", "ink": "#334C45", "frame": "none", "ornament": "k9ds10", "profile": "modern", "discipline": "Dogsitter", "layout": 9},
    k9ds11: {"label": "Paw & Leaf", "detail": "Dogsitter · impronta e alloro · fasce incise", "category": "Dogsitter", "accent": "#8A614C", "ink": "#493B46", "frame": "none", "ornament": "k9ds11", "profile": "modern", "discipline": "Dogsitter", "layout": 10},
    k9ds12: {"label": "Companion House", "detail": "Dogsitter · profilo e guinzaglio · cartigli asimmetrici", "category": "Dogsitter", "accent": "#55776B", "ink": "#474632", "frame": "none", "ornament": "k9ds12", "profile": "ceremony", "discipline": "Dogsitter", "layout": 11},
    k9ds13: {"label": "Tender Care", "detail": "Dogsitter · cani e accoglienza · medaglioni gemelli", "category": "Dogsitter", "accent": "#73556B", "ink": "#443A34", "frame": "none", "ornament": "k9ds13", "profile": "editorial", "discipline": "Dogsitter", "layout": 12},
    k9ds14: {"label": "Canine Heritage", "detail": "Dogsitter · cane e ambiente domestico · dorso illustrato", "category": "Dogsitter", "accent": "#796B39", "ink": "#334C45", "frame": "none", "ornament": "k9ds14", "profile": "ceremony", "discipline": "Dogsitter", "layout": 13},
    k9ds15: {"label": "Paw Jewel", "detail": "Dogsitter · binomio in passeggiata · archi verticali", "category": "Dogsitter", "accent": "#9A703F", "ink": "#493B46", "frame": "none", "ornament": "k9ds15", "profile": "ceremony", "discipline": "Dogsitter", "layout": 14},
    k9ds16: {"label": "Garden Companion", "detail": "Dogsitter · impronta e alloro · quattro medaglioni", "category": "Dogsitter", "accent": "#466E69", "ink": "#474632", "frame": "none", "ornament": "k9ds16", "profile": "modern", "discipline": "Dogsitter", "layout": 15},
    k9ds17: {"label": "Care Mosaic", "detail": "Dogsitter · profilo e guinzaglio · scudi e angolari", "category": "Dogsitter", "accent": "#7C5750", "ink": "#443A34", "frame": "none", "ornament": "k9ds17", "profile": "modern", "discipline": "Dogsitter", "layout": 16},
    k9ds18: {"label": "Walking Club", "detail": "Dogsitter · cani e accoglienza · pannelli illustrati", "category": "Dogsitter", "accent": "#536C82", "ink": "#334C45", "frame": "none", "ornament": "k9ds18", "profile": "modern", "discipline": "Dogsitter", "layout": 17},
    k9ds19: {"label": "Companion Compass", "detail": "Dogsitter · cane e ambiente domestico · medaglione centrale", "category": "Dogsitter", "accent": "#927250", "ink": "#493B46", "frame": "none", "ornament": "k9ds19", "profile": "modern", "discipline": "Dogsitter", "layout": 18},
    k9ds20: {"label": "Paw Journey", "detail": "Dogsitter · binomio in passeggiata · fregi intrecciati", "category": "Dogsitter", "accent": "#606F49", "ink": "#474632", "frame": "none", "ornament": "k9ds20", "profile": "modern", "discipline": "Dogsitter", "layout": 19},
    k9ds21: {"label": "Care Journal", "detail": "Dogsitter · cani e accoglienza · fasce incise", "category": "Dogsitter", "accent": "#8A614C", "ink": "#443A34", "frame": "none", "ornament": "k9ds21", "profile": "editorial", "discipline": "Dogsitter", "layout": 20},
    k9ds22: {"label": "Ribbon of Trust", "detail": "Dogsitter · cane e ambiente domestico · cartigli asimmetrici", "category": "Dogsitter", "accent": "#55776B", "ink": "#334C45", "frame": "none", "ornament": "k9ds22", "profile": "modern", "discipline": "Dogsitter", "layout": 21},
    k9ds23: {"label": "Care Merit", "detail": "Dogsitter · binomio in passeggiata · medaglioni gemelli", "category": "Dogsitter", "accent": "#73556B", "ink": "#493B46", "frame": "none", "ornament": "k9ds23", "profile": "ceremony", "discipline": "Dogsitter", "layout": 22},
    k9ds24: {"label": "Gentle Flow", "detail": "Dogsitter · impronta e alloro · dorso illustrato", "category": "Dogsitter", "accent": "#796B39", "ink": "#474632", "frame": "none", "ornament": "k9ds24", "profile": "modern", "discipline": "Dogsitter", "layout": 23},
    k9ds25: {"label": "Companion Horizon", "detail": "Dogsitter · profilo e guinzaglio · archi verticali", "category": "Dogsitter", "accent": "#9A703F", "ink": "#443A34", "frame": "none", "ornament": "k9ds25", "profile": "editorial", "discipline": "Dogsitter", "layout": 24},
    k9ds26: {"label": "Canine Wellness", "detail": "Dogsitter · cani e accoglienza · quattro medaglioni", "category": "Dogsitter", "accent": "#466E69", "ink": "#334C45", "frame": "none", "ornament": "k9ds26", "profile": "modern", "discipline": "Dogsitter", "layout": 25},
    k9ds27: {"label": "Paw Distinction", "detail": "Dogsitter · cane e ambiente domestico · scudi e angolari", "category": "Dogsitter", "accent": "#7C5750", "ink": "#493B46", "frame": "none", "ornament": "k9ds27", "profile": "ceremony", "discipline": "Dogsitter", "layout": 26},
    k9ds28: {"label": "Care Collective", "detail": "Dogsitter · binomio in passeggiata · pannelli illustrati", "category": "Dogsitter", "accent": "#536C82", "ink": "#474632", "frame": "none", "ornament": "k9ds28", "profile": "modern", "discipline": "Dogsitter", "layout": 27},
    k9ds29: {"label": "Dogsitter Prestige", "detail": "Dogsitter · impronta e alloro · medaglione centrale", "category": "Dogsitter", "accent": "#927250", "ink": "#443A34", "frame": "none", "ornament": "k9ds29", "profile": "modern", "discipline": "Dogsitter", "layout": 28},
    k9ds30: {"label": "Companion Laureate", "detail": "Dogsitter · profilo e guinzaglio · fregi intrecciati", "category": "Dogsitter", "accent": "#606F49", "ink": "#334C45", "frame": "none", "ornament": "k9ds30", "profile": "ceremony", "discipline": "Dogsitter", "layout": 29},
  };
  // Stili storici conservati per i progetti esistenti, esclusi dalla nuova galleria.
  const archivedThemeIds = new Set(["emerald", "navy", "burgundy", "academic", "sage", "coral", "alpine", "olive", "moss", "dusk", "bark", "lavender", "ice", "coastal", "copper", "ocean", "imperialNavy", "baroqueRuby", "artDecoTeal", "academyCrimson", "executiveTeal", "corporateGraphite", "k9Urban", "sarField", "hrddPro", "editorialBlue", "honorBlue", "diplomaSilver"]);
  // Revisione 4.8: composizioni identiche o eccessivamente simili, a palette neutralizzata.
  for(const id of ["bronze", "atlas", "heritage", "royal", "champagne", "midnight", "blueprint", "ivory", "civic", "technical", "bridge", "regalia", "horizon", "signal", "editorialIvory"])archivedThemeIds.add(id);
  const catalogThemes = Object.entries(themePalettes).filter(([id]) => !archivedThemeIds.has(id));
  let selectedTheme = "classic";
  const MAX_IMAGE_MB = 15;
  const MAX_BATCH = 30;
  const MAX_LOGOS = 50; // Limite esplicito, identico in editor, salvataggio e importazione.
  const BACKUP_KDF_ITERATIONS = 250000;
  const DB_NAME = "k9-certificati-progetti-v2";
  let dbPromise;
  let autosaveTimer;
  let activeWrites = Promise.resolve();
  let savedRevision = 0;
  let lastSavedProjectName = "";
  let lastBatchUrl = null;
  let showGuides = false;
  let showGrid = false;
  let pendingPreviewFrame = 0;
  let settingsSaveTimer;
  let exportLock = false;
  let pendingEditorOperations=0;
  let recoveryBlocked=false, dirty=false;
  const knownProjectVersions = new Map();
  const versionOf = item => item ? String(item.writeToken || item.updatedAt || "legacy") : null;
  const newToken = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const projectConflict = () => new Error("Progetto modificato in un'altra scheda: esporta un backup del lavoro e ricarica l'app prima di salvare.");
  function setEditorBusy(busy) {
    for(const el of document.querySelectorAll(".controls,.pdf-button,#togglePreviewGrid")) el.inert=busy;
    if(busy) document.body.setAttribute("aria-busy","true");
    else document.body.removeAttribute("aria-busy");
  }
  function guardAsync(handler) {
    return async (...args)=>{
      if (state.exporting || pendingEditorOperations || !state.initialized) {setStatus("Completa prima l'operazione in corso");return;}
      clearTimeout(autosaveTimer);
      pendingEditorOperations++;
      setEditorBusy(true);
      try {return await handler(...args);} catch(error) {console.error(error);setStatus(error.message || "Operazione non riuscita","warning");}
      finally {pendingEditorOperations--;setEditorBusy(false);if(dirty) scheduleAutosave();}
    };
  }
  function trimExportCaches(){
    const active=photoKeyFor(activeBackgroundId());
    for(const [id] of photoDecoded)if(id!==active)photoDecoded.delete(id);
    for(const [id,c] of photoLayers)if(id!==`${currentOrientation()==="portrait"?"P":"L"}|${active}`){c.width=c.height=1;photoLayers.delete(id);}
    for(const c of thumbnailCache.values())c.width=c.height=1;
    thumbnailCache.clear();
  }
  function beginExport() {
    if (state.exporting || pendingEditorOperations || !state.initialized) { if (!state.exporting) setStatus("Completa prima l'operazione in corso"); return false; }
    clearTimeout(autosaveTimer);clearTimeout(settingsSaveTimer);saveSettings();
    if(dirty||pendingPreviewFrame)void persistCurrentSnapshot();
    trimExportCaches();
    state.exporting=true;exportLock=true;
    document.activeElement?.blur();
    document.body.setAttribute("aria-busy","true");
    document.body.classList.add("export-locked");
    for(const el of document.querySelectorAll(".controls,.preview-toolbar,.header-actions,.pdf-button,#togglePreviewGrid"))el.inert=true;
    return true;
  }
  function endExport() {
    state.exporting=false;exportLock=false;
    document.body.removeAttribute("aria-busy");document.body.classList.remove("export-locked");
    for(const el of document.querySelectorAll(".controls,.preview-toolbar,.header-actions,.pdf-button,#togglePreviewGrid"))el.inert=false;
  }
  for(const event of ["click","input","change","keydown","pointerdown","drop","paste","beforeinput"]){
    document.addEventListener(event,e=>{if(exportLock && e.isTrusted){e.preventDefault();e.stopImmediatePropagation();}},true);
  }
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

  function setStatus(text, level = "") {
    const el = $("status");
    const warning = level === "warning" || (!level && /(?:errore|impossibil|non disponibile|non riuscit|non valid|annullat|tropp|mancant|inserisci|seleziona|ripetut|già present|codice manuale|non creato|non supportat|insufficient|superato il limite|prima di)/i.test(text));
    el.textContent = text;
    el.classList.remove("is-idle");
    el.classList.toggle("status-warning", warning);
    el.setAttribute("role", warning ? "alert" : "status");
    clearTimeout(setStatus.timer);
    // I messaggi di errore restano finché non arriva un nuovo evento importante;
    // gli altri sono visibili più a lungo rispetto alle versioni precedenti.
    if (!warning) setStatus.timer = setTimeout(() => {el.textContent = "Pronto";el.classList.remove("status-warning");el.classList.add("is-idle");}, 6000);
  }

  function applyBackgroundLockUI() {
    const locked = !!state.backgroundLocked;
    ["backgroundOpacity","backgroundScale","backgroundX","backgroundY","fitBackground","backgroundFile","removeBackground"].forEach(id => {
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
    $("logoCount").textContent = `${count} / ${MAX_LOGOS} loghi inseriti`;
    $("logoUploadLabel").textContent = count ? "Carica un altro logo" : "Carica logo";
  }

  function positionPercent(value, extent) {
    return Math.max(0,Math.min(100,Math.round(value/extent*1000)/10));
  }
  function percentLabel(value) {return `${String(value).replace(".",",")}%`;}
  function syncPositionRange(id, coordinate, extent) {
    const value=positionPercent(coordinate,extent);
    $(id).value=String(value);
    $(`${id}Value`).value=percentLabel(value);
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
    syncPositionRange("logoX",logo.x,W);
    syncPositionRange("logoY",logo.y,H);
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

  // Compatibile con i progetti e i backup precedenti: 100% mantiene la grafica originale.
  function normalizeThemeOpacity(value) {
    if (value === null || value === undefined || value === "" || (typeof value !== "string" && typeof value !== "number")) return "100";
    const n=Number(value);
    return Number.isFinite(n) && n>=0 && n<=100 ? String(Math.round(n)) : "100";
  }
  function themeBackgroundAlpha(){return Number(normalizeThemeOpacity($("themeBackgroundOpacity").value))/100;}
  function syncThemeOpacity(){
    const input=$("themeBackgroundOpacity");
    input.value=normalizeThemeOpacity(input.value);
    $("themeBackgroundOpacityValue").value=`${input.value}%`;
    input.disabled=state.themeBackgroundLocked || activeBackgroundId()==="none";

  }
  function frameAlpha(){return Number(normalizeThemeOpacity($("frameOpacity").value))/100;}
  function syncFrameOpacity(){
    const input=$("frameOpacity");
    input.value=normalizeThemeOpacity(input.value);
    $("frameOpacityValue").value=`${input.value}%`;
    const absent=$("frameStyle").value==="none";
    input.disabled=absent||state.frameLocked;

  }

  const PERSONAL_FRAME = "__personal_frame__";
  const frameCatalogItem = id => premiumFrameCatalog.find(item => item.id === id) || null;

  function updateFrameNavigatorUI() {
    const status=$("frameNavStatus"),prev=$("prevFrame"),next=$("nextFrame");
    const current=frameCatalogItem($("frameStyle").value),items=filteredFrameEntries();
    const index=items.findIndex(item=>item.id===current?.id);
    const count=`${$("frameDiscipline").value} · ${items.length} cornici`;
    status.textContent=index>=0?`${count} · ${index+1}/${items.length} · ${current.label}`:current?`${count} · attiva: ${current.label} (fuori filtro)` : $("frameStyle").value===PERSONAL_FRAME?`${count} · personale attiva` : count;
    prev.disabled=next.disabled=state.frameLocked||!items.length||(items.length===1&&index===0);
  }

  function applyThemeBackgroundLockUI() {
    const locked = !!state.themeBackgroundLocked;
    ["themeSearch","themeBackgroundOpacity","removeThemeBackground","locateTheme"].forEach(id => {
      const el = $(id);
      if (el) el.disabled = locked || (["removeThemeBackground","themeBackgroundOpacity"].includes(id) && activeBackgroundId()==="none") || (id==="locateTheme" && (!themePalettes[activeBackgroundId()] || archivedThemeIds.has(activeBackgroundId())));
    });
    document.querySelectorAll('.theme-choice').forEach(btn => btn.disabled = locked);
    const btn = $("lockThemeBackground");
    if (btn) {
      btn.setAttribute("aria-pressed", String(locked));
      btn.textContent = locked ? "Sblocca sfondo" : "Blocca sfondo";
      btn.classList.toggle("is-locked", locked);
    }
  }

  function applyFrameLockUI() {
    const locked = !!state.frameLocked;
    $("frameDiscipline").disabled=$("frameCollection").disabled=locked;
    ["frameStyle","removeFrame","frameOpacity"].forEach(id => {
      const el = $(id);
      if (el) el.disabled = locked || (id !== "frameStyle" && $("frameStyle").value === "none");
    });
    const removeBtn = $("removeFrame");
    if (removeBtn) removeBtn.disabled = locked || $("frameStyle").value === "none";
    const btn = $("lockFrameLayer");
    if (btn) {
      btn.setAttribute("aria-pressed", String(locked));
      btn.textContent = locked ? "Sblocca cornice" : "Blocca cornice";
      btn.classList.toggle("is-locked", locked);
    }
    $("personalFrameFile").disabled=locked;
    $("loadPersonalFrame").disabled=locked;

    $("personalFrameInfo").textContent=state.personalFrameImage ? `${state.personalFrameName} · ${state.personalFrameImage.naturalWidth} × ${state.personalFrameImage.naturalHeight} px` : "Nessuna cornice personale caricata";
    updateFrameNavigatorUI();
  }

  function moveFrameSelection(step) {
    if(state.frameLocked)return;
    const items=filteredFrameEntries();if(!items.length)return;
    const index=items.findIndex(item=>item.id===$("frameStyle").value);
    const target=items[index<0?(step<0?items.length-1:0):(index+step+items.length)%items.length];
    $("frameStyle").value=target.id;frameFailures.delete(target.id);
    syncDesignUI();saveSettings();render();setStatus(`Cornice «${target.label}» caricata`);
  }
  function loadSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem("k9-certificati-settings") || "{}");
      const saved = migrateLayers(raw,raw.designTheme||"classic");
      setPageOrientation(saved.pageOrientation, false);
      $("documentType").value = escapeStored(saved.documentType, defaults.documentType);
      textIds.forEach(id => { $(id).value = escapeStored(saved[id], defaults[id]); });
      $("certificateDate").value = escapeStored(saved.certificateDate, todayISO());
      $("courseOutcome").value = escapeStored(saved.courseOutcome, "");
      $("thirdSignatureMode").value = ["off","auto","image","none"].includes(saved.thirdSignatureMode) ? saved.thirdSignatureMode : "off";
      restoreSignatureControls(saved);
      state.themeBackgroundLocked = saved.themeBackgroundLocked === true;
      state.frameLocked = saved.frameLocked === true;
      $("autoCertificateCode").checked = saved.autoCertificateCode !== false;
      for (const id of designIds.filter(k => k !== "designTheme")) {
        if(id==="frameStyle"){selectFrameValue(saved[id]||"none");continue;}
        if (saved[id] !== undefined) $(id).value = ["themeBackgroundOpacity","frameOpacity"].includes(id) ? normalizeThemeOpacity(saved[id]) : saved[id];
      }
      if(!$("frameStyle").value)$("frameStyle").value="none";
      if (saved.ornamentStyle === undefined) $("ornamentStyle").value = themePalettes[saved.designTheme]?.ornament || "none";
      selectedTheme = saved.designTheme === "custom" ? "custom" : themePalettes[saved.designTheme] ? saved.designTheme : "classic";
      syncDesignUI();
    } catch {
      setPageOrientation("landscape", false);
      $("certificateDate").value = todayISO();
      $("autoCertificateCode").checked = true;
      $("ornamentStyle").value = "none";
      restoreSignatureControls();
      state.themeBackgroundLocked = false;
      state.frameLocked = false;
    }
    syncAutomaticCode();
  }

  function deferSettingsSave() {
    clearTimeout(settingsSaveTimer);
    settingsSaveTimer = setTimeout(saveSettings, 250);
  }

  function saveSettings() {
    const data = { pageOrientation: currentOrientation(), documentType: $("documentType").value, certificateDate: $("certificateDate").value };
    textIds.forEach(id => { data[id] = $(id).value; });
    data.courseOutcome = $("courseOutcome").value;
    data.thirdSignatureMode = $("thirdSignatureMode").value;
    signatureControlIds.forEach(id => data[id] = $(id).value);
    data.signatureBlockLocked = state.signatureBlockLocked;
    data.themeBackgroundLocked = state.themeBackgroundLocked;
    data.frameLocked = state.frameLocked;
    data.autoCertificateCode = $("autoCertificateCode").checked;
    data.designTheme = selectedTheme;
    designIds.filter(id => id !== "designTheme").forEach(id => data[id] = $(id).value);
    if (!recoveryBlocked) try { localStorage.setItem("k9-certificati-settings", JSON.stringify(data)); } catch {}
  }

  // La dimensione del foglio fa parte del progetto: editor, anteprima, modelli e PDF.
  // I vecchi progetti senza questa proprietà vengono aperti in orizzontale.
  function setPageOrientation(value, keepPosition = true) {
    const orientation = value === "portrait" ? "portrait" : "landscape";
    const size = A4_STAGE[orientation];
    const oldW = W, oldH = H;
    if (keepPosition && (oldW !== size.w || oldH !== size.h)) {
      state.backgroundX = (state.backgroundX / oldW) * size.w;
      state.backgroundY = (state.backgroundY / oldH) * size.h;
      state.logos.forEach(logo => {
        logo.x = (logo.x / oldW) * size.w;
        logo.y = (logo.y / oldH) * size.h;
      });
    }
    W = size.w;
    H = size.h;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
      ctx = canvas.getContext("2d", { alpha: false });
    }
    $("pageOrientation").value = orientation;
    const portrait = orientation === "portrait";
    document.querySelector(".a4-stage").classList.toggle("is-portrait", portrait);
    $("previewMeasure").textContent = portrait ? "A4 VERTICALE · 210 × 297 MM" : "A4 ORIZZONTALE · 297 × 210 MM";
    $("previewHeading").textContent = portrait ? "Anteprima A4 210 × 297 mm · sempre visibile" : "Anteprima A4 297 × 210 mm · sempre visibile";
    $("zoomOrientationTitle").textContent = portrait ? "Anteprima attestato · A4 verticale" : "Anteprima attestato · A4 orizzontale";
    const zoomCanvas = $("zoomCanvas");
    zoomCanvas.width = W;
    zoomCanvas.height = H;
    zoomCanvas.classList.toggle("is-portrait", portrait);
    if (state.backgroundImage) state.backgroundFitScale = coverScale(state.backgroundImage);
    if (keepPosition) syncAllControls();
    if (oldW !== W || oldH !== H) populateThemeGallery();
  }

  function formatDate(value) {
    if (!value) return "";
    const [y, m, d] = value.split("-");
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}`;
  }

  // Codice documentale K9_DISCIPLINA_GGMMAAAA_N.C. — nessun progressivo.
  // Per le iniziali: ogni parte del nominativo, inclusi i nomi composti con trattino.
  function asciiUpper(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  }
  // Riconosce discipline dichiarate chiaramente nel nome del corso.
  // Se un titolo cita più discipline, non assume quale sia quella corretta.
  const disciplineAliases = {
    DETECTION: ["DETECTION"], MANTRAILING: ["MANTRAILING"], HRDD: ["HRDD"],
    DOGSITTER: ["DOGSITTER", "DOG_SITTER"], NOSEWORK: ["NOSEWORK", "NOSE_WORK"],
    EDUCAZIONE_CINOFILA: ["EDUCAZIONE_CINOFILA"], OBEDIENCE: ["OBEDIENCE"],
    RECUPERO_COMPORTAMENTALE: ["RECUPERO_COMPORTAMENTALE"],
    PROTEZIONE_CIVILE: ["PROTEZIONE_CIVILE"]
  };
  function courseDisciplineHint(course) {
    const token = `_${asciiUpper(course).replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")}_`;
    const matches = Object.entries(disciplineAliases).filter(([, aliases]) => aliases.some(alias => token.includes(`_${alias}_`)));
    return matches.length === 1 ? matches[0][0] : "";
  }
  function disciplineMismatch() {
    const declared = asciiUpper($("certificateDiscipline").value.trim()).replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const inCourse = courseDisciplineHint($("courseName").value);
    return declared && inCourse && declared !== inCourse
      ? `Disciplina ${declared.replace(/_/g, " ")} non coerente con il corso ${inCourse.replace(/_/g, " ")}. Correggi la disciplina o il titolo.` : "";
  }
  function disciplineCode() {
    const explicit = $("certificateDiscipline").value.trim();
    const derived = $("courseName").value.trim().replace(/^(?:(?:CORSO|STAGE|SEMINARIO|PERCORSO)\s+(?:DI\s+)?|FORMAZIONE\s+)/i, "");
    const raw = explicit || derived;
    const token = asciiUpper(raw).replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!token) throw new Error("Inserisci una disciplina oppure il nome del corso");
    if (token.length > 45) throw new Error("Il nome della disciplina è troppo lungo per il codice");
    return token;
  }
  function certificateDateCode() {
    const date = $("certificateDate").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Seleziona una data valida");
    const [year,month,day] = date.split("-");
    const d = new Date(`${date}T12:00:00`);
    if (Number.isNaN(d.getTime()) || d.getFullYear() !== Number(year) || d.getMonth()+1 !== Number(month) || d.getDate() !== Number(day)) throw new Error("Data del certificato non valida");
    return `${day}${month}${year}`;
  }
  function participantInitials(name) {
    const words = String(name || "").trim().split(/[\s\u2010-\u2015-]+/).filter(Boolean);
    if (words.length < 2) throw new Error("Per le iniziali inserisci nome e cognome del corsista");
    const initials = words.map(word => asciiUpper(word).match(/\p{L}/u)?.[0]);
    if (initials.some(initial => !initial)) throw new Error("Nome o cognome non valido per creare le iniziali");
    return initials.map(initial => `${initial}.`).join("");
  }
  function automaticCode(name) {
    return `K9_${disciplineCode()}_${certificateDateCode()}_${participantInitials(name)}`;
  }
  function syncAutomaticCode() {
    const automatic = $("autoCertificateCode").checked;
    $("certificateCode").readOnly = automatic;
    $("certificateCode").setAttribute("aria-readonly", String(automatic));
    if (automatic) {
      try { $("certificateCode").value = automaticCode($("recipientName").value); }
      catch { $("certificateCode").value = ""; }
    }
    $("certificateCodeHelp").textContent = automatic
      ? "Codice generato dalla disciplina, dalla data e da tutte le iniziali del corsista. Nessun numero progressivo."
      : "Codice manuale: in un PDF multipagina verrà ripetuto su tutte le pagine.";
  }
  function certificateFilename(code, fallback) {
    // Elimina il punto finale dal nome del file (ma non dal codice stampato).
    const safe=String(code||"").replace(/\.+$/, "").replace(/[^\p{L}\p{N}_.-]/gu, "_");
    return safe || fallback;
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
  const SERIF = '"Times New Roman", Times, serif', SANS = 'Arial, Helvetica, sans-serif';
  const profileByOrnament = {imperial:"classic",baroque:"ceremony",deco:"editorial",academy:"modern",sash:"modern",facet:"modern",tactical:"tactical",rescue:"tactical",techpro:"tactical",editorial:"editorial",medallion:"ceremony",folio:"classic",regalia:"ceremony",guilloche:"classic",rosette:"ceremony",venetian:"ceremony",renaissance:"classic",laurelSeal:"ceremony",engraved:"classic",cameo:"ceremony",lattice:"editorial",fanDeco:"editorial",pearl:"classic",ribbonSeal:"ceremony",aurora:"modern",prism:"modern",horizon:"modern",origami:"modern",monolith:"modern",ascent:"modern",folioModern:"editorial",spectrum:"modern",arcadia:"editorial",bridge:"modern",ripple:"modern",minimalLux:"editorial",command:"tactical",fieldMap:"tactical",radar:"tactical",signal:"tactical",compass:"tactical",trace:"tactical",hexTech:"tactical",shieldPro:"tactical",pulse:"tactical",gridPro:"tactical",mountain:"tactical",current:"modern"};
  function layoutProfile(theme = themePalettes[selectedTheme], ornament = $("ornamentStyle").value) {
    const type = theme?.profile || profileByOrnament[ornament] ||
      (theme?.category === "Professionali" || ["network","grid","tiles","steps","stripes","sideband","diagonal","lines"].includes(ornament) ? "modern" :
        theme?.category === "Eleganti" || ["laurel","filigree","crown","arch","diamonds"].includes(ornament) ? "ceremony" :
        theme?.category === "Natura e K9" ? "tactical" : theme?.category === "Creativi" ? "editorial" : "classic");
    const profiles = {
      classic:{title:SERIF,name:SERIF,body:SERIF,scale:1,nameScale:1,course:SERIF,dy:0,rule:1},
      ceremony:{title:SERIF,name:SERIF,body:SERIF,scale:1.08,nameScale:1.05,course:SERIF,dy:-8,rule:1.1},
      modern:{title:SANS,name:SANS,body:SANS,scale:.93,nameScale:.94,course:SANS,dy:3,rule:.72},
      tactical:{title:SANS,name:SANS,body:SANS,scale:.96,nameScale:.98,course:SANS,dy:0,rule:.9},
      editorial:{title:SERIF,name:SANS,body:SERIF,scale:1.04,nameScale:.94,course:SANS,dy:-4,rule:.55}
    };
    return profiles[type] || profiles.classic;
  }
  Object.assign(profileByOrnament, {"signet": "ceremony", "silk": "ceremony", "archivist": "classic", "rational": "modern", "brocade": "ceremony", "sundial": "classic", "inlay": "editorial", "emboss": "classic", "botanical": "ceremony", "bookplate": "classic", "rivet": "tactical", "parallels": "modern", "marquetry": "editorial", "palazzo": "classic", "cadenza": "editorial", "keystone": "classic", "ribbonFold": "ceremony", "folioTab": "editorial", "chevronRail": "tactical", "relay": "tactical", "scanline": "tactical", "ledger": "editorial", "starChart": "classic", "quartz": "modern", "weave": "editorial", "wreathMedal": "ceremony", "folioRail": "editorial"});
  profileByOrnament.aureole = "ceremony";
  Object.assign(profileByOrnament, {"magistraleUHD": "classic", "senatoUHD": "ceremony", "noirUHD": "classic", "atlasUHD": "modern", "dogeUHD": "classic", "vellumUHD": "editorial", "orbitaleUHD": "modern", "sentinelUHD": "tactical", "triageUHD": "tactical", "forenseUHD": "tactical", "heliosUHD": "classic", "mintUHD": "editorial", "spectrumUHD": "modern", "vettaUHD": "tactical", "mareaUHD": "modern", "opaleUHD": "modern", "florealeUHD": "editorial", "palinsestoUHD": "editorial", "incisioneUHD": "classic", "prismaUHD": "editorial", "notarileUHD": "ceremony"});
  Object.assign(profileByOrnament, {"ducalPro": "classic", "silhouettePro": "editorial", "arcTriomphePro": "ceremony", "mosaicPro": "classic", "engravedVinePro": "ceremony", "fleurPro": "classic", "crownRibbonPro": "ceremony", "quillPro": "editorial", "laureatePro": "ceremony", "crestPro": "classic", "terracesPro": "modern", "vectorCutPro": "modern", "foldedPagePro": "editorial", "crescentPro": "editorial", "modularPro": "modern", "contourFieldPro": "tactical", "rescueBandPro": "tactical", "trackRoutePro": "tactical", "sensorPro": "tactical", "coordinateLPro": "tactical", "cedarPro": "ceremony", "tesseraPro": "modern", "lacquerPro": "editorial", "halftonePro": "modern"});
  Object.assign(profileByOrnament, {"sigApex": "tactical", "sigTrail": "tactical", "sigRescue": "tactical", "sigForensic": "tactical", "sigNight": "tactical", "sigAurum": "classic", "sigChateau": "ceremony", "sigLumiere": "editorial", "sigPorcelain": "ceremony", "sigEclipse": "editorial", "sigDiplomat": "classic", "sigAlma": "classic", "sigMonograph": "editorial", "sigHelix": "modern", "sigMarble": "editorial", "sigHorizon": "modern"});
  const signatureThemeIds = new Set(["sigApex", "sigTrail", "sigRescue", "sigForensic", "sigNight", "sigAurum", "sigChateau", "sigLumiere", "sigPorcelain", "sigEclipse", "sigDiplomat", "sigAlma", "sigMonograph", "sigHelix", "sigMarble", "sigHorizon"]);
  const specialK9Ids = new Set(["k9mt01", "k9mt02", "k9mt03", "k9mt04", "k9mt05", "k9mt06", "k9mt07", "k9mt08", "k9mt09", "k9mt10", "k9mt11", "k9mt12", "k9mt13", "k9mt14", "k9mt15", "k9mt16", "k9mt17", "k9mt18", "k9mt19", "k9mt20", "k9mt21", "k9mt22", "k9mt23", "k9mt24", "k9mt25", "k9mt26", "k9mt27", "k9mt28", "k9mt29", "k9mt30", "k9hr01", "k9hr02", "k9hr03", "k9hr04", "k9hr05", "k9hr06", "k9hr07", "k9hr08", "k9hr09", "k9hr10", "k9hr11", "k9hr12", "k9hr13", "k9hr14", "k9hr15", "k9hr16", "k9hr17", "k9hr18", "k9hr19", "k9hr20", "k9hr21", "k9hr22", "k9hr23", "k9hr24", "k9hr25", "k9hr26", "k9hr27", "k9hr28", "k9hr29", "k9hr30", "k9dt01", "k9dt02", "k9dt03", "k9dt04", "k9dt05", "k9dt06", "k9dt07", "k9dt08", "k9dt09", "k9dt10", "k9dt11", "k9dt12", "k9dt13", "k9dt14", "k9dt15", "k9dt16", "k9dt17", "k9dt18", "k9dt19", "k9dt20", "k9dt21", "k9dt22", "k9dt23", "k9dt24", "k9dt25", "k9dt26", "k9dt27", "k9dt28", "k9dt29", "k9dt30", "k9ds01", "k9ds02", "k9ds03", "k9ds04", "k9ds05", "k9ds06", "k9ds07", "k9ds08", "k9ds09", "k9ds10", "k9ds11", "k9ds12", "k9ds13", "k9ds14", "k9ds15", "k9ds16", "k9ds17", "k9ds18", "k9ds19", "k9ds20", "k9ds21", "k9ds22", "k9ds23", "k9ds24", "k9ds25", "k9ds26", "k9ds27", "k9ds28", "k9ds29", "k9ds30"]);
  Object.assign(profileByOrnament, {"k9mt01": "tactical", "k9mt02": "tactical", "k9mt03": "ceremony", "k9mt04": "tactical", "k9mt05": "tactical", "k9mt06": "ceremony", "k9mt07": "tactical", "k9mt08": "tactical", "k9mt09": "editorial", "k9mt10": "tactical", "k9mt11": "tactical", "k9mt12": "ceremony", "k9mt13": "editorial", "k9mt14": "ceremony", "k9mt15": "ceremony", "k9mt16": "tactical", "k9mt17": "tactical", "k9mt18": "tactical", "k9mt19": "tactical", "k9mt20": "tactical", "k9mt21": "editorial", "k9mt22": "tactical", "k9mt23": "ceremony", "k9mt24": "tactical", "k9mt25": "editorial", "k9mt26": "tactical", "k9mt27": "ceremony", "k9mt28": "tactical", "k9mt29": "tactical", "k9mt30": "ceremony", "k9hr01": "tactical", "k9hr02": "tactical", "k9hr03": "ceremony", "k9hr04": "tactical", "k9hr05": "tactical", "k9hr06": "ceremony", "k9hr07": "tactical", "k9hr08": "tactical", "k9hr09": "editorial", "k9hr10": "tactical", "k9hr11": "tactical", "k9hr12": "ceremony", "k9hr13": "editorial", "k9hr14": "ceremony", "k9hr15": "ceremony", "k9hr16": "tactical", "k9hr17": "tactical", "k9hr18": "tactical", "k9hr19": "tactical", "k9hr20": "tactical", "k9hr21": "editorial", "k9hr22": "tactical", "k9hr23": "ceremony", "k9hr24": "tactical", "k9hr25": "editorial", "k9hr26": "tactical", "k9hr27": "ceremony", "k9hr28": "tactical", "k9hr29": "tactical", "k9hr30": "ceremony", "k9dt01": "tactical", "k9dt02": "tactical", "k9dt03": "ceremony", "k9dt04": "tactical", "k9dt05": "tactical", "k9dt06": "ceremony", "k9dt07": "tactical", "k9dt08": "tactical", "k9dt09": "editorial", "k9dt10": "tactical", "k9dt11": "tactical", "k9dt12": "ceremony", "k9dt13": "editorial", "k9dt14": "ceremony", "k9dt15": "ceremony", "k9dt16": "tactical", "k9dt17": "tactical", "k9dt18": "tactical", "k9dt19": "tactical", "k9dt20": "tactical", "k9dt21": "editorial", "k9dt22": "tactical", "k9dt23": "ceremony", "k9dt24": "tactical", "k9dt25": "editorial", "k9dt26": "tactical", "k9dt27": "ceremony", "k9dt28": "tactical", "k9dt29": "tactical", "k9dt30": "ceremony", "k9ds01": "modern", "k9ds02": "modern", "k9ds03": "ceremony", "k9ds04": "modern", "k9ds05": "modern", "k9ds06": "ceremony", "k9ds07": "modern", "k9ds08": "modern", "k9ds09": "editorial", "k9ds10": "modern", "k9ds11": "modern", "k9ds12": "ceremony", "k9ds13": "editorial", "k9ds14": "ceremony", "k9ds15": "ceremony", "k9ds16": "modern", "k9ds17": "modern", "k9ds18": "modern", "k9ds19": "modern", "k9ds20": "modern", "k9ds21": "editorial", "k9ds22": "modern", "k9ds23": "ceremony", "k9ds24": "modern", "k9ds25": "editorial", "k9ds26": "modern", "k9ds27": "ceremony", "k9ds28": "modern", "k9ds29": "modern", "k9ds30": "ceremony"});
  const professionalOrnaments = new Set(Object.keys(profileByOrnament));


  // Catalogo locale: nessun asset esterno e nessun progetto creato automaticamente.
  // Ogni anteprima applica lo stile solo con un tocco esplicito dell'utente.
  // Tassonomia esclusiva: una sola posizione per tema, senza modificare i suoi ID o la grafica.
  const gallerySections = [
    {label:"Discipline cinofile",groups:[
      {name:"Mantrailing",families:["Tattici e operativi","Cartografia e tracciamento","Percorsi e territorio","Cerimoniali e di merito"]},
      {name:"HRDD",families:["Rilievo e griglie forensi","Stratigrafia e terreno","Documentazione e repertazione","Distinzione specialistica"]},
      {name:"Detection",families:["Tattici e risposta al segnale","Sensori e precisione","Flussi e analisi olfattiva","Cerimoniali e di merito"]},
      {name:"Dogsitter",families:["Botanici e naturali","Impronte e passeggiate","Moderni e accoglienti","Eleganti e di merito"]},
      {name:"K9 tattici generali"},{name:"SAR · ricerca e soccorso"}
    ]},
    {label:"Collezioni grafiche generali",groups:[{name:"Premium"},{name:"Professionali"},{name:"Cerimoniali"},{name:"Accademici"},{name:"Eleganti"},{name:"Creativi"},{name:"Natura"},{name:"Classici"}]}
  ];
  // Assegnazioni curate sulla base delle decorazioni, non dei soli colori o del nome commerciale.
  const disciplineFamilies={
    Mantrailing:{prefix:"k9mt",sets:[[1,2,4,7,10,11,18,26,29],[5,8,17,19,20,21,28],[9,13,16,24,25],[3,6,12,14,15,22,23,27,30]],legacy:[["sigNight"],["trace","trackRoute","sigTrail"],["contourField"],[]]},
    HRDD:{prefix:"k9hr",sets:[[1,3,5,8,12,15,17,19,21,26,28],[4,9,16,24,25],[2,6,10,13,18,20,23],[7,11,14,22,27,29,30]],legacy:[["coordinateL"],["sigForensic","scanline"],["forense"],[]]},
    Detection:{prefix:"k9dt",sets:[[1,7,10,18,22,29],[2,3,5,8,11,13,15,17,19,20,26,28],[4,9,12,14,16,21,24,25],[6,23,27,30]],legacy:[["detectionPro"],["radar","sensor","hexTech"],["pulse"],[]]},
    Dogsitter:{prefix:"k9ds",sets:[[1,4,7,10,11,12,14,16,19,28],[3,9,18,20,25],[8,13,17,21,24,26],[2,5,6,15,22,23,27,29,30]],legacy:[[],[],[],[]]}
  };
  const curatedGalleryPaths=new Map();
  for(const [group,config] of Object.entries(disciplineFamilies)){
    const definition=gallerySections[0].groups.find(g=>g.name===group);
    config.sets.forEach((ids,i)=>{
      for(const id of [...ids.map(n=>config.prefix+String(n).padStart(2,"0")),...config.legacy[i]]){
        if(curatedGalleryPaths.has(id))throw Error("Tema duplicato nella tassonomia: "+id);
        curatedGalleryPaths.set(id,{group,family:definition.families[i]});
      }
    });
  }
  const sarThemeIds=new Set(["sarRescue","fieldMap","compass","relay","triage","rescueBand","sigRescue"]);
  const natureThemeIds=new Set(["earth","sand","mountain","current","botanical","vettaCivica","marea","cedar"]);
  function galleryPath(id,theme){
    if(curatedGalleryPaths.has(id))return curatedGalleryPaths.get(id);
    if(sarThemeIds.has(id))return {group:"SAR · ricerca e soccorso",family:""};
    if(natureThemeIds.has(id))return {group:"Natura",family:""};
    if(theme.category==="K9 operativo"||theme.category==="Natura e K9")return {group:"K9 tattici generali",family:""};
    return {group:theme.category==="Base"?"Classici":theme.category,family:""};
  }
  const galleryGroup=(id,theme)=>galleryPath(id,theme).group;
  const premiumFrameCatalog = Array.isArray(window.K9PremiumFrames?.catalog) ? window.K9PremiumFrames.catalog : [];
  const premiumFrames = [["none","Senza cornice"], ...premiumFrameCatalog.map(item => [item.id, item.label])];
  const frameKeys=new Set([...premiumFrames.map(([id])=>id),PERSONAL_FRAME]);
  // La selezione della cornice non è derivata dal tema, nemmeno in migrazione.
  function filteredFrameEntries(){
    const group=$("frameDiscipline").value, collection=$("frameCollection").value;
    return premiumFrameCatalog.filter(item=>item.group===group && (collection==="all" || (collection==="duo"?!!item.a4Block:!item.a4Block)));
  }
  function populateFrameOptions(current=$("frameStyle").value || "none"){
    const select=$("frameStyle"), items=filteredFrameEntries();
    select.replaceChildren(new Option("Senza cornice","none"));
    if(state.personalFrameImage)select.add(new Option("Personale · "+state.personalFrameName,PERSONAL_FRAME));
    const active=frameCatalogItem(current);
    if(active&&!items.some(item=>item.id===current))select.add(new Option("Attiva · "+active.label,current));
    for(const item of items)select.add(new Option(item.label,item.id));
    select.value=frameKeys.has(current)?current:"none";
    if(select.selectedIndex<0)select.value="none";
  }
  function selectFrameValue(id){
    const item=frameCatalogItem(id);
    if(item){$("frameDiscipline").value=item.group;const collection=$("frameCollection");if(collection.value!=="all" && (collection.value==="duo")!==!!item.a4Block)collection.value=item.a4Block?"duo":"legacy";}
    populateFrameOptions(id);
  }
  function migrateLayers(form,themeId){
    const f={...form};
    // Recupera l'ID foto dalle vecchie versioni, ma rispetta sempre un'esplicita rimozione.
    if(!Object.hasOwn(f,"themeBackgroundId") || f.themeBackgroundId==="" || f.themeBackgroundId==null){
      const ornament=f.ornamentStyle;
      f.themeBackgroundId=specialK9Ids.has(ornament)?ornament:themePalettes[themeId]?themeId:"none";
    }
    if(f.themeBackgroundId!=="none"&&!themePalettes[f.themeBackgroundId]){
      f.themeBackgroundId=specialK9Ids.has(f.ornamentStyle)?f.ornamentStyle:themePalettes[themeId]?themeId:"none";
    }
    // Le cornici storiche non esistono più: nessuna cornice automatica.
    if(!frameKeys.has(f.frameStyle))f.frameStyle="none";
    f.frameOpacity=normalizeThemeOpacity(f.frameOpacity);
    return f;
  }
  const activeBackgroundId=()=>$("themeBackgroundId").value;
  function syncLayerControls(){
    const id=activeBackgroundId();
    $("backgroundThemeName").textContent=themePalettes[id]?.label||"Nessuno";
    $("removeThemeBackground").disabled=id==="none";
    $("removeFrame").disabled=$("frameStyle").value==="none";
    syncFrameOpacity();
    applyThemeBackgroundLockUI();
    applyFrameLockUI();
  }
  const normalizeThemeSearch=value=>String(value||"").normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase("it").trim();
  populateFrameOptions();

  // 4.9.4: separate, local photo layer. Each disciplinary theme retains its own
  // identifier and existing frame; opacity never affects the structural artwork.
  const photoAssets=window.K9_REALISTIC_VERSION==="4.9.4" ? (window.K9RealisticBackgrounds||{}) : {};
  const photoDecoded=new Map(), photoPending=new Map(), photoLayers=new Map(), photoRefreshPending=new Set(), photoFailures=new Set();
  for(const id of specialK9Ids){if(photoAssets[id])themePalettes[id].detail+=' · fondale similreale';}
  const photoKeyFor=ornament=>specialK9Ids.has(ornament)?ornament:null;
  function ensurePhoto(id){
    if(!id)return Promise.resolve(null);
    if(photoDecoded.has(id)){const image=photoDecoded.get(id);photoDecoded.delete(id);photoDecoded.set(id,image);return Promise.resolve(image);}
    if(photoPending.has(id))return photoPending.get(id);
    if(!photoAssets[id])return Promise.reject(new Error('Fondale non disponibile: verifica js/realistic-backgrounds.js e aggiorna l’app.'));
    const task=new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>{
        if(!image.naturalWidth||!image.naturalHeight){reject(new Error('Fondale non valido'));return;}
        photoDecoded.set(id,image);
        while(photoDecoded.size>18){const current=photoKeyFor(activeBackgroundId());const key=[...photoDecoded.keys()].find(k=>k!==current&&k!==id);if(!key)break;photoDecoded.delete(key);}
        resolve(image);
      };image.onerror=()=>reject(new Error('Impossibile caricare il fondale del tema'));image.src=photoAssets[id];
    }).finally(()=>photoPending.delete(id));
    photoPending.set(id,task);return task;
  }
  function requestSelectedPhoto(){
    const key=photoKeyFor(activeBackgroundId());
    if(!key||themeBackgroundAlpha()===0||photoDecoded.has(key)||photoRefreshPending.has(key)||photoFailures.has(key))return;
    photoRefreshPending.add(key);
    ensurePhoto(key).then(()=>{
      if(!state.exporting && photoKeyFor(activeBackgroundId())===key && themeBackgroundAlpha()>0)render({visualOnly:true});
    }).catch(error=>{
      photoFailures.add(key);
      if(photoKeyFor(activeBackgroundId())===key)setStatus(error.message,'warning');
    }).finally(()=>photoRefreshPending.delete(key));
  }
  const frameRefreshPending=new Set(),frameFailures=new Set();
  function requestSelectedFrame(){
    const id=$("frameStyle").value;
    const library=window.K9PremiumFrames;
    if(id===PERSONAL_FRAME||id==="none"||frameAlpha()===0||!frameKeys.has(id)||!library?.ensure||library.isReady(id)||frameRefreshPending.has(id)||frameFailures.has(id))return;
    frameRefreshPending.add(id);
    library.ensure(id).then(()=>{
      if(!state.exporting && $("frameStyle").value===id)render({visualOnly:true});
    }).catch(error=>{frameFailures.add(id);if($("frameStyle").value===id)setStatus(error.message,"warning");})
      .finally(()=>frameRefreshPending.delete(id));
  }
  async function ensureActivePhoto(){
    const id=photoKeyFor(activeBackgroundId()),frame=$("frameStyle").value;
    const tasks=[];
    if(id&&themeBackgroundAlpha()>0)tasks.push(ensurePhoto(id));
    if(frame===PERSONAL_FRAME && frameAlpha()>0 && !state.personalFrameImage)throw new Error("Cornice personale non disponibile");
    if(frame!==PERSONAL_FRAME&&frame!=="none"&&frameAlpha()>0){
      if(window.K9_FRAME_VERSION!==FRAME_LIBRARY_VERSION||!window.K9PremiumFrames?.ensure)throw new Error("Archivio cornici non aggiornato: riapri l’app online");
      tasks.push(window.K9PremiumFrames.ensure(frame));
    }
    await Promise.all(tasks);
  }
  function photoLayer(id){
    const portrait=H>W,key=(portrait?'P|':'L|')+id;
    if(photoLayers.has(key)){const layer=photoLayers.get(key);photoLayers.delete(key);photoLayers.set(key,layer);return layer;}
    const image=photoDecoded.get(id);if(!image)return null;
    // Moderately sized compositing buffer. The source image is not artificially
    // declared a 600-DPI photograph. The document itself is still drawn at 600 DPI.
    const layer=document.createElement('canvas');layer.width=portrait?720:1018;layer.height=portrait?1018:720;
    const g=layer.getContext('2d');if(!g)return null;
    const w=layer.width,h=layer.height,iw=image.naturalWidth,ih=image.naturalHeight;
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    // Landscape photographs retain their composition. In portrait, landscape
    // scenes occupy a central, feathered field rather than losing the handler.
    const wide=iw/ih>=1.1;
    if(portrait&&wide){const dh=w*ih/iw,dy=(h-dh)/2;g.drawImage(image,0,dy,w,dh);}
    else if(!portrait&&!wide){const dh=h,dw=h*iw/ih;const x=(w-dw)/2;g.drawImage(image,x,0,dw,dh);}
    else {const scale=Math.max(w/iw,h/ih),dw=iw*scale,dh=ih*scale;g.drawImage(image,(w-dw)/2,(h-dh)/2,dw,dh);}
    // Preserve the photograph in the margins and keep the central type area
    // light. No opaque white fill: a user-supplied background remains independent.
    g.globalCompositeOperation='destination-in';
    const x=g.createLinearGradient(0,0,w,0);
    for(const [at,a] of [[0,.82],[.12,.88],[.22,.72],[.34,.34],[.43,.13],[.57,.13],[.66,.34],[.78,.72],[.88,.88],[1,.82]])x.addColorStop(at,`rgba(0,0,0,${a})`);
    g.fillStyle=x;g.fillRect(0,0,w,h);
    const y=g.createLinearGradient(0,0,0,h);
    if(portrait&&wide){const dy=(h-w*ih/iw)/2/h,span=1-2*dy;for(const [at,a] of [[0,0],[Math.max(0,dy),0],[dy+span*.14,.95],[dy+span*.50,1],[dy+span*.84,.9],[Math.min(1,1-dy),0],[1,0]])y.addColorStop(at,`rgba(0,0,0,${a})`);}
    else for(const [at,a] of [[0,.22],[.15,.55],[.32,.96],[.60,1],[.80,.70],[.95,.28],[1,.12]])y.addColorStop(at,`rgba(0,0,0,${a})`);
    g.fillStyle=y;g.fillRect(0,0,w,h);
    // Portrait-origin scenes on horizontal pages receive soft horizontal edges.
    if(!portrait&&!wide){const dw=h*iw/ih,lo=(w-dw)/2/w,hi=1-lo;const edge=g.createLinearGradient(0,0,w,0);for(const [at,a] of [[0,0],[lo,0],[lo+(hi-lo)*.15,1],[hi-(hi-lo)*.15,1],[hi,0],[1,0]])edge.addColorStop(at,`rgba(0,0,0,${a})`);g.fillStyle=edge;g.fillRect(0,0,w,h);}
    g.globalCompositeOperation='source-over';
    photoLayers.set(key,layer);
    while(photoLayers.size>12){
      const active=(currentOrientation()==="portrait"?'P|':'L|')+activeBackgroundId();
      const oldest=[...photoLayers.keys()].find(k=>k!==active&&k!==key);
      if(!oldest)break;
      const old=photoLayers.get(oldest);old.width=1;old.height=1;photoLayers.delete(oldest);
    }
    return layer;
  }
  function drawPhotoBackground(id,alpha){
    if(!id||alpha<=0)return false;
    const layer=photoLayer(id);if(!layer)return false;
    ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(layer,0,0,W,H);ctx.restore();return true;
  }
  const thumbnailCache=new Map();
  function renderCachedThumbnail(canvas,theme,id){
    const key=`${currentOrientation()}|${id}`;
    const cached=thumbnailCache.get(key);
    if(cached){thumbnailCache.delete(key);thumbnailCache.set(key,cached);canvas.width=cached.width;canvas.height=cached.height;canvas.getContext("2d").drawImage(cached,0,0);return;}
    const photoId=photoKeyFor(id);
    if(photoId&&!photoDecoded.has(photoId)&&!photoLayers.has((currentOrientation()==="portrait"?'P|':'L|')+photoId)){
      drawThemeThumbnail(canvas,theme);
      if(!photoFailures.has(photoId)){
        const orientation=currentOrientation();ensurePhoto(photoId).then(()=>{
          if(canvas.isConnected&&currentOrientation()===orientation&&canvas.dataset.themeId===id)renderCachedThumbnail(canvas,theme,id);
        }).catch(error=>{photoFailures.add(photoId);console.warn(error);});
      }return;
    }
    drawThemeThumbnail(canvas,theme);
    const copy=document.createElement("canvas");copy.width=canvas.width;copy.height=canvas.height;copy.getContext("2d").drawImage(canvas,0,0);
    thumbnailCache.set(key,copy);
    if(thumbnailCache.size>32){const oldest=thumbnailCache.keys().next().value;const old=thumbnailCache.get(oldest);old.width=1;old.height=1;thumbnailCache.delete(oldest);}
  }
  let thumbnailObserver=null;
  // La navigazione normale e la ricerca hanno stati separati. Il cambio A4 non chiude i menu.
  const browseGallery={group:"",family:""}, searchGallery={group:"",family:""};
  let previousThemeQuery="";
  function populateThemeGallery() {
    if(thumbnailObserver)thumbnailObserver.disconnect();
    const grid=$("themeGrid"), query=normalizeThemeSearch($("themeSearch").value);
    const tokens=query.split(/\s+/).filter(Boolean);
    const nav=query?searchGallery:browseGallery;
    if(query!==previousThemeQuery){searchGallery.group="";searchGallery.family="";previousThemeQuery=query;}
    const visible=catalogThemes.filter(([id,t])=>{
      const path=galleryPath(id,t),hay=normalizeThemeSearch(`${t.label} ${t.detail} ${path.group} ${path.family}`);
      return tokens.every(token=>hay.includes(token));
    });
    const groups=new Map();
    for(const section of gallerySections)for(const g of section.groups)groups.set(g.name,new Map((g.families||[""]).map(f=>[f,[]])));
    for(const item of visible){const path=galleryPath(...item);groups.get(path.group).get(path.family).push(item);}
    const countGroup=g=>[...groups.get(g).values()].reduce((n,items)=>n+items.length,0);
    const matchingGroups=[...groups.keys()].filter(g=>countGroup(g));
    if(query&&matchingGroups.length===1&&!nav.group){nav.group=matchingGroups[0];const families=[...groups.get(nav.group)].filter(([,items])=>items.length);if(families.length===1)nav.family=families[0][0];}
    const fragment=document.createDocumentFragment();
    thumbnailObserver=typeof IntersectionObserver==="function"?new IntersectionObserver((entries,observer)=>{
      for(const e of entries)if(e.isIntersecting){const c=e.target;observer.unobserve(c);if(c.isConnected){const t=themePalettes[c.dataset.themeId];if(t)renderCachedThumbnail(c,t,c.dataset.themeId);}}
    },{rootMargin:"120px"}):null;
    function clearCards(inner){for(const c of inner.querySelectorAll("canvas")){thumbnailObserver?.unobserve(c);c.width=1;c.height=1;}inner.replaceChildren();}
    function fillCards(inner,items){
      if(inner.childElementCount)return;
      const cards=document.createDocumentFragment();
      for(const [id,t] of [...items].sort((a,b)=>a[1].label.localeCompare(b[1].label,"it"))){
        const button=document.createElement("button");button.type="button";button.className="theme-choice";button.disabled=state.themeBackgroundLocked;button.dataset.theme=id;button.setAttribute("aria-label",`Carica stile ${t.label}, ${t.detail}`);button.setAttribute("aria-pressed",String(activeBackgroundId()===id));if(activeBackgroundId()===id)button.classList.add("selected");
        const preview=document.createElement("canvas");preview.className="theme-preview";preview.dataset.ornament=t.ornament;preview.dataset.frame=t.frame;preview.dataset.themeId=id;preview.style.setProperty("--preset-accent",t.accent);preview.style.setProperty("--preset-ink",t.ink);preview.setAttribute("aria-hidden","true");preview.width=1;preview.height=1;preview.style.aspectRatio=currentOrientation()==="portrait"?"210 / 297":"297 / 210";
        if(thumbnailObserver)thumbnailObserver.observe(preview);else renderCachedThumbnail(preview,t,id);
        const title=document.createElement("strong"),detail=document.createElement("small");title.textContent=t.label;detail.textContent=t.detail.replace(/^(Mantrailing|HRDD|Detection|Dogsitter) · /,"");button.append(preview,title,detail);cards.appendChild(button);
      }inner.appendChild(cards);
    }
    function makeSummary(label,count){const heading=document.createElement("summary"),name=document.createElement("strong"),total=document.createElement("span");name.textContent=label;total.textContent=`${count} temi`;heading.append(name,total);return heading;}
    const controls=[];
    for(const section of gallerySections){
      const sectionCount=section.groups.reduce((n,g)=>n+countGroup(g.name),0);if(!sectionCount)continue;
      const sectionEl=document.createElement("section");sectionEl.className="theme-section";
      const title=document.createElement("h3");title.className="theme-section-title";title.textContent=section.label;
      const sectionTotal=document.createElement("span");sectionTotal.textContent=`${sectionCount} temi`;title.append(sectionTotal);sectionEl.append(title);
      for(const g of section.groups){
        const group=g.name,total=countGroup(group);if(!total)continue;
        const panel=document.createElement("details");panel.className="theme-discipline";panel.dataset.group=group;
        const heading=makeSummary(group,total);panel.append(heading);
        const body=document.createElement("div");body.className="theme-category-body";panel.append(body);
        const families=[];
        for(const [family,items] of groups.get(group)){if(!items.length)continue;
          const inner=document.createElement("div");inner.className="theme-grid theme-group-grid";
          if(family){const sub=document.createElement("details");sub.className="theme-family";sub.dataset.family=family;const subHeading=makeSummary(family,items.length);sub.append(subHeading,inner);body.append(sub);families.push({sub,inner,items,family});
            subHeading.addEventListener("click",event=>{event.preventDefault();const open=!sub.open;nav.family=open?family:"";for(const f of families){f.sub.open=open&&f.sub===sub;if(f.sub.open)fillCards(f.inner,f.items);else clearCards(f.inner);}});
          }else{body.append(inner);families.push({sub:null,inner,items,family});}
        }
        function setOpen(open){panel.open=open;for(const f of families){const show=open&&(!f.sub||f.family===nav.family);if(f.sub)f.sub.open=show;if(show)fillCards(f.inner,f.items);else clearCards(f.inner);}}
        controls.push({group,setOpen});
        heading.addEventListener("click",event=>{event.preventDefault();const open=!panel.open;nav.group=open?group:"";nav.family="";for(const control of controls)control.setOpen(open&&control.group===group);});
        sectionEl.append(panel);
      }
      fragment.append(sectionEl);
    }
    grid.replaceChildren(fragment);
    for(const control of controls)control.setOpen(control.group===nav.group);
    $("themeCount").textContent=`${visible.length} stili su ${catalogThemes.length}`;$("themeEmpty").classList.toggle("hidden",visible.length!==0);
    syncGallerySelection();
    applyThemeBackgroundLockUI();
  }
  function syncGallerySelection(){
    const id=activeBackgroundId(),theme=themePalettes[id],visible=theme&&!archivedThemeIds.has(id);
    const path=visible?galleryPath(id,theme):null;
    $("themePath").textContent=path?[path.group,path.family].filter(Boolean).join(" / "):theme?"Stile storico · compatibile":"Stile personalizzato";
    $("locateTheme").disabled=!path||state.themeBackgroundLocked;
    document.querySelectorAll(".theme-discipline").forEach(panel=>panel.classList.toggle("contains-selected",panel.dataset.group===path?.group));
    document.querySelectorAll(".theme-family").forEach(panel=>panel.classList.toggle("contains-selected",panel.closest(".theme-discipline")?.dataset.group===path?.group&&panel.dataset.family===path?.family));
  }
  function locateSelectedTheme(){
    const id=activeBackgroundId(),theme=themePalettes[id];if(!theme||archivedThemeIds.has(id))return;
    const path=galleryPath(id,theme);$("themeSearch").value="";Object.assign(browseGallery,path);populateThemeGallery();
    const selected=[...$("themeGrid").querySelectorAll(".theme-choice")].find(b=>b.dataset.theme===id);
    if(selected)selected.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
  }

  async function applyCatalogTheme(id) {
    if (state.themeBackgroundLocked) { setStatus("Sfondo bloccato", "warning"); return; }
    const theme = themePalettes[id];
    if (!theme) return;
    const photo=photoKeyFor(id);
    if(photo){photoFailures.delete(photo);await ensurePhoto(photo);}
    if(state.themeBackgroundLocked)return;
    selectedTheme = id;
    $("accentColor").value = theme.accent;
    $("inkColor").value = theme.ink;
    $("themeBackgroundId").value = id;
    $("ornamentStyle").value = theme.ornament;
    syncDesignUI(); saveSettings(); render();
    setStatus(`Stile «${theme.label}» caricato nel progetto`);
  }

  function syncDesignUI() {
    document.querySelectorAll(".theme-choice").forEach(btn => {
      const chosen = btn.dataset.theme === activeBackgroundId();
      btn.setAttribute("aria-pressed", String(chosen));
      btn.classList.toggle("selected", chosen);
    });
    $("fontScaleValue").value = `${$("fontScale").value}%`;
    syncThemeOpacity();
    $("themeLoaded").textContent = themePalettes[activeBackgroundId()]?.label || "Nessuno";
    syncLayerControls();
    syncGallerySelection();
  }

  function drawThemeThumbnail(preview,theme) {
    const prior={ctx,W,H};
    const portrait=currentOrientation()==="portrait";
    preview.width=portrait?226:320;preview.height=portrait?320:226;
    try {
      ctx=preview.getContext("2d");W=portrait?1190:1683;H=portrait?1683:1190;
      ctx.scale(preview.width/W,preview.height/H);
      ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);
      const id=Object.keys(themePalettes).find(k=>themePalettes[k]===theme);
      drawIndependentBackground(id,1);
      const profile=layoutProfile(theme,theme.ornament);
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle=theme.accent;ctx.font=`700 ${portrait?93:100}px ${profile.title}`;ctx.fillText("ATTESTATO",W/2,H*.32);
      ctx.fillStyle=theme.accent;ctx.font=`700 ${portrait?78:90}px ${profile.name}`;ctx.fillText("NOME COGNOME",W/2,H*.48);
      ctx.fillStyle=theme.ink;
      ctx.globalAlpha=.50;ctx.fillRect(W*.27,H*.56,W*.46,12);ctx.fillRect(W*.34,H*.59,W*.32,9);
      ctx.globalAlpha=1;ctx.fillStyle=theme.accent;ctx.font=`700 52px ${profile.course}`;ctx.fillText(theme.discipline ? `CORSO ${theme.discipline.toUpperCase()}` : "CORSO",W/2,H*.68);
      ctx.fillRect(W*.18,H*.82,W*.22,5);ctx.fillRect(W*.60,H*.82,W*.22,5);
    } finally {ctx=prior.ctx;W=prior.W;H=prior.H;}
  }
  // Fondali e cornici sono livelli indipendenti; nessuna decorazione storica
  // viene più disegnata come bordo. La foto conserva l'opacità originale.
  function drawIndependentBackground(id,alpha){
    if(id==="none"||!id||alpha<=0)return;
    if(photoKeyFor(id)){drawPhotoBackground(id,alpha);return;}
    const t=themePalettes[id];if(!t)return;
    const seed=[...id].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,17);
    ctx.save();ctx.globalAlpha*=alpha;
    const g=ctx.createRadialGradient(W*.5,H*.48,Math.min(W,H)*.13,W*.5,H*.48,Math.max(W,H)*.7);
    g.addColorStop(0,"#ffffff00");g.addColorStop(.7,t.accent+"09");g.addColorStop(1,t.accent+"26");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // Carta colorata e trama discreta, senza bordi incorporati.
    ctx.strokeStyle=t.accent;ctx.lineWidth=1.1;ctx.globalAlpha=alpha*.075;
    for(let i=0;i<19;i++){
      const y=H*(.12+i*.043), shift=(seed%29)-14;
      ctx.beginPath();ctx.moveTo(W*.06,y);
      if(seed%3===0)ctx.bezierCurveTo(W*.20,y-25-shift,W*.26,y+25,W*.36,y-15);
      else if(seed%3===1)ctx.lineTo(W*.32,y+shift);
      else ctx.quadraticCurveTo(W*.18,y-35,W*.32,y+10);
      ctx.stroke();ctx.beginPath();ctx.moveTo(W*.94,H-y);
      ctx.quadraticCurveTo(W*.82,H-y+shift,W*.68,H-y-15);ctx.stroke();
    }
    ctx.restore();
  }
  function drawBase(){
    ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);
    drawIndependentBackground(activeBackgroundId(),themeBackgroundAlpha());
    if(state.backgroundImage){
      const scale=state.backgroundFitScale*(state.backgroundScale/100);
      drawImagePositioned(state.backgroundImage,scale,state.backgroundOpacity/100,state.backgroundX,state.backgroundY);
    }
    drawFrame($("frameStyle").value);
  }
  function personalFrameRect(i,w,h){
    const scale=Math.min(w/i.naturalWidth,h/i.naturalHeight);
    const width=i.naturalWidth*scale,height=i.naturalHeight*scale;
    return [(w-width)/2,(h-height)/2,width,height];
  }
  function drawFrame(style){
    if(style==="none"||frameAlpha()===0||!frameKeys.has(style))return;
    if(style===PERSONAL_FRAME){
      const image=state.personalFrameImage;
      if(!image){if(state.exporting)throw new Error("Cornice personale mancante");return;}
      ctx.save();try{ctx.globalAlpha*=frameAlpha();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(image,...personalFrameRect(image,W,H));}finally{ctx.restore();}return;
    }
    if(window.K9_FRAME_VERSION!==FRAME_LIBRARY_VERSION||!window.K9PremiumFrames){
      const message="Archivio cornici non aggiornato: chiudi e riapri l'app online";
      if(state.exporting)throw new Error(message);
      setStatus(message,"warning");return;
    }
    ctx.save();try{ctx.globalAlpha*=frameAlpha();const ready=window.K9PremiumFrames.draw(ctx,W,H,style);if(!ready&&state.exporting)throw new Error("Cornice non ancora disponibile");}finally{ctx.restore();}
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
    maxWidth = Math.min(maxWidth,themeContentWidth(y,size*1.4));
    const minSize = Math.max(18, Math.round(size * .43));
    size = fitFont(text, maxWidth, size, minSize, family, weight);
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (ctx.measureText(text).width > maxWidth + .5) layoutWarnings.push(`Il testo «${String(text).slice(0, 28)}…» supera lo spazio disponibile.`);
    drawText(text, W / 2, y);
  }

  function drawText(text, x, y, mode = "bold") {
    if (!rasterUnsupportedOnly || !window.K9PDF.canEncode(text)) ctx.fillText(text, x, y);
    if(text){const metric=ctx.measureText(text),size=Number(ctx.font.match(/([\d.]+)px/)?.[1])||24;
      textBounds.push({x:x-metric.width/2,y:y-size*.55,w:metric.width,h:size*1.1});}
    if (pdfTextOps && text) {
      const match = ctx.font.match(/([\d.]+)px/);
      pdfTextOps.push({ text: String(text), x, y, size: match ? Number(match[1]) : 24,
        width: ctx.measureText(text).width, color: ctx.fillStyle,
        font: /(?:Arial|Helvetica|sans-serif)/i.test(ctx.font) ? (/\b(700|800|900|bold)\b/.test(ctx.font) ? "sans-bold" : "sans-regular") : mode === "italic" ? "italic" : /\b(700|800|900|bold)\b/.test(ctx.font) ? "bold" : "regular" });
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
    const family = layoutProfile().body;
    const portrait = currentOrientation() === "portrait";
    const top = portrait ? 815 : 604, bottom = portrait ? 1027 : 704;
    const maxWidth = Math.min(portrait?920:1220,themeContentWidth((top+bottom)/2,bottom-top));
    for (let size = Math.round((portrait ? 32 : 32) * fontRatio()); size >= 17; size--) {
      const font = `500 ${size}px ${family}`;
      const lines = wrapLines(text, maxWidth, font);
      const spacing = size + 8;
      if (!lines.length || (lines.length-1)*spacing+size*1.1 <= bottom-top) return { lines, size, spacing, top, bottom, fits: true };
    }
    const lines = wrapLines(text, maxWidth, `500 18px ${family}`);
    const capacity=Math.max(1,Math.floor((bottom-top-20)/24)+1);
    return { lines:lines.slice(0,capacity), size: 18, spacing: 24, top, bottom, fits: false };
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
    const family = '"Great Vibes", "Snell Roundhand", "Segoe Script", "Brush Script MT", "URW Chancery L", "Apple Chancery", cursive';
    let size = startSize;
    do {
      ctx.font = `italic 500 ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    } while (size > minSize);
    return minSize;
  }

  // La terza firma è facoltativa e appare al centro; due firme restano identiche ai progetti storici.
  function restoreSignatureControls(values = {}) {
    for (const id of signatureControlIds) {
      const input = $(id), value = values[id];
      input.value = String(goodNumber(value === null || value === "" ? undefined : value,
        Number(signatureControlDefaults[id]), Number(input.min), Number(input.max)));
    }
    state.signatureBlockLocked = values.signatureBlockLocked === true;
    syncSignatureControls();
  }

  function syncSignatureControls() {
    for (const id of signatureControlIds) {
      const input=$(id), value = Number(input.value);
      if(id==="signatureBlockScale"){
        const effective=Math.round(signatureGeometry().scale*1000)/10;
        const label=effective+0.05<value?`${percentLabel(effective)} eff. (rich. ${value}%)`:percentLabel(value);
        $(`${id}Value`).value=label;
        input.setAttribute("aria-valuetext",label);
      }else{
        const label=`${value>0?"+":""}${value}%`;
        $(`${id}Value`).value=label;
        input.setAttribute("aria-valuetext",label);
      }
    }
    applySignatureBlockLockUI();
  }

  function applySignatureBlockLockUI() {
    const locked = state.signatureBlockLocked;
    for (const id of [...signatureControlIds, "resetSignatureBlock"]) $(id).disabled = locked;
    const button = $("lockSignatureBlock");
    button.setAttribute("aria-pressed", String(locked));
    button.textContent = locked ? "Sblocca firme" : "Blocca firme";
    button.classList.toggle("is-locked", locked);
  }

  function signatureSlots() {
    const portrait = currentOrientation() === "portrait";
    const left={prefix:"leftSignature",x:portrait?320:375};
    const right={prefix:"signature",x:portrait?870:1309};
    if ($("thirdSignatureMode").value === "off") return [left,right];
    return [{...left,x:W*.205},{prefix:"thirdSignature",x:W*.5},{...right,x:W*.795}];
  }
  function signatureWidth(base) {
    return $("thirdSignatureMode").value === "off" ? base : Math.min(base, W*.25);
  }

  // Spostamenti relativi all'area libera del foglio. Lo zero mantiene esattamente
  // la posizione storica. Coordinate esplicite per anteprima, PNG e testo vettoriale PDF.
  // Same reserved print margins for all new frames (including none).
  function themeSafeArea(){return {left:92,right:92,top:85,bottom:H-85};}
  function themeContentWidth(y, height=70){const safe=themeSafeArea(Math.max(0,(y-height/2)/H),Math.min(1,(y+height/2)/H));return Math.max(W*.54,W-2*Math.max(safe.left,safe.right));}
  function signatureGeometry() {
    const portrait = currentOrientation() === "portrait";
    const requested=Number($("signatureBlockScale").value)/100,slots=signatureSlots(),baseLine=portrait?1530:980;
    const metadataCount=Number($("autoCertificateCode").checked || !!$("certificateCode").value.trim())+Number(!!$("courseHours").value.trim())+Number(!!$("courseOutcome").value);
    const textBottom=portrait?(metadataCount?1270+Math.max(0,metadataCount-1)*31+15:1219):(metadataCount?869:831);
    const safe=themeSafeArea(textBottom/H,.97),baseHalf=signatureWidth(portrait?350:430)/2;
    const halfExtent=Math.max(...slots.map(slot=>Math.abs(slot.x-W/2)))+baseHalf;
    const scale=Math.max(.1,Math.min(requested,(W/2-Math.max(safe.left,safe.right))/halfExtent,(safe.bottom-textBottom-7)/((portrait?101:96)+70)));
    const halfWidth=baseHalf*scale,scaledSlots=slots.map(slot=>({...slot,x:W/2+(slot.x-W/2)*scale}));
    const minX=scaledSlots[0].x-halfWidth,maxX=scaledSlots.at(-1).x+halfWidth;
    const xRatio=Number($("signatureBlockX").value)/100,yRatio=Number($("signatureBlockY").value)/100;
    const dx=xRatio<0?xRatio*Math.max(0,minX-safe.left):xRatio*Math.max(0,W-safe.right-maxX);
    const minLine=textBottom+7+(portrait?101:96)*scale,maxLine=Math.max(minLine,safe.bottom-70*scale);
    const origin=Math.max(minLine,Math.min(maxLine,baseLine));
    const lineY=origin+(yRatio<0?yRatio*Math.max(0,origin-minLine):yRatio*Math.max(0,maxLine-origin));
    return {portrait,scale,lineY,slots:scaledSlots.map(slot=>({...slot,x:slot.x+dx}))};
  }

  function drawSignatureArtwork(centerX, name, prefix, geometry) {
    const mode = $(`${prefix}Mode`).value, image = state[`${prefix}Image`];
    const {portrait, scale, lineY} = geometry;
    const baseWidth = signatureWidth(portrait ? 335 : 405);
    if (mode === "image" && image) {
      const ratio = image.naturalWidth / image.naturalHeight;
      const w = Math.min(baseWidth, (portrait ? 54 : 44) * ratio) * scale;
      const h = w / ratio;
      ctx.drawImage(image, centerX - w / 2, lineY - h - 3*scale, w, h);
    } else if (mode === "auto" && name) {
      const signatureFamily = '"Great Vibes", "Snell Roundhand", "Segoe Script", "Brush Script MT", "URW Chancery L", "Apple Chancery", cursive';
      const sigSize = fitSignatureFont(name, baseWidth, 46, 20) * scale;
      ctx.font = `italic 500 ${sigSize}px ${signatureFamily}`;
      ctx.fillStyle = "#25221d";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, centerX, lineY - 18*scale, baseWidth*scale);
    }
  }

  function drawSignatureLines(geometry) {
    const {portrait,scale,lineY,slots} = geometry;
    const halfWidth = signatureWidth(portrait ? 336 : 430) / 2 * scale;
    for (const {x} of slots) {
      ctx.save();
      ctx.strokeStyle = "rgba(50,45,36,.62)";
      ctx.lineWidth = 1.6*scale;
      ctx.beginPath();
      ctx.moveTo(x - halfWidth, lineY);
      ctx.lineTo(x + halfWidth, lineY);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSignatureBlock(centerX, role, name, geometry) {
    const {portrait,scale,lineY} = geometry;
    const baseWidth = signatureWidth(portrait ? 350 : 412);
    const maxWidth = baseWidth*scale;
    const roleY = lineY - (portrait ? 85 : 80)*scale;
    const printedY = lineY + (portrait ? 50 : 45)*scale;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#55524c";
    const family=layoutProfile().body;
    const roleSize = fitFont(role, baseWidth, 26, 10, family, "700")*scale;
    ctx.font = `700 ${roleSize}px ${family}`;
    if (ctx.measureText(role).width > maxWidth+.5) layoutWarnings.push("Una qualifica firma è troppo lunga.");
    drawText(role, centerX, roleY);
    if (name) {
      const printedFamily = family;
      const printedSize = fitFont(name, baseWidth, 25, 10, printedFamily, "900")*scale;
      ctx.font = `900 ${printedSize}px ${printedFamily}`;
      ctx.fillStyle = "#3d3a35";
      if (ctx.measureText(name).width > maxWidth+.5) layoutWarnings.push("Un nome firmatario è troppo lungo.");
      drawText(name, centerX, printedY);
    }
    ctx.restore();
  }

  function drawTextLayout() {
    textBounds=[];
    const [title, subtitle] = $("documentType").value.split("|");
    const ink = designColor("inkColor", "#26231f");
    // Un solo colore per titolo, nominativo e corso, anche nel livello vettoriale PDF.
    const mainTextColor = designColor("accentColor", "#735a2f");
    const fontAdj = fontRatio();
    const profile=layoutProfile();
    const portrait = currentOrientation() === "portrait";
    // Il verticale ha spaziature dedicate, non è il foglio orizzontale ruotato.
    drawCentered(title, (portrait ? 475 : 370)+profile.dy, Math.min(portrait?95:91,Math.round((portrait ? 78 : 82) * fontAdj*profile.scale)), profile.title, mainTextColor, "700", portrait ? 990 : 1380);
    drawCentered(subtitle, (portrait ? 555 : 438)+profile.dy, Math.min(44,Math.round((portrait ? 39 : 40) * fontAdj)), profile.body, ink, "700", portrait ? 940 : 1260);

    const recipient = $("recipientName").value.trim().toUpperCase();
    const nameY=portrait?730:550, nameWidth=Math.min(portrait?995:1340,themeContentWidth(nameY,110));
    const nameSize=Math.min(portrait?80:77,Math.round((portrait?67:72)*fontAdj*profile.nameScale));
    const fitted=fitFont(recipient,nameWidth,nameSize,Math.min(nameSize,portrait?38:35),profile.name,"700");
    ctx.font=`700 ${fitted}px ${profile.name}`;
    if (recipient && ctx.measureText(recipient).width>nameWidth) {
      let found=false;
      for(let size=portrait?55:41;size>=20;size--){
        const lines=wrapLines(recipient,nameWidth,`700 ${size}px ${profile.name}`);
        if(lines.length<=2 && lines.every(line=>ctx.measureText(line).width<=nameWidth)){
          lines.forEach((line,i)=>drawCentered(line,nameY+(i-(lines.length-1)/2)*(size+3),size,profile.name,mainTextColor,"700",nameWidth));found=true;break;
        }
      }
      if(!found)layoutWarnings.push("Nominativo troppo lungo per lo spazio disponibile.");
    } else drawCentered(recipient,nameY,fitted,profile.name,mainTextColor,"700",nameWidth);

    const body = bodyLayout();
    if (!body.fits) layoutWarnings.push("Testo centrale troppo lungo: riducilo prima di creare il PDF.");
    ctx.font = `500 ${body.size}px ${profile.body}`;
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const bodyStart = (body.top + body.bottom) / 2 - (body.lines.length - 1) * body.spacing / 2;
    body.lines.forEach((line, i) => drawText(line, W / 2, bodyStart + i * body.spacing, "regular"));

    const course=$("courseName").value.trim().toUpperCase(), courseY=portrait?1100:750, courseWidth=Math.min(portrait?990:1280,themeContentWidth(courseY,100));
    const courseSize=Math.min(52,Math.round((portrait?47:48)*fontAdj));
    const courseFit=fitFont(course,courseWidth,courseSize,Math.min(courseSize,29),profile.course,"700");
    ctx.font=`700 ${courseFit}px ${profile.course}`;
    if(course&&ctx.measureText(course).width>courseWidth){
      let found=false;
      for(let size=portrait?38:30;size>=18;size--){
        const lines=wrapLines(course,courseWidth,`700 ${size}px ${profile.course}`);
        if(lines.length<=2 && lines.every(line=>ctx.measureText(line).width<=courseWidth)){lines.forEach((line,i)=>drawCentered(line,courseY+(i-(lines.length-1)/2)*(size+3),size,profile.course,mainTextColor,"700",courseWidth));found=true;break;}
      }
      if(!found)layoutWarnings.push("Titolo del corso troppo lungo: riducilo prima di esportare.");
    }else drawCentered(course,courseY,courseFit,profile.course,mainTextColor,"700",courseWidth);

    const locationDate = [$("place").value.trim(), formatDate($("certificateDate").value)].filter(Boolean).join(" · ");
    drawCentered(locationDate, portrait ? 1200 : 812, Math.round(28 * fontAdj), profile.body, ink, "700", portrait ? 950 : 1160);

    const metadata = [];
    const code = $("certificateCode").value.trim();
    const hours = $("courseHours").value.trim();
    const outcome = $("courseOutcome").value;
    if (code) metadata.push(`Cod. ${code}`);
    if (hours) metadata.push(`Durata: ${hours}`);
    if (outcome) metadata.push(`Esito: ${outcome}`);
    if (metadata.length) {
      if (portrait && metadata.length > 1) {
        metadata.forEach((part, i) => drawCentered(part, 1270 + i * 31, Math.round(22 * fontAdj), profile.body, ink, "700", 990));
      } else {
        drawCentered(metadata.join("   •   "), portrait ? 1270 : 853, Math.round(23 * fontAdj), profile.body, ink, "700", portrait ? 990 : 1320);
      }
    }

    const signatures = signatureGeometry();
    for (const {prefix,x} of signatures.slots) drawSignatureBlock(x, $(`${prefix}Role`).value.trim(), $(`${prefix}Name`).value.trim(), signatures);
    // I loghi e le filigrane possono sovrapporsi intenzionalmente al testo.
    // La posizione scelta dal docente non impedisce l’esportazione.
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
    const signatures = signatureGeometry();
    drawSignatureLines(signatures);
    ctx.save();
    for (const {prefix,x} of signatures.slots) drawSignatureArtwork(x, $(`${prefix}Name`).value.trim(), prefix, signatures);
    ctx.restore();
    drawLogos();
    const portrait=currentOrientation()==="portrait",profile=layoutProfile(),gold=designColor("accentColor","#735a2f");
    ctx.save();
    ctx.strokeStyle = gold;
    ctx.globalAlpha = .55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - (portrait ? 210 : 282)*profile.rule, portrait ? 615 : 482);
    ctx.lineTo(W / 2 + (portrait ? 210 : 282)*profile.rule, portrait ? 615 : 482);
    ctx.stroke();
    ctx.restore();
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

  const GRID_STEP=85; // circa 15 mm, quadrati centrati sul foglio
  function drawPreviewGrid() {
    const step = GRID_STEP;
    ctx.save();
    ctx.strokeStyle = "rgba(23,93,126,.30)";
    ctx.lineWidth = 1;
    for (let x = (W/2)%step; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = (H/2)%step; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(23,93,126,.58)";
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
    ctx.restore();
  }

  function documentProblems() {
    const issues = [...new Set(layoutWarnings)];
    if (!$("recipientName").value.trim()) issues.push("Inserisci il nominativo del corsista");
    if (!$("courseName").value.trim()) issues.push("Inserisci il corso o la qualifica");
    const mismatch = disciplineMismatch();
    if (mismatch) issues.push(mismatch);
    for (const [nameId, side] of [["leftSignatureName", "sinistro"], ["signatureName", "destro"]]) {
      const name = $(nameId).value.trim();
      // Il nome del firmatario è stampato anche con firma impostata su "nessuna".
      if (/^nome\s+cognome$/i.test(name)) issues.push(`Sostituisci «Nome Cognome» nel firmatario ${side} (Modalità completa → Testi e firme)`);
    }
    if ($("thirdSignatureMode").value !== "off" && !$("thirdSignatureName").value.trim()) issues.push("Inserisci il nome del terzo firmatario oppure disattiva la terza firma");
    if ($("autoCertificateCode").checked) {
      try { automaticCode($("recipientName").value); }
      catch(error) {issues.push(error.message);}
    } else if (!$("certificateCode").value.trim()) {
      issues.push("Inserisci il codice identificativo manuale prima di esportare");
    }
    return issues;
  }

  // Una sola anteprima per frame anche durante digitazione e regolazione continua degli slider.
  function queuePreviewRender() {
    if (state.initialized&&!state.exporting&&!recoveryBlocked){dirty=true;++savedRevision;}
    if (pendingPreviewFrame) return;
    pendingPreviewFrame = requestAnimationFrame(() => {
      pendingPreviewFrame = 0;
      render();
    });
  }
  // All range controls share a single update path. Input and change both
  // update the model; the final value is persisted even with keyboard/touch.
  function queueSliderRender(commit=false) {
    if(state.exporting)return;
    invalidateReadyBatch();
    if(commit){clearTimeout(settingsSaveTimer);saveSettings();}
    else deferSettingsSave();
    scheduleAutosave(commit?250:650);
    if(pendingPreviewFrame)return;
    pendingPreviewFrame=requestAnimationFrame(()=>{
      pendingPreviewFrame=0;
      render({visualOnly:true});
    });
  }
  function bindRange(id, allowed, update) {
    const input=$(id);
    const apply=(commit)=>{
      if(!state.initialized||state.exporting||pendingEditorOperations||input.disabled||!allowed())return;
      update(Number(input.value));
      queueSliderRender(commit);
    };
    input.addEventListener("input",()=>apply(false));
    input.addEventListener("change",()=>apply(true));
  }
  function render({visualOnly=false}={}) {
    if (pendingPreviewFrame) { cancelAnimationFrame(pendingPreviewFrame); pendingPreviewFrame = 0; visualOnly=false; }
    if (!state.exporting && !visualOnly) invalidateReadyBatch();
    syncAutomaticCode();
    syncSignatureControls();
    layoutWarnings = [];
    requestSelectedPhoto();
    requestSelectedFrame();
    drawGraphics();
    drawTextLayout();
    if (showGrid) drawPreviewGrid(); // Solo anteprima, mai nel PDF o nel PNG.
    if (showGuides) drawSafetyGuides(); // Solo anteprima, mai nel PDF o nel PNG.
    syncQuickFromEditor();
    if(state.initialized&&quickTemplateKey()!==lastTemplateLookupKey)void refreshQuickTemplateInfo();
    if (state.initialized && !state.exporting && !visualOnly) scheduleAutosave();
  }

  const MAX_IMAGE_PIXELS = 40_000_000; // superiore al foglio A4 a 600 DPI
  const MAX_PROJECT_PIXELS = 100_000_000;
  const imagePixels = image => image ? image.naturalWidth * image.naturalHeight : 0;
  async function checkImageHeader(blob){
    const b=new Uint8Array(await (blob.type==="image/jpeg"?blob:blob.slice(0,32)).arrayBuffer()),v=new DataView(b.buffer);let w=0,h=0;
    if(b.length>=24&&v.getUint32(0)===0x89504e47){w=v.getUint32(16);h=v.getUint32(20);}
    else if(b.length>=25&&v.getUint32(0)===0x52494646&&v.getUint32(8)===0x57454250){
      const kind=String.fromCharCode(...b.subarray(12,16));
      if(kind==="VP8X"&&b.length>=30){w=1+b[24]+256*b[25]+65536*b[26];h=1+b[27]+256*b[28]+65536*b[29];}
      else if(kind==="VP8L"&&b[20]===47){w=1+((b[21]|b[22]<<8)&0x3fff);h=1+(((b[22]>>6)|b[23]<<2|b[24]<<10)&0x3fff);}
      else if(kind==="VP8 "&&b.length>=30&&b[23]===157&&b[24]===1&&b[25]===42){w=v.getUint16(26,true)&0x3fff;h=v.getUint16(28,true)&0x3fff;}
    }else if(b.length>=4&&b[0]===255&&b[1]===216){
      for(let i=2;i+8<b.length;){if(b[i++]!==255)break;while(b[i]===255)i++;const marker=b[i++];if(marker===0xda||marker===0xd9)break;if(marker===1||(marker>=0xd0&&marker<=0xd7))continue;if(i+2>b.length)break;const size=v.getUint16(i);if(size<2||i+size>b.length)break;
        if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&size>=7){h=v.getUint16(i+3);w=v.getUint16(i+5);break;}i+=size;}
    }
    if(w&&h&&w*h>MAX_IMAGE_PIXELS)throw new Error("Immagine troppo grande: massimo 40 megapixel per immagine");
  }
  async function imageFromBlob(blob) {
    if (!(blob instanceof Blob) || !blob.size || blob.size > MAX_IMAGE_MB * 1048576 || !/^image\/(png|jpeg|webp)$/.test(blob.type)) return Promise.reject(new Error("Immagine non valida (PNG, JPG, WEBP; massimo 15 MB)"));
    await checkImageHeader(blob);
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); if (!imagePixels(img) || imagePixels(img)>MAX_IMAGE_PIXELS) reject(new Error("Immagine troppo grande: massimo 40 megapixel per immagine")); else resolve(img); };
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
    pendingEditorOperations++;
    try { const image=await imageFromBlob(file); if(!state.exporting){onLoad(image,file);render();} }
    catch (err) { console.error(err); setStatus(err.message || "Immagine non leggibile"); }
    finally {pendingEditorOperations--;}
  }

  function checkImageBudget(image,replaced=null){
    const total=[state.backgroundImage,state.personalFrameImage,...state.logos.map(l=>l.image),state.leftSignatureImage,state.signatureImage,state.thirdSignatureImage].reduce((n,i)=>n+imagePixels(i),0);
    if(total-imagePixels(replaced)+imagePixels(image)>MAX_PROJECT_PIXELS)throw new Error("Limite immagini del progetto: 100 megapixel complessivi. Riduci una delle immagini prima di caricarla.");
  }
  function personalFrameMessage(image){
    const rect=personalFrameRect(image,W,H);
    return (rect[0]>W*.015||rect[1]>H*.015) ? "Cornice adattata senza deformazioni; restano margini. Per riempire il foglio usa un PNG dello stesso orientamento A4." : "Cornice personale adattata al foglio A4";
  }
  function validatePersonalFrame(image){
    const sample=document.createElement("canvas");sample.width=sample.height=128;
    try{
      const sc=sample.getContext("2d",{willReadFrequently:true});sc.drawImage(image,0,0,128,128);
      const pixels=sc.getImageData(24,24,80,80).data;let transparent=0;
      for(let i=3;i<pixels.length;i+=4)if(pixels[i]<=5)transparent++;
      if(transparent<.90*80*80)throw new Error("Centro troppo opaco: serve un PNG o WebP con almeno il 90% della zona centrale trasparente.");
    }finally{sample.width=sample.height=1;}
  }
  async function importPersonalFrame(file){
    if(!file||state.frameLocked)return;
    // Android can omit a MIME type when the source is a file manager.
    let blob=file;
    if(!blob.type && /\.png$/i.test(file.name||""))blob=new Blob([file],{type:"image/png"});
    if(!blob.type && /\.webp$/i.test(file.name||""))blob=new Blob([file],{type:"image/webp"});
    if(!/^image\/(png|webp)$/.test(blob.type))throw new Error("Seleziona una cornice PNG o WebP con trasparenza");
    const image=await imageFromBlob(blob);
    checkImageBudget(image,state.personalFrameImage);
    // Verifica campione centrale: almeno 90% realmente trasparente (alfa <= 5).
    // Non altera i pixel; i progetti precedenti restano leggibili.
    validatePersonalFrame(image);
    if(state.frameLocked)return;
    state.personalFrameImage=image;state.personalFrameBlob=blob;
    state.personalFrameName=String(file.name||"Cornice personale").slice(0,150);
    populateFrameOptions();$("frameStyle").value=PERSONAL_FRAME;
    syncDesignUI();saveSettings();render();setStatus(personalFrameMessage(image));
  }
  function setBackground(img, blob) {
    checkImageBudget(img,state.backgroundImage);
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
    if (state.logos.length >= MAX_LOGOS) {
      setStatus(`Massimo ${MAX_LOGOS} loghi: rimuovine uno prima di aggiungerne altri`);
      $("logoFile").value = "";
      return;
    }
    checkImageBudget(img);
    const logo = {image:img,blob,scale:100,x:W/2,y:Math.round(H*150/1190),locked:false};
    // Posiziona solo il nuovo logo: non toccare quelli già collocati o bloccati.
    const safe=themeSafeArea(.06,.22),maxHeight=H*.14;
    const ratio=img.naturalHeight/img.naturalWidth;
    logo.scale=Math.max(20,Math.min(100,Math.floor(maxHeight/(180*ratio)*100)));
    const width=180*logo.scale/100,height=width*ratio;
    const left=safe.left+width/2,right=W-safe.right-width/2;
    const top=Math.max(safe.top+height/2,H*.055),bottom=Math.min(H*.235-height/2,H*.22);
    const candidates=[];
    for(const y of [Math.max(top,Math.min(bottom,logo.y)),top,bottom])for(const f of [.5,.23,.77,.05,.95,.35,.65,.12,.88]){
      const x=Math.max(left,Math.min(right,left+(right-left)*f));
      candidates.push({x,y:Math.max(top,Math.min(Math.max(top,bottom),y))});
    }
    const cost=pos=>state.logos.reduce((sum,other)=>{const ow=180*other.scale/100,oh=ow*other.image.naturalHeight/other.image.naturalWidth;
      return sum+Math.max(0,(width+ow)/2+12-Math.abs(pos.x-other.x))*Math.max(0,(height+oh)/2+12-Math.abs(pos.y-other.y));},0);
    const best=candidates.reduce((a,b)=>cost(b)<cost(a)?b:a,candidates[0]);
    if(best){logo.x=best.x;logo.y=best.y;}
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

  async function composePage(includeUnsupported=false) {
    await ensureActivePhoto();
    // Disegno nativo a 600 DPI, senza ingrandire l'anteprima. Testi separati nel PDF.
    const {outputW:outW, outputH:outH} = pageSize();
    const high = document.createElement("canvas");
    const previous = ctx;
    try {
      high.width = outW; high.height = outH;
      ctx = high.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Memoria insufficiente per la grafica a 600 DPI");
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.scale(outW / W, outH / H);
      drawGraphics();
      if(includeUnsupported){rasterUnsupportedOnly=true;try{drawTextLayout();}finally{rasterUnsupportedOnly=false;}}
      ctx = previous;
      const blob = await new Promise((resolve,reject)=>high.toBlob(b=>b&&b.size?resolve(b):reject(new Error("Impossibile creare la grafica a 600 DPI. Chiudi le altre app e riprova.")),"image/jpeg",.98));
      if(blob.type !== "image/jpeg") throw new Error("Formato grafico PDF non disponibile");
      high.width=high.height=1; // rilascia ~133 MiB prima di leggere il JPEG
      return new Uint8Array(await blob.arrayBuffer());
    } finally {
      ctx = previous;
      high.width = 1; high.height = 1;
    }
  }

  function collectPageText(){
    pdfTextOps=[];
    try{
      render();const problems=documentProblems();if(problems.length)throw new Error(problems[0]);
      return pdfTextOps.slice();
    }finally{pdfTextOps=null;}
  }
  async function recordPage(sharedGraphics=null, collected=null){
    const ops=collected||collectPageText();
    const unsupported=ops.some(op=>!window.K9PDF.canEncode(op.text));
    const jpg=unsupported?await composePage(true):sharedGraphics||await composePage();
    const {outputW,outputH}=pageSize();
    return {image:jpg,width:outputW,height:outputH,stageWidth:W,stageHeight:H,orientation:currentOrientation(),texts:ops.filter(op=>window.K9PDF.canEncode(op.text))};
  }

  function invalidateReadyBatch() {
    if (lastBatchUrl) { URL.revokeObjectURL(lastBatchUrl); lastBatchUrl = null; }
    $("readyBatchLink").classList.add("hidden");
    $("readyBatchLink").removeAttribute("href");
    const quickBatch = $("quickReadyBatchLink");
    if (quickBatch) {quickBatch.classList.add("hidden");quickBatch.removeAttribute("href");quickBatch.onclick = null;}
  }

  function offerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function insertPngDpi(blob, dpi = EXPORT_DPI) {
    const src=new Uint8Array(await blob.arrayBuffer());
    const sig=[137,80,78,71,13,10,26,10];
    if (sig.some((x,i)=>src[i]!==x)) throw new Error("PNG non valido");
    const parts=[src.slice(0,8)];
    const u32=(n)=>new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
    const crc32=bytes=>{
      let c=0xffffffff;
      for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^(c&1 ? 0xedb88320 : 0);}
      return (c^0xffffffff)>>>0;
    };
    const ppm=Math.round(dpi / 0.0254);
    const payload=new Uint8Array(13);
    payload.set([112,72,89,115],0);payload.set(u32(ppm),4);payload.set(u32(ppm),8);payload[12]=1;
    const chunk=new Uint8Array(4+payload.length+4);
    chunk.set(u32(9),0);chunk.set(payload,4);chunk.set(u32(crc32(payload)),17);
    let pos=8, inserted=false;
    while(pos+12 <= src.length){
      const len=((src[pos]<<24)|(src[pos+1]<<16)|(src[pos+2]<<8)|src[pos+3])>>>0;
      if(pos+len+12>src.length) throw new Error("PNG danneggiato");
      const type=String.fromCharCode(...src.slice(pos+4,pos+8));
      if(type!=="pHYs") parts.push(src.subarray(pos,pos+len+12));
      if(type==="IHDR"&&!inserted){parts.push(chunk);inserted=true;}
      pos+=len+12;
      if(type==="IEND") break;
    }
    if (!inserted) throw new Error("PNG senza intestazione");
    return new Blob(parts,{type:"image/png"});
  }

  async function downloadPng() {
    if (!beginExport()) return;
    const oldCtx = ctx;
    const oldOps = pdfTextOps;
    let high;
    try {
      await ensureActivePhoto();
      render();
      const problems = documentProblems();
      if (problems.length) throw new Error(problems[0]);
      const code=$("certificateCode").value.trim();
      if (!(await verifyCodes([code]))) {setStatus("Esportazione annullata");return;}
      setStatus("Preparazione PNG 600 DPI…");
      high = document.createElement("canvas");
      const {outputW, outputH} = pageSize();
      high.width = outputW; high.height = outputH;
      ctx = high.getContext("2d", {alpha:false});
      if (!ctx) throw new Error("Memoria insufficiente per il PNG a 600 DPI");
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.scale(high.width/W,high.height/H);
      pdfTextOps = null;
      drawGraphics();
      drawTextLayout();
      if (layoutWarnings.length) throw new Error(layoutWarnings[0]);
      ctx = oldCtx;
      pdfTextOps = oldOps;
      const blob = await new Promise((resolve,reject) => high.toBlob(b=>b ? resolve(b) : reject(new Error("Esportazione PNG non disponibile")), "image/png"));
      high.width=1;high.height=1;
      offerDownload(await insertPngDpi(blob), `${certificateFilename(code, safeFilename())}.png`);
      setStatus("PNG 600 DPI pronto");
      await registerExport([{name:$("recipientName").value.trim(),course:$("courseName").value.trim(),code,certificateDate:$("certificateDate").value,format:"PNG"}]);
    } catch (err) {console.error(err);setStatus(err.message || "Errore PNG");}
    finally {
      ctx = oldCtx;pdfTextOps = oldOps;
      if (high) {high.width=1;high.height=1;}
      endExport();render({visualOnly:true});if(dirty)scheduleAutosave();
    }
  }

  async function downloadPdf() {
    if (!beginExport()) return;
    try {
      await ensureActivePhoto();
      setStatus("Creazione PDF Ultra HD…");
      const ops=collectPageText(),code=$("certificateCode").value.trim();
      if (!(await verifyCodes([code]))) {setStatus("Esportazione annullata");return;}
      const page=await recordPage(null,ops);
      offerDownload(window.K9PDF.create([page]), `${certificateFilename(code, safeFilename())}.pdf`);
      setStatus("PDF A4 Ultra HD creato");
      await registerExport([{name:$("recipientName").value.trim(),course:$("courseName").value.trim(),code,certificateDate:$("certificateDate").value,format:"PDF"}]);
    } catch (err) { console.error(err); setStatus(err.message || "Errore PDF"); }
    finally { endExport(); render({visualOnly:true});if(dirty)scheduleAutosave(); }
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
    if (window.K9PDF?.canEncode && names.some(n => !window.K9PDF.canEncode(n))) notes.push("Alcuni caratteri saranno riprodotti graficamente nel PDF");
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
    const automatic = $("autoCertificateCode").checked;
    if (!beginExport()) return;
    const pages = [];
    let uniqueRasterBytes=0;const seenRasters=new Set();
    try {
      await ensureActivePhoto();
      const repeated = duplicateNames(names);
      if (repeated.length && !confirm(`Sono presenti ${repeated.length} nominativi ripetuti. Continuare?`)) return;
      if (names.length > 1 && !automatic && oldCode.trim() && !confirm("Codice manuale: tutte le pagine avranno lo stesso codice. Continuare?")) return;
      // La grafica delle pagine è identica: la preparo una volta sola.
      // Nominali e codici rimangono testo PDF indipendente per pagina.
      const codes=names.map(name=>automatic ? automaticCode(name) : oldCode.trim());
      const batchFilename=automatic?`K9_${disciplineCode()}_${certificateDateCode()}_corsisti.pdf`:`${certificateFilename(oldCode.trim(),"K9_certificati")}_corsisti.pdf`;
      if(codes.some(code=>!code))throw new Error("Inserisci il codice identificativo manuale prima di esportare");
      const allOps=[];
      for(let i=0;i<names.length;i++){
        $("recipientName").value=names[i];$("certificateCode").value=codes[i];
        try{allOps.push(collectPageText());}catch(err){throw new Error(`Corsista ${i+1} (${names[i]}): ${err.message}`);}
      }
      if (!(await verifyCodes(codes))) {setStatus("Esportazione annullata");return;}
      $("recipientName").value=names[0];$("certificateCode").value=codes[0];
      const sharedGraphics=allOps.some(ops=>ops.every(op=>window.K9PDF.canEncode(op.text)))?await composePage():null;
      for (let i = 0; i < names.length; i++) {
        $("recipientName").value = names[i];
        $("certificateCode").value = codes[i];
        setStatus(`Pagina ${i + 1}/${names.length}`);
        const page=await recordPage(sharedGraphics,allOps[i]);
        if(!seenRasters.has(page.image)){seenRasters.add(page.image);uniqueRasterBytes+=page.image.byteLength;}
        if(uniqueRasterBytes>96*1024*1024)throw new Error("PDF multipagina troppo pesante per un’unica esportazione: dividi l’elenco in gruppi più piccoli. La qualità resta 600 DPI.");
        pages.push(page);
        // Cede il controllo all'interfaccia (soprattutto su smartphone).
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const pdf = window.K9PDF.create(pages);
      invalidateReadyBatch();
      lastBatchUrl = URL.createObjectURL(pdf);
      const ready = $("readyBatchLink");
      ready.href = lastBatchUrl;
      ready.download = batchFilename;
      ready.classList.remove("hidden");
      const quickReady = $("quickReadyBatchLink");
      if (quickReady) {quickReady.href = ready.href;quickReady.download = ready.download;quickReady.classList.remove("hidden");}
      const entries=names.map((name,i)=>({name,course:$("courseName").value.trim(),code:codes[i],certificateDate:$("certificateDate").value,format:"PDF multipagina"}));
      let registered = false;
      const recordOnce = () => {if (!registered) {registered = true;void registerExport(entries).then(ok=>{if(!ok)registered=false;});}};
      ready.onclick = recordOnce;
      if (quickReady) quickReady.onclick = recordOnce;
      setStatus(`PDF pronto: ${names.length} pagine. Tocca Scarica.`);
    } catch (err) { console.error(err); setStatus(`PDF non creato: ${err.message}`); }
    finally {
      try {
        $("recipientName").value = oldName;
        $("certificateCode").value = oldCode;
        // Mantiene valido il link del PDF multipagina già generato.
        render();
      } finally {
        endExport();
        if(dirty)scheduleAutosave();
      }
    }
  }

  $("backgroundFile").addEventListener("change", guardAsync(e => {if(!state.backgroundLocked)return loadImage(e.target.files[0], setBackground);}));
  $("logoFile").addEventListener("change", guardAsync(e => loadImage(e.target.files[0], setLogo)));

  const canAdjustBackground=()=>!!state.backgroundImage&&!state.backgroundLocked;
  bindRange("backgroundOpacity",canAdjustBackground,value=>{
    state.backgroundOpacity=value;$("backgroundOpacityValue").value=percentLabel(value);
  });
  bindRange("backgroundScale",canAdjustBackground,value=>{
    state.backgroundScale=value;$("backgroundScaleValue").value=percentLabel(value);
  });
  for(const [id,axis] of [["backgroundX","X"],["backgroundY","Y"]]){
    bindRange(id,canAdjustBackground,value=>{
      state[`background${axis}`]=value/100*(axis==="X"?W:H);
      $(`${id}Value`).value=percentLabel(value);
    });
  }
  $("fitBackground").addEventListener("click", () => {
    if(state.backgroundLocked)return;
    state.backgroundScale = 100;
    state.backgroundX = W / 2;
    state.backgroundY = H / 2;
    $("backgroundScale").value = 100;
    $("backgroundScaleValue").value = "100%";
    $("backgroundX").value = 50;
    $("backgroundY").value = 50;
    $("backgroundXValue").value = "50%";
    $("backgroundYValue").value = "50%";
    queuePreviewRender();
  });
  $("lockBackground").addEventListener("click", () => {
    state.backgroundLocked = !state.backgroundLocked;
    applyBackgroundLockUI();
    scheduleAutosave();
    setStatus(state.backgroundLocked ? "Sfondo bloccato" : "Sfondo sbloccato");
  });

  $("removeBackground").addEventListener("click", () => {
    if(state.backgroundLocked)return;
    state.backgroundImage = null;
    state.backgroundBlob = null;
    state.backgroundLocked = false;
    $("backgroundFile").value = "";
    $("backgroundTools").classList.add("hidden");
    queuePreviewRender();
  });

  const canAdjustLogo=()=>{const logo=getActiveLogo();return !!logo&&!logo.locked;};
  bindRange("logoScale",canAdjustLogo,value=>{
    getActiveLogo().scale=value;$("logoScaleValue").value=percentLabel(value);
  });
  for(const [id,axis] of [["logoX","x"],["logoY","y"]]){
    bindRange(id,canAdjustLogo,value=>{
      getActiveLogo()[axis]=value/100*(axis==="x"?W:H);
      $(`${id}Value`).value=percentLabel(value);
    });
  }
  $("centerLogo").addEventListener("click", () => {
    const logo = getActiveLogo();
    if (!logo || logo.locked) return;
    logo.x = W / 2;
    logo.y = Math.round(H * 150 / 1190);
    syncLogoControls();
    queuePreviewRender();
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
    queuePreviewRender();
    setStatus(`Logo ${removedNumber} rimosso`);
  });

  $("logoSelector").addEventListener("change", e => {
    state.activeLogoIndex = Number(e.target.value);
    syncLogoControls();
    queuePreviewRender();
  });

  ["documentType", "certificateDate", ...textIds].forEach(id => {
    $(id).addEventListener("input", () => { deferSettingsSave(); queuePreviewRender(); });
    $(id).addEventListener("change", () => { saveSettings(); queuePreviewRender(); });
  });

  $("downloadPdf").addEventListener("click", downloadPdf);

  $("downloadPng").addEventListener("click", downloadPng);
  // Il formato è una proprietà dello STESSO progetto, non un nuovo progetto.
  // Il salvataggio automatico aggiorna l'ID esistente; "Duplica come nuovo"
  // rimane disponibile esclusivamente su richiesta esplicita dell'utente.
  $("pageOrientation").addEventListener("change", event => {
    const requested = event.target.value === "portrait" ? "portrait" : "landscape";
    const previous = W === A4_STAGE.portrait.w ? "portrait" : "landscape";
    if (requested === previous) return;
    setPageOrientation(requested);
    void refreshQuickTemplateInfo();
    saveSettings();
    render(); // Pianifica il salvataggio del lavoro e del progetto già aperto.
    const format = requested === "portrait" ? "verticale" : "orizzontale";
    setStatus(state.currentProjectId
      ? `A4 ${format} impostato nello stesso progetto. Le modifiche vengono salvate automaticamente.`
      : `A4 ${format} impostato. Premi Salva progetto per conservarlo nell'archivio.`);
  });
  $("showGuides").addEventListener("change", e => {
    showGuides = !!e.target.checked;
    try { localStorage.setItem("k9-certificati-guide", String(showGuides)); } catch {}
    render({visualOnly:true});
  });
  $("togglePreviewGrid").addEventListener("click", () => {
    showGrid = !showGrid;
    $("togglePreviewGrid").setAttribute("aria-pressed", String(showGrid));
    $("togglePreviewGrid").textContent = showGrid ? "Griglia attiva" : "Griglia";
    try { localStorage.setItem("k9-certificati-grid", String(showGrid)); } catch {}
    render({visualOnly:true});
  });
  $("openPreview").addEventListener("click", () => {
    const zoomCanvas = $("zoomCanvas");
    zoomCanvas.width = W; zoomCanvas.height = H;
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
      const req = indexedDB.open(DB_NAME, 4);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("history")) req.result.createObjectStore("history", { keyPath: "id" });
        if (!req.result.objectStoreNames.contains("projects")) req.result.createObjectStore("projects", { keyPath: "id" });
        if (!req.result.objectStoreNames.contains("exports")) req.result.createObjectStore("exports", { keyPath: "id" });
        if (!req.result.objectStoreNames.contains("templates")) req.result.createObjectStore("templates", { keyPath: "id" });
      };
      req.onsuccess = () => {const db=req.result;db.onversionchange=()=>{db.close();dbPromise=null;};resolve(db);};
      req.onerror = () => {dbPromise=null;reject(req.error);};
      req.onblocked = () => {dbPromise=null;reject(new Error("Archivio occupato da un'altra scheda"));};
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
  function templateTask(mode, executor) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction("templates", mode), req = executor(tx.objectStore("templates"));
      let result;
      req.onsuccess = () => {result = req.result;};
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error || new Error("Archivio modelli non disponibile"));
    }));
  }
  const getTemplate = id => templateTask("readonly", store => store.get(id));
  const allTemplates = () => templateTask("readonly", store => store.getAll());
  async function putTemplate(value,expectedVersion=undefined){
    const db=await openDb();return new Promise((resolve,reject)=>{
      const tx=db.transaction("templates","readwrite"),store=tx.objectStore("templates");let error=null;
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(error||tx.error||new Error("Modello non salvato"));
      const write=()=>{value.writeToken=newToken();store.put(value);};
      if(expectedVersion===undefined){write();return;}
      const req=store.get(value.id);req.onsuccess=()=>{if(versionOf(req.result)!==expectedVersion){error=new Error("Modello cambiato in un'altra scheda: riapri e verifica prima di sostituirlo.");tx.abort();}else write();};
    });
  }
  function exportTask(mode, fn) {
    return openDb().then(db => new Promise((resolve,reject) => {
      const tx=db.transaction("exports",mode), req=fn(tx.objectStore("exports"));
      let value;
      req.onsuccess=()=>{value=req.result;};
      req.onerror=()=>reject(req.error);
      tx.oncomplete=()=>resolve(value);
      tx.onabort=()=>reject(tx.error || new Error("Registro non disponibile"));
    }));
  }
  const allExports=()=>exportTask("readonly",store=>store.getAll());
  const putExport=entry=>exportTask("readwrite",store=>store.put(entry));
  const clearExports=()=>exportTask("readwrite",store=>store.clear());
  function normalizedCode(value) {return String(value || "").trim().toLocaleLowerCase("it-IT");}
  async function verifyCodes(codes) {
    const valid=codes.map(c=>String(c||"").trim()).filter(Boolean);
    if (!valid.length) return true;
    let records;
    try {records=await allExports();}
    catch (error) {console.warn("Registro locale non disponibile",error);setStatus("Registro non disponibile: verifica i codici manualmente");return true;}
    const used=new Set(records.map(e=>normalizedCode(e.code)).filter(Boolean));
    const collisions=valid.filter(code=>used.has(normalizedCode(code)));
    const internal=valid.filter((c,i)=>valid.findIndex(x=>normalizedCode(x)===normalizedCode(c))!==i);
    if (internal.length && !confirm(`Codici identici nello stesso documento: ${[...new Set(internal)].slice(0,5).join(", ")}. Corsisti con le stesse iniziali possono avere lo stesso codice. Continuare?`)) return false;
    if (collisions.length) return confirm(`${collisions.length} codice/i già presenti nel registro locale: ${collisions.slice(0,3).join(", ")}. Esportare comunque una copia?`);
    return true;
  }
  async function registerExport(records) {
    // Impedisce l'azzeramento durante la registrazione di un PDF multipagina.
    pendingEditorOperations++;
    try {
      await writeArchiveAtomically([],[],records.map(record=>({...record,id:`e_${newToken()}`,exportedAt:new Date().toISOString()})));
      await refreshExports();return true;
    } catch(error) {console.warn("Esportazione avvenuta, ma registrazione non riuscita",error);setStatus("Documento creato, ma registro non aggiornato");return false;}
    finally {pendingEditorOperations--;if(dirty&&!state.exporting)scheduleAutosave();}
  }
  async function refreshExports() {
    const target=$("exportsSummary");if (!target) return;
    try {
      const items=(await allExports()).sort((a,b)=>String(b.exportedAt).localeCompare(String(a.exportedAt)));
      target.textContent=items.length ? `${items.length} esportazioni registrate su questo dispositivo` : "Nessuna esportazione registrata";
      const list=$("exportsList"); list.replaceChildren();
      for (const item of items.slice(0,8)) {
        const li=document.createElement("li");
        li.textContent=`${new Date(item.exportedAt).toLocaleDateString("it-IT")} · ${item.name || "Senza nome"} · ${item.code || "Senza codice"}`;
        list.appendChild(li);
      }
    } catch(error) {target.textContent="Registro non disponibile su questo dispositivo";}
  }
  async function exportRegistryCSV() {
    try {
      const items=await allExports();
      if (!items.length) {setStatus("Nessuna esportazione da registrare");return;}
      const esc=v=>{let t=String(v??"");if (/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(t)) t="'"+t;return `"${t.replace(/"/g,'""')}"`;};
      const header=["Data esportazione","Corsista","Corso","Codice","Data attestato","Formato"];
      const lines=[header.map(esc).join(";")];
      items.sort((a,b)=>String(a.exportedAt).localeCompare(String(b.exportedAt))).forEach(item=>{
        lines.push([item.exportedAt,item.name,item.course,item.code,item.certificateDate,item.format].map(esc).join(";"));
      });
      offerDownload(new Blob(["\uFEFF",lines.join("\r\n")],{type:"text/csv;charset=utf-8"}),`K9_registro_esportazioni_${todayISO()}.csv`);
      setStatus("Registro CSV esportato: contiene dati personali");
    } catch(error) {console.error(error);setStatus("Impossibile esportare il registro");}
  }
  $("exportRegistry").addEventListener("click",exportRegistryCSV);
  async function clearRegistry() {
    if (!state.initialized || state.exporting || pendingEditorOperations) {
      setStatus("Completa prima l'operazione in corso");return;
    }
    const button=$("clearRegistry");
    if (button.disabled) return;
    if (!confirm("Azzerare definitivamente tutte le esportazioni registrate su questo dispositivo? I progetti, i modelli, i PDF e i PNG già scaricati resteranno invariati. Anche lo storico dei codici già utilizzati sarà cancellato. Continuare?")) return;
    button.disabled=true;
    pendingEditorOperations++;
    try {
      // Cancella esclusivamente lo store del registro, non l'intero database.
      await clearExports();
      await refreshExports();
      setStatus("Registro esportazioni azzerato");
    } catch(error) {
      console.error("Azzeramento registro non riuscito",error);
      setStatus("Impossibile azzerare il registro esportazioni","warning");
    } finally {
      pendingEditorOperations--;
      button.disabled=false;if(dirty)scheduleAutosave();
    }
  }
  $("clearRegistry").addEventListener("click",clearRegistry);

  function snapshot(id = "__workspace__", name = "") {
    const form = {};
    formIds.forEach(key => form[key] = $(key).value);
    form.signatureBlockLocked = state.signatureBlockLocked;
    form.themeBackgroundLocked = state.themeBackgroundLocked;
    form.frameLocked = state.frameLocked;
    return {
      version: 2, id, name, updatedAt: new Date().toISOString(), form,
      designTheme: selectedTheme,
      importSourceKey:state.importSourceKey,
      personalFrame: state.personalFrameBlob ? {blob:state.personalFrameBlob,name:state.personalFrameName} : null,
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
      thirdSignature: state.thirdSignatureBlob,
      workingName: $("projectName").value,
      currentProjectId: state.currentProjectId,
      rosterText: $("batchNames").value,
      autoCertificateCode: $("autoCertificateCode").checked
    };
  }

  async function persistCurrentSnapshot() {
    clearTimeout(autosaveTimer);
    if (!state.initialized || state.exporting || recoveryBlocked) return false;
    const revision=++savedRevision;
    if(pendingPreviewFrame){cancelAnimationFrame(pendingPreviewFrame);pendingPreviewFrame=0;render({visualOnly:true});}
    const workspace=snapshot();
    const projectId=state.currentProjectId;
    const projectName=$("projectName").value.trim() || lastSavedProjectName || "Progetto";
    const entries=[workspace,...(projectId?[{...workspace,id:projectId,name:projectName,workingName:projectName,currentProjectId:projectId}]:[])];
    // Legge le versioni attese quando il turno della scrittura inizia, dopo le scritture di questa scheda.
    const changed=dirty;
    const write=activeWrites.catch(()=>{}).then(()=>writeCurrentProjects(entries,new Set(),changed));
    activeWrites=write;
    try {
      await write;
      if (revision===savedRevision) {
        dirty=false;
        if(projectId){
          const option=Array.from($("projectSelector").options).find(o=>o.value===projectId);
          const label=`${projectName} · ${workspace.form.pageOrientation==="portrait"?"A4 verticale":"A4 orizzontale"}`;
          if(option)option.textContent=label;else await refreshProjectList().catch(console.warn);
          lastSavedProjectName=projectName;
        }
        setSaveIndicator(`${projectId ? "Progetto e lavoro" : "Lavoro"} salvati alle ${localClock()}`);
      }
      return true;
    } catch(err) {
      console.warn("Autosave:",err);
      setSaveIndicator("Salvataggio non riuscito", "error");
      setStatus(err.message || "Memoria non disponibile: esporta backup JSON", "warning");
      return false;
    }
  }
  async function requireSaved() {
    if (!await persistCurrentSnapshot()) throw new Error(recoveryBlocked ? "Recupero incompleto: salva un backup e riapri l'app prima di cambiare progetto." : "Salvataggio non riuscito: il progetto corrente non verrà sostituito. Esporta un backup JSON.");
  }
  function scheduleAutosave(delay=250) {
    if (!state.initialized || state.exporting || recoveryBlocked) return;
    dirty=true;
    ++savedRevision; // un nuovo input non può essere marcato salvato da una scrittura precedente
    setSaveIndicator(state.currentProjectId ? "Salvataggio progetto…" : "Salvataggio lavoro…", "saving");
    clearTimeout(autosaveTimer);
    if (!pendingEditorOperations) autosaveTimer=setTimeout(()=>{void persistCurrentSnapshot();},Number.isFinite(delay)?delay:250);
  }
  function flushPendingSave() {
    if (!state.initialized || state.exporting || pendingEditorOperations || recoveryBlocked || (!dirty && !pendingPreviewFrame)) return;
    clearTimeout(settingsSaveTimer);saveSettings();
    void persistCurrentSnapshot();
  }
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flushPendingSave();});
  window.addEventListener("pagehide",flushPendingSave);
  window.addEventListener("beforeunload",event=>{if(dirty && !state.exporting){flushPendingSave();event.preventDefault();event.returnValue="";}});
  function goodNumber(value, fallback, min, max) {
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  }

  async function prepareSnapshot(data) {
    if (!data || data.version !== 2 || !data.form || typeof data.form!=="object" || Array.isArray(data.form) || !Array.isArray(data.logos)) throw new Error("Backup non valido");
    if (data.logos.length > MAX_LOGOS) throw new Error(`Troppi loghi nel progetto: massimo ${MAX_LOGOS}`);
    let pixels=0;
    const decode=async blob=>{const image=await imageFromBlob(blob);pixels+=imagePixels(image);if(pixels>MAX_PROJECT_PIXELS)throw new Error("Le immagini del progetto superano il limite di memoria (100 megapixel complessivi)");return image;};
    const background=data.background ? await decode(data.background.blob) : null;
    const personalFrame=data.personalFrame ? await decode(data.personalFrame.blob) : null;
    if(data.form.frameStyle===PERSONAL_FRAME && !personalFrame)throw new Error("Cornice personale mancante nel progetto");
    const logos=[];
    for(const entry of data.logos){if(!entry || typeof entry!=="object")throw new Error("Logo non valido");logos.push(await decode(entry.blob));}
    const signatures={};
    for(const key of ["leftSignature","rightSignature","thirdSignature"]) signatures[key]=data[key]==null?null:await decode(data[key]);
    return {background,logos,signatures,personalFrame};
  }
  async function restoreSnapshot(data, prepared=null) {
    const assets=prepared || await prepareSnapshot(data); // nessuna mutazione dell'editor prima della verifica completa
    const wasInitialized=state.initialized;
    state.initialized=false;clearTimeout(autosaveTimer);
    try {
      setPageOrientation(data.form.pageOrientation,false);
      selectedTheme=data.designTheme === "custom" ? "custom" : themePalettes[data.designTheme] ? data.designTheme : "classic";
      const theme=themePalettes[selectedTheme] || themePalettes.classic;
      const migrated=migrateLayers(data.form,data.designTheme);
      const fallback={...defaults,certificateDate:todayISO(),leftSignatureMode:"auto",signatureMode:"auto",thirdSignatureMode:"off",accentColor:theme.accent,inkColor:theme.ink,frameStyle:"none",ornamentStyle:theme.ornament,fontScale:"100",...signatureControlDefaults};
      state.personalFrameImage=assets.personalFrame||null;
      state.personalFrameBlob=assets.personalFrame?data.personalFrame.blob:null;
      state.personalFrameName=assets.personalFrame?String(data.personalFrame.name||"Cornice personale").slice(0,150):"";
      populateFrameOptions();
      for(const id of formIds){
        const field=$(id), savedValue=migrated[id];
        const value=typeof savedValue==="string" || (field.type==="range"&&typeof savedValue==="number"&&Number.isFinite(savedValue))?String(savedValue):String(fallback[id]??"");
        if(id==="frameStyle"){selectFrameValue(value);continue;}
        field.value=["themeBackgroundOpacity","frameOpacity"].includes(id)?normalizeThemeOpacity(value):value;
        if(field.tagName==="SELECT" && field.selectedIndex<0)field.value=String(fallback[id]??"");
      }
      const photo=photoKeyFor(activeBackgroundId());
      if(photo && themeBackgroundAlpha()>0){
        try{await ensurePhoto(photo);}catch(error){photoFailures.add(photo);console.warn(error);}
      }
      if($("frameStyle").value!==PERSONAL_FRAME&&$("frameStyle").value!=="none"){try{await window.K9PremiumFrames.ensure($("frameStyle").value);}catch(error){console.warn(error);setStatus(error.message,"warning");}}
      restoreSignatureControls(data.form);
      state.themeBackgroundLocked = data.form.themeBackgroundLocked === true;
      state.frameLocked = data.form.frameLocked === true;
      state.backgroundImage=assets.background;state.backgroundBlob=assets.background?data.background.blob:null;
      state.backgroundScale=goodNumber(data.background?.scale,100,50,180);
      state.backgroundOpacity=goodNumber(data.background?.opacity,100,0,100);
      state.backgroundX=goodNumber(data.background?.x,W/2,0,W);state.backgroundY=goodNumber(data.background?.y,H/2,0,H);
      state.backgroundLocked=!!(assets.background && data.background.locked);
      state.backgroundFitScale=assets.background?coverScale(assets.background):1;
      state.logos=data.logos.map((entry,i)=>({image:assets.logos[i],blob:entry.blob,scale:goodNumber(entry.scale,100,20,300),x:goodNumber(entry.x,W/2,0,W),y:goodNumber(entry.y,150,0,H),locked:!!entry.locked}));
      state.activeLogoIndex=state.logos.length?Math.min(state.logos.length-1,Math.max(0,Math.floor(Number(data.activeLogoIndex)||0))):-1;
      for(const [key,prop] of [["leftSignature","leftSignature"],["rightSignature","signature"],["thirdSignature","thirdSignature"]]){
        state[`${prop}Image`]=assets.signatures[key];state[`${prop}Blob`]=assets.signatures[key]?data[key]:null;
        if($(`${prop}Mode`).value==="image"&&!assets.signatures[key])$(`${prop}Mode`).value="none";
      }
      $("projectName").value=String(data.workingName || data.name || "");
      state.currentProjectId=Object.hasOwn(data,"currentProjectId")?data.currentProjectId:(data.id!=="__workspace__"?data.id:null);
      state.importSourceKey=data.importSourceKey||null;
      lastSavedProjectName=String(data.name || data.workingName || "");selectedQuickDiscipline="";
      $("batchNames").value=typeof data.rosterText==="string"?data.rosterText:"";$("quickBatchNames").value=$("batchNames").value;
      $("autoCertificateCode").checked=data.autoCertificateCode!==false;
      syncAutomaticCode();updateBatchCount();syncAllControls();saveSettings();render({visualOnly:true});
    } finally {state.initialized=wasInitialized;}
  }

  function syncAllControls() {
    populateFrameOptions();
    const hasBg = !!state.backgroundImage;
    $("backgroundTools").classList.toggle("hidden", !hasBg);
    $("backgroundScale").value = state.backgroundScale;
    $("backgroundOpacity").value = state.backgroundOpacity;
    syncPositionRange("backgroundX",state.backgroundX,W);
    syncPositionRange("backgroundY",state.backgroundY,H);
    $("backgroundScaleValue").value=percentLabel(state.backgroundScale);
    $("backgroundOpacityValue").value=percentLabel(state.backgroundOpacity);
    applyBackgroundLockUI();
    syncLogoControls();
    syncSignatureControls();
    syncDesignUI();
  }

  async function projectMetadata(){
    const db=await openDb();return new Promise((resolve,reject)=>{
      const tx=db.transaction("projects","readonly"), req=tx.objectStore("projects").openCursor(), items=[];
      req.onsuccess=()=>{const c=req.result;if(!c)return;const v=c.value;if(v.id!=="__workspace__")items.push({id:v.id,name:v.name,updatedAt:v.updatedAt,form:{pageOrientation:v.form?.pageOrientation}});c.continue();};
      tx.oncomplete=()=>resolve(items);tx.onabort=()=>reject(tx.error || new Error("Archivio non disponibile"));
    });
  }
  async function refreshProjectList() {
    const selector = $("projectSelector");
    const chosen = selector.value;
    const entries = (await projectMetadata()).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
    selector.replaceChildren(new Option("Seleziona un progetto salvato", ""));
    for (const entry of entries) {
      const orientation = entry.form?.pageOrientation === "portrait" ? "A4 verticale" : "A4 orizzontale";
      selector.add(new Option(`${entry.name || "Senza nome"} · ${orientation}`, entry.id));
    }
    selector.value = entries.some(p => p.id === chosen) ? chosen : state.currentProjectId || "";
  }

  async function saveProject(duplicate) {
    void refreshStorageInfo(true);
    clearTimeout(autosaveTimer);
    await activeWrites.catch(()=>{});
    const name = $("projectName").value.trim();
    if (!name) { setStatus("Assegna un nome al progetto"); $("projectName").focus(); return; }
    try {
      const id = !duplicate && state.currentProjectId ? state.currentProjectId : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      if(recoveryBlocked)throw new Error("Recupero incompleto: esporta un backup prima di salvare");
      if(pendingPreviewFrame){cancelAnimationFrame(pendingPreviewFrame);pendingPreviewFrame=0;render({visualOnly:true});}syncAutomaticCode();
      const data = snapshot(id, name);
      data.currentProjectId = id;
      if(duplicate)data.importSourceKey=null;
      await writeCurrentProjects([data,{...data,id:"__workspace__"}], duplicate || !state.currentProjectId ? new Set([id]) : new Set(),dirty);
      void refreshStorageInfo();
      state.currentProjectId = id;
      state.importSourceKey=data.importSourceKey;
      lastSavedProjectName = name;
      await refreshProjectList();
      $("projectSelector").value = id;
      dirty=false;
      setSaveIndicator(`Salvato alle ${localClock()}`);
      setStatus(`${duplicate ? "Copia progetto" : "Progetto"} A4 ${currentOrientation() === "portrait" ? "verticale" : "orizzontale"} salvato`);
    } catch (err) { console.error(err); setStatus(err.message || "Salvataggio impossibile: esporta un backup","warning"); }
  }

  async function openProject() {
    const id = $("projectSelector").value;
    if (!id) { setStatus("Seleziona un progetto"); return; }
    try {
      if(recoveryBlocked){
        if(!knownProjectVersions.has("__workspace__") || !confirm("Il lavoro precedente non è recuperabile. Aprire esplicitamente questo progetto salvato? Il progetto selezionato non verrà modificato durante il caricamento."))return;
      }else await requireSaved();
      clearTimeout(autosaveTimer);
      const data = await dbGet(id);
      if (!data) throw new Error("Progetto non trovato");
      // Apri sempre il progetto scelto, anche se un vecchio backup contiene
      // un currentProjectId differente: il salvataggio non crea nuove copie.
      const prepared=await prepareSnapshot(data);
      const workspace={...data,id:"__workspace__",currentProjectId:id,workingName:data.name||data.workingName||"",writeToken:newToken()};
      await writeArchiveAtomically([workspace],[],[],new Map([["__workspace__",knownProjectVersions.get("__workspace__")],[id,versionOf(data)]]));
      knownProjectVersions.set("__workspace__",versionOf(workspace));knownProjectVersions.set(id,versionOf(data));
      await restoreSnapshot({...data,currentProjectId:id},prepared);
      recoveryBlocked=false;dirty=false;
      void refreshQuickTemplateInfo();
      state.currentProjectId=id;$("projectSelector").value=id;
      setSaveIndicator(`Progetto aperto alle ${localClock()}`);
      setStatus(`Progetto «${data.name || "Senza nome"}» riaperto in A4 ${currentOrientation() === "portrait" ? "verticale" : "orizzontale"}`);
    } catch (err) { console.error(err); setStatus(err.message || "Impossibile aprire il progetto","warning"); }
  }

  async function readHistory(id){
    const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction("history","readonly"),req=tx.objectStore("history").get(id);req.onsuccess=()=>resolve(req.result?.versions||[]);req.onerror=()=>reject(req.error);});
  }
  async function showProjectHistory(){
    const id=state.currentProjectId;if(!id)throw new Error("Apri prima un progetto salvato");
    await requireSaved();const versions=await readHistory(id),select=$("historyVersion");
    select.replaceChildren(...versions.map((entry,i)=>new Option(new Date(entry.data.updatedAt||entry.checkpointAt).toLocaleString("it-IT")+" · "+(entry.data.form?.pageOrientation==="portrait"?"A4 verticale":"A4 orizzontale"),String(i))));
    $("restoreHistory").disabled=!versions.length;$("historyInfo").textContent=versions.length?"Fino a tre versioni precedenti, sul dispositivo. Il recupero aggiorna lo stesso progetto.":"Nessuna versione precedente disponibile.";
    historyView={id,versions};$("historyDialog").showModal();
  }
  let historyView=null;
  async function restoreProjectHistory(){
    const view=historyView,entry=view?.versions[Number($("historyVersion").value)];
    if(!entry||view.id!==state.currentProjectId)throw new Error("Versione non disponibile");
    if(!confirm("Ripristinare questa versione nello stesso progetto? Verrà conservato anche il lavoro attuale tra le versioni precedenti."))return;
    await requireSaved();const id=view.id,prepared=await prepareSnapshot(entry.data),name=$("projectName").value.trim()||lastSavedProjectName||entry.data.name;
    const data={...entry.data,id,name,workingName:name,currentProjectId:id,updatedAt:new Date().toISOString()};
    await writeCurrentProjects([data,{...data,id:"__workspace__"}],new Set(),"force");
    await restoreSnapshot(data,prepared);dirty=false;lastSavedProjectName=name;await refreshProjectList();$("projectSelector").value=id;
    $("historyDialog").close();historyView=null;setStatus("Versione precedente ripristinata nello stesso progetto");
  }
  async function refreshStorageInfo(request=false){
    const el=$("storageInfo");if(!navigator.storage){el.textContent="Stima dello spazio non disponibile.";return;}
    try{if(request&&navigator.storage.persist)await navigator.storage.persist();const estimate=await navigator.storage.estimate?.(),persistent=await navigator.storage.persisted?.();
      const free=estimate?.quota!=null?Math.max(0,Math.floor((estimate.quota-(estimate.usage||0))/1048576)):null;
      el.textContent=(persistent?"Archivio persistente autorizzato.":"Archivio locale: conserva un backup.")+(free!==null?` Spazio stimato disponibile: ${free.toLocaleString("it-IT")} MB.`:"");
    }catch{el.textContent="Stima dello spazio non disponibile: conserva un backup.";}
  }
  $("showHistory").addEventListener("click",guardAsync(showProjectHistory));
  $("restoreHistory").addEventListener("click",guardAsync(restoreProjectHistory));
  $("closeHistory").addEventListener("click",()=>$("historyDialog").close());
  $("historyDialog").addEventListener("close",()=>{historyView=null;});

  async function deleteProject() {
    const id=$("projectSelector").value;
    if(!id){setStatus("Seleziona un progetto");return;}
    if(!confirm("Eliminare definitivamente questo progetto salvato? Il modello aperto non cambia."))return;
    try{
      await requireSaved();
      const wasCurrent=state.currentProjectId===id;
      const data=await dbGet(id);if(!data)throw new Error("Progetto non trovato");
      const workspace=snapshot();if(wasCurrent){workspace.currentProjectId=null;workspace.importSourceKey=null;}
      const expected=new Map([[id,versionOf(data)],["__workspace__",knownProjectVersions.get("__workspace__")]]);
      workspace.writeToken=newToken();
      await writeArchiveAtomically(wasCurrent?[workspace]:[],[],[],expected,[id]);
      knownProjectVersions.delete(id);
      if(wasCurrent){knownProjectVersions.set("__workspace__",versionOf(workspace));state.currentProjectId=null;state.importSourceKey=null;lastSavedProjectName="";}
      dirty=false;await refreshProjectList();setStatus("Progetto salvato eliminato");
    }catch(err){console.error(err);setStatus(err.message || "Eliminazione non riuscita","warning");}
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function requiredImageBlob(data){const blob=await dataURLToBlob(data);if(!blob)throw new Error("Immagine obbligatoria mancante nel backup");return blob;}
  async function dataURLToBlob(data) {
    if (!data) return null;
    if (typeof data !== "string" || !/^data:image\/(png|jpeg|webp);base64,/.test(data) || data.length > MAX_IMAGE_MB * 1400000) {
      throw new Error("Immagine backup non valida");
    }
    const separator=data.indexOf(","), type=data.slice(5,data.indexOf(";"));
    let blob;try{blob=new Blob([base64Bytes(data.slice(separator+1))],{type});}catch{throw new Error("Immagine backup non valida");}
    if (blob.size > MAX_IMAGE_MB * 1048576) throw new Error("Immagine troppo grande");
    return blob;
  }

  const bytesBase64=bytes=>{
    let out="";
    for(let i=0;i<bytes.length;i+=8192) out+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(out);
  };
  const base64Bytes=str=>Uint8Array.from(atob(str),c=>c.charCodeAt(0));
  const MAX_PROJECT_BACKUP=80*1048576, MAX_ARCHIVE_BACKUP=180*1048576;
  function checkBackupEstimate(items,limit){
    const blobBytes=items.reduce((sum,item)=>sum+[item.personalFrame?.blob,item.background?.blob,...item.logos.map(l=>l.blob),item.leftSignature,item.rightSignature,item.thirdSignature].reduce((n,b)=>n+(b?.size||0),0),0);
    const factor=$("encryptBackup").checked?16/9:4/3;
    if(blobBytes*factor>limit)throw new Error(`Backup oltre ${Math.round(limit/1048576)} MB: riduci le immagini o esporta i singoli progetti.`);
  }
  async function protectBackup(doc) {
    const json=JSON.stringify(doc);
    if (!$("encryptBackup").checked) return new Blob([json],{type:"application/json"});
    const password=$("backupPassword").value;
    if (password.length < 8) throw new Error("Per cifrare il backup inserisci una password di almeno 8 caratteri");
    if (!crypto?.subtle) throw new Error("Cifratura non disponibile: usa l’app tramite HTTPS");
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const source=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
    const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:BACKUP_KDF_ITERATIONS,hash:"SHA-256"},source,{name:"AES-GCM",length:256},false,["encrypt"]);
    const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(json)));
    const payload={kind:"k9-certificati-encrypted",version:1,kdf:"PBKDF2-SHA256",iterations:BACKUP_KDF_ITERATIONS,cipher:"AES-256-GCM",salt:bytesBase64(salt),iv:bytesBase64(iv),data:bytesBase64(encrypted)};
    return new Blob([JSON.stringify(payload)],{type:"application/json"});
  }
  async function decodeBackup(file) {
    const parsed=JSON.parse(await file.text());
    if (parsed?.kind !== "k9-certificati-encrypted") return parsed; // Compatibilità con V2-V4
    if (parsed.version !== 1 || parsed.kdf !== "PBKDF2-SHA256" || parsed.cipher !== "AES-256-GCM" || parsed.iterations !== BACKUP_KDF_ITERATIONS) throw new Error("Versione backup cifrato non supportata");
    if (!crypto?.subtle) throw new Error("Cifratura non disponibile: apri l’app tramite HTTPS");
    const password=$("backupPassword").value || prompt("Inserisci la password del backup K9 cifrato") || "";
    if (!password) throw new Error("Password necessaria per aprire questo backup");
    try {
      const salt=base64Bytes(parsed.salt),iv=base64Bytes(parsed.iv),encrypted=base64Bytes(parsed.data);
      if (salt.length !== 16 || iv.length !== 12 || encrypted.length > 200 * 1048576) throw new Error("Formato danneggiato");
      const source=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
      const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:BACKUP_KDF_ITERATIONS,hash:"SHA-256"},source,{name:"AES-GCM",length:256},false,["decrypt"]);
      const bytes=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,encrypted);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch(error) {throw new Error("Password errata oppure file di backup danneggiato");}
  }

  async function exportProject() {
    try {
      const current=snapshot(state.currentProjectId||"__workspace__",$("projectName").value.trim());
      checkBackupEstimate([current],MAX_PROJECT_BACKUP);
      const backup=await portableProject(current);
      if(state.currentProjectId){try{const stored=await dbGet(state.currentProjectId);if(stored&&await contentFingerprint(stored)===await contentFingerprint(current)){backup.updatedAt=stored.updatedAt;backup.writeToken=stored.writeToken;}}catch{}}
      const json = await protectBackup(backup);
      if(json.size>MAX_PROJECT_BACKUP)throw new Error("Backup oltre 80 MB: riduci le immagini del progetto prima di esportarlo; nessun file non recuperabile è stato creato.");
      offerDownload(json, `K9_progetto_${safeProjectName(current.name || "certificato")}.json`);
      setStatus("Backup completo esportato");
    } catch (err) { console.error(err); setStatus(err.message || "Impossibile esportare il backup"); }
  }

  function safeProjectName(value) {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  }

  // Confronto deterministico: nessun timestamp, token o ID nel contenuto.
  const blobFingerprints=new WeakMap();
  function canonicalJSON(value){
    if(value===null||typeof value!=="object")return JSON.stringify(value)??"null";
    if(Array.isArray(value))return `[${value.map(canonicalJSON).join(",")}]`;
    return `{${Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>`${JSON.stringify(k)}:${canonicalJSON(value[k])}`).join(",")}}`;
  }
  async function blobFingerprint(blob){
    if(!blob)return null;
    if(typeof blob==="string")blob=await requiredImageBlob(blob);
    if(!blobFingerprints.has(blob))blobFingerprints.set(blob,(async()=>{
      if(!globalThis.crypto?.subtle)return await blobToDataURL(blob);
      const digest=await crypto.subtle.digest("SHA-256",await blob.arrayBuffer());
      return `${blob.type}:${Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("")}`;
    })());
    return blobFingerprints.get(blob);
  }
  async function contentFingerprint(item){
    const form=normalizeOpacityForm(migrateLayers(item.form,item.designTheme));
    if(item.autoCertificateCode!==false)delete form.certificateCode;
    const background=item.background?{...item.background,blob:await blobFingerprint(item.background.blob)}:null;
    const logos=[];for(const logo of item.logos||[])logos.push({...logo,blob:await blobFingerprint(logo.blob)});
    const content=[form,item.designTheme,background,logos,item.activeLogoIndex??-1,await blobFingerprint(item.leftSignature),await blobFingerprint(item.rightSignature),await blobFingerprint(item.thirdSignature),item.rosterText||"",item.autoCertificateCode!==false];
    if(item.personalFrame)content.push({name:item.personalFrame.name,blob:await blobFingerprint(item.personalFrame.blob)});
    const doc=canonicalJSON(content);
    if(!globalThis.crypto?.subtle)return doc;
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(doc))),b=>b.toString(16).padStart(2,"0")).join("");
  }
  const lineage=item=>String(item.originId||String(item.importSourceKey||"").split("|")[0]||item.id||"");
  const importKey=item=>`${String(item.id||"")}|${String(item.writeToken||item.updatedAt||"")}`;
  function normalizeOpacityForm(form){
    const result={...form};
    const opacity=normalizeThemeOpacity(result.themeBackgroundOpacity);
    if(opacity==="100")delete result.themeBackgroundOpacity;else result.themeBackgroundOpacity=opacity;
    const frame=normalizeThemeOpacity(result.frameOpacity);
    if(frame==="100")delete result.frameOpacity;else result.frameOpacity=frame;
    return result;
  }
  const portableContent=p=>canonicalJSON([normalizeOpacityForm(migrateLayers(p.form,p.designTheme)),p.designTheme,p.background,p.personalFrame||null,p.logos,p.activeLogoIndex,p.leftSignature,p.rightSignature,p.thirdSignature,p.rosterText,p.autoCertificateCode]);
  async function findImported(items,source){
    const root=lineage(source);if(!root)return null;
    const fingerprint=await contentFingerprint(source);
    for(const item of items){
      if(lineage(item)!==root&&item.id!==source.id)continue;
      if(await contentFingerprint(item)===fingerprint)return item;
    }
    return null;
  }
  async function decodePortable(entry){
    if(!entry||entry.version!==2||!entry.form||typeof entry.form!=="object"||Array.isArray(entry.form)||!Array.isArray(entry.logos)||entry.logos.length>MAX_LOGOS)throw new Error("Progetto non valido");
    const data={...entry,personalFrame:entry.personalFrame?{name:String(entry.personalFrame.name||"Cornice personale").slice(0,150),blob:await requiredImageBlob(entry.personalFrame.blob)}:null,background:entry.background?{...entry.background,blob:await requiredImageBlob(entry.background.blob)}:null,logos:[],leftSignature:await dataURLToBlob(entry.leftSignature),rightSignature:await dataURLToBlob(entry.rightSignature),thirdSignature:await dataURLToBlob(entry.thirdSignature)};
    for(const l of entry.logos){if(!l || typeof l!=="object")throw new Error("Logo non valido");data.logos.push({...l,blob:await requiredImageBlob(l.blob)});}
    delete data.contentFingerprint;await prepareSnapshot(data);return data;
  }
  async function importProject(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PROJECT_BACKUP) { setStatus("Backup troppo grande"); return; }
    try {
      const item=await decodeBackup(file);
      const decoded=await decodePortable(item);
      const existing=await findImported((await dbAll()).filter(p=>p.id!=="__workspace__"),decoded);
      if(existing){await refreshProjectList();$("projectSelector").value=existing.id;setStatus("Progetto già presente: premi Apri progetto");return;}
      const id=`p_${newToken()}`,name=String(item.name||"Backup importato").slice(0,100);
      const data={...decoded,id,name,workingName:name,currentProjectId:id,updatedAt:new Date().toISOString(),writeToken:newToken(),importSourceKey:`${lineage(item)}|${String(item.writeToken||item.updatedAt||"")}`,originId:lineage(item)};
      // Conserva il progetto importato senza sostituire quello corrente.
      await dbPut(data);
      await refreshProjectList();
      $("projectSelector").value = data.id;
      setStatus("Backup importato: premi Apri progetto");
    } catch (err) { console.error(err); setStatus(err.message || "Backup non valido o memoria insufficiente"); }
  }

  // Backup completo portabile: i progetti vengono aggiunti senza sovrascrivere
  // quelli già esistenti sul dispositivo di destinazione.
  async function portableProject(item) {
    const logos=[];for(const l of item.logos)logos.push({...l,blob:await blobToDataURL(l.blob)});
    return {
      ...item,
      personalFrame: item.personalFrame ? {...item.personalFrame,blob:await blobToDataURL(item.personalFrame.blob)} : null,
      background: item.background ? {...item.background, blob: await blobToDataURL(item.background.blob)} : null,
      logos,
      leftSignature: item.leftSignature ? await blobToDataURL(item.leftSignature) : null,
      rightSignature: item.rightSignature ? await blobToDataURL(item.rightSignature) : null,
      thirdSignature: item.thirdSignature ? await blobToDataURL(item.thirdSignature) : null
    };
  }

  async function readArchiveConsistent(){
    const db=await openDb();return new Promise((resolve,reject)=>{
      const tx=db.transaction(["projects","templates","exports"],"readonly"),out={};
      for(const name of ["projects","templates","exports"]){const req=tx.objectStore(name).getAll();req.onsuccess=()=>{out[name]=req.result;};}
      tx.oncomplete=()=>resolve(out);tx.onabort=()=>reject(tx.error||new Error("Archivio non disponibile"));
    });
  }
  function clearArchiveLinks(){const target=$("archiveParts");for(const a of target.querySelectorAll("a"))URL.revokeObjectURL(a.href);target.replaceChildren();target.hidden=true;}
  async function exportArchive(){
    try{
      setStatus("Creazione archivio…");
      if(!await persistCurrentSnapshot()&&!confirm("Il lavoro corrente non è stato salvato. Esportare soltanto l'archivio già presente sul dispositivo? Per il lavoro in corso usa Esporta progetto."))return;
      const stored=await readArchiveConsistent(),saved=stored.projects.filter(p=>p.id!=="__workspace__");
      const effectiveTemplates=new Map();for(const t of stored.templates){const key=normalizedTemplateKey(t);if(!effectiveTemplates.has(key)||t.id===key)effectiveTemplates.set(key,t);}
      const savedTemplates=[...effectiveTemplates.entries()].map(([id,t])=>({...t,id})),registry=stored.exports;
      const workspace=stored.projects.find(p=>p.id==="__workspace__");
      const linked=workspace?.currentProjectId?saved.find(p=>p.id===workspace.currentProjectId):null;
      const includeWorkspace=!!workspace&&(!linked||!workspace.snapshotToken||linked.snapshotToken!==workspace.snapshotToken);
      // Parti autonome con stesso formato di importazione, senza duplicare il lavoro già salvato.
      const files=[];let part={kind:"k9-certificati-archive",archiveVersion:1,createdAt:new Date().toISOString(),projects:[],templates:[],registry:[],workspace:null}, size=2048;
      const limit=MAX_ARCHIVE_BACKUP*.72; // margine per cifratura/base64 e intestazioni
      const flush=async()=>{if(part.projects.length||part.templates.length||part.registry.length||part.workspace){const backup=await protectBackup(part);if(backup.size>MAX_ARCHIVE_BACKUP)throw new Error("Una parte supera 180 MB: riduci le immagini del singolo progetto prima del backup.");files.push(backup);part={kind:"k9-certificati-archive",archiveVersion:1,createdAt:new Date().toISOString(),projects:[],templates:[],registry:[],workspace:null};size=2048;}};
      async function add(key,value){const bytes=new Blob([JSON.stringify(value)]).size;
        if(size+bytes>limit || (key==="projects"&&part.projects.length>=100)||(key==="templates"&&part.templates.length>=30)||(key==="registry"&&part.registry.length>=10000))await flush();
        if(key==="workspace")part.workspace=value;else part[key].push(value);size+=bytes+16;
      }
      for(const item of saved){await prepareSnapshot(item);await add("projects",await portableProject(item));}
      for(const item of savedTemplates){await prepareSnapshot(item);await add("templates",await portableProject(item));}
      if(includeWorkspace&&(!linked||await contentFingerprint(linked)!==await contentFingerprint(workspace))){await prepareSnapshot(workspace);await add("workspace",await portableProject(workspace));}
      for(const record of registry)await add("registry",record);await flush();
      if(!files.length)files.push(await protectBackup(part));
      clearArchiveLinks();
      if(files.length===1)offerDownload(files[0],`K9_archivio_${todayISO()}.json`);
      else{const target=$("archiveParts");files.forEach((file,i)=>{const a=document.createElement("a");a.className="button secondary";a.href=URL.createObjectURL(file);a.download=`K9_archivio_${todayISO()}_parte_${i+1}_di_${files.length}.json`;a.textContent=`Scarica parte ${i+1} di ${files.length}`;target.append(a);});target.hidden=false;}
      setStatus(`Backup: ${saved.length} progetti, ${savedTemplates.length} modelli e ${registry.length} registrazioni. ${files.length>1?`Scarica tutte le ${files.length} parti, importabili separatamente.`:"File pronto."}`);
    }catch(err){console.error(err);setStatus(err.message||"Archivio non esportato: spazio insufficiente?","warning");}
  }

  async function writeArchiveAtomically(projects,templates,records,expected=new Map(),deletions=[],insertOnly=false,checkpoint=false) {
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(["projects","templates","exports","history"],"readwrite"), store=tx.objectStore("projects"), history=tx.objectStore("history");
      const previous=new Map();
      let error=null;
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(error || tx.error || new Error("Salvataggio archivio annullato"));
      const abort=e=>{error=e;try{tx.abort();}catch{reject(e);}};
      const write=()=>{try{for(const [name,items] of [["projects",projects],["templates",templates],["exports",records]])for(const item of items){const target=tx.objectStore(name);if(insertOnly)target.add(item);else target.put(item);}for(const id of deletions){store.delete(id);history.delete(id);}
        if(checkpoint)for(const item of projects){const old=previous.get(item.id);if(!old||item.id==="__workspace__")continue;
          const req=history.get(item.id);req.onsuccess=()=>{try{const list=req.result?.versions||[];const now=Date.now();
            if(checkpoint!=="force" && list.length && now-Number(list[0].checkpointAt||0)<600000)return;
            if(list[0]&&(versionOf(list[0].data)===versionOf(old)||(old.contentFingerprint&&list[0].data.contentFingerprint===old.contentFingerprint&&list[0].data.name===old.name)))return;
            if(old.contentFingerprint&&old.contentFingerprint===item.contentFingerprint&&old.name===item.name)return;
            history.put({id:item.id,versions:[{checkpointAt:now,data:old},...list].slice(0,3)});
          }catch(e){abort(e);}};
        }}catch(e){abort(e);}};
      if(!expected.size){write();return;}
      let left=expected.size;
      for(const [id,version] of expected){const req=store.get(id);req.onsuccess=()=>{if(error)return;if(versionOf(req.result)!==version){abort(projectConflict());return;}previous.set(id,req.result);if(--left===0)write();};}
    });
  }
  async function writeCurrentProjects(entries,newIds=new Set(),checkpoint=false){
    const expected=new Map(),snapshotToken=newToken(),changed=[];
    // Hash delle immagini originali, non del canvas UHD. L'operazione rimane
    // fuori dalla transazione; la verifica CAS al commit protegge dalle altre schede.
    const previous=await Promise.all(entries.map(entry=>dbGet(entry.id)));
    for(let i=0;i<entries.length;i++){
      const entry=entries[i],old=previous[i];
      if(!knownProjectVersions.has(entry.id)&&!newIds.has(entry.id))throw projectConflict();
      const version=newIds.has(entry.id)?null:knownProjectVersions.get(entry.id);
      if(versionOf(old)!==version)throw projectConflict();
      expected.set(entry.id,version);
      const fingerprint=await contentFingerprint(entry);
      const oldFingerprint=old&&(old.contentFingerprint||await contentFingerprint(old));
      if(old&&fingerprint===oldFingerprint&&String(entry.name||"")===String(old.name||"")&&String(entry.workingName||"")===String(old.workingName||"")&&(entry.currentProjectId||null)===(old.currentProjectId||null)){
        entry.writeToken=old.writeToken;entry.updatedAt=old.updatedAt;entry.snapshotToken=old.snapshotToken;
        continue;
      }
      if(globalThis.crypto?.subtle)entry.contentFingerprint=fingerprint;else delete entry.contentFingerprint;entry.writeToken=newToken();entry.snapshotToken=snapshotToken;changed.push(entry);
    }
    // Anche un salvataggio senza modifiche controlla le versioni attese.
    await writeArchiveAtomically(changed,[],[],expected,[],false,checkpoint);
    for(const entry of changed)knownProjectVersions.set(entry.id,versionOf(entry));
  }
  async function importArchive(event){
    const file=event.target.files[0];event.target.value="";if(!file)return;
    if(file.size>MAX_ARCHIVE_BACKUP){setStatus("Archivio troppo grande (max 180 MB)");return;}
    try{
      const archive=await decodeBackup(file);
      if(archive?.kind!=="k9-certificati-archive"||archive.archiveVersion!==1||!Array.isArray(archive.projects)||archive.projects.length>100)throw new Error("Formato archivio non valido");
      for(const key of ["templates","registry"])if(archive[key]!==undefined&&!Array.isArray(archive[key]))throw new Error("Sezione archivio non valida: "+key);
      if((archive.templates||[]).length>30||(archive.registry||[]).length>10000)throw new Error("Archivio oltre i limiti di recupero");
      if(!confirm(`Importare ${archive.projects.length} progetti, ${(archive.templates||[]).length} modelli e ${(archive.registry||[]).length} registrazioni? I dati già presenti non saranno sovrascritti.`))return;
      const existing=(await dbAll()).filter(p=>p.id!=="__workspace__"), items=[],presets=[],records=[];
      const sources=[...archive.projects];
      if(archive.workspace){
        const w=archive.workspace, linked=archive.projects.find(p=>p.id===w.currentProjectId);
        if(!linked||portableContent(linked)!==portableContent(w))sources.push({...w,name:`Lavoro recuperato ${new Date().toLocaleDateString("it-IT")}`});
      }
      for(const entry of sources){
        const data=await decodePortable(entry);
        if(await findImported([...existing,...items],data))continue;
        const name=String(entry.name||"Progetto importato").slice(0,100),id=`p_${newToken()}`;
        items.push({...data,id,name,workingName:name,currentProjectId:id,updatedAt:new Date().toISOString(),writeToken:newToken(),importSourceKey:`${lineage(entry)}|${String(entry.writeToken||entry.updatedAt||"")}`,originId:lineage(entry)});
      }
      const templateIds=new Set();let templateConflicts=0;
      const templateSources=[...(archive.templates||[])].sort((a,b)=>Number(String(b?.id).includes(":"))-Number(String(a?.id).includes(":")));
      for(const entry of templateSources){
        const key=normalizedTemplateKey(entry),data=await decodePortable(entry);data.id=key;
        const existingTemplate=presets.find(p=>p.id===key)||await getOrientedTemplate(key);
        if(existingTemplate){if(await contentFingerprint(existingTemplate)!==await contentFingerprint(data))templateConflicts++;continue;}
        if(templateIds.has(key))continue;templateIds.add(key);presets.push(data);
      }
      const previous=await allExports();const registryKey=e=>e.importSourceId||e.id||JSON.stringify([e.exportedAt,e.name,e.course,e.code,e.certificateDate,e.format]);
      const seen=new Set(previous.map(registryKey));
      for(const record of archive.registry||[]){
        if(!record||typeof record!=="object"||Array.isArray(record))throw new Error("Registrazione non valida");
        const key=registryKey(record);if(seen.has(key))continue;seen.add(key);records.push({...record,id:`e_${newToken()}`,importSourceId:key});
      }
      await writeArchiveAtomically(items,presets,records,new Map(),[],true);
      await refreshProjectList();await refreshExports();await refreshQuickTemplateInfo();
      setStatus(`${items.length} progetti, ${presets.length} modelli e ${records.length} registrazioni importati; duplicati ignorati${templateConflicts?`; ${templateConflicts} modelli differenti già presenti, conservati`:""}`);
    }catch(err){console.error(err);setStatus(err.message||"Archivio non importato: formato o spazio insufficiente","warning");}
  }
  $("exportArchive").addEventListener("click", guardAsync(exportArchive));
  $("importArchive").addEventListener("change", guardAsync(importArchive));

  $("resetAll").addEventListener("click", guardAsync(async () => {
    if (!confirm("Ripristinare il modello iniziale? I progetti salvati rimangono disponibili.")) return;
    await requireSaved();
    state.initialized = false;
    clearTimeout(autosaveTimer);
    try{localStorage.removeItem("k9-certificati-settings");}catch{}
    setPageOrientation("landscape", false);
    $("documentType").value = defaults.documentType;
    textIds.forEach(id => { $(id).value = defaults[id]; });
    $("certificateDate").value = todayISO();
    $("leftSignatureMode").value = "auto";
    $("signatureMode").value = "auto";
    $("thirdSignatureMode").value = "off";
    restoreSignatureControls();
    $("courseOutcome").value = "";
    selectedTheme = "classic";
    $("accentColor").value = themePalettes.classic.accent;
    $("inkColor").value = themePalettes.classic.ink;
    $("frameStyle").value = "none";
    $("themeBackgroundId").value = "classic";
    $("ornamentStyle").value = "none";
    $("fontScale").value = "100";
    $("themeBackgroundOpacity").value = "100";
    $("frameOpacity").value = "100";
    state.themeBackgroundLocked = false;
    state.frameLocked = false;
    state.personalFrameImage=null;state.personalFrameBlob=null;state.personalFrameName="";
    $("personalFrameFile").value="";
    state.backgroundImage = null; state.backgroundBlob = null;
    state.backgroundScale = 100; state.backgroundOpacity = 100;
    state.backgroundX = W / 2; state.backgroundY = H / 2; state.backgroundLocked = false;
    state.leftSignatureBlob = null; state.leftSignatureImage = null;
    state.signatureBlob = null; state.signatureImage = null;
    state.thirdSignatureBlob = null; state.thirdSignatureImage = null;
    state.logos = []; state.activeLogoIndex = -1; state.currentProjectId = null;state.importSourceKey=null;lastSavedProjectName="";
    selectedQuickDiscipline = "";
    $("batchNames").value="";$("quickBatchNames").value="";$("autoCertificateCode").checked=true;
    syncAutomaticCode();
    $("projectName").value = ""; $("projectSelector").value = "";
    $("backgroundFile").value = ""; $("logoFile").value = "";
    ["leftSignatureFile", "signatureFile", "thirdSignatureFile"].forEach(id => $(id).value = "");
    syncAllControls();
    state.initialized = true;
    render();
    if(await persistCurrentSnapshot())setStatus("Modello ripristinato");
  }));

  for (const [side, fileId, modeId, removeId] of [
    ["left", "leftSignatureFile", "leftSignatureMode", "removeLeftSignature"],
    ["right", "signatureFile", "signatureMode", "removeSignature"],
    ["third", "thirdSignatureFile", "thirdSignatureMode", "removeThirdSignature"]
  ]) {
    $(fileId).addEventListener("change", guardAsync(e => loadImage(e.target.files[0], (image, blob) => {
      const prefix = side === "left" ? "leftSignature" : side === "third" ? "thirdSignature" : "signature";
      checkImageBudget(image,state[`${prefix}Image`]);
      state[`${prefix}Image`] = image;
      state[`${prefix}Blob`] = blob;
      $(modeId).value = "image";
      $(fileId).value = "";
      saveSettings(); render();
      setStatus("Firma grafica caricata");
    })));
    $(modeId).addEventListener("change", () => {
      if ($(modeId).value === "image" && !(side === "left" ? state.leftSignatureImage : side === "third" ? state.thirdSignatureImage : state.signatureImage)) {
        $(modeId).value = "none";
        setStatus("Carica prima un'immagine firma");
      }
      saveSettings(); render();
    });
    $(removeId).addEventListener("click", () => {
      const prefix = side === "left" ? "leftSignature" : side === "third" ? "thirdSignature" : "signature";
      state[`${prefix}Image`] = null;
      state[`${prefix}Blob`] = null;
      if ($(modeId).value !== "off") $(modeId).value = "none";
      saveSettings(); render(); setStatus("Immagine firma rimossa");
    });
  }

  const signaturePad=$("signaturePad"),padCtx=signaturePad.getContext("2d");
  let padPrefix=null,padPointer=null,padLast=null,padHasInk=false,padBounds=null;
  function clearSignaturePad(){padCtx.clearRect(0,0,signaturePad.width,signaturePad.height);padPointer=null;padLast=null;padHasInk=false;padBounds=null;$("saveDrawnSignature").disabled=true;}
  function padPosition(e){const r=signaturePad.getBoundingClientRect();return {x:(e.clientX-r.left)*signaturePad.width/r.width,y:(e.clientY-r.top)*signaturePad.height/r.height};}
  function padInk(point){const x=Math.max(0,Math.min(signaturePad.width,point.x)),y=Math.max(0,Math.min(signaturePad.height,point.y));
    padBounds=padBounds?{l:Math.min(padBounds.l,x),r:Math.max(padBounds.r,x),t:Math.min(padBounds.t,y),b:Math.max(padBounds.b,y)}:{l:x,r:x,t:y,b:y};
    padCtx.strokeStyle="#202020";padCtx.fillStyle="#202020";padCtx.lineWidth=6;padCtx.lineCap="round";padCtx.lineJoin="round";
    padCtx.beginPath();if(padLast){padCtx.moveTo(padLast.x,padLast.y);padCtx.lineTo(x,y);padCtx.stroke();}else{padCtx.arc(x,y,3,0,Math.PI*2);padCtx.fill();}
    padLast={x,y};padHasInk=true;$("saveDrawnSignature").disabled=false;
  }
  signaturePad.addEventListener("pointerdown",e=>{if(padPointer!==null||e.button!==0)return;e.preventDefault();padPointer=e.pointerId;signaturePad.setPointerCapture(e.pointerId);padLast=null;padInk(padPosition(e));});
  signaturePad.addEventListener("pointermove",e=>{if(e.pointerId!==padPointer)return;e.preventDefault();const events=e.getCoalescedEvents?.();for(const ev of (events?.length?events:[e]))padInk(padPosition(ev));});
  for(const event of ["pointerup","pointercancel","lostpointercapture"])signaturePad.addEventListener(event,e=>{if(e.pointerId===padPointer){padPointer=null;padLast=null;}});
  for(const [id,prefix] of [["drawLeftSignature","leftSignature"],["drawRightSignature","signature"],["drawThirdSignature","thirdSignature"]])$(id).addEventListener("click",()=>{
    if(state.exporting||pendingEditorOperations)return;padPrefix=prefix;clearSignaturePad();$("signaturePadDialog").showModal();
  });
  $("clearSignaturePad").addEventListener("click",clearSignaturePad);
  $("cancelSignaturePad").addEventListener("click",()=>$("signaturePadDialog").close());
  $("signaturePadDialog").addEventListener("close",()=>{padPrefix=null;clearSignaturePad();});
  $("saveDrawnSignature").addEventListener("click",guardAsync(async()=>{
    if(!padHasInk||!padPrefix||!padBounds)return;
    const prefix=padPrefix,b=padBounds,padding=20;
    const x=Math.max(0,Math.floor(b.l-padding)),y=Math.max(0,Math.floor(b.t-padding));
    const w=Math.min(signaturePad.width-x,Math.ceil(b.r+padding)-x),h=Math.min(signaturePad.height-y,Math.ceil(b.b+padding)-y);
    const crop=document.createElement("canvas");crop.width=w;crop.height=h;crop.getContext("2d").drawImage(signaturePad,x,y,w,h,0,0,w,h);
    const blob=await new Promise((resolve,reject)=>crop.toBlob(b=>b?resolve(b):reject(new Error("Firma non salvata")),"image/png"));
    crop.width=1;crop.height=1;const image=await imageFromBlob(blob);checkImageBudget(image,state[`${prefix}Image`]);
    state[`${prefix}Image`]=image;state[`${prefix}Blob`]=blob;$( `${prefix}Mode`).value="image";$("signaturePadDialog").close();saveSettings();render();setStatus("Firma disegnata salvata nel progetto");
  }));
  for (const id of signatureControlIds) bindRange(id,()=>!state.signatureBlockLocked,()=>syncSignatureControls());
  $("resetSignatureBlock").addEventListener("click", () => {
    if (state.signatureBlockLocked) return;
    restoreSignatureControls();saveSettings();render();
  });
  $("lockSignatureBlock").addEventListener("click", () => {
    state.signatureBlockLocked = !state.signatureBlockLocked;
    applySignatureBlockLockUI();
    clearTimeout(settingsSaveTimer);saveSettings();
    scheduleAutosave();
  });

  // L'archivio grafico è incorporato nell'app: nessuna rete e nessun caricamento all'apertura.
  populateThemeGallery();
  $("themeSearch").addEventListener("input", populateThemeGallery);
  $("locateTheme").addEventListener("click",locateSelectedTheme);
  const selectGalleryBackground=guardAsync(applyCatalogTheme);
  $("themeGrid").addEventListener("click", event => {
    const button=event.target.closest(".theme-choice");
    if(button&&$("themeGrid").contains(button))void selectGalleryBackground(button.dataset.theme);
  });
  bindRange("themeBackgroundOpacity",()=>!state.themeBackgroundLocked&&activeBackgroundId()!=="none",syncThemeOpacity);
  bindRange("frameOpacity",()=>!state.frameLocked&&$("frameStyle").value!=="none",syncFrameOpacity);
  bindRange("fontScale",()=>true,value=>{$("fontScaleValue").value=percentLabel(value);});
  $("removeThemeBackground").addEventListener("click",()=>{
    if(state.themeBackgroundLocked)return;
    $("themeBackgroundId").value="none";syncDesignUI();saveSettings();render();
  });
  $("removeFrame").addEventListener("click",()=>{
    if(state.frameLocked)return;
    if($("frameStyle").value===PERSONAL_FRAME){state.personalFrameImage=null;state.personalFrameBlob=null;state.personalFrameName="";$("personalFrameFile").value="";populateFrameOptions();}
    $("frameStyle").value="none";syncDesignUI();saveSettings();render();
  });
  $("loadPersonalFrame").addEventListener("click",()=>{if(!state.frameLocked)$("personalFrameFile").click();});
  $("personalFrameFile").addEventListener("change",guardAsync(async e=>{const file=e.target.files[0];e.target.value="";await importPersonalFrame(file);}));

    $("lockThemeBackground").addEventListener("click",()=>{
    state.themeBackgroundLocked = !state.themeBackgroundLocked;
    applyThemeBackgroundLockUI();
    saveSettings();
    scheduleAutosave();
    setStatus(state.themeBackgroundLocked ? "Sfondo del tema bloccato" : "Sfondo del tema sbloccato");
  });
  $("lockFrameLayer").addEventListener("click",()=>{
    state.frameLocked = !state.frameLocked;
    applyFrameLockUI();
    saveSettings();
    scheduleAutosave();
    setStatus(state.frameLocked ? "Cornice bloccata" : "Cornice sbloccata");
  });
  for(const id of ["frameDiscipline","frameCollection"]) $(id).addEventListener("change",()=>{if(state.frameLocked)return;populateFrameOptions();updateFrameNavigatorUI();});
  $("prevFrame").addEventListener("click",()=>moveFrameSelection(-1));
  $("nextFrame").addEventListener("click",()=>moveFrameSelection(1));
  for (const id of ["accentColor", "inkColor", "frameStyle", "ornamentStyle", "courseOutcome"]) {
    $(id).addEventListener("input", () => {
      if(id==="frameStyle" && state.frameLocked){syncDesignUI();return;}
      // Changing frame or colors must not change the background identity.
      if(id==="frameStyle")frameFailures.delete($("frameStyle").value);
      syncDesignUI();deferSettingsSave();queuePreviewRender();
    });
    $(id).addEventListener("change", () => { if(id==="frameStyle" && state.frameLocked){syncDesignUI();return;} saveSettings(); queuePreviewRender(); });
  }

  // I pannelli scorrono autonomamente, il foglio non partecipa allo scroll.
  function scrollEditorTo(target) {
    const editor = document.querySelector(".layout > .controls");
    if (!editor || !target) return;
    const top = editor.scrollTop + target.getBoundingClientRect().top - editor.getBoundingClientRect().top - editor.clientTop - 8;
    editor.scrollTo({top:Math.max(0,top),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
  }
  document.querySelectorAll(".quick-link").forEach(btn => btn.addEventListener("click", () => {
    const panels = document.querySelectorAll(".controls > details.panel");
    const panel = panels[Number(btn.dataset.panelIndex)];
    if (!panel) return;
    panel.open = true;
    scrollEditorTo(panel);
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
    const counts={";":0,",":0,"\t":0}; let quoted=false;
    for(let i=0;i<raw.length;i++){
      const ch=raw[i];
      if(ch==='"'){if(quoted&&raw[i+1]==='"')i++;else quoted=!quoted;}
      else if(!quoted&&ch==='\n')break;
      else if(!quoted&&Object.hasOwn(counts,ch))counts[ch]++;
    }
    const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
    const rows=[], row=[];let value="",inQuote=false,closed=false;
    const push=()=>{row.push(value.trim());value="";closed=false;};
    for(let i=0;i<raw.length;i++){
      const ch=raw[i];
      if(inQuote){if(ch==='"'){if(raw[i+1]==='"'){value+='"';i++;}else{inQuote=false;closed=true;}}else value+=ch;}
      else if(ch===delimiter&&counts[delimiter])push();
      else if(ch==='\n'){push();rows.push(row.splice(0));}
      else if(ch==='"'&&!value.trim()&&!closed){value="";inQuote=true;}
      else if(ch==='"')throw new Error("CSV non valido: virgolette fuori posizione");
      else if(closed&&ch.trim())throw new Error("CSV non valido: caratteri dopo le virgolette");
      else if(!closed)value+=ch;
    }
    if(inQuote)throw new Error("CSV non valido: virgolette non chiuse");
    push();rows.push(row);
    const nonempty=rows.filter(parts=>parts.some(x=>x.trim()));if(!nonempty.length)return [];
    const headers=nonempty[0].map(x=>x.toLocaleLowerCase("it-IT").trim());
    const first=headers.findIndex(h=>["nome","first name"].includes(h));
    const last=headers.findIndex(h=>["cognome","surname","last name"].includes(h));
    const full=headers.findIndex(h=>["nome e cognome","nome cognome","nominativo","corsista","nome completo","full name"].includes(h));
    const hasHeader=first>=0||last>=0||full>=0;
    if(full<0&&hasHeader&&(first<0||last<0))throw new Error("CSV: servono Nome e Cognome oppure una colonna Nominativo");
    const expected=nonempty[0].length;
    if(!hasHeader&&expected>2)throw new Error("CSV: per più colonne usa le intestazioni Nome e Cognome oppure Nominativo");
    return (hasHeader?nonempty.slice(1):nonempty).map((parts,i)=>{
      if(parts.length!==expected)throw new Error(`CSV: numero colonne non valido alla riga ${i+(hasHeader?2:1)}`);
      const name=(full>=0?parts[full]:hasHeader?`${parts[first]} ${parts[last]}`:parts.join(" ")).trim().replace(/\s+/g," ");
      if((hasHeader&&full<0&&(!parts[first]||!parts[last]))||name.length>160||name.includes('"'))throw new Error(`CSV: nominativo non valido alla riga ${i+(hasHeader?2:1)}`);
      try{participantInitials(name);}catch{throw new Error(`CSV: nome e cognome mancanti o non validi alla riga ${i+(hasHeader?2:1)}`);}
      return name;
    });
  }

  $("rosterFile").addEventListener("change", guardAsync(async event => {
    const file = event.target.files[0]; event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1048576) {setStatus("Elenco troppo grande (massimo 2 MB)");return;}
    try {
      const names = parseRosterCSV(await file.text());
      if (!names.length) {setStatus("Nessun nominativo trovato nel file");return;}
      const existing=$("batchNames").value.trim();
      if (existing && existing !== names.join("\n") && !confirm(`Sostituire l’elenco attuale con ${names.length} nominativi importati?`)) return;
      $("batchNames").value = names.join("\n");
      updateBatchCount();
      scheduleAutosave();
      $("quickBatchNames").value=$("batchNames").value;
      setStatus(`${names.length} nominativi importati`);
    } catch(err) {console.error(err);setStatus(err.message || "Impossibile leggere l’elenco");}
  }));
  $("clearRoster").addEventListener("click", () => {
    if ($("batchNames").value.trim() && !confirm("Svuotare l’elenco dei corsisti?")) return;
    $("batchNames").value="";$("quickBatchNames").value="";updateBatchCount();scheduleAutosave();
  });

  $("batchNames").addEventListener("input", ()=>{updateBatchCount();scheduleAutosave();});
  $("autoCertificateCode").addEventListener("change",()=>{syncAutomaticCode();saveSettings();render();});
  $("downloadBatch").addEventListener("click", downloadBatch);
  $("saveProject").addEventListener("click", guardAsync(() => saveProject(false)));
  $("duplicateProject").addEventListener("click", guardAsync(() => saveProject(true)));
  $("openProject").addEventListener("click", guardAsync(openProject));
  $("deleteProject").addEventListener("click", guardAsync(deleteProject));
  $("exportProject").addEventListener("click", guardAsync(exportProject));
  $("importProject").addEventListener("change", guardAsync(importProject));
  $("projectName").addEventListener("input", scheduleAutosave);

  // Modalità rapida e completa: stessi campi e stesso motore PDF, nessuna duplicazione del certificato.
  const disciplineLabels = {
    DETECTION:"DETECTION", MANTRAILING:"MANTRAILING", HRDD:"HRDD", DOGSITTER:"DOGSITTER",
    NOSEWORK:"NOSEWORK", EDUCAZIONE_CINOFILA:"EDUCAZIONE CINOFILA", OBEDIENCE:"OBEDIENCE",
    RECUPERO_COMPORTAMENTALE:"RECUPERO COMPORTAMENTALE", PROTEZIONE_CIVILE:"PROTEZIONE CIVILE"
  };
  const quickDisc = $("quickDiscipline"), quickName = $("quickRecipientName");
  const quickCourse = $("quickCourseName"), quickDate = $("quickCertificateDate");
  let quickMode = "quick";
  let selectedQuickDiscipline = "";
  function detectedDiscipline() {
    try {return disciplineCode();} catch {return "";}
  }
  function syncQuickFromEditor() {
    if (!quickName) return;
    const values = [[quickName, $("recipientName").value], [quickCourse, $("courseName").value], [quickDate, $("certificateDate").value]];
    for (const [el,value] of values) if (el.value !== value) el.value = value;
    const code = $("certificateCode").value.trim();
    const isAuto = $("autoCertificateCode").checked;
    $("quickCodePreview").textContent = code || "Completa disciplina, data e nome e cognome";
    $("quickCodeMode").textContent = isAuto ? "Codice automatico" : "Codice MANUALE (ripetuto nei PDF multipagina)";
    $("quickCode").classList.toggle("manual-code-warning", !isAuto);
    $("quickEnableAuto").classList.toggle("hidden", isAuto);
    const derived = detectedDiscipline();
    const option = Array.from(quickDisc.options).find(o=>o.value === derived && derived);
    const next = option ? derived : derived ? "ALTRO" : "";
    if (quickDisc.value !== next && selectedQuickDiscipline !== "ALTRO") quickDisc.value = next;
    if (!selectedQuickDiscipline || selectedQuickDiscipline !== "ALTRO") selectedQuickDiscipline = next;
    const custom = $("quickCustomDiscipline");
    if (custom) {
      custom.parentElement.classList.toggle("hidden", quickDisc.value !== "ALTRO");
      if (quickDisc.value === "ALTRO" && custom.value !== derived) custom.value = $("certificateDiscipline").value;
    }
  }
  function setEditorMode(mode, persist = true) {
    quickMode = mode === "full" ? "full" : "quick";
    if (quickMode === "full") selectedQuickDiscipline = "";
    document.body.classList.toggle("mode-quick", quickMode === "quick");
    document.body.classList.toggle("mode-full", quickMode === "full");
    $("modeQuick").setAttribute("aria-pressed", String(quickMode === "quick"));
    $("modeFull").setAttribute("aria-pressed", String(quickMode === "full"));
    if (persist) try {localStorage.setItem("k9-certificati-editor-mode", quickMode);} catch {}
    if (quickMode === "quick") { syncQuickFromEditor(); refreshQuickTemplateInfo(); }
  }
  $("modeQuick").addEventListener("click", () => setEditorMode("quick"));
  $("modeFull").addEventListener("click", () => setEditorMode("full"));
  $("quickCustomize").addEventListener("click", () => {
    setEditorMode("full");
    scrollEditorTo(document.querySelector(".quick-nav"));
  });
  quickName.addEventListener("input", () => {$("recipientName").value = quickName.value;deferSettingsSave();queuePreviewRender();});
  quickCourse.addEventListener("input", () => {
    $("courseName").value = quickCourse.value;
    const recognized = courseDisciplineHint(quickCourse.value);
    // Se il corso nomina una sola disciplina riconoscibile, il codice la segue.
    // Titoli generici o che nominano due discipline mantengono la scelta precedente.
    if (recognized && recognized !== $("certificateDiscipline").value.trim()) {
      $("certificateDiscipline").value = recognized;
      selectedQuickDiscipline = recognized;
      refreshQuickTemplateInfo();
    }
    deferSettingsSave();queuePreviewRender();
  });
  quickDate.addEventListener("change", () => {$("certificateDate").value = quickDate.value;saveSettings();queuePreviewRender();});
  quickDisc.addEventListener("change", guardAsync(async () => {
    const chosen = quickDisc.value;
    // Prima di applicare un'altra disciplina, salva il progetto precedente
    // senza sovrascriverlo con il nuovo titolo del corso.
    if (state.initialized && !await persistCurrentSnapshot()){syncQuickFromEditor();return;}
    selectedQuickDiscipline = chosen;
    if (!chosen) {$("certificateDiscipline").value = "";}
    else if (chosen === "ALTRO") {$("certificateDiscipline").value = ""; $("courseName").value = "";}
    else {
      $("certificateDiscipline").value = chosen;
      $("courseName").value = `CORSO ${disciplineLabels[chosen] || chosen}`;
    }
    saveSettings();queuePreviewRender();
    await refreshQuickTemplateInfo();
    if (chosen && chosen !== "ALTRO") {
      const key = orientedTemplateKey(chosen);
      try {
        if (await getOrientedTemplate(key)) {
          const ok = confirm(`Esiste un modello salvato per ${disciplineLabels[chosen] || chosen}. Caricarlo ora (loghi, testi, firme e stile)? Nome, data e corsisti saranno conservati.`);
          if (ok) await loadDisciplineTemplate({key, skipConfirm:true, skipSave:true});
          else setStatus("Modello disponibile: puoi caricarlo in seguito");
        }
      } catch (error) {console.error(error);setStatus("Modello non caricato: usa Carica modello", "warning");}
    }
  }));
  $("quickCustomDiscipline").addEventListener("input", e => {
    selectedQuickDiscipline = "ALTRO";
    $("certificateDiscipline").value = e.target.value;
    deferSettingsSave();queuePreviewRender();
    refreshQuickTemplateInfo();
  });
  $("quickEnableAuto").addEventListener("click", () => {
    $("autoCertificateCode").checked = true;
    syncAutomaticCode(); saveSettings();render();
    setStatus("Codice automatico attivato");
  });

  $("quickOpenBatch").addEventListener("click", () => {$("quickBatchPanel").open = true;$("quickBatchNames").focus();});
  $("quickBatchNames").addEventListener("input", e => {
    $("batchNames").value = e.target.value;
    updateBatchCount();scheduleAutosave();
  });
  $("quickDownloadBatch").addEventListener("click", () => {$("batchNames").value = $("quickBatchNames").value;downloadBatch();});
  $("batchNames").addEventListener("input", () => {$("quickBatchNames").value = $("batchNames").value;});
  function orientedTemplateKey(discipline, orientation=currentOrientation()) {
    return /^[A-Z0-9_]{1,45}$/.test(discipline||"")?`t_${discipline}:${orientation==="portrait"?"portrait":"landscape"}`:"";
  }
  function quickTemplateKey(){return orientedTemplateKey(detectedDiscipline());}
  function templateLabel(key){return `${key.split(":")[0].slice(2).replace(/_/g," ")} · A4 ${key.endsWith(":portrait")?"verticale":"orizzontale"}`;}
  function normalizedTemplateKey(entry){
    const match=String(entry?.id||"").match(/^t_([A-Z0-9_]{1,45})(?::(portrait|landscape))?$/);
    if(!match)throw new Error("Modello disciplina non valido");
    const orientation=entry.form?.pageOrientation==="portrait"?"portrait":"landscape";
    if(match[2]&&match[2]!==orientation)throw new Error("Orientamento del modello non coerente");
    return orientedTemplateKey(match[1],orientation);
  }
  async function getOrientedTemplate(key){
    const exact=await getTemplate(key);if(exact)return exact;
    const legacy=await getTemplate(key.split(":")[0]);
    return legacy&&normalizedTemplateKey(legacy)===key?legacy:null;
  }
  let templateLookupSequence = 0,lastTemplateLookupKey=null;
  async function refreshQuickTemplateInfo() {
    const seq = ++templateLookupSequence;
    const info = $("quickTemplateInfo"), key = quickTemplateKey();lastTemplateLookupKey=key;
    if (!key) {info.textContent="Inserisci una disciplina per usare i modelli";$("quickLoadTemplate").disabled=true;return;}
    try {
      const item = await getOrientedTemplate(key);
      if (seq !== templateLookupSequence) return;
      info.textContent = item ? `Modello salvato per ${templateLabel(key)}` : "Nessun modello salvato: puoi creare e salvare il primo";
      $("quickLoadTemplate").disabled = !item;
    } catch {info.textContent = "Archivio modelli non disponibile";$("quickLoadTemplate").disabled=true;}
  }
  async function saveDisciplineTemplate() {
    try {
      const key = quickTemplateKey();
      if (!key) throw new Error("Inserisci prima la disciplina");
      const previous=await getTemplate(key),legacy=previous||await getOrientedTemplate(key);
      if(legacy && !confirm(`Sostituire il modello già salvato per ${templateLabel(key)}?`)) return;
      const item = snapshot(key,`Modello ${templateLabel(key)}`);
      // Un modello non contiene nominativi o elenchi corsisti.
      item.form.recipientName = "";item.form.certificateCode = "";item.rosterText = "";
      item.currentProjectId = null;item.workingName = "";item.importSourceKey=null;
      if(!previous||await contentFingerprint(previous)!==await contentFingerprint(item))await putTemplate(item,versionOf(previous));
      await refreshQuickTemplateInfo();
      setStatus(`Modello A4 ${currentOrientation() === "portrait" ? "verticale" : "orizzontale"} salvato con loghi e firme`);
    } catch(error) {console.error(error);setStatus(error.message || "Modello non salvato");}
  }
  async function loadDisciplineTemplate({key = quickTemplateKey(), skipConfirm = false, skipSave = false} = {}) {
    try {
      const preset = key && await getOrientedTemplate(key);
      if (!preset) {setStatus("Nessun modello salvato per questa disciplina");return;}
      if (!skipConfirm && !confirm("Caricare grafica, testi, loghi e firme del modello? Il lavoro corrente verrà salvato prima del cambio.")) return;
      if (!skipSave) await requireSaved();
      const name=$("recipientName").value,date=$("certificateDate").value,roster=$("batchNames").value,auto=$("autoCertificateCode").checked,manual=$("certificateCode").value;
      const activeId=state.currentProjectId, projectName=$("projectName").value, savedName=lastSavedProjectName,sourceKey=state.importSourceKey;
      await restoreSnapshot({...preset,currentProjectId:activeId});
      $("recipientName").value = name;$("certificateDate").value = date;
      $("batchNames").value = roster;$("quickBatchNames").value = roster;
      $("autoCertificateCode").checked=auto;if(!auto)$("certificateCode").value=manual;
      state.currentProjectId=activeId;state.importSourceKey=sourceKey;lastSavedProjectName=savedName;$("projectName").value=projectName;$("projectSelector").value=activeId||"";
      syncAutomaticCode();updateBatchCount();saveSettings();render();
      if(await persistCurrentSnapshot())setStatus("Modello caricato: nominativo, data e progetto mantenuti");
    } catch(error) {console.error(error);setStatus("Impossibile aprire il modello");}
  }
  $("quickSaveTemplate").addEventListener("click",guardAsync(saveDisciplineTemplate));
  $("quickLoadTemplate").addEventListener("click",guardAsync(loadDisciplineTemplate));

  async function initialize() {
    try {showGuides = localStorage.getItem("k9-certificati-guide") === "true";} catch {}
    try {showGrid = localStorage.getItem("k9-certificati-grid") === "true";} catch {}
    $("showGuides").checked = showGuides;
    $("togglePreviewGrid").setAttribute("aria-pressed", String(showGrid));
    $("togglePreviewGrid").textContent = showGrid ? "Griglia attiva" : "Griglia";
    loadSettings();
    $("leftSignatureMode").value = "auto";
    $("signatureMode").value = "auto";
    let archiveAvailable=false;
    setEditorBusy(true);
    try {
      const saved=await dbGet("__workspace__");knownProjectVersions.set("__workspace__",versionOf(saved));
      if(saved){
        let data=saved;
        if(saved.currentProjectId){const project=await dbGet(saved.currentProjectId);if(project){knownProjectVersions.set(project.id,versionOf(project));data=String(saved.updatedAt||"")>String(project.updatedAt||"")?{...saved,currentProjectId:project.id}:{...project,currentProjectId:project.id};}else data={...saved,currentProjectId:null};}
        try{await restoreSnapshot(data);}catch(err){recoveryBlocked=true;console.warn("Recupero ultimo lavoro non riuscito",err);setStatus("Recupero ultimo lavoro non riuscito: archivio protetto. Apri un progetto salvato o esporta un backup.","warning");}
      }
      await refreshProjectList();archiveAvailable=true;
    }catch(e){recoveryBlocked=true;console.warn("Archivio locale non disponibile",e);setStatus("Archivio non disponibile: usa backup JSON","warning");}
    state.initialized = true;
    syncAllControls();
    $("quickBatchNames").value = $("batchNames").value;
    try {setEditorMode(localStorage.getItem("k9-certificati-editor-mode") || "quick", false);} catch {setEditorMode("quick", false);}
    render({visualOnly:true});
    updateBatchCount();
    await refreshQuickTemplateInfo();
    await refreshExports();
    void refreshStorageInfo();
    setSaveIndicator(archiveAvailable&&!recoveryBlocked ? "Archivio locale pronto" : "Archivio protetto: recupero necessario", archiveAvailable&&!recoveryBlocked ? "" : "error");
    setEditorBusy(false);
  }
  initialize().catch(error=>{console.error(error);recoveryBlocked=true;state.initialized=true;setEditorBusy(false);setStatus("Avvio non riuscito: archivio protetto, esporta un backup se necessario","warning");});

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    const checkWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("./sw.js", {updateViaCache:"none"});
        await registration.update();
      } catch(error) { console.warn("Controllo aggiornamento offline non riuscito", error); }
    };
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      setStatus("Aggiornamento disponibile: chiudi e riapri l’app online dopo il salvataggio.");
    });
    window.addEventListener("load", checkWorker, {once:true});
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && navigator.onLine) void checkWorker();
    });
  }
})();
