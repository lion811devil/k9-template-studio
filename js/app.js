(() => {
  "use strict";

  const STUDIO_VERSION = "4.9.9-ultra";
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
  function beginExport() {
    if (state.exporting || pendingEditorOperations || !state.initialized) { if (!state.exporting) setStatus("Completa prima l'operazione in corso"); return false; }
    clearTimeout(autosaveTimer);clearTimeout(settingsSaveTimer);saveSettings();
    if(dirty||pendingPreviewFrame)void persistCurrentSnapshot();
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
    $("logoCount").textContent = `${count} / ${MAX_LOGOS} loghi inseriti`;
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
    $("resetThemeBackgroundOpacity").disabled=input.value==="100";
  }
  function frameAlpha(){return Number(normalizeThemeOpacity($("frameOpacity").value))/100;}
  function syncFrameOpacity(){
    const input=$("frameOpacity");
    input.value=normalizeThemeOpacity(input.value);
    $("frameOpacityValue").value=`${input.value}%`;
    const absent=$("frameStyle").value==="none";
    input.disabled=absent;
    $("resetFrameOpacity").disabled=absent||input.value==="100";
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
      $("autoCertificateCode").checked = saved.autoCertificateCode !== false;
      for (const id of designIds.filter(k => k !== "designTheme")) {
        if (saved[id] !== undefined) $(id).value = ["themeBackgroundOpacity","frameOpacity"].includes(id) ? normalizeThemeOpacity(saved[id]) : saved[id];
      }
      if (saved.ornamentStyle === undefined) $("ornamentStyle").value = themePalettes[saved.designTheme]?.ornament || "none";
      selectedTheme = saved.designTheme === "custom" ? "custom" : themePalettes[saved.designTheme] ? saved.designTheme : "classic";
      syncDesignUI();
    } catch {
      setPageOrientation("landscape", false);
      $("certificateDate").value = todayISO();
      $("autoCertificateCode").checked = true;
      $("ornamentStyle").value = "none";
      restoreSignatureControls();
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
  const frameKeys=new Set(premiumFrames.map(([id])=>id));
  // La selezione della cornice non è derivata dal tema, nemmeno in migrazione.
  function populateFrameOptions(){
    const select=$("frameStyle"); if(!select) return;
    const current=select.value || "none";
    select.replaceChildren(new Option("Senza cornice","none"));
    for(const group of ["Mantrailing","HRDD","Detection","Dogsitter"]){
      const items=premiumFrameCatalog.filter(item=>item.group===group);
      if(!items.length) continue;
      const optgroup=document.createElement("optgroup");
      optgroup.label=`${group} · ${items.length} cornici Ultra`;
      for(const item of items) optgroup.appendChild(new Option(item.label,item.id));
      select.appendChild(optgroup);
    }
    select.value=frameKeys.has(current)?current:"none";
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
    if(id==="none"||frameAlpha()===0||!frameKeys.has(id)||!library?.ensure||library.isReady(id)||frameRefreshPending.has(id)||frameFailures.has(id))return;
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
    if(frame!=="none"&&frameAlpha()>0){
      if(window.K9_FRAME_VERSION!==STUDIO_VERSION||!window.K9PremiumFrames?.ensure)throw new Error("Archivio cornici non aggiornato: riapri l’app online");
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
        const button=document.createElement("button");button.type="button";button.className="theme-choice";button.dataset.theme=id;button.setAttribute("aria-label",`Carica stile ${t.label}, ${t.detail}`);button.setAttribute("aria-pressed",String(activeBackgroundId()===id));if(activeBackgroundId()===id)button.classList.add("selected");
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
  }
  function syncGallerySelection(){
    const id=activeBackgroundId(),theme=themePalettes[id],visible=theme&&!archivedThemeIds.has(id);
    const path=visible?galleryPath(id,theme):null;
    $("themePath").textContent=path?[path.group,path.family].filter(Boolean).join(" / "):theme?"Stile storico · compatibile":"Stile personalizzato";
    $("locateTheme").disabled=!path;
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
    const theme = themePalettes[id];
    if (!theme) return;
    const photo=photoKeyFor(id);
    if(photo){photoFailures.delete(photo);await ensurePhoto(photo);}
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

  // Motivi leggeri ai margini: conservano leggibili i testi A4 in ogni orientamento.
  // Sono disegnati anche in drawGraphics(), quindi compaiono in PDF e PNG.
  // 4.9.2: original illustrated, resolution-independent artwork. All dimensions
  // are in stage units; the same paths are drawn at preview and print resolution.
  function illustratedDiscipline(theme, A, D, n, discipline, backgroundAlpha=1) {
    const u=Math.min(W,H)/1190, w=W/u,h=H/u, portrait=h>w;
    const pale='#ffffff', rail=portrait?134:168, style=n%10, edition=Math.floor(n/10)%3;
    const name=discipline==='SAR · ricerca e soccorso'?'RICERCA E SOCCORSO':discipline==='K9 tattici generali'?'UNITÀ CINOFILA':discipline.toUpperCase();
    const legacy=n>=30, sar=discipline==='SAR · ricerca e soccorso', generic=discipline==='K9 tattici generali';
    const mt=discipline==='Mantrailing'||discipline==='SAR · ricerca e soccorso'||discipline==='K9 tattici generali', hr=discipline==='HRDD', dt=discipline==='Detection', ds=discipline==='Dogsitter';
    ctx.save();ctx.scale(u,u);ctx.lineCap='round';ctx.lineJoin='round';
    const path=(d,c,fill=true,z=2,alpha=1)=>{ctx.save();ctx.globalAlpha*=alpha;ctx.lineWidth=z;ctx[fill?'fillStyle':'strokeStyle']=c;const p=new Path2D(d);fill?ctx.fill(p):ctx.stroke(p);ctx.restore();};
    const rect=(x,y,X,Y,c,a=1)=>{ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=c;ctx.fillRect(x,y,X,Y);ctx.restore();};
    const line=(x,y,X,Y,c=A,z=1.6,a=1)=>path(`M${x} ${y}L${X} ${Y}`,c,false,z,a);
    const circle=(x,y,r,c=A,fill=false,z=2,a=1)=>{ctx.save();ctx.globalAlpha*=a;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx[fill?'fillStyle':'strokeStyle']=c;ctx.lineWidth=z;fill?ctx.fill():ctx.stroke();ctx.restore();};
    const at=(x,y,s,f,flip=1)=>{ctx.save();ctx.translate(x,y);ctx.scale(s*flip,s);try{f();}finally{ctx.restore();}};
    const text=(s,x,y,size,c,weight='600',family='Arial')=>{ctx.save();ctx.fillStyle=c;ctx.font=`${weight} ${size}px ${family}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s,x,y);ctx.restore();};
    const frame=(m,c=A,z=2,a=1)=>path(`M${m} ${m}H${w-m}V${h-m}H${m}Z`,c,false,z,a);
    const gradient=(x,y,X,Y,c1,c2)=>{const g=ctx.createLinearGradient(x,y,X,Y);g.addColorStop(0,c1);g.addColorStop(1,c2);return g;};
    // Anatomically recognisable working dog: head lowered, tail, harness and four limbs.
    // A second, seated dog and a spaniel head give each discipline its own imagery.
    function dog(c=A,mode=0,detail=pale){
      if(mode===1){
        path('M-45 45 Q-55 28 -47 4 L-32 -15 -27 -48 -9 -25 Q6 -29 18 -17 L34 -11 45 -4 41 7 23 12 19 28 Q37 48 41 69 L61 74 61 83 18 83 4 56 -6 73 -28 75 -30 83 -59 83 -59 73 -44 66 Q-64 66 -76 55 -83 45 -78 35 -71 54 -53 51Z',c);
        path('M-26 -22L-24 -40 -15 -23M-20 4Q0 18 22 11M-38 26Q-13 27 8 20M6 34Q-12 51 -3 65',detail,false,2.7,.8);circle(12,-12,2.5,detail,true);path('M41 -7L46 -4 42 1',D);
      }else if(mode===2){
        path('M-61 31 Q-71 4 -51 -23 Q-42 -49 -12 -57 Q21 -63 40 -42 Q52 -23 51 -10 L76 7 Q81 16 67 25 L36 31 Q28 51 4 62 L-22 80 -66 80 Q-49 62 -54 48Z',c);
        path('M-35 -45 Q-58 -38 -62 -10 Q-67 25 -49 39 Q-32 42 -29 15 Q-24 -11 -12 -34Z',D,true,2,.58);
        path('M-25 -30Q-33 -1 -41 17M-16 35Q13 47 35 30M-34 55L15 62',detail,false,3,.85);circle(31,-16,3,detail,true);path('M72 5L81 11 74 17 65 13Z',D);
      }else{
        path('M-90 1 Q-108 -9 -119 -30 Q-122 -36 -126 -31 Q-125 -10 -103 13 L-88 20 Q-82 32 -75 39 L-87 69 -105 75 -105 84 -78 84 -64 48 -53 36 -30 42 7 38 24 37 36 49 42 76 62 80 65 88 36 88 25 75 16 52 5 47 -1 63 -12 80 -28 80 -29 88 -3 88 17 68 31 51 44 35 Q52 24 56 10 L72 2 91 7 106 1 118 -2 122 -10 107 -15 86 -19 79 -30 66 -35 49 -62 46 -35 34 -28 Q9 -18 -17 -21 L-54 -22 Q-77 -22 -90 1Z',c);
        path('M49 -34L51 -50 61 -35M48 -14Q57 0 75 1M-69 7Q-54 21 -45 36M-14 -16L-4 35M-14 -16Q8 -29 27 -15L18 35M-6 5L22 1',detail,false,3,.9);circle(80,-18,2.8,detail,true);path('M116 -13L123 -10 119 -5 111 -8Z',D);
      }
    }
    function handler(c){path('M-12 -62A11 11 0 1 1 10 -62A11 11 0 1 1 -12 -62 M-16 -48L12 -48 23 -9 43 3 39 12 13 2 5 -18 8 21 25 69 13 75 -8 39 -24 77 -38 73 -18 25 -23 -4 -36 15 -45 11 -29 -40Z',c);path('M-17 -38L11 -39M-16 -17L8 -17',pale,false,2,.8);}
    function paw(c){for(const [x,y,rx,ry,a] of [[-25,-15,9,14,-.45],[-9,-31,10,15,-.15],[11,-31,10,15,.15],[27,-14,9,14,.45]]){ctx.save();ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,a,0,Math.PI*2);ctx.fill();ctx.restore();}path('M-28 22Q-37 4 -15 -6Q0 -17 15 -6Q37 4 28 22Q23 34 8 26Q0 21 -8 26Q-23 34 -28 22Z',c);}
    function tree(x,y,s,c){at(x,y,s,()=>{path('M0 -48L-24 -10 -12 -10 -31 15 -15 15 -39 43 -5 43 -5 55 5 55 5 43 39 43 15 15 31 15 12 -10 24 -10Z',c);});}
    function compass(c){circle(0,0,50,c,false,2);circle(0,0,43,c,false,1);for(let i=0;i<16;i++){let a=i*Math.PI/8;line(Math.cos(a)*43,Math.sin(a)*43,Math.cos(a)*48,Math.sin(a)*48,c,1);}path('M0 -39L11 -8 39 0 11 8 0 39 -11 8 -39 0 -11 -8Z',c,false,2);path('M0 -39L11 -8 0 0 -11 -8Z',c);text('N',0,-62,12,c,'700');}
    function scent(c){for(let k=0;k<4;k++)path(`M-45 ${-28+k*17} C-17 ${-53+k*17} 5 ${-4+k*17} 46 ${-34+k*17}`,c,false,2.3-k*.26,.9);for(let k=0;k<9;k++)circle(28+(k%3)*13,-24+Math.floor(k/3)*15,2+(k%2),c,true,1,.8);}
    function terrain(c){for(let k=0;k<6;k++){let y=-55+k*19;path(`M-66 ${y}Q-43 ${y-26} -13 ${y-5}T36 ${y+1}T69 ${y-19}`,c,false,1.8,.55);} }
    function grid(c){for(let k=-60;k<=60;k+=20){line(k,-58,k,58,c,1,.55);line(-60,k,60,k,c,1,.55);}path('M-60 -40V-60H-40M40 -60H60V-40M60 40V60H40M-40 60H-60V40',c,false,3);}
    function flag(c){path('M-30 55V-48H37L13 -29 37 -10H-30',c,false,3);circle(-30,-48,3,c,true);path('M-12 53L0 28 12 53Z',c);text('01',0,43,12,pale,'700');}
    function boxSearch(c){for(let k=0;k<3;k++){let x=-66+k*48;path(`M${x} 18l35 -9 12 13 -35 10Z M${x} 18v27l12 11 35 -10V22M${x+12} 32v24`,c,false,2.8);circle(x+23,22,3,c,true);}}
    function home(c){path('M-65 -9L0 -61 65 -9M-49 -14V57H49V-14M-17 57V23Q0 6 17 23V57',c,false,4);at(0,-8,.42,()=>paw(c));path('M-62 57H62',c,false,3);}
    function collar(c){path('M-63 8Q-61 -30 0 -29Q61 -30 63 8Q61 35 0 35Q-61 35 -63 8Z M-49 8Q-42 -15 0 -15Q42 -15 49 8Q42 20 0 20Q-42 20 -49 8Z',c,false,3);path('M-12 22H12V41H-12Z',c,false,3);circle(0,49,9,c,false,2);path('M10 52Q42 65 64 42Q80 24 62 -2',c,false,3);}
    function laurel(c){for(const side of [-1,1])at(0,0,1,()=>{path('M0 53Q-56 29 -51 -44',c,false,2);for(let k=0;k<6;k++){let x=-20-k*6,y=42-k*16;path(`M${x} ${y}q-25 -8 -13 -24q14 3 13 24M${x} ${y}q23 -7 17 -22q-14 1 -17 22`,c,true,1,.87);}},side);}
    // Distinct scenes, not merely icons or changed palettes. Each is rendered at
    // the top or side of the sheet on a locally clipped illustration panel.
    function scene(kind,c,secondary){
      if(sar){
        path('M-68 24L-32 -33 -10 -6 17 -48 66 24Z',secondary,false,2.5);path('M-68 25H66',secondary,false,1.5);at(-18,13,.44,()=>dog(c,0));path('M42 -54V-22M26 -38H58',c,false,5);if(kind%2)at(35,48,.3,()=>compass(c));else circle(42,-38,20,c,false,1.5);
      }else if(generic){
        at(-18,3,.54,()=>dog(c,kind%3));path('M35 48L47 8 59 48Z M31 48H63',secondary,false,2.8);path('M31 -35L47 -45 63 -35V-12L47 0 31 -12Z',secondary,false,2);path('M39 -22L45 -16 56 -29',c,false,2.4);
      }else if(mt){
        if(kind===0){terrain(secondary);at(-42,-20,.54,()=>handler(c));at(24,10,.46,()=>dog(c,0));path('M-21 -14Q4 -23 10 5',c,false,2.2);}
        else if(kind===1){terrain(secondary);for(let k=0;k<4;k++)tree(-50+k*32,-36+(k%2)*12,.36,secondary);at(0,11,.49,()=>dog(c,0));path('M-55 54Q-27 38 5 52T59 42',c,false,2);}
        else if(kind===2){grid(secondary);path('M-57 42L-28 22 -34 -9 12 -18 22 12 54 -34',c,false,3.5);for(const [x,y] of [[-57,42],[-34,-9],[22,12],[54,-34]])circle(x,y,5,c,true);at(40,43,.39,()=>compass(c));}
        else if(kind===3){for(let k=0;k<5;k++)path(`M${-60+k*25} -52v${39+k%2*14}h${17+k%2*6}v${-39-k%2*14}Z`,secondary,true,1,.7);at(0,21,.5,()=>dog(c,0));path('M-60 53H60',c,false,2);}
        else {at(0,-9,.63,()=>dog(c,2));at(0,46,.45,()=>compass(secondary));}
      }else if(hr){
        if(kind===0){grid(secondary);at(-6,11,.49,()=>dog(c,0));at(44,-34,.45,()=>flag(c));}
        else if(kind===1){terrain(secondary);for(let k=0;k<5;k++)line(-62,30+k*7,62,30+k*7,secondary,1.3);at(-5,-3,.45,()=>dog(c,0));at(49,10,.48,()=>flag(c));}
        else if(kind===2){grid(secondary);at(-26,-8,.7,()=>flag(c));path('M3 -49H59V40H3Z M13 -35H49M13 -22H49M13 -9H49M13 4H40',c,false,2);circle(39,32,15,c,false,2);}
        else if(kind===3){path('M-60 -40H-2L8 -30H60V48H-60Z M-60 -19H60',secondary,false,3);at(0,9,.49,()=>dog(c,0));circle(43,-31,8,c,false,2);}
        else{at(0,-5,.6,()=>dog(c,1));at(44,-37,.42,()=>flag(secondary));line(-58,55,58,55,c,2);}
      }else if(dt){
        if(kind===0){at(-6,-15,.52,()=>dog(c,0));at(1,29,.84,()=>boxSearch(secondary));}
        else if(kind===1){at(-35,0,.55,()=>dog(c,2));at(37,-10,.63,()=>scent(secondary));circle(53,-37,5,c,false,2);}
        else if(kind===2){for(let r=15;r<=58;r+=14)circle(0,0,r,secondary,false,1.5);line(-65,0,65,0,secondary,1);line(0,-65,0,65,secondary,1);at(0,0,.48,()=>dog(c,2));}
        else if(kind===3){at(-31,-5,.57,()=>dog(c,1));at(35,17,.55,()=>boxSearch(secondary));path('M19 -21L29 -11 50 -35',c,false,4);}
        else{at(-14,0,.53,()=>dog(c,2));for(let k=0;k<5;k++)circle(48,-37+k*17,3+k*.7,secondary,true);}
      }else if(ds){
        if(kind===0){at(10,-15,.83,()=>home(secondary));at(-13,16,.47,()=>dog(c,1));}
        else if(kind===1){at(-34,-20,.54,()=>handler(secondary));at(24,14,.46,()=>dog(c,0));path('M-14 -7Q10 -23 25 7',c,false,2.3);}
        else if(kind===2){at(0,0,.95,()=>laurel(secondary));at(0,-5,.86,()=>paw(c));}
        else if(kind===3){at(0,-16,.65,()=>dog(c,2));at(0,42,.73,()=>collar(secondary));}
        else{at(-27,-9,.61,()=>dog(c,1));at(29,7,.49,()=>dog(secondary,2));path('M-54 53Q0 44 54 53',c,false,2);}
      }
    }
    function badge(x,y,r,kind,form,dark=false){at(x,y,r/73,()=>{
      const base=dark?D:pale, fg=dark?pale:D, secondary=dark?A:A;
      if(form===0){circle(0,0,72,base,true);circle(0,0,70,A,false,2.8);circle(0,0,64,fg,false,1,.7);}
      if(form===1){path('M0 -76L62 -54V22Q55 51 0 76Q-55 51 -62 22V-54Z',base);path('M0 -76L62 -54V22Q55 51 0 76Q-55 51 -62 22V-54Z',A,false,3);path('M0 -67L54 -48V20Q47 47 0 66Q-47 47 -54 20V-48Z',fg,false,1,.75);}
      if(form===2){path('M-60 -70H60L74 -56V56L60 70H-60L-74 56V-56Z',base);path('M-60 -70H60L74 -56V56L60 70H-60L-74 56V-56Z',A,false,3);path('M-57 -62H57L65 -54V54L57 62H-57L-65 54V-54Z',fg,false,1,.65);}
      if(form===3){path('M-67 67V-10Q-67 -70 0 -74Q67 -70 67 -10V67Z',base);path('M-67 67V-10Q-67 -70 0 -74Q67 -70 67 -10V67Z',A,false,3);}
      at(0,0,.86,()=>scene(kind,fg,secondary));
    });}
    const decorative=(x,y,c,kind)=>at(x,y,.58,()=>{if(mt){kind%2?compass(c):terrain(c);}else if(hr){kind%2?flag(c):grid(c);}else if(dt){kind%2?scent(c):boxSearch(c);}else{kind%2?paw(c):laurel(c);}});
    // Restrict substantial artwork to peripheral zones. No fixed graphic under
    // the editable title, name, body, course or signature text.
    function panel(side,from,to,width,dark){const x=side===0?0:w-width;const g=gradient(x,0,x+width,0,side===0?(dark?D:A):A,side===0?A:(dark?D:A));rect(x,from,width,to-from,g,dark?1:.10);line(side===0?width:w-width,from,side===0?width:w-width,to,A,2.4);}
    function corner(x,y,sx,sy,kind){ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);path('M0 0H175L143 26H48L26 48V143L0 175Z',D);path('M0 0H143L118 13H40L13 40V118L0 143Z',A);for(let k=0;k<4;k++)line(22+k*9,12,12,22+k*9,pale,1,.66);ctx.restore();}
    const Y=h*.52, x=rail*.51, r=rail*.43, kind=(n+edition*2)%5, other=(kind+2+edition)%5;
    // Rich engraved scenery in the paper itself, deliberately below the 10% ink
    // threshold so normal text and user artwork remain readable. No opaque center.
    if(backgroundAlpha>0){
      ctx.save();ctx.globalAlpha=.055*backgroundAlpha;
      at(w/2,h*.51,Math.min(w,h)*.0045,()=>scene(kind,D,A));
      ctx.restore();
    }
    // Each discipline uses its own engraved marginal language. The actual side
    // scene is continuous rather than a row of repeated clip-art symbols.
    if(backgroundAlpha>0) for(const side of [0,1]) {
      const X=side===0?0:w;
      ctx.save();ctx.globalAlpha*=backgroundAlpha;ctx.translate(X,0);ctx.scale(side===0?1:-1,1);
      ctx.beginPath();ctx.rect(0,0,rail*.88,h);ctx.clip();
      const wash=ctx.createLinearGradient(0,0,rail*.88,0);wash.addColorStop(0,A+'26');wash.addColorStop(1,A+'00');rect(0,0,rail*.88,h,wash);
      if(mt){for(let i=0;i<8;i++){const xx=8+i*17;path(`M${xx} 0Q${xx+45} ${h*.13} ${xx+3} ${h*.27}T${xx+3} ${h*.54}T${xx+3} ${h*.81}T${xx} ${h}`,A,false,1.4,.35);} }
      else if(hr){for(let y=75;y<h;y+=32){line(4,y,rail*.88,y,A,1,.25);line(4,y,12+(Math.round(y/32)%5===0?24:8),y,D,1.5,.5);}for(let j=0;j<4;j++)line(12+j*24,0,12+j*24,h,A,1,.22);}
      else if(dt){for(let j=0;j<6;j++){let x0=10+j*19;path(`M${x0} 0C${x0+100} ${h*.27} ${x0-70} ${h*.38} ${x0} ${h*.5}S${x0-80} ${h*.8} ${x0} ${h}`,A,false,1.5,.34);} }
      else{for(let i=0;i<2;i++){const xx=21+i*40;path(`M${xx} 0Q${xx+45} ${h*.2} ${xx} ${h*.4}T${xx} ${h*.8}T${xx} ${h}`,A,false,1.5,.40);for(let y=96;y<h-70;y+=86){path(`M${xx} ${y}q40 -35 26 -53q-27 11 -26 53M${xx} ${y}q-28 -27 -30 -43q30 8 30 43`,A,true,1,.22);}}}
      ctx.restore();
    }
    // The thirty designs use ten distinct frame architectures and three different
    // arrangements of illustrations. Shared motifs do not imply shared layouts.
    switch(style){
      case 0: frame(18,D,4);frame(29,A,1.4);panel(0,0,h,rail*.78,true);panel(1,0,h,rail*.78,true);for(const y of [h*.20,h*.80]){decorative(x*.77,y,pale,n);decorative(w-x*.77,y,pale,n+1);}for(let i=0;i<5;i++){line(15,100+i*6,rail*.70,100+i*6,pale,1,.34);line(w-rail*.70,h-100-i*6,w-15,h-100-i*6,pale,1,.34);}badge(x,Y,r,kind,1,true);badge(w-x,Y,r,other,1,true);break;
      case 1: frame(27,A,3);frame(38,D,1);for(const [X,Y0,sx,sy] of [[0,0,1,1],[w,h,-1,-1]])corner(X,Y0,sx,sy,n);badge(rail*.63,h*.27,r*1.08,kind,2);badge(w-rail*.63,h*.73,r*1.08,other,2);line(rail*.63,h*.38,rail*.63,h*.86,A,1.8);line(w-rail*.63,h*.14,w-rail*.63,h*.62,A,1.8);break;
      case 2: frame(22,A,2.5);frame(32,A,1);for(const X of [x,w-x]){path(`M${X} 115Q${X-40} ${h*.33} ${X} ${h*.5}T${X} ${h-115}`,A,false,2.3,.65);badge(X,h*.23,r*.92,kind,0);badge(X,h*.78,r*.92,other,0);}break;
      case 3: panel(0,0,h,rail*.88,true);path(`M${rail*.88} 0L${rail+18} 80V${h-80}L${rail*.88} ${h}`,A,false,3);line(w-26,30,w-26,h-30,D,3);badge(rail*.47,h*.37,r,kind,2,true);badge(rail*.47,h*.67,r,other,2,true);for(let y=150;y<h-100;y+=105)decorative(w-x*.5,y,A,n);break;
      case 4: frame(23,A,2);for(const X of [x,w-x]){path(`M${X-28} 70V${h-70}M${X+28} 70V${h-70}`,A,false,1.5,.66);badge(X,Y,r,kind,3);decorative(X,h*.23,A,n);decorative(X,h*.79,A,n+1);}break;
      case 5: frame(18,D,1);frame(26,A,3);for(const [X,Y0] of [[x,h*.20],[w-x,h*.20],[x,h*.80],[w-x,h*.80]])badge(X,Y0,r*.86,(kind+(Y0>h/2?2:0)+(X>w/2?1:0))%5,0);break;
      case 6: for(const [X,Y0,sx,sy] of [[0,0,1,1],[w,0,-1,1],[0,h,1,-1],[w,h,-1,-1]])corner(X,Y0,sx,sy,n);for(const X of [x,w-x]){rect(X-3,200,6,h-400,A,.85);badge(X,h*.42,r,kind,1,true);badge(X,h*.68,r*.80,other,0);}break;
      case 7: panel(0,58,h-58,rail*.85,false);panel(1,58,h-58,rail*.85,false);frame(18,D,2);for(const X of [x,w-x]){badge(X,h*.30,r*.9,kind,2);badge(X,h*.63,r*.9,other,3);for(let y=h*.43;y<h*.53;y+=24)circle(X,y,3,A,true);}break;
      case 8: frame(26,A,2);for(const X of [x,w-x]){for(let k=0;k<4;k++)path(`M${X-38+k*8} 90V${h-90}`,A,false,1,.55);badge(X,Y,r*1.06,kind,0,true);decorative(X,h*.20,A,n);decorative(X,h*.80,A,n+1);}break;
      case 9: frame(18,A,3);frame(27,D,1);for(const X of [x,w-x]){path(`M${X-32} 100Q${X+28} ${h*.29} ${X-32} ${h*.5}T${X-32} ${h-100} M${X+32} 100Q${X-28} ${h*.29} ${X+32} ${h*.5}T${X+32} ${h-100}`,A,false,1.8);badge(X,h*.34,r*.96,kind,3);badge(X,h*.68,r*.96,other,1);}break;
    }
    // Large scene panels in the upper margin: landscape composition at left,
    // a secondary disciplinary motif at right. These are not official logos.
    if(![0,2,3,5].includes(style)){
      const yy=110;
      for(const side of [0,1]){const xx=side? w-rail*.55:rail*.55;
        ctx.save();ctx.beginPath();ctx.rect(side?w-rail:0,66,rail,128);ctx.clip();
        ctx.globalAlpha=.55;at(xx,yy+16,rail*.0065,()=>scene(side?other:kind,D,A));ctx.restore();
      }
    }
    if(edition===1){const metallic=theme.profile==='ceremony'?'#A68A51':A;for(const X of [x,w-x]){line(X-25,70,X+25,70,metallic,2);line(X-25,h-70,X+25,h-70,metallic,2);at(X,h-95,.44,()=>laurel(metallic));}}
    if(edition===2){for(const X of [x,w-x]){for(let j=0;j<4;j++){line(X-26+j*6,76,X-9+j*6,61,A,1.6);line(X-26+j*6,h-76,X-9+j*6,h-61,A,1.6);}}}
    // The pre-existing discipline-specific models are deliberately distinct from
    // the 30 new designs: preserve a separate folio architecture for these IDs.
    if(legacy){const l=rail*.9;for(const [xx,sx] of [[0,1],[w,-1]]){ctx.save();ctx.translate(xx,0);ctx.scale(sx,1);path(`M0 0H${l}L${l*.56} 62H0Z`,D);path(`M0 ${h}H${l}L${l*.56} ${h-62}H0Z`,D);for(let j=0;j<3;j++){line(6,22+j*9,l*.51,22+j*9,A,1.5);line(6,h-22-j*9,l*.51,h-22-j*9,A,1.5);}ctx.restore();}}
    // Edition differences are structural: cartouche, engraved header, or double
    // ornamental rule. The caption identifies the actual discipline at a glance.
    const bw=Math.min(w-2*rail-36,550), cx=w/2;
    if(edition===0){path(`M${cx-bw/2} 22H${cx+bw/2}L${cx+bw/2-26} 59H${cx-bw/2+26}Z`,D);line(cx-bw/2+22,55,cx+bw/2-22,55,A,2);text(name,cx,39,23,pale,'700');}
    else if(edition===1){line(cx-bw/2,32,cx-155,32,A,2);line(cx+155,32,cx+bw/2,32,A,2);circle(cx-bw/2,32,4,A,true);circle(cx+bw/2,32,4,A,true);text(name,cx,38,24,D,'700','Georgia');line(cx-115,57,cx+115,57,A,1);}
    else{path(`M${cx-bw/2} 24H${cx+bw/2}V58H${cx-bw/2}Z`,pale);path(`M${cx-bw/2} 24H${cx+bw/2}V58H${cx-bw/2}Z`,A,false,2);text(name,cx,41,22,D,'700');}
    // Bottom ornament sits below the signature safe area; no invented logos,
    // accreditation or certification marks are printed.
    line(cx-105,h-29,cx-19,h-29,A,1.6);line(cx+19,h-29,cx+105,h-29,A,1.6);
    at(cx,h-29,.23,()=>{if(ds)paw(A);else if(mt)compass(A);else if(hr)flag(A);else scent(A);});
    ctx.restore();
  }
  // Retain the visual architecture of general themes. Add category-specific
  // engraved edge finishing, not a universal overlay across the content area.
  function refinedGeneralEdge(theme,A,D,backgroundAlpha=1){
    const category=theme.category, s=Math.min(W,H)/1190, w=W/s,h=H/s;
    ctx.save();ctx.scale(s,s);ctx.lineCap='round';
    const stroke=(d,c,z=1,a=1)=>{ctx.save();ctx.strokeStyle=c;ctx.lineWidth=z;ctx.globalAlpha=a;ctx.stroke(new Path2D(d));ctx.restore();};
    const fill=(d,c,a=1)=>{ctx.save();ctx.fillStyle=c;ctx.globalAlpha=a;ctx.fill(new Path2D(d));ctx.restore();};
    if(backgroundAlpha>0){
      ctx.save();ctx.globalAlpha*=backgroundAlpha;
      const soft=ctx.createLinearGradient(0,0,38,0);soft.addColorStop(0,A+'22');soft.addColorStop(1,A+'00');ctx.fillStyle=soft;ctx.fillRect(0,0,38,h);
      const other=ctx.createLinearGradient(w-38,0,w,0);other.addColorStop(0,A+'00');other.addColorStop(1,A+'22');ctx.fillStyle=other;ctx.fillRect(w-38,0,38,h);
      ctx.restore();
    }
    const serif=['Premium','Cerimoniali','Accademici','Eleganti','Base'].includes(category);
    for(const [x,y,sx,sy] of [[0,0,1,1],[w,0,-1,1],[0,h,1,-1],[w,h,-1,-1]]){
      ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);
      if(serif){stroke('M7 112V7H112M13 82V13H82',A,1.8,.9);for(let i=0;i<4;i++){const t=17+i*14;stroke(`M7 ${t}Q23 ${t-8} 13 ${t-16}M${t} 7Q${t-8} 23 ${t-16} 13`,A,1,.78);}fill('M9 9L18 9 9 18Z',D,.8);}
      else if(category==='Creativi'){for(let i=0;i<3;i++)stroke(`M${7+i*5} 100V${7+i*5}H${100-i*12}`,A,2,.8-i*.13);}
      else if(category==='Natura e K9'||category==='Natura'){stroke('M10 100Q5 50 10 10Q50 5 100 10',A,1.5,.9);for(let i=0;i<5;i++){let y0=18+i*15;fill(`M10 ${y0}q18 -13 15 -20q-16 5 -15 20M${y0} 10q-13 18 -20 15q5 -16 20 -15`,A,.75);}}
      else{fill('M0 0H107L85 8H8V85L0 107Z',D,.91);stroke('M13 80V13H80',A,2,.9);for(let i=0;i<4;i++)stroke(`M3 ${25+i*10}H10M${25+i*10} 3V10`,A,1.3,.8);}
      ctx.restore();
    }
    ctx.restore();
  }

  function drawCatalogOrnament(ornament = $("ornamentStyle").value, color = designColor("accentColor", "#735a2f"), ink = designColor("inkColor", "#26231f"), theme = themePalettes[selectedTheme], backgroundAlpha=1) {
    const id = Object.keys(themePalettes).find(key => themePalettes[key] === theme);
    if(specialK9Ids.has(ornament)) {
      const t=themePalettes[ornament]; illustratedDiscipline(t,color,ink,t.layout,t.discipline,backgroundAlpha); return;
    }
    if(theme && id && !archivedThemeIds.has(id) && theme.ornament===ornament) {
      const group=galleryPath(id,theme).group;
      if(["Mantrailing","HRDD","Detection","Dogsitter","K9 tattici generali","SAR · ricerca e soccorso"].includes(group)) {
        const related=catalogThemes.filter(([key,t])=>!specialK9Ids.has(key)&&galleryPath(key,t).group===group);
        const number=related.findIndex(([key])=>key===id);
        illustratedDiscipline(theme,color,ink,30+Math.max(0,number),group,backgroundAlpha);return;
      }
      refinedGeneralEdge(theme,color,ink,backgroundAlpha);
    }
    drawLegacyCatalogOrnament(ornament,color,ink);
  }
  function drawLegacyCatalogOrnament(ornament, color, ink) {
    if (!ornament || ornament === "none") return;
    if (specialK9Ids.has(ornament)) { drawSpecialK9(ornament,color,ink); return; }
    if (signatureThemeIds.has(ornament)) { drawSignatureCollection(ornament,color,ink); return; }
    if (professionalOrnaments.has(ornament)) { drawProfessionalOrnament(ornament,color,ink); return; }
    const m = Math.max(34, Math.min(W, H) * .042);
    const a = Math.min(W, H) * .14;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const line = (x1,y1,x2,y2,width=2,alpha=.4) => {
      ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    };
    const circle = (x,y,r,alpha=.26,filled=false) => {
      ctx.globalAlpha=alpha;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);filled?ctx.fill():ctx.stroke();
    };
    const poly = (points,alpha=.1) => {
      ctx.globalAlpha=alpha;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
    };
    const top = m + 33, bottom = H-m-33;
    const corners = [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]];
    switch (ornament) {
      case "topline":
        for (const y of [top, top+16, bottom-16, bottom]) line(m+20,y,W-m-20,y,y===top||y===bottom?3:1.5,.33);
        circle(W/2,top+8,10,.58,true);circle(W/2,bottom-8,10,.58,true);break;
      case "arch":
        ctx.globalAlpha=.38;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(m+35,H-m-20);ctx.lineTo(m+35,m+2);ctx.quadraticCurveTo(W/2,-m*1.1,W-m-35,m+2);ctx.lineTo(W-m-35,H-m-20);ctx.stroke();
        line(m+54,H-m-50,W-m-54,H-m-50,2,.18);break;
      case "petals":
      case "laurel":
      case "filigree":
        corners.forEach(([x,y,sx,sy])=>{
          for(let i=1;i<=5;i++){
            const dx=sx*(i*16+8),dy=sy*(i*10+7);
            ctx.globalAlpha=.28;ctx.lineWidth=2;
            ctx.beginPath();ctx.moveTo(x+dx,y);ctx.quadraticCurveTo(x+dx+sx*15,y+sy*12,x+dx,y+sy*27);ctx.stroke();
            if(ornament!=="filigree")circle(x+dx+sx*6,y+dy,2.7,.26,true);
          }
        });
        if(ornament==="filigree") {line(m+90,top,W-m-90,top,2,.15);line(m+90,bottom,W-m-90,bottom,2,.15);}
        break;
      case "crown":
      case "diamonds":
        for(const y of [top,bottom]){
          line(m+65,y,W-m-65,y,2,.32);
          for(const dx of [-52,0,52]){
            const x=W/2+dx;
            poly([[x,y-13],[x+13,y],[x,y+13],[x-13,y]],dx===0?.38:.18);
          }
        }break;
      case "rays":
      case "radial":
      case "rings":
        corners.forEach(([x,y])=>{
          if(ornament==="rays"){
            for(let i=0;i<8;i++){
              const th=i*Math.PI/4;
              line(x+Math.cos(th)*45,y+Math.sin(th)*45,x+Math.cos(th)*(a+.5),y+Math.sin(th)*(a+.5),2,.14);
            }
          }else for(let r=35;r<=a;r+=27)circle(x,y,r,.13);
        });break;
      case "columns":
      case "sideband":
        for(const x of [m+14,W-m-14]){
          ctx.globalAlpha=ornament==="sideband"?.10:.18;
          ctx.fillRect(x-10,m+40,20,H-2*m-80);
          line(x-20,m+40,x-20,H-m-40,1.5,.30);
        }break;
      case "stripes":
      case "lines":
        for(let i=0;i<4;i++){
          const y=m+10+i*13;
          line(m+20,y,W-m-20,y,ornament==="stripes"?5:1.5,.10+i*.045);
          line(m+20,H-y,W-m-20,H-y,ornament==="stripes"?5:1.5,.10+i*.045);
        }break;
      case "steps":
        corners.forEach(([x,y,sx,sy])=>{
          for(let i=0;i<4;i++){
            const d=18+i*23;line(x+sx*d,y,x+sx*d,y+sy*(a-d/3),2,.22);
            line(x,y+sy*d,x+sx*(a-d/3),y+sy*d,2,.22);
          }
        });break;
      case "network":
      case "grid":
      case "tiles":
        corners.forEach(([x,y,sx,sy])=>{
          for(let i=0;i<4;i++)for(let j=0;j<4;j++){
            const px=x+sx*(i*32),py=y+sy*(j*32);
            if(ornament==="tiles") {ctx.globalAlpha=.065;ctx.fillRect(px,py,19*sx,19*sy);}
            else {circle(px,py,ornament==="grid"?1.5:3,.19,true);
              if(ornament==="network"&&i<3&&j%2===0)line(px,py,px+sx*32,py+sy*32,1,.13);}
          }
        });break;
      case "diagonal":
        poly([[0,0],[a*1.5,0],[0,a*.72]],.105);
        poly([[W,H],[W-a*1.5,H],[W,H-a*.72]],.105);
        line(m+10,top,W/2-a,top,2,.20);line(W/2+a,bottom,W-m-10,bottom,2,.20);break;
      case "waves":
      case "contours":
        for(const y0 of [top,bottom])for(let i=0;i<3;i++){
          const y=y0+i*15*(y0===top?1:-1);
          ctx.globalAlpha=.12+i*.05;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(m+10,y);
          ctx.bezierCurveTo(W*.26,y-25,W*.34,y+25,W*.5,y);
          ctx.bezierCurveTo(W*.66,y-25,W*.74,y+25,W-m-10,y);ctx.stroke();
        }break;
      case "ribbon":
        ctx.globalAlpha=.10;ctx.fillRect(0,0,W,90);ctx.fillRect(0,H-90,W,90);
        line(0,100,W,100,4,.35);line(0,H-100,W,H-100,4,.35);break;
      default: break;
    }
    ctx.restore();
  }

  // Grafica originale procedurale, in coordinate A4: tutte le decorazioni restano ai bordi.
  // Signature Collection: original decorative artwork in stage coordinates, not bitmap templates.
  // Keep central field unobstructed; the same drawing path is used for preview and UHD output.
  // Native-resolution artwork. Edge-only architecture keeps the certificate text area clear.
  function drawSpecialK9(id,A,D){
    const t=themePalettes[id], n=t.layout, discipline=t.discipline, dog=discipline==='Dogsitter', hr=discipline==='HRDD', dt=discipline==='Detection', mt=discipline==='Mantrailing';
    const u=Math.min(W,H)/1190, w=W/u,h=H/u, T=Math.PI*2, paper='#ffffff';
    ctx.save();ctx.scale(u,u);ctx.lineCap='round';ctx.lineJoin='round';
    const stroke=(c,z,f,alpha=1)=>{ctx.save();ctx.strokeStyle=c;ctx.lineWidth=z;ctx.globalAlpha=alpha;ctx.beginPath();f(ctx);ctx.stroke();ctx.restore();};
    const shape=(c,f,alpha=1)=>{ctx.save();ctx.fillStyle=c;ctx.globalAlpha=alpha;ctx.beginPath();f(ctx);ctx.fill();ctx.restore();};
    const rect=(c,x,y,X,Y,a=1)=>shape(c,q=>q.rect(x,y,X,Y),a);
    const line=(c,x,y,X,Y,z=1,a=1)=>stroke(c,z,q=>{q.moveTo(x,y);q.lineTo(X,Y);},a);
    const poly=(c,pts,a=1)=>shape(c,q=>{pts.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.closePath();},a);
    const outline=(c,pts,z=2,a=1)=>stroke(c,z,q=>{pts.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.closePath();},a);
    const circle=(c,x,y,r,z=1,a=1)=>stroke(c,z,q=>q.arc(x,y,r,0,T),a);
    const dot=(c,x,y,r,a=1)=>shape(c,q=>q.arc(x,y,r,0,T),a);
    const at=(x,y,sx,sy,f)=>{ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);try{f();}finally{ctx.restore();}};
    const corners=f=>{for(const [x,y,sx,sy] of [[0,0,1,1],[w,0,-1,1],[0,h,1,-1],[w,h,-1,-1]])at(x,y,sx,sy,f);};
    const sides=f=>{at(0,0,1,1,f);at(w,0,-1,1,f);};
    const ends=f=>{at(0,0,1,1,f);at(0,h,1,-1,f);};
    const border=(m,z=2,c=A)=>stroke(c,z,q=>q.rect(m,m,w-2*m,h-2*m));
    const diamond=(x,y,r,c=A)=>outline(c,[[x-r,y],[x,y-r],[x+r,y],[x,y+r]],1.8);
    const leaf=(x,y,r,angle,c=A)=>{ctx.save();ctx.translate(x,y);ctx.rotate(angle);shape(c,q=>{q.moveTo(-r,0);q.quadraticCurveTo(0,-r*.9,r,0);q.quadraticCurveTo(0,r*.9,-r,0);},.8);line(paper,-r*.7,0,r*.7,0,.8,.8);ctx.restore();};
    const rosette=(x,y,r,k,c=A)=>stroke(c,1.5,q=>{for(let i=0;i<=180;i++){const a=i*T/180,rr=r*(.79+.21*Math.cos(k*a));const X=x+rr*Math.cos(a),Y=y+rr*Math.sin(a);i?q.lineTo(X,Y):q.moveTo(X,Y);}q.closePath();});
    // Distinct engraved visual languages: a route with waypoints, an evidence grid,
    // concentric olfactory waves, or a paw with four digital pads and a leaf.
    function emblem(x,y,r,c=A,variant=n){at(x,y,r/25,r/25,()=>{
      if(mt){stroke(c,2.4,q=>{q.moveTo(-20,16);q.bezierCurveTo(-12,2,4,21,3,0);q.bezierCurveTo(2,-15,16,-7,20,-19);});for(const [X,Y] of [[-20,16],[3,0],[20,-19]]){circle(c,X,Y,3.5,1.5);dot(c,X,Y,1.1);}if(variant%3===0){line(c,-14,-17,-14,-7,1.2);line(c,-19,-12,-9,-12,1.2);}}
      else if(hr){outline(c,[[-19,-19],[19,-19],[19,19],[-19,19]],1.7);for(let j=-9;j<=9;j+=9){line(c,j,-18,j,18,1,.7);line(c,-18,j,18,j,1,.7);}outline(c,[[-9,-8],[10,-8],[10,8],[-9,8]],2);dot(c,0,0,2);if(variant%2===0){line(c,-24,-24,-14,-24,1.5);line(c,-24,-24,-24,-14,1.5);}}
      else if(dt){for(let j=1;j<=3;j++)stroke(c,1.8,q=>q.arc(0,0,j*7,Math.PI*.12,Math.PI*1.83));dot(c,0,0,3);line(c,0,0,22,-10,1.5);circle(c,22,-10,2.6,1.3);}
      else {shape(c,q=>{q.moveTo(-13,12);q.bezierCurveTo(-20,3,-8,-6,0,-3);q.bezierCurveTo(8,-6,20,3,13,12);q.bezierCurveTo(9,18,4,10,0,12);q.bezierCurveTo(-4,10,-9,18,-13,12);});for(const [X,Y,R] of [[-15,-7,-.5],[-6,-15,-.18],[6,-15,.18],[15,-7,.5]])shape(c,q=>q.ellipse(X,Y,4.4,6.4,R,0,T));}
    });}
    // Fine pattern repeated within the edge only. Each discipline has a different topology.
    function edgePattern(x,y,X,Y,step=48,c=A){let L=Math.hypot(X-x,Y-y);if(!L)return;let a=Math.atan2(Y-y,X-x);ctx.save();ctx.translate(x,y);ctx.rotate(a);try{for(let z=step/2;z<L-step/3;z+=step){if(mt){stroke(c,1.4,q=>{q.moveTo(z-20,0);q.bezierCurveTo(z-8,-10,z+8,10,z+20,0);});dot(c,z,0,2);}else if(hr){line(c,z-17,-7,z+17,-7,1);line(c,z-17,7,z+17,7,1);for(let j=-12;j<=12;j+=6)line(c,z+j,-7,z+j+4,7,1,.8);diamond(z,0,3,c);}else if(dt){for(let j=0;j<3;j++)stroke(c,1.4,q=>q.arc(z-11,0,5+j*5,-.75,.75));dot(c,z-11,0,1.9);}else{leaf(z-6,0,8,-.65,c);leaf(z+6,0,8,.65,c);dot(c,z,0,1.3);}}}finally{ctx.restore();}}
    function plaque(x,y,r,form=0){if(form===0){circle(D,x,y,r,2);circle(A,x,y,r-5,1);emblem(x,y,r*.54);}else if(form===1){diamond(x,y,r,D);diamond(x,y,r-5);emblem(x,y,r*.48);}else{outline(D,[[x-r,y-r*.68],[x+r,y-r*.68],[x+r,y+r*.24],[x,y+r],[x-r,y+r*.24]],2);emblem(x,y,r*.48);}}
    // Dedicated border architectures, not palette variants of the Mantrailing line.
    function drawForensic(){
      const mark=(x,y,r=26)=>{outline(D,[[x-r,y-r],[x+r,y-r],[x+r,y+r],[x-r,y+r]],2.2);for(let i=1;i<=3;i++){line(A,x-r+i*r/2,y-r,x-r+i*r/2,y+r,1,.65);line(A,x-r,y-r+i*r/2,x+r,y-r+i*r/2,1,.65);}diamond(x,y,r*.43,D);dot(A,x,y,3);};
      const ticks=(x,y,X,Y,space=22)=>{let L=Math.hypot(X-x,Y-y),a=Math.atan2(Y-y,X-x);ctx.save();ctx.translate(x,y);ctx.rotate(a);line(D,0,0,L,0,1.7);for(let i=0,z=0;z<=L;z+=space,i++)line(A,z,0,z,i%5===0?15:6,i%5===0?2:1);ctx.restore();};
      const strata=(x,y,X,Y,amp=8)=>{for(let k=0;k<5;k++)stroke(k%2?A:D,k===0?2.5:1.2,q=>{for(let i=0;i<=50;i++){let z=i/50,xx=x+(X-x)*z,yy=y+(Y-y)*z+(k-2)*7+amp*Math.sin(z*T*2+k*.45);i?q.lineTo(xx,yy):q.moveTo(xx,yy);}},.85);};
      const tab=(x,y,sx=1,sy=1)=>at(x,y,sx,sy,()=>{poly(D,[[0,0],[132,0],[111,33],[58,33],[58,90],[0,90]],.95);line(A,8,8,116,8,2);mark(29,43,16);});
      const specimen=(x,y,r=24)=>{circle(A,x,y,r,1.6);circle(D,x,y,r-5,2);line(D,x-r-7,y,x+r+7,y,1);line(D,x,y-r-7,x,y+r+7,1);dot(A,x,y,3);};
      switch(n){
      case 0: rect(D,0,0,w,27);rect(A,0,28,w,6);corners(()=>{stroke(D,3,q=>{q.moveTo(18,180);q.lineTo(18,52);q.lineTo(132,52);});mark(50,83,26);});ends(()=>ticks(165,47,w-165,47,32));break;
      case 1: rect(D,0,0,48,h);for(let y=45;y<h-30;y+=84){rect(paper,11,y,25,48,.85);mark(24,y+24,9);}rect(A,49,0,5,h);ends(()=>{line(D,92,27,w-90,27,3);line(A,92,40,w*.55,40,2);});break;
      case 2: ends(()=>{for(let x=90;x<w-85;x+=85){mark(x,29,22);line(A,x+27,29,x+58,29,1);}});sides(()=>ticks(28,70,28,h-70,24));break;
      case 3: ends(()=>strata(0,38,w,38,12));sides(()=>{for(let y=110;y<h-60;y+=118){strata(12,y,83,y+18,5);dot(A,46,y+32,3);}});break;
      case 4: for(const [x,y,sx,sy] of [[0,0,1,1],[w,h,-1,-1]])at(x,y,sx,sy,()=>{poly(D,[[0,0],[w*.31,0],[w*.24,35],[75,35],[75,142],[0,142]]);ticks(88,47,w*.24,47,16);mark(37,70,23);});for(const [x,y] of [[w-45,45],[45,h-45]])specimen(x,y,28);break;
      case 5: border(16,1,D);corners(()=>{for(let k=0;k<5;k++)line(A,20,20+k*13,98,20+k*13,1);mark(54,54,22);});sides(()=>{line(D,53,120,53,h-120,1.6);for(let y=165;y<h-130;y+=115)specimen(53,y,23);});break;
      case 6: sides(()=>{rect(D,0,0,18,h);rect(A,22,0,5,h);for(let y=60;y<h-25;y+=102){outline(A,[[35,y],[72,y],[72,y+53],[35,y+53]],1.5);line(D,35,y+53,72,y,1.5);dot(D,53,y+27,4);}});break;
      case 7: corners(()=>{for(let k=0;k<6;k++)stroke(A,1.4,q=>{q.moveTo(12+k*14,120);q.lineTo(12+k*14,12+k*14);q.lineTo(120,12+k*14);});mark(32,32,15);});ends(()=>{ticks(150,31,w-150,31,25);});break;
      case 8: for(const [x,s] of [[0,1],[w,-1]])at(x,0,s,1,()=>{for(let i=0,y=0;y<h;y+=h/7,i++){poly(i%2?A:D,[[0,y],[60,y+14],[46,y+h/7-14],[0,y+h/7]],.86);if(i%2)mark(24,y+h/14,14);}});break;
      case 9: corners(()=>tab(0,0));sides(()=>{for(let y=150;y<h-110;y+=75){line(D,25,y,76,y,1.5);line(A,25,y+7,52,y+7,3);}});break;
      case 10: ends(()=>{for(let x=0,i=0;x<w;x+=w/14,i++)poly(i%2?A:D,[[x,0],[x+w/14,0],[x+w/14-16,24],[x+16,24]],.9);});sides(()=>{ticks(34,75,34,h-75,21);for(let y=130;y<h-70;y+=150)mark(71,y,19);});break;
      case 11: border(39,1,A);corners(()=>{line(D,18,18,126,18,4);line(D,18,18,18,126,4);specimen(56,56,25);});ends(()=>{line(D,w*.26,19,w*.74,19,2);mark(w/2,43,23);});break;
      case 12: rect(D,0,0,12,h);rect(D,w-12,0,12,h);for(let y=80,i=0;y<h-65;y+=85,i++){rect(A,21,y,44,7);rect(D,w-65,y+13,44,7);if(i%3===0){mark(43,y+38,15);mark(w-43,y+38,15);}}ends(()=>{line(A,89,19,w-89,19,2);});break;
      case 13: ends(()=>{rect(A,24,24,w-48,39,.11);for(let x=72;x<w-65;x+=66)specimen(x,43,15);});sides(()=>{line(D,22,105,22,h-105,2);line(A,31,105,31,h-105,1);});break;
      case 14: corners(()=>{outline(D,[[18,18],[119,18],[119,55],[55,55],[55,119],[18,119]],2.5);mark(37,37,15);});sides(()=>{for(let y=155;y<h-130;y+=103){outline(A,[[24,y],[63,y],[63,y+42],[24,y+42]],1.5);line(D,24,y+42,63,y,1);}});break;
      case 15: ends(()=>{for(let j=0;j<5;j++)stroke(j%2?D:A,1.5,q=>{q.moveTo(0,12+j*9);q.bezierCurveTo(w*.25,4+j*9,w*.56,24+j*9,w,12+j*9);});});sides(()=>{for(let y=120;y<h-85;y+=99){strata(8,y,70,y+20,6);specimen(37,y+30,13);}});break;
      case 16: corners(()=>{for(let i=0;i<4;i++)for(let j=0;j<4;j++){let x=20+i*25,y=20+j*25;rect((i+j)%2?A:D,x,y,20,20,(i+j)%2?.45:.9);}mark(69,69,13);});ends(()=>ticks(138,22,w-138,22,20));break;
      case 17: sides(()=>{for(let y=32,i=0;y<h-45;y+=64,i++){const x=i%2?31:13;poly(i%2?A:D,[[x,y],[x+42,y],[x+42,y+32],[x+9,y+47],[x,y+47]],.9);line(paper,x+10,y+8,x+10,y+32,1.4);}});ends(()=>line(D,100,24,w-100,24,2));break;
      case 18: ends(()=>{for(const x of [w*.16,w*.5,w*.84]){specimen(x,36,26);line(A,x-90,36,x-36,36,1.5);line(A,x+36,36,x+90,36,1.5);}});sides(()=>ticks(37,105,37,h-105,30));break;
      case 19: sides(()=>{for(let y=70,i=0;y<h-40;y+=90,i++){let x=i%2?70:28;mark(x,y,17);if(y+90<h-40)line(D,x,y+19,i%2?28:70,y+71,1.8);}});ends(()=>{line(A,w*.30,30,w*.70,30,4);});break;
      case 20: ends(()=>{rect(D,0,0,w,15);ticks(30,27,w-30,27,20);});sides(()=>{for(let y=95;y<h-60;y+=130){rect(A,18,y,46,24,.23);mark(41,y+12,9);line(D,18,y+35,63,y+35,2);line(A,18,y+45,48,y+45,1);}});break;
      case 21: for(const [x,y,sx,sy] of [[0,0,1,1],[w,h,-1,-1]])at(x,y,sx,sy,()=>{poly(A,[[0,0],[w*.35,0],[w*.27,47],[0,47]],.8);poly(D,[[0,0],[w*.28,0],[w*.2,34],[0,34]]);for(let x=25;x<w*.2;x+=26)line(paper,x,6,x+13,26,1.5);});sides(()=>{line(D,30,95,30,h-95,2);for(let y=135;y<h-110;y+=110)mark(55,y,15);});break;
      case 22: corners(()=>{poly(D,[[0,0],[117,0],[117,41],[64,41],[64,117],[0,117]],.85);outline(A,[[8,8],[105,8],[105,30],[54,30],[54,105],[8,105]],2);specimen(31,31,19);});ends(()=>ticks(150,30,w-150,30,27));break;
      case 23: sides(()=>{for(let j=0;j<4;j++)stroke(j%2?D:A,1.7,q=>{for(let i=0;i<=100;i++){let y=h*i/100,x=22+j*10+8*Math.sin(y/h*T*5+j*.4);i?q.lineTo(x,y):q.moveTo(x,y);}});});ends(()=>{for(let x=135;x<w-100;x+=110)mark(x,31,18);});break;
      case 24: ends(()=>{for(let i=0;i<5;i++){let Y=4+i*9;rect(i%2?D:A,0,Y,w*.42-i*25,6,.84);rect(i%2?A:D,w-(w*.42-i*25),Y,w*.42-i*25,6,.84);}specimen(w/2,31,18);});sides(()=>ticks(24,100,24,h-100,21));break;
      case 25: sides(()=>{for(let y=45,i=0;y<h-40;y+=78,i++){outline(i%2?A:D,[[12,y],[77,y],[68,y+48],[12,y+48]],2.4);rect(A,12,y,7,48,.85);mark(44,y+24,14);}});break;
      case 26: border(19,1,A);corners(()=>{for(let i=0;i<4;i++)diamond(50,50,18+i*11,i%2?D:A);specimen(50,50,13);});ends(()=>{line(D,112,19,w-112,19,2);edgePattern(125,36,w-125,36,54);});break;
      case 27: ends(()=>{for(let x=90;x<w-85;x+=54){line(D,x,10,x+30,46,1.6);line(A,x+30,10,x,46,1.6);}line(A,30,50,w-30,50,2);});sides(()=>{for(let y=95;y<h-75;y+=85)mark(32,y,20);});break;
      case 28: corners(()=>{stroke(D,7,q=>{q.moveTo(14,158);q.lineTo(14,73);q.lineTo(73,14);q.lineTo(158,14);});stroke(A,2,q=>{q.moveTo(29,158);q.lineTo(29,80);q.lineTo(80,29);q.lineTo(158,29);});mark(60,60,18);});break;
      case 29: border(28,1,D);ends(()=>{for(let x=115;x<w-100;x+=76){diamond(x,45,19);mark(x,45,9);}});sides(()=>{line(A,43,100,43,h-100,2);for(let y=125;y<h-90;y+=74){diamond(43,y,24,D);specimen(43,y,11);}});break;
      }
    }
    function drawDetection(){
      const wave=(x,y,r,c=A,count=4,angle=0)=>at(x,y,1,1,()=>{ctx.save();ctx.rotate(angle);for(let j=1;j<=count;j++)stroke(c,1.9,q=>q.arc(0,0,r*j/count,-Math.PI*.72,Math.PI*.72),1-j*.11);dot(c,0,0,3);ctx.restore();});
      const hex=(x,y,r,c=A,z=2)=>outline(c,Array.from({length:6},(_,i)=>[x+r*Math.cos(i*T/6),y+r*Math.sin(i*T/6)]),z);
      const signal=(x,y,X,Y,amp=12,c=A)=>stroke(c,2.1,q=>{for(let i=0;i<=100;i++){let t=i/100,xx=x+(X-x)*t,yy=y+(Y-y)*t+amp*Math.sin(t*T*5)*(.35+.65*Math.sin(t*Math.PI));i?q.lineTo(xx,yy):q.moveTo(xx,yy);}});
      const nodes=(x,y,X,Y,step=70)=>{const L=Math.hypot(X-x,Y-y);line(D,x,y,X,Y,1.4);for(let z=step/2;z<L;z+=step){let f=z/L,xx=x+(X-x)*f,yy=y+(Y-y)*f;dot(paper,xx,yy,7);circle(A,xx,yy,6,2);dot(D,xx,yy,2);}};
      const target=(x,y,r=25)=>{for(let i=1;i<=3;i++)circle(i%2?D:A,x,y,r*i/3,1.7);line(A,x-r-6,y,x+r+6,y,1);line(A,x,y-r-6,x,y+r+6,1);dot(D,x,y,2.5);};
      switch(n){
      case 0: ends(()=>{poly(D,[[0,0],[w*.44,0],[w*.39,28],[95,28],[0,100]]);poly(A,[[w,0],[w*.67,0],[w*.71,19],[w,19]]);signal(w*.44,43,w*.94,43,9);});sides(()=>{for(let y=130;y<h-80;y+=95)wave(29,y,25,A,3);});break;
      case 1: corners(()=>{target(50,50,33);line(D,50,90,50,170,3);line(D,90,50,170,50,3);});ends(()=>nodes(190,29,w-190,29,57));break;
      case 2: sides(()=>{for(let y=45;y<h-30;y+=83){for(let i=1;i<=3;i++)circle(i%2?A:D,31,y,7*i,1.8);line(A,31,y,69,y-16,1.7);dot(D,69,y-16,3);}});ends(()=>{line(D,105,26,w-105,26,3);signal(w*.30,42,w*.70,42,9);});break;
      case 3: ends(()=>{for(let j=0;j<4;j++)signal(0,11+j*10,w,11+j*10,5+j,A);});sides(()=>{line(D,29,90,29,h-90,3);for(let y=125;y<h-80;y+=95)target(49,y,16);});break;
      case 4: corners(()=>{poly(D,[[0,0],[151,0],[151,28],[67,28],[28,67],[28,151],[0,151]]);wave(29,29,56,paper,4);line(A,35,161,35,210,3);line(A,161,35,210,35,3);});break;
      case 5: ends(()=>{line(D,100,30,w-100,30,2);for(const x of [w*.18,w*.5,w*.82]){dot(paper,x,30,23);hex(x,30,23,D,2.3);target(x,30,12);}});sides(()=>{for(let y=120;y<h-80;y+=103)hex(35,y,25,A,1.8);});break;
      case 6: for(const [x,y,sx,sy] of [[0,0,1,1],[w,h,-1,-1]])at(x,y,sx,sy,()=>{poly(D,[[0,0],[w*.33,0],[w*.26,37],[72,37],[0,112]]);poly(A,[[0,8],[w*.23,8],[w*.2,23],[62,23],[0,85]]);});sides(()=>{for(let y=155;y<h-100;y+=60)poly(A,[[18,y],[46,y+16],[18,y+32],[18,y+23],[34,y+16],[18,y+9]]);});break;
      case 7: corners(()=>{for(let i=0;i<3;i++)for(let j=0;j<3-i;j++){let x=25+i*35,y=25+j*39;hex(x,y,20,(i+j)%2?D:A,2);dot(D,x,y,2.5);}});ends(()=>nodes(150,29,w-150,29,53));break;
      case 8: rect(A,w-55,0,55,h,.15);rect(D,w-12,0,12,h);for(let y=50;y<h-35;y+=65)wave(w-38,y,25,D,4,Math.PI);ends(()=>{line(D,25,20,w-75,20,4);signal(75,43,w-95,43,8);});break;
      case 9: ends(()=>{for(let x=15;x<w-15;x+=58){poly(D,[[x,0],[x+22,0],[x+41,22],[x+19,22]],.9);poly(A,[[x+26,0],[x+42,0],[x+59,22],[x+45,22]],.9);}});sides(()=>{nodes(32,80,32,h-80,75);});break;
      case 10: corners(()=>{for(let j=0;j<3;j++)stroke(j%2?A:D,2.6,q=>{q.moveTo(12+j*15,122);q.lineTo(12+j*15,60-j*10);q.lineTo(60-j*10,12+j*15);q.lineTo(122,12+j*15);});target(63,63,22);});break;
      case 11: ends(()=>{for(let x=90;x<w-75;x+=110)wave(x,28,29,A,3,Math.PI*.5);line(D,22,12,w-22,12,1.7);});sides(()=>{line(A,40,110,40,h-110,2);for(let y=145;y<h-110;y+=115)hex(40,y,24,D);});break;
      case 12: sides(()=>{line(D,17,0,17,h,5);for(let y=110;y<h-75;y+=120){wave(22,y,56,A,4);dot(D,22,y,3);}});break;
      case 13: border(16,1,D);ends(()=>{for(let j=0;j<3;j++)line(A,70,26+j*9,w-70,26+j*9,1.3);for(const x of [w*.22,w*.5,w*.78]){dot(paper,x,35,21);target(x,35,18);}});sides(()=>nodes(31,80,31,h-80,72));break;
      case 14: corners(()=>{stroke(D,3,q=>{q.moveTo(15,120);q.lineTo(15,15);q.lineTo(120,15);});stroke(A,4,q=>q.arc(15,15,100,0,Math.PI/2));target(15,15,27);});ends(()=>signal(150,33,w-150,33,9));break;
      case 15: ends(()=>{const grad=ctx.createLinearGradient(0,0,w,0);grad.addColorStop(0,D);grad.addColorStop(.5,A);grad.addColorStop(1,D);rect(grad,0,0,w,24);for(let x=60;x<w-50;x+=72){for(let k=0;k<4;k++)rect(k%2?A:D,x+k*7,35,4,6+k*4,.85);}});sides(()=>{for(let y=120;y<h-80;y+=110)wave(28,y,28);});break;
      case 16: sides(()=>{for(let y=30;y<h-25;y+=51){hex(22,y,24,D,1.8);hex(58,y+26,24,A,1.8);dot(A,22,y,3);}});ends(()=>line(D,110,25,w-110,25,3));break;
      case 17: ends(()=>{for(let x=0,i=0;x<w;x+=w/10,i++){const Y=i%2?18:0;poly(i%2?A:D,[[x,Y],[x+w/10-8,Y],[x+w/10-22,Y+22],[x,Y+22]],.88);}});sides(()=>{for(let y=85;y<h-65;y+=92)target(35,y,22);});break;
      case 18: ends(()=>{target(w/2,35,26);line(A,80,35,w*.43,35,2);line(A,w*.57,35,w-80,35,2);});corners(()=>{for(let a=0;a<=Math.PI/2;a+=Math.PI/12)line(D,Math.cos(a)*32,Math.sin(a)*32,Math.cos(a)*125,Math.sin(a)*125,1.4,.75);wave(12,12,91,A,5);});break;
      case 19: sides(()=>{for(let y=45,i=0;y<h-40;y+=81,i++){const x=i%2?70:20;hex(x,y,18,A,2);dot(D,x,y,4);if(y+81<h-40)line(D,x,y+18,i%2?20:70,y+63,2);}});ends(()=>signal(w*.22,30,w*.78,30,13));break;
      case 20: rect(D,0,0,w,17);rect(A,0,h-17,w,17);sides(()=>{for(let y=65,i=0;y<h-50;y+=80,i++){for(let j=0;j<5;j++)rect((i+j)%2?A:D,20+j*10,y+36-(j+1)*6,6,(j+1)*6,.8);}});break;
      case 21: for(const [x,y,sx,sy] of [[w,0,-1,1],[0,h,1,-1]])at(x,y,sx,sy,()=>{poly(D,[[0,0],[w*.30,0],[w*.24,51],[0,51]]);poly(A,[[0,35],[w*.24,35],[w*.21,51],[0,51]]);for(let x=28;x<w*.18;x+=40)wave(x,23,18,paper,3);});sides(()=>{nodes(33,105,33,h-105,68);});break;
      case 22: corners(()=>{hex(50,50,44,D,3);hex(50,50,34,A,1.6);wave(50,50,21,A,3);line(D,50,96,50,155,2);line(D,96,50,155,50,2);});ends(()=>line(A,180,23,w-180,23,2));break;
      case 23: sides(()=>{for(let j=0;j<5;j++)stroke(j%2?D:A,1.8,q=>{for(let i=0;i<=120;i++){let y=h*i/120,x=15+j*12+9*Math.sin(y/h*T*4+j*.7);i?q.lineTo(x,y):q.moveTo(x,y);}});});ends(()=>{signal(100,23,w-100,23,7);});break;
      case 24: ends(()=>{rect(D,0,0,w,10);for(let x=30;x<w-20;x+=27){let z=8+18*(.5+.5*Math.sin(x/w*T*4));rect(A,x,14,8,z,.88);}});sides(()=>{for(let y=110;y<h-80;y+=105)hex(34,y,24,D);});break;
      case 25: ends(()=>{for(let x=60;x<w-45;x+=82){hex(x,27,25,A,2);wave(x,27,12,D,3);}});sides(()=>{line(D,23,75,23,h-75,2);line(A,63,75,63,h-75,2);for(let y=100;y<h-60;y+=79)line(A,23,y,63,y+25,1.5);});break;
      case 26: corners(()=>{for(let i=0;i<4;i++)hex(49,49,15+i*12,i%2?A:D,1.5);wave(49,49,18,A,3);});ends(()=>{line(D,125,20,w-125,20,2);nodes(155,42,w-155,42,60);});break;
      case 27: sides(()=>{for(let y=25;y<h-20;y+=70){line(D,14,y,62,y+40,1.7);line(A,62,y+40,14,y+70,1.7);dot(A,14,y,3);dot(D,62,y+40,3);}});ends(()=>{for(let x=100;x<w-85;x+=75)hex(x,30,19,A);});break;
      case 28: corners(()=>{poly(D,[[0,0],[176,0],[126,45],[45,126],[0,176],[0,132],[31,88],[88,31],[132,0]],.9);stroke(A,2.6,q=>{q.moveTo(14,144);q.lineTo(65,68);q.lineTo(144,14);});wave(26,26,26,paper,3);});break;
      case 29: border(25,1,D);ends(()=>{for(let x=120;x<w-110;x+=75){wave(x,38,20,A,3,Math.PI/2);dot(D,x,38,2);}});sides(()=>{for(let y=105;y<h-80;y+=66){hex(40,y,21,A,1.7);target(40,y,12);}});break;
      }
    }
    function drawCare(){
      const paw=(x,y,r=24,c=A)=>emblem(x,y,r,c);
      const sprig=(x,y,len,angle=0,c=A)=>{ctx.save();ctx.translate(x,y);ctx.rotate(angle);stroke(c,1.7,q=>{q.moveTo(0,0);q.quadraticCurveTo(8,-len*.55,0,-len);});for(let i=1;i<=5;i++){let Y=-len*i/6,X=4*Math.sin(i/6*Math.PI);leaf(X-6,Y,10+i*.7,-.65,c);leaf(X+7,Y-5,10+i*.7,.55,c);}ctx.restore();};
      const scallop=(x,y,X,Y,period=64,c=A)=>{const L=Math.hypot(X-x,Y-y);ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(Y-y,X-x));stroke(c,2.1,q=>{q.moveTo(0,0);for(let a=0;a<L;a+=period){const b=Math.min(period,L-a);q.quadraticCurveTo(a+b/2,18,a+b,0);}});ctx.restore();};
      const flower=(x,y,r=18)=>{rosette(x,y,r,5,A);rosette(x,y,r*.72,5,D);dot(A,x,y,3);};
      const ribbon=(x,y,span,c=A)=>shape(c,q=>{q.moveTo(x,y);q.bezierCurveTo(x+span*.25,y+23,x+span*.75,y-15,x+span,y);q.lineTo(x+span,y+15);q.bezierCurveTo(x+span*.75,y,x+span*.25,y+38,x,y+15);q.closePath();},.72);
      const med=(x,y,r=33)=>{circle(A,x,y,r,1.8);circle(D,x,y,r-6,1);paw(x,y,r*.55);};
      const soft=(x,y,span,sy)=>at(x,y,1,sy,()=>{shape(A,q=>{q.moveTo(0,0);q.lineTo(span,0);q.bezierCurveTo(span*.55,55,30,12,0,105);q.closePath();},.23);stroke(A,2.4,q=>{q.moveTo(0,105);q.bezierCurveTo(30,12,span*.55,55,span,0);});});
      switch(n){
      case 0: corners(()=>{shape(A,q=>{q.moveTo(0,0);q.lineTo(210,0);q.bezierCurveTo(100,24,50,65,0,175);q.closePath();},.24);sprig(30,120,80,.45);sprig(145,18,75,-1.3);paw(44,44,25);});break;
      case 1: border(23,1,A);ends(()=>{ribbon(60,17,w-120);for(const x of [w*.2,w*.5,w*.8]){dot(paper,x,32,21);med(x,32,19);}});break;
      case 2: sides(()=>{for(let y=60,i=0;y<h-30;y+=95,i++){paw(i%2?56:30,y,23);stroke(A,1.2,q=>q.arc(43,y,33,Math.PI*.7,Math.PI*1.55),.55);}});ends(()=>line(A,110,24,w-110,24,1.5));break;
      case 3: corners(()=>{sprig(35,150,127,.15);sprig(145,35,123,-Math.PI/2);flower(37,37,22);paw(78,78,19);});ends(()=>{line(D,185,26,w-185,26,1);});break;
      case 4: ends(()=>{for(const [x,sx] of [[0,1],[w,-1]])at(x,0,sx,1,()=>{stroke(A,2.5,q=>{q.moveTo(24,98);q.bezierCurveTo(13,10,86,10,185,30);});sprig(120,30,83,-1.3);});med(w/2,38,31);});sides(()=>line(A,21,118,21,h-118,1.3));break;
      case 5: border(33,1,D);corners(()=>{med(62,62,35);for(let i=0;i<4;i++){leaf(38+i*17,109,11,-.55);leaf(109,38+i*17,11,.55);}});ends(()=>{line(A,130,22,w-130,22,1.6);});break;
      case 6: soft(0,0,w*.28,1);soft(0,h,w*.28,-1);for(const [x,y] of [[45,45],[45,h-45]])paw(x,y,25);sides(()=>{scallop(18,115,18,h-115,72);});break;
      case 7: sides(()=>{rect(A,15,0,52,h,.12);for(let y=65;y<h-40;y+=90){med(41,y,22);flower(41,y+38,9);}});ends(()=>scallop(95,26,w-95,26,70));break;
      case 8: rect(A,0,0,28,h,.25);stroke(D,1.7,q=>{q.moveTo(41,0);q.bezierCurveTo(89,h*.3,8,h*.65,41,h);});for(let y=60,i=0;y<h-35;y+=100,i++)paw(49+15*Math.sin(i),y,19);ends(()=>{line(A,94,26,w-80,26,2);});break;
      case 9: ends(()=>{for(let x=65;x<w-60;x+=65){leaf(x-10,27,13,-.55);paw(x+11,32,12);}});sides(()=>{line(A,31,72,31,h-72,1.6);for(let y=105;y<h-70;y+=130)sprig(31,y+30,45,.15);});break;
      case 10: corners(()=>{sprig(48,151,112,.5);sprig(151,48,112,-1.9);paw(48,48,28);});ends(()=>scallop(180,23,w-180,23,80));break;
      case 11: ends(()=>{stroke(A,2,q=>{q.moveTo(72,31);q.bezierCurveTo(w*.28,65,w*.35,4,w*.45,31);q.bezierCurveTo(w*.65,65,w*.73,4,w-72,31);});med(w/2,36,27);});sides(()=>{for(let y=100;y<h-70;y+=105)flower(32,y,20);});break;
      case 12: corners(()=>{stroke(A,1.9,q=>{q.moveTo(28,145);q.bezierCurveTo(7,26,24,10,145,28);});stroke(D,1,q=>{q.moveTo(40,118);q.bezierCurveTo(25,40,38,25,118,40);});paw(46,46,23);});break;
      case 13: border(19,1,D);border(58,1,A);ends(()=>{for(let x=75;x<w-65;x+=70)flower(x,38,15);});sides(()=>{for(let y=75;y<h-65;y+=70)flower(38,y,15);});break;
      case 14: corners(()=>{rosette(65,65,48,8,A);rosette(65,65,36,8,D);paw(65,65,22);});ends(()=>{line(A,130,30,w-130,30,1.5);for(const x of [w*.35,w*.65])diamond(x,30,8);});break;
      case 15: sides(()=>{stroke(A,2,q=>{q.moveTo(25,0);q.bezierCurveTo(90,h*.35,0,h*.65,25,h);});for(let y=70,i=0;y<h-45;y+=63,i++){let x=25+19*Math.sin(y/h*T);leaf(x+17,y,15,i%2?.75:-.75);if(i%3===0)flower(x+27,y+15,12);}});ends(()=>{for(let x=115;x<w-110;x+=120)sprig(x,52,39,-.25);});break;
      case 16: corners(()=>{for(let i=0;i<3;i++)for(let j=0;j<3-i;j++){let x=35+i*41,y=35+j*41;flower(x,y,18);if((i+j)%2===0)paw(x,y,10);}});ends(()=>{ribbon(170,18,w-340);});break;
      case 17: sides(()=>{for(let y=50,i=0;y<h-45;y+=90,i++){let x=i%2?54:27;stroke(A,2.2,q=>{q.ellipse(x,y,22,32,0,0,T);});paw(x,y,15);}});ends(()=>scallop(105,30,w-105,30,67));break;
      case 18: corners(()=>{for(let i=0;i<3;i++)stroke(A,1.5,q=>q.arc(22,22,37+i*24,0,Math.PI/2));sprig(32,95,74,.35);paw(42,42,20);});ends(()=>{flower(w/2,28,18);line(D,135,28,w*.45,28,1);line(D,w*.55,28,w-135,28,1);});break;
      case 19: sides(()=>{stroke(A,2.2,q=>{q.moveTo(39,0);for(let i=0;i<7;i++){let y=i*h/7;q.bezierCurveTo(5,y+h/21,80,y+2*h/21,39,y+h/7);}});for(let y=80,i=0;y<h-45;y+=h/9,i++)paw(39+18*Math.cos(i),y,17);});break;
      case 20: ends(()=>{line(D,45,20,w-45,20,2);for(let x=70;x<w-60;x+=85){flower(x,40,13);leaf(x+23,40,11,.6);}});sides(()=>{for(let y=105;y<h-80;y+=115){med(39,y,24);}});break;
      case 21: ends(()=>{ribbon(0,15,w*.36);ribbon(w*.64,15,w*.36);med(w/2,32,24);});sides(()=>{for(let y=100;y<h-75;y+=120)sprig(39,y+32,67,.25);});break;
      case 22: corners(()=>{shape(A,q=>{q.moveTo(20,20);q.lineTo(105,20);q.bezierCurveTo(113,80,69,114,20,105);q.closePath();},.16);stroke(A,2,q=>{q.moveTo(20,20);q.lineTo(105,20);q.bezierCurveTo(113,80,69,114,20,105);q.closePath();});paw(55,55,24);});ends(()=>line(D,145,24,w-145,24,1.5));break;
      case 23: ends(()=>{for(let j=0;j<4;j++)stroke(j%2?D:A,1.6,q=>{q.moveTo(0,12+j*9);q.bezierCurveTo(w*.30,45+j*5,w*.68,-7+j*5,w,12+j*9);});});sides(()=>{for(let y=110;y<h-75;y+=110)flower(36,y,23);});break;
      case 24: ends(()=>{shape(A,q=>{q.moveTo(0,0);q.lineTo(w,0);q.bezierCurveTo(w*.73,45,w*.31,4,0,42);q.closePath();},.24);for(let x=115;x<w-100;x+=100)paw(x,28,16);});sides(()=>scallop(28,88,28,h-88,77));break;
      case 25: sides(()=>{for(let y=40;y<h-30;y+=80){stroke(A,2,q=>{q.roundRect(14,y,59,59,24);});paw(44,y+30,22);}});ends(()=>{line(A,110,27,w-110,27,1);for(let x=150;x<w-130;x+=84)flower(x,27,11);});break;
      case 26: border(22,1,D);corners(()=>{for(let i=0;i<3;i++)rosette(59,59,19+i*13,7+i,A);paw(59,59,17);});sides(()=>{for(let y=145;y<h-110;y+=90){flower(35,y,17);sprig(35,y+37,34,.45);}});break;
      case 27: ends(()=>{for(let x=60;x<w-55;x+=55){leaf(x,28,17,.65);leaf(x+15,40,14,-.65);}});sides(()=>{for(let y=60;y<h-50;y+=65){leaf(31,y,16,.75);leaf(45,y+18,15,-.75);if(y%4===0)paw(34,y+33,10);}});break;
      case 28: corners(()=>{shape(D,q=>{q.moveTo(0,0);q.lineTo(145,0);q.quadraticCurveTo(35,35,0,145);q.closePath();},.78);stroke(A,3,q=>{q.moveTo(8,131);q.quadraticCurveTo(42,42,131,8);});paw(32,32,24,paper);sprig(85,46,48,-1.3,paper);});break;
      case 29: border(18,1,A);sides(()=>{for(let y=95,i=0;y<h-80;y+=74,i++){sprig(43,y+26,58,i%2?.4:-.4);if(i%2===0)paw(43,y-7,15);}});ends(()=>{for(let x=100;x<w-95;x+=76){flower(x,35,17);leaf(x+27,34,14,.65);}med(w/2,35,27);});break;
      }
    }

    const fine=dog?1.4:2.2, heavy=dog?6:10;
    try{
      if(hr){drawForensic();return;}
      if(dt){drawDetection();return;}
      if(dog){drawCare();return;}
      switch(n){
      case 0: // chamfered corner plates
        corners(()=>{poly(D,[[0,0],[190,0],[134,42],[56,42],[56,132],[0,188]],dog?.28:1);poly(A,[[0,0],[190,0],[165,12],[45,12],[12,46],[12,165],[0,188]]);emblem(31,32,18,dog?D:paper);line(A,67,61,140,61,2);});sides(()=>{line(A,26,204,26,h-204,3);edgePattern(47,220,47,h-220,70);});break;
      case 1: // parallel rails, narrow technical longitudinal panels
        sides(()=>{rect(D,14,0,36,h,dog?.2:1);line(A,57,20,57,h-20,3);line(A,70,20,70,h-20,1);edgePattern(32,85,32,h-85,63,dog?D:paper);});ends(()=>{line(D,95,32,w-95,32,2);line(A,95,43,w-95,43,1);});break;
      case 2: // engraved arch corners
        border(27,1,D);corners(()=>{for(let j=0;j<5;j++)stroke(A,1.6,q=>q.arc(30,30,36+j*15,0,Math.PI/2),.9-j*.1);emblem(57,57,18);});ends(()=>{line(A,160,37,w-160,37,2);edgePattern(w*.28,55,w*.72,55,55);});break;
      case 3: // faceted relief panels, opposite orientation
        for(const [x,y,sx,sy] of [[0,0,1,1],[w,h,-1,-1]])at(x,y,sx,sy,()=>{poly(D,[[0,0],[w*.37,0],[w*.27,45],[90,45],[0,175]],dog?.28:.92);poly(A,[[0,0],[w*.30,0],[w*.21,26],[70,26],[0,133]],.85);for(let k=0;k<5;k++)line(paper,20+k*10,48,78+k*10,3,1,.7);emblem(36,35,15,paper);});for(const [x,y,sx,sy] of [[w,0,-1,1],[0,h,1,-1]])at(x,y,sx,sy,()=>{outline(A,[[25,25],[180,25],[25,180]],2);emblem(58,58,25);});break;
      case 4: // diamond cartouches, open frame
        sides(()=>{line(A,36,150,36,h*.36,2);line(A,36,h*.64,36,h-150,2);plaque(44,h/2,39,1);edgePattern(64,180,64,h*.36,60);edgePattern(64,h*.64,64,h-180,60);});ends(()=>{line(D,115,26,w*.45,26,2);line(D,w*.55,26,w-115,26,2);plaque(w/2,38,28,1);});corners(()=>diamond(35,35,17));break;
      case 5: // side medals and understated border
        border(23,1,D);border(34,1,A);sides(()=>{for(const y of [h*.21,h*.5,h*.79]){plaque(48,y,31);line(A,48,y-48,48,y-35,2);line(A,48,y+35,48,y+48,2);}});ends(()=>edgePattern(w*.32,24,w*.68,24,58));break;
      case 6: // angled strip ribbons
        corners(()=>{for(let j=0;j<3;j++)poly(j===1?D:A,[[0,30+j*19],[118+j*31,0],[143+j*31,0],[0,54+j*19]],dog?.45:.92);emblem(33,104,18);});sides(()=>{line(D,19,195,19,h-195,3);edgePattern(42,200,42,h-200,70);});break;
      case 7: // atlas grid at four corners
        corners(()=>{for(let i=0;i<6;i++){line(A,24+i*24,24,24+i*24,148,1,.8);line(A,24,24+i*24,148,24+i*24,1,.8);}rect(D,24,24,49,49,dog?.18:.85);emblem(48,48,20,dog?D:paper);line(D,24,149,149,149,2);line(D,149,24,149,149,2);});ends(()=>{line(A,175,24,w-175,24,1.7);});break;
      case 8: // asymmetric corridor
        rect(D,0,0,71,h,dog?.22:.94);rect(A,72,0,6,h);for(let y=65;y<h-35;y+=89){emblem(35,y,22,dog?D:paper);line(A,11,y+36,60,y+36,1.3);}line(A,w-35,90,w-35,h-90,2);ends(()=>{line(D,112,33,w-60,33,2);for(let i=0;i<5;i++)line(A,w-63-i*12,33,w-63-i*12,45,2);});break;
      case 9: // segmented grooves, two horizontal bars
        ends(()=>{rect(D,0,0,w,20,dog?.24:.95);rect(A,0,20,w,5);for(let x=85;x<w-85;x+=68){line(A,x,37,x+33,37,3);line(D,x,45,x+24,45,1);}});sides(()=>{for(let y=95;y<h-95;y+=76){line(D,24,y,24,y+45,heavy);emblem(48,y+22,16);}});break;
      case 10: // stepped angular frame
        corners(()=>{stroke(D,heavy,q=>{q.moveTo(25,184);q.lineTo(25,87);q.lineTo(58,87);q.lineTo(58,25);q.lineTo(185,25);});stroke(A,2.5,q=>{q.moveTo(42,185);q.lineTo(42,104);q.lineTo(75,104);q.lineTo(75,42);q.lineTo(185,42);});emblem(44,44,19);});sides(()=>edgePattern(28,215,28,h-215,62));ends(()=>line(A,210,24,w-210,24,1));break;
      case 11: // central medals, twin vertical flourish
        ends(()=>{line(A,100,32,w*.44,32,2);line(A,w*.56,32,w-100,32,2);plaque(w/2,40,34);rosette(w/2,40,30,8);});sides(()=>{line(D,33,135,33,h-135,2);for(let i=0;i<4;i++){let y=h*(i+1)/5;leaf(48,y,13,i%2?.9:-.9);emblem(35,y+20,12);}});break;
      case 12: // editorial brackets, no full frame
        corners(()=>{stroke(D,4,q=>{q.moveTo(35,140);q.lineTo(35,35);q.lineTo(140,35);});stroke(A,1.5,q=>{q.moveTo(48,118);q.lineTo(48,48);q.lineTo(118,48);});emblem(63,63,19);});sides(()=>{line(A,27,h*.37,27,h*.63,2);for(let j=0;j<3;j++)dot(D,27,h*.43+j*h*.07,3);});break;
      case 13: // classic frieze
        border(18,2,D);border(68,1,A);ends(()=>{rect(A,19,19,w-38,34,.10);edgePattern(83,36,w-83,36,47);});sides(()=>{edgePattern(41,83,41,h-83,48);});corners(()=>plaque(42,42,20,1));break;
      case 14: // four embossed seals
        border(25,1,D);corners(()=>{plaque(64,64,42,2);rosette(64,64,47,12);line(A,64,113,64,158,2);line(A,113,64,158,64,2);});ends(()=>{line(D,180,25,w-180,25,1);line(A,180,32,w-180,32,1);});break;
      case 15: // organic sweeping bands
        sides(()=>{shape(D,q=>{q.moveTo(0,0);q.lineTo(54,0);for(let i=0;i<=120;i++){let y=h*i/120;q.lineTo(34+23*Math.cos(y/h*T*2),y);}q.lineTo(0,h);q.closePath();},dog?.22:.82);for(let k=0;k<4;k++)stroke(A,1.8,q=>{for(let i=0;i<=120;i++){let y=h*i/120,x=63+k*8+13*Math.cos(y/h*T*2+k*.4);i?q.lineTo(x,y):q.moveTo(x,y);}});for(let y=110;y<h-70;y+=120)emblem(23,y,16,dog?D:paper);});break;
      case 16: // mosaic corners with distinct tiles
        corners(()=>{for(let i=0;i<5;i++)for(let j=0;j<5-i;j++){let X=17+i*28,Y=17+j*28;poly((i+j)%2?A:D,[[X,Y-13],[X+13,Y],[X,Y+13],[X-13,Y]],dog?.45:.88);}emblem(87,87,19);});ends(()=>{line(A,175,27,w-175,27,1);edgePattern(w*.30,45,w*.70,45,52);});break;
      case 17: // alternating interrupted bars
        sides(()=>{for(let y=45,i=0;y<h-40;y+=91,i++){let a=i%2;rect(a?A:D,18,y,a?20:43,56,dog?.4:.94);emblem(a?65:40,y+27,14,a?A:paper);}});ends(()=>{line(D,100,20,w-100,20,3);line(A,w*.25,35,w*.75,35,2);});break;
      case 18: // radial instruments / rosettes
        corners(()=>{for(let k=0;k<4;k++)stroke(A,1.4,q=>q.arc(0,0,40+k*26,0,Math.PI/2));for(let k=0;k<9;k++){let a=k*Math.PI/16;line(D,Math.cos(a)*35,Math.sin(a)*35,Math.cos(a)*115,Math.sin(a)*115,1,.7);}emblem(34,34,20);});ends(()=>{line(A,145,28,w-145,28,2);for(const x of [w*.25,w*.5,w*.75])diamond(x,28,6);});break;
      case 19: // linked route or specimen / scent / care nodes
        sides(()=>{stroke(D,3,q=>{q.moveTo(25,0);for(let i=1;i<=12;i++)q.lineTo(i%2?75:25,h*i/12);});for(let i=1;i<12;i++){let x=i%2?75:25,y=h*i/12;dot(paper,x,y,13);circle(A,x,y,12,2);emblem(x,y,8);}});ends(()=>line(A,95,35,w-95,35,1.7));break;
      case 20: // engraved field register
        sides(()=>{line(D,27,0,27,h,3);for(let y=40,i=0;y<h-35;y+=23,i++){let l=i%5===0?40:i%2===0?23:12;line(A,27,y,27+l,y,i%5===0?2.4:1);if(i%5===0)emblem(78,y,12);}});ends(()=>{line(D,110,24,w-110,24,1);for(let x=135;x<w-135;x+=35)line(A,x,24,x,34,1);});break;
      case 21: // folded ribbon ends
        ends(()=>{for(const [x,sx] of [[0,1],[w,-1]])at(x,0,sx,1,()=>{poly(D,[[0,0],[w*.22,0],[w*.17,45],[36,45],[36,95],[0,130]],dog?.35:.94);poly(A,[[0,0],[36,45],[36,95],[0,130]],.9);poly(A,[[36,45],[w*.17,45],[w*.14,61],[36,61]],.65);emblem(18,44,12,paper);});line(A,w*.23,26,w*.77,26,2);});break;
      case 22: // shield cartouches and long narrow spine
        sides(()=>{line(D,42,0,42,h,2);for(const y of [h*.13,h*.43,h*.73,h*.91]){rect(paper,4,y-35,76,70);plaque(42,y,32,2);}});ends(()=>{line(A,105,28,w-105,28,1);});break;
      case 23: // layered wave engravings, upper/lower and side
        ends(()=>{for(let j=0;j<6;j++)stroke(j%2?A:D,j===0?3:1.2,q=>{for(let i=0;i<=120;i++){let x=w*i/120,y=10+j*6+6*Math.sin(x/w*T*3+j*.5);i?q.lineTo(x,y):q.moveTo(x,y);}},.85);});sides(()=>{for(let y=110;y<h-85;y+=93)emblem(31,y,19);});break;
      case 24: // stratified horizon, interrupted left/right
        ends(()=>{for(let j=0;j<4;j++){poly(j%2?A:D,[[0,j*12],[w*.31,j*12],[w*.25,j*12+8],[0,j*12+8]],.8);poly(j%2?D:A,[[w,j*12],[w*.69,j*12],[w*.75,j*12+8],[w,j*12+8]],.8);}plaque(w/2,28,22,1);});sides(()=>{line(A,19,75,19,h-75,2);for(let y=100;y<h-80;y+=75)emblem(42,y,16);});break;
      case 25: // modular capsules
        sides(()=>{for(let y=25,i=0;y<h-55;y+=87,i++){stroke(i%2?A:D,2.2,q=>{q.roundRect(13,y,66,62,16);});rect(i%2?A:D,13,y+23,6,16);emblem(46,y+31,20);}});ends(()=>{line(A,112,26,w-112,26,2);for(let x=145;x<w-145;x+=70)dot(D,x,26,3);});break;
      case 26: // fine guilloche medallions
        border(21,1,D);corners(()=>{for(let i=0;i<3;i++)rosette(55,55,22+i*12,8+i*2);emblem(55,55,17);});sides(()=>{for(let y=155;y<h-145;y+=84){rosette(32,y,17,6);emblem(32,y,10);}});ends(()=>edgePattern(170,28,w-170,28,55));break;
      case 27: // woven lattice side bands
        sides(()=>{for(let y=-25;y<h;y+=39){line(D,13,y,75,y+45,2,.8);line(A,75,y,13,y+45,2,.8);}line(A,12,0,12,h,2);line(A,77,0,77,h,2);for(let y=105;y<h-65;y+=156){dot(paper,45,y,23);circle(A,45,y,23,2);emblem(45,y,15);}});ends(()=>line(D,100,27,w-100,27,1.4));break;
      case 28: // cusp corners, linked angular arches
        corners(()=>{stroke(D,heavy,q=>{q.moveTo(0,178);q.quadraticCurveTo(49,128,49,49);q.quadraticCurveTo(128,49,178,0);});stroke(A,3,q=>{q.moveTo(8,151);q.quadraticCurveTo(64,116,64,64);q.quadraticCurveTo(116,64,151,8);});emblem(28,28,20);});sides(()=>{for(let y=215;y<h-195;y+=85)diamond(25,y,10);});break;
      case 29: // honor garland, open center
        border(20,1,A);sides(()=>{stroke(D,1.6,q=>{q.moveTo(34,80);q.bezierCurveTo(61,h*.3,7,h*.7,34,h-80);});for(let y=105,i=0;y<h-90;y+=34,i++){let x=34+12*Math.sin(y/h*T);leaf(x-7,y,13,-.9);leaf(x+7,y+10,13,.9);if(i%4===0)emblem(62,y,13);}});ends(()=>{for(let x=110;x<w-110;x+=34){leaf(x,34,13,-.6);leaf(x+8,44,11,.6);}plaque(w/2,40,29);});break;
    }}finally{ctx.restore();}
  }

  function drawSignatureCollection(kind,accent,ink){
    const A=accent,D=ink, tau=Math.PI*2, e=Math.min(W,H), u=e/1190;
    ctx.save();
    ctx.lineCap='round';ctx.lineJoin='round';
    const fill=(c,x,y,w,h)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
    const p=(c,w,fn,opacity=1)=>{ctx.save();ctx.globalAlpha=opacity;ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();fn(ctx);ctx.stroke();ctx.restore();};
    const shape=(c,fn,opacity=1)=>{ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle=c;ctx.beginPath();fn(ctx);ctx.fill();ctx.restore();};
    const poly=(c,pts,opacity=1)=>shape(c,q=>{pts.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.closePath();},opacity);
    const line=(c,x,y,X,Y,w=1,opacity=1)=>p(c,w,q=>{q.moveTo(x,y);q.lineTo(X,Y);},opacity);
    const rect=(c,m,w=1)=>p(c,w,q=>q.rect(m,m,W-m*2,H-m*2));
    const circ=(c,x,y,r,w=1,opacity=1)=>p(c,w,q=>q.arc(x,y,r,0,tau),opacity);
    const dot=(c,x,y,r,opacity=1)=>shape(c,q=>q.arc(x,y,r,0,tau),opacity);
    const local=(x,y,sx,sy,fn)=>{ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);try{fn();}finally{ctx.restore();}};
    const corners=[[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]];
    const goldLine=(x,y,X,Y,w=2)=>line(A,x,y,X,Y,w);
    const curve=(c,x,y,r,n,opacity=1)=>p(c,1.4,q=>{for(let j=0;j<=240;j++){let a=tau*j/240,rr=r*(.82+.18*Math.cos(n*a));let xx=x+rr*Math.cos(a),yy=y+rr*Math.sin(a);j?q.lineTo(xx,yy):q.moveTo(xx,yy);}q.closePath();},opacity);
    const leaf=(x,y,rx,ry,angle,c=A)=>{ctx.save();ctx.translate(x,y);ctx.rotate(angle);shape(c,q=>{q.moveTo(-rx,0);q.quadraticCurveTo(0,-ry*2,rx,0);q.quadraticCurveTo(0,ry*2,-rx,0);},.85);line('#ffffff',-rx*.7,0,rx*.75,0,.7,.7);ctx.restore();};
    const jewel=(x,y,r)=>{poly(A,[[x-r,y],[x,y-r],[x+r,y],[x,y+r]]);poly(D,[[x-r*.55,y],[x,y-r*.55],[x+r*.55,y],[x,y+r*.55]]);};
    const edgeWash=(c,side,size)=>{let g=ctx.createLinearGradient(side?W:0,0,side?W-size:size,0);g.addColorStop(0,c);g.addColorStop(1,'rgba(255,255,255,0)');fill(g,side?W-size:0,0,size,H);};
    const metal=(x,y,X,Y)=>{const g=ctx.createLinearGradient(x,y,X,Y);g.addColorStop(0,D);g.addColorStop(.23,A);g.addColorStop(.49,'#f2e4c4');g.addColorStop(.66,A);g.addColorStop(1,D);return g;};
    try{switch(kind){
      case 'sigApex': {
        // Machined chamfered plates, inset rivets and engraved parallel grooves.
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{
          poly(D,[[0,0],[W*.24,0],[W*.19,47],[119,47],[67,103],[67,217],[0,276]]);
          poly(A,[[0,0],[W*.24,0],[W*.225,14],[104,14],[15,108],[15,263],[0,276]]);
          poly('#ffffff',[[25,107],[111,23],[W*.187,23],[W*.175,34],[119,34],[56,105],[56,210],[25,238]],.13);
          for(let j=0;j<7;j++)line(A,30,121+j*15,52,100+j*15,2,.8);
          for(const [X,Y] of [[88,30],[28,72],[34,224]]){circ(A,X,Y,7,2);dot(A,X,Y,2);}
        });
        for(const [x,s] of [[25,1],[W-25,-1]]){line(D,x,290,x,H-290,3);for(let y=310;y<H-300;y+=38)line(A,x,y,x+s*(y%3?12:20),y,2);}
        for(const y of [25,H-25]){goldLine(W*.29,y,W*.45,y,2);goldLine(W*.55,y,W*.71,y,2);jewel(W/2,y,12);}break;
      }
      case 'sigTrail': {
        // Tracking ribbon: organically meandering paths and directional paw silhouettes.
        for(const [x,sx] of [[0,1],[W,-1]])local(x,0,sx,1,()=>{
          edgeWash(D,0,1); // thin edge only; mirrored by the local transform
          shape(D,q=>{q.moveTo(0,0);q.lineTo(81,0);for(let j=0;j<=100;j++){let t=j/100;q.lineTo(62+16*Math.sin(t*tau*2.2),t*H);}q.lineTo(0,H);q.closePath();});
          for(let j=0;j<4;j++)p(A,1.7,q=>{for(let i=0;i<=200;i++){let t=i/200,X=89+j*10+12*Math.sin(t*tau*2.2+j*.3);i?q.lineTo(X,t*H):q.moveTo(X,t*H);}},.8-j*.13);
          for(let y=105,i=0;y<H-60;y+=150,i++){ctx.save();ctx.translate(33+(i%2)*9,y);ctx.rotate((i%2?.25:-.25));shape(A,q=>{q.ellipse(0,5,11,9,0,0,tau);});for(let a=0;a<4;a++){let angle=Math.PI+(a+.5)*Math.PI/4;shape(A,q=>q.ellipse(14*Math.cos(angle),14*Math.sin(angle),3.3,5,angle+Math.PI/2,0,tau));}ctx.restore();}
        });
        for(const y of [38,H-38]){p(A,2,q=>{q.moveTo(155,y);q.bezierCurveTo(W*.29,y+14,W*.37,y-14,W/2,y);q.bezierCurveTo(W*.63,y+14,W*.71,y-14,W-155,y);});for(const x of [W*.25,W*.5,W*.75]){circ(D,x,y,7,2);dot(A,x,y,3);}}break;
      }
      case 'sigRescue': {
        // Rescue beacon: asymmetric signal tower, radial sweeps and reflective chevrons.
        fill(D,0,0,51,H);fill(A,51,0,8,H);
        for(let y=25;y<H-22;y+=57)poly(A,[[0,y],[51,y+17],[51,y+32],[0,y+15]],.9);
        for(const [x,y,sx,sy] of [corners[1],corners[3]])local(x,y,sx,sy,()=>{
          shape(D,q=>{q.moveTo(0,0);q.lineTo(W*.27,0);q.quadraticCurveTo(60,65,0,230);q.closePath();});
          for(let j=0;j<8;j++)p(A,2.2,q=>q.arc(0,0,42+j*23,0,Math.PI/2),.95-j*.07);
          for(let j=0;j<8;j++){let a=j*Math.PI/14;line(A,Math.cos(a)*33,Math.sin(a)*33,Math.cos(a)*222,Math.sin(a)*222,1,.4);}
          dot(A,23,23,8);circ('#fff',23,23,16,2);
        });
        for(const y of [26,H-26]){line(D,82,y,W*.67,y,2);line(A,82,y+6,W*.45,y+6,4);for(let i=0;i<3;i++)poly(D,[[W*.69+i*22,y-7],[W*.69+i*22+12,y],[W*.69+i*22,y+7]]);}break;
      }
      case 'sigForensic': {
        // Stratigraphic cutaway panels, numbered-free specimen markers and fine hatching.
        for(const [x,s] of [[0,1],[W,-1]])local(x,0,s,1,()=>{
          fill(D,0,0,22,H);for(let j=0;j<7;j++){
            shape(j%2?A:D,q=>{q.moveTo(22,j*H/7);q.lineTo(112,j*H/7+27);q.lineTo(88,(j+1)*H/7-26);q.lineTo(22,(j+1)*H/7);q.closePath();},.82);
            for(let i=0;i<9;i++)line('#fff',31,j*H/7+13+i*12,71,j*H/7+28+i*12,1,.36);
            circ(A,133,(j+.5)*H/7,11,1.8);line(D,126,(j+.5)*H/7,140,(j+.5)*H/7,1.5);line(D,133,(j+.5)*H/7-7,133,(j+.5)*H/7+7,1.5);
          }
        });for(const y of [30,H-30]){line(D,170,y,W-170,y,2);for(let i=0;i<21;i++)line(A,W*.21+i*W*.029,y,W*.21+i*W*.029,y+(i%5===0?15:6)*(y< H/2?1:-1),1.5);}break;
      }
      case 'sigNight': {
        // Wide telemetry apertures, staggered micro-grid and electronic waveform.
        for(const [x,y,sx,sy] of [corners[0],corners[3]])local(x,y,sx,sy,()=>{
          poly(D,[[0,0],[W*.44,0],[W*.37,38],[156,38],[86,103],[86,228],[0,305]]);
          for(let i=0;i<7;i++)for(let j=0;j<8;j++)if(10+i*11<82)dot(A,12+i*11,53+j*14,2.1,.4+(i+j)%3*.24);
          p(A,3,q=>{q.moveTo(7,284);q.lineTo(69,228);q.lineTo(69,103);q.lineTo(147,26);q.lineTo(W*.37,26);});
          for(let j=0;j<6;j++)line('#fff',175+j*19,10,183+j*19,21,1.4,.65);
        });
        for(const [x,sx] of [[0,1],[W,-1]])local(x,H/2,sx,1,()=>{fill(D,0,-H*.22,17,H*.44);p(A,3,q=>{q.moveTo(35,-H*.22);for(let j=0;j<24;j++)q.lineTo(35+([0,11,2,24,8,14][j%6]),-H*.22+(j+1)*H*.44/24);});});
        for(const y of [43,H-43]){for(let i=0;i<13;i++)dot(A,W*.36+i*W*.024,y,i%3?2.2:4);line(D,W*.28,y,W*.34,y,3);line(D,W*.67,y,W*.73,y,3);}break;
      }
      case 'sigAurum': {
        // Detailed intaglio engraving: braided border, rosettes and fine-cut acanthus corners.
        rect(D,17,1.5);rect(A,24,3);rect(A,73,1.4);
        for(const y of [48,H-48])for(let i=0;i<3;i++)p(A,1.1,q=>{for(let j=0;j<=700;j++){let t=j/700,X=80+t*(W-160),Y=y+15*Math.sin(t*tau*19+i*tau/3);j?q.lineTo(X,Y):q.moveTo(X,Y);}},.85);
        for(const x of [47,W-47])for(let i=0;i<3;i++)p(A,1.1,q=>{for(let j=0;j<=500;j++){let t=j/500,X=x+13*Math.sin(t*tau*13+i*tau/3),Y=80+t*(H-160);j?q.lineTo(X,Y):q.moveTo(X,Y);}},.85);
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{
          shape(D,q=>{q.moveTo(15,15);q.lineTo(190,15);q.bezierCurveTo(96,36,38,96,15,190);q.closePath();});
          for(let j=0;j<13;j++)p(metal(15,15,145,145),1.4,q=>{q.moveTo(20+j*10,20);q.quadraticCurveTo(35+j*4,35+j*4,20,20+j*10);});
          for(let j=0;j<7;j++){let a=.16+j*.2;leaf(27+105*Math.cos(a),27+105*Math.sin(a),15,5,a+1.1);}
          curve(A,47,47,23,12);circ(A,47,47,14,1);dot(A,47,47,4);
        });break;
      }
      case 'sigChateau': {
        // Architectural pilasters and sculpted Baroque flourishes.
        for(const [x,sx] of [[0,1],[W,-1]])local(x,0,sx,1,()=>{
          fill(D,0,0,26,H);for(let j=0;j<5;j++)fill(metal(28,0,70,0),29+j*9,0,5,H);
          for(const [y,sy] of [[0,1],[H,-1]])local(0,y,1,sy,()=>{
            poly(D,[[0,0],[W*.23,0],[W*.18,24],[115,24],[96,63],[0,63]]);
            for(let j=0;j<5;j++)p(A,2,q=>{q.moveTo(35+j*11,74);q.bezierCurveTo(43,134+j*13,170+j*12,66,129+j*8,35);});
            for(let j=0;j<6;j++)leaf(95+j*20,63+13*Math.sin(j),17,6,-.6);
            for(let j=0;j<3;j++)circ(A,72,90,20+j*7,1.2);
          });
        });
        for(const y of [28,H-28]){p(A,2,q=>{q.moveTo(W*.25,y);q.bezierCurveTo(W*.40,y+27,W*.42,y-19,W/2,y);q.bezierCurveTo(W*.58,y-19,W*.60,y+27,W*.75,y);});curve(A,W/2,y,19,6);}
        break;
      }
      case 'sigLumiere': {
        // Fan-shaped art-deco sunbursts contained in long horizontal capstones.
        for(const [y,sy] of [[0,1],[H,-1]])local(0,y,1,sy,()=>{
          shape(D,q=>{q.moveTo(0,0);q.lineTo(W,0);q.lineTo(W,35);q.lineTo(W*.64,35);q.lineTo(W*.60,65);q.lineTo(W*.40,65);q.lineTo(W*.36,35);q.lineTo(0,35);q.closePath();});
          for(let j=0;j<=24;j++){let a=-Math.PI+j*Math.PI/24;const X=W/2+Math.cos(a)*W*.097,Y=61+Math.sin(a)*54;line(A,W/2,61,X,Y,2.3);}
          for(let j=0;j<3;j++)p(A,1.5,q=>{q.moveTo(W*.40+j*12,61);q.quadraticCurveTo(W/2,5+j*12,W*.60-j*12,61);});
          for(let j=0;j<3;j++){line(A,0,10+j*8,W*.35,10+j*8,1.1);line(A,W*.65,10+j*8,W,10+j*8,1.1);}
        });
        for(const x of [30,W-30]){line(D,x,60,x,H-60,2);for(let y=100;y<H-90;y+=112){poly(A,[[x-8,y],[x,y-17],[x+8,y],[x,y+17]]);circ(D,x,y,4,1);}}break;
      }
      case 'sigPorcelain': {
        // Cobalt porcelain vines with petal clusters, alternating hand-painted motifs.
        rect(A,19,3);rect(A,29,1);
        for(const [x,sx] of [[0,1],[W,-1]])local(x,0,sx,1,()=>{
          p(A,2.3,q=>{for(let j=0;j<=220;j++){let t=j/220;let X=62+23*Math.sin(t*tau*5),Y=46+(H-92)*t;j?q.lineTo(X,Y):q.moveTo(X,Y);}});
          for(let y=90,i=0;y<H-60;y+=97,i++){let X=60+19*Math.sin((y-46)/(H-92)*tau*5);for(let j=0;j<5;j++){let a=j*tau/5;leaf(X+15*Math.cos(a),y+15*Math.sin(a),12,5,a,A);}dot(D,X,y,4);leaf(X+20,y+30,17,6,.7);leaf(X-18,y-25,17,6,-.6);}
        });
        for(const y of [42,H-42]){for(let x=140,i=0;x<W-120;x+=52,i++){curve(A,x,y,15,i%2?4:6,.8);dot(A,x,y,2);if(x+26<W-120)leaf(x+26,y,10,3,0,A);}}break;
      }
      case 'sigEclipse': {
        // Crescent cutout with offset orbital tracks; dramatic but print-friendly.
        for(const [x,y,sx,sy] of [corners[1],corners[2]])local(x,y,sx,sy,()=>{
          shape(D,q=>{q.moveTo(0,0);q.lineTo(W*.46,0);q.bezierCurveTo(W*.23,29,64,81,0,H*.34);q.closePath();});
          for(let j=0;j<10;j++)p(A,1.7,q=>{q.moveTo(W*(.47+j*.012),0);q.bezierCurveTo(W*(.20+j*.012),36+j*7,55+j*9,95+j*8,0,H*(.35+j*.016));},.91-j*.055);
          for(let j=0;j<6;j++)dot(A,W*.29-j*18,14+j*12,2.6+j*.5,.75);
        });
        for(const [x,sx] of [[0,1],[W,-1]])local(x,H/2,sx,1,()=>{p(A,2.4,q=>{q.moveTo(23,-H*.22);q.bezierCurveTo(99,-H*.13,99,H*.13,23,H*.22);});p(D,1,q=>{q.moveTo(15,-H*.22);q.bezierCurveTo(71,-H*.13,71,H*.13,15,H*.22);});});break;
      }
      case 'sigDiplomat': {
        // Woven ceremonial ribbon; central generic ornamental medallions, no official seals.
        for(const y of [0,H-47]){fill(D,0,y,W,47);for(let i=0;i<W;i+=24){poly(A,[[i,y],[i+12,y],[i+36,y+47],[i+24,y+47]],.75);line('#fff',i+2,y,i+26,y+47,.8,.45);}}
        rect(A,58,1.6);
        for(const x of [37,W-37])for(let y=90;y<H-70;y+=30){poly(D,[[x-9,y],[x,y-11],[x+9,y],[x,y+11]]);dot(A,x,y,3);}
        for(const [y,sy] of [[48,1],[H-48,-1]])local(W/2,y,1,sy,()=>{shape('#fff',q=>q.arc(0,0,37,0,tau));circ(A,0,0,34,3);circ(D,0,0,28,1.5);curve(A,0,0,23,10);jewel(0,0,11);});break;
      }
      case 'sigAlma': {
        // Gothic tracery built from pointed arches, ribbed capitals and quatrefoils.
        for(const [x,s] of [[0,1],[W,-1]])local(x,0,s,1,()=>{
          fill(D,0,0,19,H);line(A,24,0,24,H,3);
          for(let y=70;y<H-100;y+=150){p(D,2.4,q=>{q.moveTo(35,y+86);q.lineTo(35,y+37);q.quadraticCurveTo(35,y+16,64,y);q.quadraticCurveTo(93,y+16,93,y+37);q.lineTo(93,y+86);});p(A,1.5,q=>{q.moveTo(45,y+86);q.lineTo(45,y+40);q.quadraticCurveTo(45,y+23,64,y+12);q.quadraticCurveTo(83,y+23,83,y+40);q.lineTo(83,y+86);});curve(A,64,y+56,14,4);line(D,33,y+92,95,y+92,3);}
        });
        for(const [y,sy] of [[20,1],[H-20,-1]])local(0,y,1,sy,()=>{for(let i=0;i<7;i++){let x=135+i*(W-270)/7,d=(W-270)/7;p(A,1.8,q=>{q.moveTo(x,32);q.quadraticCurveTo(x+d*.25,32,x+d/2,0);q.quadraticCurveTo(x+d*.75,32,x+d,32);});curve(D,x+d/2,35,9,4);}line(D,125,0,W-125,0,2);});break;
      }
      case 'sigMonograph': {
        // Editorial composition: book spine, cropped folio tabs and asymmetric red line.
        fill(D,0,0,42,H);fill(A,42,0,11,H);for(let j=0;j<5;j++)line('#fff',8+j*7,30,8+j*7,H-30,.8,.4);
        fill(D,W*.68,0,W*.32,58);fill(A,W*.79,58,W*.21,10);
        fill(A,0,H-51,W*.31,51);fill(D,W*.31,H-17,W*.69,17);
        for(let j=0;j<6;j++){fill(j%2?A:D,W-65,110+j*H*.12,65,9);line(D,W-95,124+j*H*.12,W-22,124+j*H*.12,1);}
        line(A,80,45,W*.62,45,2);line(D,80,52,W*.52,52,1);line(A,W*.37,H-39,W-85,H-39,2);break;
      }
      case 'sigHelix': {
        // Abstract double helix with connected rungs and alternating chromatic curves.
        for(const [x,sx] of [[0,1],[W,-1]])local(x,0,sx,1,()=>{
          fill(D,0,0,15,H);
          for(let i=0;i<=57;i++){let y=25+i*(H-50)/57,a=(y/H)*tau*4;let X=70+31*Math.sin(a),Y=70-31*Math.sin(a);line(D,X,y,Y,y,1.8,.5);dot(A,X,y,3.3);dot(D,Y,y,3.3);}
          for(const [c,sg] of [[A,1],[D,-1]])p(c,4,q=>{for(let j=0;j<=350;j++){let y=j*H/350,x=70+sg*31*Math.sin(y/H*tau*4);j?q.lineTo(x,y):q.moveTo(x,y);}});
        });
        for(const y of [35,H-35]){for(let i=0;i<15;i++){let x=W*.24+i*W*.037;line(D,x,y,x+W*.023,y,2);dot(A,x+W*.025,y,3);}}break;
      }
      case 'sigMarble': {
        // Procedural mineral veining on broad diagonal corner panels; not a photo texture.
        for(const [x,y,sx,sy] of [corners[0],corners[3]])local(x,y,sx,sy,()=>{
          ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W*.42,0);ctx.lineTo(109,117);ctx.lineTo(0,295);ctx.closePath();ctx.clip();
          fill('#e9e8e6',0,0,W*.43,300);for(let j=0;j<30;j++)p(j%4===0?A:D,j%4===0?2.5:.9,q=>{for(let i=0;i<=170;i++){let t=i/170,X=t*W*.46,Y=j*12-50+35*Math.sin(t*13+j*.53)+13*Math.sin(t*33+j*.11)+t*50;i?q.lineTo(X,Y):q.moveTo(X,Y);}},j%4===0?.8:.25);
          ctx.restore();p(metal(0,280,W*.42,0),7,q=>{q.moveTo(0,295);q.lineTo(109,117);q.lineTo(W*.42,0);});
        });
        rect(A,21,1.2);for(const [y,sy] of [[55,1],[H-55,-1]]){line(D,W*.44,y,W*.72,y,1);jewel(W*.76,y,7);}break;
      }
      case 'sigHorizon': {
        // Deep relief engraved waves, edge-to-edge micro-linework in bottom/top bands.
        for(const [y,sy] of [[0,1],[H,-1]])local(0,y,1,sy,()=>{
          shape(D,q=>{q.moveTo(0,0);q.lineTo(W,0);q.lineTo(W,45);q.bezierCurveTo(W*.75,9,W*.62,86,W*.40,48);q.bezierCurveTo(W*.20,15,W*.12,77,0,48);q.closePath();});
          for(let j=0;j<12;j++)p(j%3?A:'#ffffff',1.4,q=>{for(let i=0;i<=400;i++){let t=i/400,X=t*W,Y=7+j*4+11*Math.sin(t*tau*2+j*.17)+5*Math.sin(t*tau*4-j*.07);i?q.lineTo(X,Y):q.moveTo(X,Y);}},j%3?.8:.46);
          p(A,2.5,q=>{q.moveTo(0,48);q.bezierCurveTo(W*.12,77,W*.20,15,W*.40,48);q.bezierCurveTo(W*.62,86,W*.75,9,W,45);});
        });
        for(const [x,sx] of [[0,1],[W,-1]])local(x,0,sx,1,()=>{for(let j=0;j<3;j++)p(A,1.3,q=>{for(let i=0;i<=240;i++){let t=i/240, X=22+j*7+6*Math.sin(t*tau*4+j*.6),Y=93+t*(H-186);i?q.lineTo(X,Y):q.moveTo(X,Y);}},.8-j*.17);});break;
      }
    }}finally{ctx.restore();}
  }

  function drawProfessionalOrnament(kind, accent, ink) {
    const m=38, e=Math.min(W,H), gold=accent, dark=ink;
    ctx.save();
    const fill=(c,x,y,w,h)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
    const poly=(c,pts)=>{ctx.fillStyle=c;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
    const line=(c,x,y,X,Y,w=2)=>{ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke();};
    const rect=(c,n,w=2)=>{ctx.strokeStyle=c;ctx.lineWidth=w;ctx.strokeRect(n,n,W-2*n,H-2*n);};
    const circle=(c,x,y,r,w=2)=>{ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();};
    const corners=[[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]];
    const cornerPoly=(c,x,y,sx,sy,pts)=>poly(c,pts.map(([a,b])=>[x+sx*a,y+sy*b]));
    const diamond=(x,y,r)=>poly(gold,[[x-r,y],[x,y-r],[x+r,y],[x,y+r]]);

    const path=(c,w,fn)=>{ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();fn(ctx);ctx.stroke();};
    const local=(x,y,sx,sy,fn)=>{ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);try{fn();}finally{ctx.restore();}};
    const dot=(x,y,r)=>{ctx.fillStyle=accent;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
    const wave=(x,y,len,amp,count,phase,c,opacity,width)=>{ctx.save();ctx.globalAlpha=opacity;path(c,width,p=>{for(let j=0;j<=320;j++){const t=j/320,yy=y+amp*Math.sin(t*Math.PI*2*count+phase);j?p.lineTo(x+t*len,yy):p.moveTo(x,yy);}});ctx.restore();};
    const rosette=(x,y,r,n)=>{path(accent,1.5,p=>{for(let j=0;j<=200;j++){let a=j*Math.PI*2/200,rr=r*(.73+.27*Math.cos(n*a));let X=x+rr*Math.cos(a),Y=y+rr*Math.sin(a);j?p.lineTo(X,Y):p.moveTo(X,Y);}p.closePath();});circle(accent,x,y,r*.38,1.2);};
    const leaf=(x,y,rx,ry,a)=>{ctx.save();ctx.translate(x,y);ctx.rotate(a);path(accent,1.3,p=>{p.moveTo(-rx,0);p.quadraticCurveTo(0,-ry*2,rx,0);p.quadraticCurveTo(0,ry*2,-rx,0);});ctx.restore();};
    const hex=(x,y,r)=>{path(accent,1.4,p=>{for(let j=0;j<=6;j++){let a=j*Math.PI/3;j?p.lineTo(x+r*Math.cos(a),y+r*Math.sin(a)):p.moveTo(x+r*Math.cos(a),y+r*Math.sin(a));}p.closePath();});};
    switch(kind) {

      case "ducalPro": { rect(dark,25,2);rect(gold,65,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(gold,3,p=>{p.moveTo(24,220);p.lineTo(24,116);p.quadraticCurveTo(24,24,116,24);p.lineTo(220,24);});for(let i=0;i<8;i++){leaf(43+i*19,43,15,5,-.6);leaf(43,43+i*19,15,5,2.17);}rosette(43,43,17,7);}); break; }
      case "silhouettePro": { fill(dark,0,0,W,12);fill(dark,0,H-12,W,12);for(const x of [0,W]){const sx=x===0?1:-1;local(x,H/2,sx,1,()=>{poly(dark,[[0,-H*.35],[53,-H*.21],[53,H*.21],[0,H*.35]]);path(gold,3,p=>{p.moveTo(8,-H*.32);p.lineTo(39,-H*.20);p.lineTo(39,H*.20);p.lineTo(8,H*.32);});});}for(const y of [49,H-49]){line(gold,W*.15,y,W*.85,y,1);diamond(W/2,y,11);} break; }
      case "arcTriomphePro": { for(const [x,sx] of [[0,1],[W,-1]])local(x,0,sx,1,()=>{fill(dark,0,0,16,H);for(const n of [31,46])path(gold,2,p=>{p.moveTo(n,H-50);p.lineTo(n,156);p.quadraticCurveTo(n,50,154,50);p.lineTo(W*.28,50);});});for(const y of [50,H-50]){line(gold,W*.33,y,W*.67,y,2);for(let j=-2;j<=2;j++)diamond(W/2+j*23,y,7);} break; }
      case "mosaicPro": { for(const y of [20,H-53])for(let x=20,i=0;x<W-20;x+=36,i++){poly(i%2?gold:dark,[[x,y+16],[x+17,y],[x+34,y+16],[x+17,y+32]]);poly('#fff',[[x+10,y+16],[x+17,y+9],[x+24,y+16],[x+17,y+23]]);}for(const x of [36,W-36])line(gold,x,65,x,H-65,2);rect(dark,70,1); break; }
      case "engravedVinePro": { for(const [x,sx] of [[35,1],[W-35,-1]]){path(gold,2,p=>{for(let i=0;i<=160;i++){let y=65+(H-130)*i/160,xx=x+sx*12*Math.sin(i/8);i?p.lineTo(xx,y):p.moveTo(xx,y);}});for(let y=85,i=0;y<H-75;y+=45,i++)leaf(x+sx*(i%2?10:23),y,19,8,sx*(i%2?.8:-.8));}for(const y of [39,H-39]){line(dark,67,y,W-67,y,2);rosette(W/2,y,24,9);} break; }
      case "fleurPro": { rect(gold,42,2);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(42,42);ctx.bezierCurveTo(150,12,12,150,42,42);ctx.fill();for(const a of [0,Math.PI/2])local(42,42,1,1,()=>{ctx.rotate(a);path(gold,2,p=>{p.moveTo(18,0);p.bezierCurveTo(38,-32,70,-26,86,0);p.bezierCurveTo(70,26,38,32,18,0);});});});for(const y of [42,H-42]){for(let j=-3;j<=3;j++)leaf(W/2+j*25,y,14,5,Math.PI/2);diamond(W/2,y,8);} break; }
      case "crownRibbonPro": { fill(dark,0,0,W,18);fill(dark,0,H-18,W,18);rect(gold,60,1);for(const [x,y,sx,sy] of [corners[0],corners[1]])local(x,y,sx,sy,()=>{poly(gold,[[0,0],[165,0],[165,38],[80,38],[80,118],[40,83],[0,118]]);poly(dark,[[12,0],[68,0],[68,91],[40,68],[12,91]]);});for(const y of [40,H-40]){line(gold,W*.24,y,W*.44,y,2);line(gold,W*.56,y,W*.76,y,2);poly(gold,[[W/2-37,y-13],[W/2-18,y+4],[W/2,y-19],[W/2+18,y+4],[W/2+37,y-13],[W/2+28,y+14],[W/2-28,y+14]]);} break; }
      case "quillPro": { fill('#f1ece3',0,0,55,H);line(gold,60,20,60,H-20,2);for(const y of [46,H-46]){line(dark,90,y,W-54,y,1);for(let j=0;j<3;j++)line(gold,W-122+j*15,y-10,W-105+j*15,y+10,1.2);}for(let y=105;y<H-100;y+=100){path(gold,1.5,p=>{p.moveTo(18,y+22);p.quadraticCurveTo(20,y-19,42,y-25);});for(let j=0;j<4;j++)line(gold,23+j*4,y+10-j*8,39,y+5-j*8,1);} break; }
      case "laureatePro": { rect(dark,26,1);for(const y of [47,H-47]){for(const sx of [-1,1])local(W/2,y,sx,1,()=>{path(gold,1.7,p=>{p.moveTo(0,15);p.quadraticCurveTo(110,30,218,-12);});for(let j=0;j<8;j++)leaf(25+j*25,15+Math.sin(j*.5)*8,18,5,-.6-j*.08);});circle(gold,W/2,y,17,2);diamond(W/2,y,7);}for(const x of [46,W-46])line(gold,x,92,x,H-92,2); break; }
      case "crestPro": { for(const y of [0,H-28])fill(dark,0,y,W,28);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(gold,2,p=>{p.moveTo(0,33);p.lineTo(130,33);p.lineTo(130,67);p.quadraticCurveTo(65,80,65,142);p.lineTo(33,142);p.lineTo(33,0);});});for(const y of [48,H-48]){path(gold,2,p=>{p.moveTo(W/2-22,y-14);p.lineTo(W/2+22,y-14);p.lineTo(W/2+19,y+8);p.quadraticCurveTo(W/2,y+26,W/2-19,y+8);p.closePath();});line(gold,W*.25,y,W/2-34,y,1);line(gold,W/2+34,y,W*.75,y,1);} break; }
      case "terracesPro": { for(const [x,y,sx,sy] of [corners[0],corners[3]])local(x,y,sx,sy,()=>{for(let j=0;j<4;j++){const len=W*(.48-j*.09);fill(j%2?gold:dark,0,j*15,len,12);poly(j%2?gold:dark,[[0,j*15],[17,j*15],[17,100-j*12],[0,130-j*12]]);}});for(const y of [57,H-57])line(gold,70,y,W-70,y,1); break; }
      case "vectorCutPro": { for(const [x,y,sx,sy] of [corners[1],corners[2]])local(x,y,sx,sy,()=>{poly(dark,[[0,0],[W*.53,0],[W*.31,22],[94,45],[0,210]]);poly(gold,[[0,210],[94,45],[112,39],[0,252]]);poly(gold,[[0,0],[92,0],[0,92]]);});for(const y of [48,H-48])line(dark,W*.39,y,W*.61,y,4); break; }
      case "foldedPagePro": { fill(dark,0,0,22,H);poly(gold,[[W-215,0],[W,0],[W,215]]);poly(dark,[[W-215,0],[W-35,35],[W,215],[W,0]]);poly('#e6dfd2',[[W-215,0],[W-35,35],[W,215],[W-164,51]]);for(const y of [65,H-65])line(gold,55,y,W*.7,y,2);fill(gold,W-20,H*.55,20,H*.45); break; }
      case "crescentPro": { for(const [x,y,sx,sy] of [corners[0],corners[3]])local(x,y,sx,sy,()=>{ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(240,0);ctx.quadraticCurveTo(16,32,0,240);ctx.closePath();ctx.fill();for(let i=0;i<6;i++)path(gold,2,p=>{p.moveTo(245+i*13,0);p.quadraticCurveTo(32+i*6,32+i*6,0,245+i*13);});});for(const y of [40,H-40])circle(gold,W/2,y,12,1.5); break; }
      case "modularPro": { for(const y of [0,H-40]){fill(dark,W*.18,y,W*.64,40);for(const x of [0,W*.82]){fill(gold,x,y,W*.18,40);fill(dark,x+W*.035,y+11,W*.11,18);}}for(const x of [38,W-38]){for(let j=0;j<5;j++){let y=H*(.18+.16*j);fill(j%2?gold:dark,x-10,y-15,20,30);}} break; }
      case "contourFieldPro": { for(const [x,y,sx,sy] of [corners[0],corners[1],corners[2],corners[3]])local(x,y,sx,sy,()=>{for(let j=0;j<7;j++){path(gold,1.6,p=>{p.moveTo(0,35+j*19);p.bezierCurveTo(42+j*15,40+j*9,35+j*8,0,145+j*21,0);});}fill(dark,0,0,26,26);});for(const x of [34,W-34])line(dark,x,H*.25,x,H*.75,2); break; }
      case "rescueBandPro": { for(const x of [0,W-30]){fill(dark,x,0,30,H);for(let y=60;y<H-40;y+=73)poly(gold,[[x,y],[x+30,y+16],[x+30,y+30],[x,y+14]]);}for(const y of [30,H-30]){fill(gold,W*.33,y-9,W*.34,18);line(dark,65,y,W*.33,y,4);line(dark,W*.67,y,W-65,y,4);fill(dark,W/2-17,y-6,34,12);} break; }
      case "trackRoutePro": { rect(dark,24,2);for(const [y,sy] of [[42,1],[H-42,-1]]){const pts=[[55,y],[W*.18,y+sy*10],[W*.33,y-sy*9],[W*.51,y+sy*8],[W*.72,y-sy*8],[W-55,y]];path(gold,3,p=>pts.forEach(([x,Y],j)=>j?p.lineTo(x,Y):p.moveTo(x,Y)));for(const [x,Y] of pts){circle(dark,x,Y,8,2);dot(x,Y,3);}}for(const x of [42,W-42])for(let y=110;y<H-100;y+=80)circle(gold,x,y,3,1); break; }
      case "sensorPro": { for(const [x,sx] of [[0,1],[W,-1]])local(x,H/2,sx,1,()=>{poly(dark,[[0,-190],[60,-115],[60,115],[0,190]]);for(let j=0;j<6;j++)path(gold,2,p=>{p.arc(0,0,20+j*10,-Math.PI/2,Math.PI/2);});});for(const y of [46,H-46]){line(dark,65,y,W-65,y,2);for(let j=0;j<9;j++)dot(W/2+(j-4)*22,y,3+j%3);} break; }
      case "coordinateLPro": { for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{fill(dark,0,0,136,13);fill(dark,0,0,13,136);for(let j=1;j<=8;j++){line(gold,j*15,13,j*15,j%2?25:37,2);line(gold,13,j*15,j%2?25:37,j*15,2);}circle(dark,47,47,12,2);});for(const y of [44,H-44]){line(gold,W*.25,y,W*.75,y,1.5);for(let j=-3;j<=3;j++)line(dark,W/2+j*31,y-7,W/2+j*31,y+7,2);} break; }
      case "cedarPro": { for(const [x,y,sx,sy] of [corners[0],corners[1],corners[2],corners[3]])local(x,y,sx,sy,()=>{path(dark,2,p=>{p.moveTo(30,168);p.quadraticCurveTo(64,72,168,30);});for(let j=0;j<7;j++){let X=35+j*17,Y=146-j*16;leaf(X,Y,16,5,-.3);leaf(X-9,Y-6,14,4,1.1);}});for(const y of [35,H-35])line(gold,184,y,W-184,y,1.5); break; }
      case "tesseraPro": { for(const [x,y,sx,sy] of [corners[0],corners[3]])local(x,y,sx,sy,()=>{for(let j=0;j<6;j++){let X=12+j*37;poly(j%2?gold:dark,[[X,0],[X+32,0],[X+13,31],[X-15,31]]);}for(let j=0;j<4;j++)poly(j%2?dark:gold,[[0,45+j*33],[30,30+j*33],[30,61+j*33],[0,76+j*33]]);});for(const y of [40,H-40])line(gold,W*.31,y,W*.69,y,3); break; }
      case "lacquerPro": { fill(dark,0,0,W,10);fill(dark,0,H-10,W,10);for(const [x,sx] of [[0,1],[W,-1]])local(x,0,sx,1,()=>{ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(73,0);ctx.bezierCurveTo(25,H*.30,25,H*.70,73,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();path(gold,3,p=>{p.moveTo(77,0);p.bezierCurveTo(29,H*.30,29,H*.70,77,H);});});for(const y of [55,H-55]){line(gold,W*.25,y,W*.75,y,2);circle(dark,W/2,y,12,2);} break; }
      case "halftonePro": { for(const [x,y,sx,sy] of [corners[1],corners[2]])local(x,y,sx,sy,()=>{for(let i=0;i<12;i++)for(let j=0;j<6;j++){const r=6*(1-(i+j)/18);if(r>1){ctx.fillStyle=(i+j)%3?gold:dark;ctx.beginPath();ctx.arc(13+i*19,13+j*19,r,0,Math.PI*2);ctx.fill();}}});rect(dark,28,1);line(gold,35,46,W*.35,46,6);line(gold,W*.65,H-46,W-35,H-46,6); break; }

      // Edizione Ultra HD: 21 composizioni originali; nessuna semplice variante cromatica.
      case "magistraleUHD": {
        rect(dark,28,7);rect(gold,43,2);rect(gold,64,1.5);
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let j=0;j<5;j++){let z=52+j*11;path(gold,1.6,p=>{p.moveTo(z,154-j*10);p.bezierCurveTo(z,65,z+25,z,154-j*10,z);});}rosette(61,61,20,8);});
        for(const y of [31,H-31]){fill(dark,W*.35,y-9,W*.30,18);for(let j=-3;j<=3;j++)diamond(W/2+j*23,y,5);}break;}
      case "senatoUHD": {
        fill(dark,0,0,W,42);fill(dark,0,H-30,W,30);line(gold,0,43,W,43,4);line(gold,0,H-31,W,H-31,3);
        for(const x of [36,W-36]){fill(gold,x-3,66,6,H-125);for(let y=96;y<H-92;y+=54){leaf(x,y,21,7,Math.PI/2);}}
        for(const [x,y,sx,sy] of [corners[0],corners[1]])local(x,y,sx,sy,()=>{poly(dark,[[0,0],[210,0],[147,46],[49,46],[49,156],[0,205]]);path(gold,3,p=>{p.moveTo(44,166);p.lineTo(44,51);p.lineTo(169,51);});});break;}
      case "noirUHD": {
        fill(dark,0,0,35,H);fill(dark,W-35,0,35,H);fill(dark,0,0,W,35);fill(dark,0,H-35,W,35);
        rect(gold,16,2.5);rect(gold,47,2);rect(dark,57,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let j=0;j<6;j++)line(gold,6,18+j*7,18+j*7,6,1.6);poly(gold,[[36,36],[100,36],[36,100]]);poly(dark,[[43,43],[83,43],[43,83]]);});break;}
      case "atlasUHD": {
        for(const [x,y,sx,sy] of [corners[0],corners[3]])local(x,y,sx,sy,()=>{poly(dark,[[0,0],[W*.46,0],[W*.27,24],[75,24],[24,90],[0,190]]);poly(gold,[[0,190],[24,90],[24,120],[0,230]]);});
        for(const y of [62,H-62]){line(dark,80,y,W-80,y,1.6);fill(gold,W*.40,y-5,W*.20,10);}for(const x of [49,W-49])for(let j=0;j<4;j++)line(gold,x-8,160+j*25,x+8,160+j*25,2);break;}
      case "dogeUHD": {
        rect(gold,35,4);rect(dark,59,1.5);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(gold,2.5,p=>{p.moveTo(39,170);p.bezierCurveTo(92,115,8,95,68,68);p.bezierCurveTo(95,8,115,92,170,39);});for(let j=0;j<4;j++){leaf(71+j*23,48,16,6,-.32);leaf(48,71+j*23,16,6,1.89);}rosette(45,45,14,6);});
        for(const y of [46,H-46]){path(gold,2,p=>{p.moveTo(W/2-96,y);p.bezierCurveTo(W/2-38,y-24,W/2+38,y+24,W/2+96,y);});rosette(W/2,y,22,10);}break;}
      case "vellumUHD": {
        ctx.save();ctx.globalAlpha=.10;fill('#c5a57b',0,0,W,70);fill('#c5a57b',0,H-70,W,70);ctx.restore();
        for(const y of [34,H-34]){line(gold,34,y,W-34,y,1);for(let x=55;x<W-46;x+=34){line(gold,x,y-6,x+11,y+6,1.4);line(gold,x+11,y+6,x+22,y-6,1.4);}}
        for(const x of [34,W-34]){line(dark,x,58,x,H-58,1.5);for(let y=86;y<H-70;y+=60){path(gold,1.5,p=>{p.moveTo(x,y-14);p.quadraticCurveTo(x+12,y,x,y+14);p.quadraticCurveTo(x-12,y,x,y-14);});}}break;}
      case "orbitaleUHD": {
        for(const [x,y,sx,sy] of [corners[1],corners[2]])local(x,y,sx,sy,()=>{poly(dark,[[0,0],[245,0],[0,245]]);for(let j=0;j<5;j++){path(gold,2,p=>{p.arc(0,0,44+j*29,0,Math.PI/2);});}dot(112,61,7);dot(63,143,5);});
        line(gold,57,44,W-270,44,3);line(dark,270,H-44,W-57,H-44,3);break;}
      case "sentinelUHD": {
        fill(dark,0,0,25,H);fill(dark,W-25,0,25,H);for(const x of [39,W-39]){line(gold,x,44,x,H-44,4);for(let y=95;y<H-80;y+=115)poly(gold,[[x-10,y],[x,y-14],[x+10,y],[x,y+14]]);}
        for(const y of [37,H-37]){poly(dark,[[W*.38,y-16],[W*.62,y-16],[W*.59,y+16],[W*.41,y+16]]);line(gold,W*.43,y,W*.57,y,3);}break;}
      case "triageUHD": {
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{poly(dark,[[0,0],[142,0],[142,25],[55,25],[25,55],[25,142],[0,142]]);poly(gold,[[25,25],[71,25],[25,71]]);for(let j=0;j<3;j++)line(gold,10,65+j*19,20,76+j*19,3);});
        for(const y of [42,H-42]){line(gold,174,y,W*.45,y,2);line(gold,W*.55,y,W-174,y,2);fill(dark,W/2-27,y-5,54,10);fill(gold,W/2-5,y-15,10,30);}break;}
      case "forenseUHD": {
        rect(dark,27,2);for(const y of [44,H-44]){for(let i=0;i<36;i++){let x=55+i*(W-110)/36;fill(i%6===0?dark:gold,x,y-5,i%3===0?4:1.5,i%6===0?20:10);}}
        for(const x of [46,W-46])for(let y=94;y<H-75;y+=72){line(gold,x-9,y,x+9,y,1);line(dark,x,y-9,x,y+9,1.4);}for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(dark,2,p=>{p.moveTo(24,85);p.lineTo(24,24);p.lineTo(85,24);});});break;}
      case "heliosUHD": {
        rect(gold,40,1.5);for(const y of [45,H-45]){for(let j=-8;j<=8;j++){let x=W/2+j*24;let h=7+17*(1-Math.abs(j)/9);line(gold,x,y-h/2,x,y+h/2,j===0?3:1.5);}circle(dark,W/2,y,21,1.5);circle(gold,W/2,y,15,1.5);}
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let j=0;j<4;j++)path(gold,1.7,p=>{p.arc(35,35,18+j*15,0,Math.PI/2);});});break;}
      case "mintUHD": {
        rect(gold,47,1.4);for(const [x,y,sx,sy] of [corners[0],corners[3]])local(x,y,sx,sy,()=>{poly(dark,[[0,0],[W*.36,0],[W*.29,26],[88,26],[26,88],[26,150],[0,150]]);poly(gold,[[0,150],[26,150],[26,167],[0,191]]);});
        for(const y of [36,H-36]){line(gold,W*.38,y,W*.62,y,1);for(let j=-2;j<=2;j++){path(dark,1.4,p=>{p.ellipse(W/2+j*17,y,16,6,0,0,Math.PI*2);});}}break;}
      case "spectrumUHD": {
        for(const [x,y,sx,sy] of [corners[0],corners[3]])local(x,y,sx,sy,()=>{poly(dark,[[0,0],[W*.50,0],[W*.37,22],[0,105]]);for(let j=0;j<5;j++){ctx.save();ctx.globalAlpha=.32+j*.13;poly(gold,[[0,105+j*8],[W*.37-j*35,22+j*10],[W*.42-j*35,22+j*10],[0,111+j*8]]);ctx.restore();}});
        line(dark,45,H-46,W*.38,H-46,3);line(gold,W*.62,46,W-45,46,3);break;}
      case "vettaUHD": {
        for(const y of [0,H-43]){fill(dark,0,y,W,43);const pts=[];for(let j=0;j<=12;j++)pts.push([W*j/12,y+6+((j*13)%29)]);pts.push([W,y+43],[0,y+43]);poly(gold,pts);}
        for(const x of [37,W-37]){line(dark,x,65,x,H-65,2);for(let y=104;y<H-95;y+=85){poly(gold,[[x-8,y+6],[x,y-10],[x+8,y+6]]);}}break;}
      case "mareaUHD": {
        for(const [x,y,sx,sy] of [corners[1],corners[2]])local(x,y,sx,sy,()=>{ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W*.43,0);ctx.bezierCurveTo(W*.24,55,88,16,0,182);ctx.closePath();ctx.fill();for(let j=0;j<5;j++)path(gold,2.5,p=>{p.moveTo(W*.43+j*13,0);p.bezierCurveTo(W*.25,67+j*8,98+j*6,32+j*10,0,187+j*9);});});
        for(const y of [49,H-49]){line(gold,W*.32,y,W*.68,y,1.6);}break;}
      case "opaleUHD": {
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{poly(dark,[[0,0],[116,0],[78,28],[25,25],[28,78],[0,116]]);poly(gold,[[25,25],[78,28],[48,51],[28,78]]);path(gold,2,p=>{p.moveTo(25,125);p.lineTo(48,51);p.lineTo(125,25);});});
        for(const y of [42,H-42]){line(dark,130,y,W*.38,y,1);line(dark,W*.62,y,W-130,y,1);for(let j=-2;j<=2;j++)diamond(W/2+j*20,y,8);}break;}
      case "florealeUHD": {
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(dark,2,p=>{p.moveTo(32,220);p.bezierCurveTo(18,96,91,31,220,32);});for(let j=0;j<7;j++){let t=j/6;let X=39+148*t*t,Y=184-142*t;leaf(X,Y,23,7,-.65);leaf(X+13,Y-14,17,6,.42);}rosette(49,49,19,7);});
        for(const y of [40,H-40])line(gold,228,y,W-228,y,1.2);break;}
      case "palinsestoUHD": {
        for(const x of [0,W-24]){fill(dark,x,0,24,H);fill(gold,x===0?24:W-29,0,5,H);}for(const y of [35,H-35]){line(gold,51,y,W-51,y,1.5);for(let i=0;i<9;i++){let x=W*.32+i*W*.045;path(dark,1.6,p=>{p.moveTo(x-9,y-6);p.lineTo(x,y+6);p.lineTo(x+9,y-6);});}}
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{fill(gold,32,32,57,6);fill(gold,32,32,6,57);});break;}
      case "incisioneUHD": {
        rect(dark,28,2);rect(gold,67,1);for(const y of [47,H-47]){for(let j=0;j<5;j++)wave(38,y,W-76,8+j*2,Math.round(W/97),j*.7,gold,.55,1.1);}
        for(const x of [47,W-47])for(let y=87;y<H-70;y+=42){path(gold,1.1,p=>{p.ellipse(x,y,10,18,0,0,Math.PI*2);});diamond(x,y,3);}break;}
      case "prismaUHD": {
        for(const [x,y,sx,sy] of [corners[0],corners[3]])local(x,y,sx,sy,()=>{poly(dark,[[0,0],[245,0],[136,48],[48,136],[0,245]]);poly(gold,[[0,245],[48,136],[136,48],[245,0],[266,0],[156,64],[64,156],[0,266]]);});
        for(const [x,y,sx,sy] of [corners[1],corners[2]])local(x,y,sx,sy,()=>{path(gold,2,p=>{p.moveTo(30,142);p.lineTo(30,30);p.lineTo(142,30);});poly(dark,[[30,30],[75,30],[30,75]]);});break;}
      case "notarileUHD": {
        rect(dark,34,2);rect(gold,49,2);for(const y of [49,H-49]){fill('#ffffff',W/2-85,y-29,170,58);line(dark,W/2-84,y,W/2-36,y,1.5);line(dark,W/2+36,y,W/2+84,y,1.5);rosette(W/2,y,31,12);circle(dark,W/2,y,24,1.3);diamond(W/2,y,8);}
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(gold,2,p=>{p.moveTo(49,116);p.quadraticCurveTo(49,49,116,49);});for(let j=0;j<3;j++)circle(dark,49+j*12,49+j*12,3,1.2);});break;}

      case "aureole":
        fill(dark,0,0,W,20);fill(dark,0,H-20,W,20);
        for(const [x,y,sx,sy] of [corners[0],corners[1]])local(x,y,sx,sy,()=>{poly(dark,[[0,0],[248,0],[192,25],[55,25],[25,55],[25,192],[0,248]]);path(accent,3,p=>{p.moveTo(0,181);p.quadraticCurveTo(25,37,181,0);});for(let j=0;j<7;j++){const a=(j+1)*Math.PI/18;line(accent,23+46*Math.cos(a),23+46*Math.sin(a),23+76*Math.cos(a),23+76*Math.sin(a),2);}});
        for(const y of [40,H-40]){line(accent,70,y,W*.41,y,2);line(accent,W*.59,y,W-70,y,2);path(accent,2,p=>{p.ellipse(W/2,y,W*.072,12,0,0,2*Math.PI);});diamond(W/2,y,7);}break;
      case "signet":
        rect(dark,32,1.5);rect(accent,49,3);for(const y of [48,H-48]){for(let k=-2;k<=2;k++)circle(accent,W/2+k*25,y,16,1.4);diamond(W/2,y,12);}for(const x of [49,W-49])for(let y=110;y<H-100;y+=74)diamond(x,y,6);break;
      case "silk":
        for(const y of [22,H-22]){for(let j=0;j<4;j++)wave(0,y,W,12+j*3,3,j*.7,accent,.8-j*.12,2.2);}for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(dark,4,p=>{p.moveTo(0,122);p.bezierCurveTo(32,38,98,75,188,0);});});break;
      case "archivist":
        fill('#f3eee3',0,0,55,H);fill('#f3eee3',W-55,0,55,H);rect(accent,32,1);for(let x=75;x<W-65;x+=18){line(accent,x,35,x,45,1);line(accent,x,H-35,x,H-45,1);}for(let y=90;y<H-90;y+=65){line(dark,29,y,44,y,2);line(dark,W-44,y,W-29,y,2);}break;
      case "rational":
        fill(dark,0,0,W*.32,24);fill(accent,W*.32,0,W*.68,24);fill(accent,0,H-24,W*.68,24);fill(dark,W*.68,H-24,W*.32,24);line(dark,36,63,36,H-63,7);line(accent,W-36,63,W-36,H-63,7);break;
      case "brocade":
        rect(accent,31,2);rect(accent,70,1);for(const y of [49,H-49])for(let x=64;x<W-42;x+=51){leaf(x,y,24,8,Math.PI/4);leaf(x,y,24,8,-Math.PI/4);}for(const x of [50,W-50])for(let y=90;y<H-70;y+=45){leaf(x,y,20,7,Math.PI/4);leaf(x,y,20,7,-Math.PI/4);}break;
      case "sundial":
        rect(accent,46,1.7);for(const [x,y,sx,sy] of [corners[0],corners[1]])local(x,y,sx,sy,()=>{for(let i=0;i<=12;i++){let a=i*Math.PI/24;line(accent,24+35*Math.cos(a),24+35*Math.sin(a),24+86*Math.cos(a),24+86*Math.sin(a),i%3===0?3:1.2);}circle(dark,24,24,32,2);});for(const x of [45,W-45])for(let y=150;y<H-100;y+=100)dot(x,y,3);break;
      case "inlay":
        rect(dark,35,2);for(let x=46;x<W-55;x+=58){poly(accent,[[x,36],[x+23,25],[x+46,36],[x+23,47]]);poly(dark,[[x,H-36],[x+23,H-25],[x+46,H-36],[x+23,H-47]]);}for(const x of [36,W-36])line(accent,x,64,x,H-64,3);break;
      case "emboss":
        for(let n=28;n<=48;n+=5)rect(n%10===3?dark:accent,n,1.2);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let i=0;i<5;i++)circle(accent,56,56,12+i*7,1);});break;
      case "botanical":
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(dark,1.8,p=>{p.moveTo(38,200);p.quadraticCurveTo(27,70,160,42);});for(let j=0;j<5;j++){leaf(42+j*20,150-j*23,21,8,-.65);leaf(33+j*20,135-j*19,18,7,.6);}});line(accent,176,42,W-176,42,1);line(accent,176,H-42,W-176,H-42,1);break;
      case "bookplate":
        rect(accent,43,2);for(const y of [44,H-44]){fill(dark,W*.4,y-11,W*.2,22);line(accent,W*.4,y,W*.6,y,2);diamond(W/2,y,9);}for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(accent,2,p=>{p.moveTo(26,108);p.lineTo(26,26);p.lineTo(108,26);p.moveTo(56,100);p.lineTo(56,56);p.lineTo(100,56);});});break;
      case "rivet":
        fill(dark,0,0,34,H);fill(dark,W-34,0,34,H);for(const x of [17,W-17])for(let y=36;y<H-12;y+=76){circle(accent,x,y,8,2);line(accent,x-4,y,x+4,y,1);}line(accent,57,45,W-57,45,3);line(accent,57,H-45,W-57,H-45,3);break;
      case "parallels":
        for(const [x,y,sx,sy] of [corners[1],corners[2]])local(x,y,sx,sy,()=>{for(let i=0;i<5;i++){let n=i*18;poly(i%2?accent:dark,[[0,n],[200+n,0],[230+n,0],[0,n+13]]);}});line(dark,46,65,W-46,65,1);line(dark,46,H-65,W-46,H-65,1);break;
      case "marquetry":
        rect(accent,54,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let i=0;i<3;i++)for(let j=0;j<3;j++){let X=18+18*i,Y=18+18*j;poly((i+j)%2?dark:accent,[[X,Y],[X+17,Y],[X,Y+17]]);poly((i+j)%2?accent:dark,[[X+17,Y],[X+17,Y+17],[X,Y+17]]);}});break;
      case "palazzo":
        for(const x of [37,W-37]){line(accent,x-9,78,x-9,H-78,2);line(dark,x,78,x,H-78,5);line(accent,x+9,78,x+9,H-78,2);}for(const y of [42,H-42]){line(dark,28,y,W-28,y,6);for(let x=65;x<W-60;x+=55){path(accent,2,p=>{p.moveTo(x-20,y);p.quadraticCurveTo(x,y-18,x+20,y);p.quadraticCurveTo(x,y+18,x-20,y);});}}break;
      case "cadenza":
        for(let x=70,i=0;x<W-65;x+=24,i++){const h=5+14*(1+Math.sin(i*.52));line(i%4===0?dark:accent,x,40-h/2,x,40+h/2,2);line(i%4===0?dark:accent,x,H-40-h/2,x,H-40+h/2,2);}for(const x of [36,W-36])line(dark,x,76,x,H-76,1);break;
      case "keystone":
        rect(accent,50,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{poly(dark,[[0,0],[145,0],[145,22],[60,22],[22,60],[22,145],[0,145]]);poly(accent,[[22,22],[80,22],[22,80]]);});for(const y of [36,H-36])poly(accent,[[W/2-36,y-9],[W/2+36,y-9],[W/2+22,y+9],[W/2-22,y+9]]);break;
      case "ribbonFold":
        for(const [x,y,sx,sy] of [corners[0],corners[1]])local(x,y,sx,sy,()=>{poly(dark,[[0,18],[156,18],[124,45],[156,72],[0,72]]);poly(accent,[[0,72],[32,72],[0,97]]);line(accent,12,26,113,26,1.5);});line(accent,48,H-45,W-48,H-45,3);break;
      case "folioTab":
        fill(dark,0,0,25,H);for(let j=0;j<5;j++){let y=110+j*(H-220)/4;fill(j%2?accent:dark,0,y,48,47);}line(accent,64,45,W-44,45,2);line(dark,W-44,45,W-44,H-45,2);line(accent,64,H-45,W-44,H-45,2);break;
      case "chevronRail":
        for(const y of [0,H-35]){fill(dark,0,y,W,35);for(let x=16;x<W-40;x+=62)poly(accent,[[x,y+7],[x+16,y+7],[x+31,y+17],[x+16,y+28],[x,y+28],[x+15,y+17]]);}line(accent,42,54,42,H-54,3);line(accent,W-42,54,W-42,H-54,3);break;
      case "relay":
        rect(dark,36,2);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{fill(dark,0,0,100,26);fill(accent,0,26,66,8);fill(dark,0,0,26,100);fill(accent,26,0,8,66);});for(const y of [48,H-48]){for(let j=0;j<7;j++){let x=W/2+(j-3)*26;fill(j===3?accent:dark,x-6,y-5,12,10);}}break;
      case "scanline":
        rect(dark,31,1);for(const x of [34,W-34])for(let y=70;y<H-60;y+=22){line(accent,x-12,y,x+12,y,1.4);}for(const y of [44,H-44]){for(let i=0;i<31;i++){let x=56+(W-112)*i/30;line(i%5===0?dark:accent,x,y-5,x,y+5+(i%5)*2,1.5);}}break;
      case "ledger":
        fill(dark,0,0,19,H);fill(accent,19,0,5,H);for(let y=82;y<H-65;y+=48){circle(accent,40,y,6,1.5);line(dark,48,y,65,y,1.5);}line(accent,80,46,W-45,46,2);line(accent,80,H-46,W-45,H-46,2);break;
      case "starChart":
        rect(accent,43,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{const pts=[[38,42],[80,26],[118,49],[159,30],[46,88],[25,126]];for(const [a,b] of [[0,1],[1,2],[2,3],[0,4],[4,5]])line(dark,...pts[a],...pts[b],1);for(const [a,b] of pts){diamond(a,b,4);circle(accent,a,b,8,1);}});break;
      case "quartz":
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{poly(dark,[[0,0],[122,0],[70,27],[27,70],[0,122]]);poly(accent,[[0,0],[49,0],[27,27],[0,49]]);path(accent,2,p=>{p.moveTo(26,108);p.lineTo(53,53);p.lineTo(108,26);});});rect(accent,57,1);break;
      case "weave":
        for(const y of [40,H-40])for(let x=44;x<W-40;x+=32){line(accent,x-14,y-10,x+14,y+10,3);line(dark,x-14,y+10,x+14,y-10,1.6);}for(const x of [40,W-40])for(let y=76;y<H-65;y+=32){line(accent,x-10,y-14,x+10,y+14,3);line(dark,x+10,y-14,x-10,y+14,1.6);}break;
      case "wreathMedal":
        rect(accent,40,2);for(const y of [48,H-48]){circle(dark,W/2,y,31,2);circle(accent,W/2,y,25,2);for(let j=0;j<8;j++){const a=j*Math.PI/4;leaf(W/2+38*Math.cos(a),y+24*Math.sin(a),11,4,a+Math.PI/2);}diamond(W/2,y,14);}break;
      case "folioRail":
        fill(accent,0,0,12,H);fill(dark,12,0,12,H);for(const y of [37,H-37]){line(dark,45,y,W-36,y,1.4);line(accent,45,y+7,W*.38,y+7,4);}for(let y=90;y<H-75;y+=100)line(accent,W-30,y,W-30,y+30,4);break;

      // Nuove composizioni originali: la grafica resta nello spazio periferico A4.
      case "regalia":
        fill(dark,0,0,W,35);fill(dark,0,H-35,W,35);fill(dark,0,0,35,H);fill(dark,W-35,0,35,H);
        rect(accent,19,2);rect(accent,47,3);rect(accent,60,1);for(const [x,y,sx,sy] of corners){local(x,y,sx,sy,()=>{for(let j=0;j<3;j++){const t=48+j*13;path(accent,2,p=>{p.moveTo(t,155);p.lineTo(t,t);p.lineTo(155,t);});}rosette(51,51,23,8);});}break;
      case "guilloche":
        rect(dark,31,1);rect(accent,66,2);for(const y of [48,H-48])for(let j=0;j<5;j++){wave(34,y,W-68,10,34,j*Math.PI/5,accent,.62,1.1);}for(const x of [48,W-48]){ctx.save();ctx.translate(x,34);ctx.rotate(Math.PI/2);for(let j=0;j<5;j++)wave(0,0,H-68,10,25,j*Math.PI/5,accent,.62,1.1);ctx.restore();}break;
      case "rosette":
        rect(accent,40,2.4);rect(accent,58,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{rosette(60,60,32,12);path(accent,2,p=>{p.moveTo(91,60);p.quadraticCurveTo(140,12,215,40);p.moveTo(60,91);p.quadraticCurveTo(12,140,40,215);});});break;
      case "venetian":
        rect(accent,34,4);rect(accent,72,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let j=0;j<6;j++){path(accent,2,p=>{p.moveTo(45,45);p.bezierCurveTo(72,15+j*8,103+j*15,108-j*9,180+j*12,48);});path(accent,2,p=>{p.moveTo(45,45);p.bezierCurveTo(15+j*8,72,108-j*9,103+j*15,48,180+j*12);});}});break;
      case "renaissance":
        rect(accent,36,2);rect(accent,58,2);for(const y of [47,H-47])for(let x=90;x<W-65;x+=52){diamond(x,y,6);path(accent,1.2,p=>{p.moveTo(x-24,y);p.quadraticCurveTo(x,y-13,x+24,y);p.quadraticCurveTo(x,y+13,x-24,y);});}for(const x of [47,W-47])for(let y=90;y<H-65;y+=52){diamond(x,y,6);}break;
      case "laurelSeal":
        rect(accent,43,2);rect(accent,56,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(accent,2,p=>{p.moveTo(44,175);p.quadraticCurveTo(57,65,178,44);});for(let j=0;j<7;j++){let t=j/6;leaf(45+130*t,175-130*t,13,5,-.7);leaf(45+130*t,175-130*t,13,5,2.2);}});break;
      case "engraved":
        rect(dark,30,4);rect(accent,73,1.5);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let j=0;j<8;j++){path(accent,1.4,p=>{p.moveTo(38+j*4,125);p.arcTo(38+j*4,38+j*4,125,38+j*4,37+j*2);p.lineTo(125,38+j*4);});}});for(let x=130;x<W-120;x+=18){line(accent,x,44,x+8,57,1);line(accent,x,H-44,x+8,H-57,1);}break;
      case "cameo":
        rect(accent,47,1.5);for(const y of [48,H-48]){ctx.save();ctx.translate(W/2,y);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,46,23,0,0,Math.PI*2);ctx.stroke();ctx.restore();rosette(W/2,y,17,8);line(accent,85,y,W/2-58,y,1.2);line(accent,W/2+58,y,W-85,y,1.2);}break;
      case "lattice":
        rect(accent,27,2);rect(dark,72,2);for(const y of [49,H-49])for(let x=48;x<W-35;x+=38){path(accent,1.3,p=>{p.moveTo(x-19,y);p.lineTo(x,y-15);p.lineTo(x+19,y);p.lineTo(x,y+15);p.closePath();});}for(const x of [49,W-49])for(let y=82;y<H-60;y+=38){path(accent,1.3,p=>{p.moveTo(x-15,y);p.lineTo(x,y-19);p.lineTo(x+15,y);p.lineTo(x,y+19);p.closePath();});}break;
      case "fanDeco":
        rect(dark,30,3);rect(accent,68,1.5);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{poly(dark,[[0,0],[160,0],[0,160]]);for(let j=0;j<13;j++){let a=j*Math.PI/24;line(accent,28,28,28+120*Math.cos(a),28+120*Math.sin(a),1.6);}for(let r of [39,67,98]){path(accent,2,p=>{p.arc(28,28,r,0,Math.PI/2);});}});break;
      case "pearl":
        rect(accent,37,1);rect(accent,64,1);for(let x=45;x<W-35;x+=19){dot(x,50,2.5);dot(x,H-50,2.5);}for(let y=68;y<H-58;y+=19){dot(50,y,2.5);dot(W-50,y,2.5);}for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{circle(accent,50,50,13,1.5);circle(accent,50,50,7,1);});break;
      case "ribbonSeal":
        rect(accent,45,2);for(const y of [0,H-33])fill(dark,0,y,W,33);for(const y of [48,H-48]){line(accent,75,y,W-75,y,2);poly(accent,[[W/2-42,y-12],[W/2+42,y-12],[W/2+30,y+12],[W/2-30,y+12]]);circle(dark,W/2,y,13,2);}break;
      case "aurora":
        for(const [x,y,sx,sy] of [corners[0],corners[3]])local(x,y,sx,sy,()=>{for(let j=0;j<5;j++){ctx.globalAlpha=.95-j*.13;poly(j%2?accent:dark,[[0,j*9],[e*(.48-j*.045),0],[0,82+j*12]]);}ctx.globalAlpha=1;});line(accent,78,64,W-78,64,1);line(accent,78,H-64,W-78,H-64,1);break;
      case "prism":
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{poly(dark,[[0,0],[180,0],[70,63],[0,118]]);poly(accent,[[180,0],[245,0],[70,63]]);ctx.globalAlpha=.38;poly(accent,[[0,118],[70,63],[0,180]]);ctx.globalAlpha=1;});break;
      case "horizon":
        fill(dark,0,0,W,30);fill(accent,0,30,W,8);fill(dark,0,H-30,W,30);fill(accent,0,H-38,W,8);for(const y of [55,H-55]){line(accent,0,y,W*.34,y,3);line(accent,W*.66,y,W,y,3);}break;
      case "origami":
        for(const [x,y,sx,sy] of [corners[1],corners[2]])local(x,y,sx,sy,()=>{poly(dark,[[0,0],[260,0],[90,82],[0,110]]);poly(accent,[[0,0],[115,0],[60,130],[0,110]]);poly(dark,[[60,130],[0,110],[0,155]]);});rect(accent,56,1.3);break;
      case "monolith":
        fill(dark,0,0,46,H);fill(dark,W-46,0,46,H);fill(accent,46,0,8,H);fill(accent,W-54,0,8,H);for(const y of [55,H-55]){line(accent,85,y,W-85,y,1.6);fill(dark,W/2-85,y-9,170,18);fill(accent,W/2-35,y-2,70,4);}break;
      case "ascent":
        for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let j=0;j<3;j++){let z=j*29;poly(j===1?accent:dark,[[z,0],[z+65,0],[0,z+65],[0,z]]);}});rect(accent,72,1.4);break;
      case "folioModern":
        fill(accent,0,0,19,H);fill(dark,W-19,0,19,H);line(dark,66,56,W-66,56,3);line(accent,66,H-56,W-66,H-56,3);for(const x of [66,W-66]){line(accent,x,56,x,144,1);line(dark,x,H-144,x,H-56,1);}break;
      case "spectrum":
        for(const y of [0,H-46]){fill(dark,0,y,W,46);for(let j=0;j<7;j++){ctx.globalAlpha=.25+j*.095;poly(accent,[[W*j/7,y],[W*(j+1)/7,y],[W*(j+1)/7-50,y+46],[W*j/7-50,y+46]]);}ctx.globalAlpha=1;}rect(accent,64,1.2);break;
      case "arcadia":
        rect(accent,50,1.2);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(accent,2,p=>{p.moveTo(37,150);p.bezierCurveTo(67,115,103,64,172,37);});for(let j=0;j<6;j++){let t=j/5;leaf(37+135*t,150-113*t,18,7,-.9);}});break;
      case "bridge":
        fill(dark,0,0,W,29);fill(dark,0,H-29,W,29);for(const y of [49,H-49]){line(accent,0,y,W,y,2);for(let j=0;j<5;j++){let x=75+j*(W-150)/4;path(accent,1.5,p=>{p.moveTo(x-34,y);p.quadraticCurveTo(x,y+(y<100?24:-24),x+34,y);});}}break;
      case "ripple":
        for(const y of [43,H-43])for(let j=0;j<4;j++)wave(0,y,W,8+j*3,3,j*.7, j%2?accent:dark,.6,2.5);break;
      case "minimalLux":
        rect(dark,36,2.5);for(const y of [60,H-60]){line(accent,88,y,W*.42,y,1.8);line(accent,W*.58,y,W-88,y,1.8);diamond(W/2,y,9);circle(accent,W/2,y,15,1);}break;
      case "command":
        fill(dark,0,0,W,44);fill(dark,0,H-44,W,44);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{poly(accent,[[0,0],[155,0],[100,44],[44,44],[44,119],[0,150]]);for(let j=0;j<4;j++)line(dark,45+j*16,9,58+j*16,30,4);});rect(accent,65,2);break;
      case "fieldMap":
        rect(dark,35,2);rect(accent,74,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let j=0;j<7;j++){let r=20+j*13;path(accent,1.5,p=>{p.moveTo(15,40+r);p.bezierCurveTo(40+r,48+r,25+r,20+r,80+r,30);});}});break;
      case "radar":
        rect(dark,33,3);rect(accent,63,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let r of [32,49,66,83])path(accent,1.6,p=>{p.arc(35,35,r,0,Math.PI/2);});for(let a of [0,Math.PI/6,Math.PI/3,Math.PI/2])line(accent,35,35,35+83*Math.cos(a),35+83*Math.sin(a),1.2);dot(79,66,4);});break;
      case "signal":
        fill(dark,0,0,W,35);fill(dark,0,H-35,W,35);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let j=0;j<5;j++){let z=12+j*31;poly(accent,[[z,0],[z+16,0],[z+43,35],[z+27,35]]);}});line(accent,52,61,W-52,61,2);line(accent,52,H-61,W-52,H-61,2);break;
      case "compass":
        rect(dark,39,2);rect(accent,58,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{circle(accent,60,60,30,1.3);for(let j=0;j<8;j++){let a=j*Math.PI/4;line(accent,60+21*Math.cos(a),60+21*Math.sin(a),60+30*Math.cos(a),60+30*Math.sin(a),2);}poly(dark,[[60,31],[65,60],[60,89],[55,60]]);poly(accent,[[31,60],[60,55],[89,60],[60,65]]);});break;
      case "trace":
        rect(accent,47,1.5);for(const y of [46,H-46]){ctx.save();ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.setLineDash([3,8]);ctx.beginPath();ctx.moveTo(80,y);ctx.bezierCurveTo(W*.25,y-17,W*.38,y+17,W*.5,y);ctx.bezierCurveTo(W*.62,y-17,W*.75,y+17,W-80,y);ctx.stroke();ctx.restore();for(let x of [80,W/2,W-80])circle(accent,x,y,8,2);}break;
      case "hexTech":
        rect(dark,36,2.5);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{for(let j=0;j<5;j++){let X=49+j*34,Y=49;hex(X,Y,19);if(j<3)hex(49,Y+j*34+34,19);}});break;
      case "shieldPro":
        rect(accent,38,2);rect(dark,58,1);for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{path(accent,2.3,p=>{p.moveTo(32,30);p.lineTo(90,30);p.lineTo(90,62);p.quadraticCurveTo(88,83,61,97);p.quadraticCurveTo(34,83,32,62);p.closePath();});line(dark,61,39,61,77,2);line(accent,43,53,79,53,2);});break;
      case "pulse":
        rect(dark,34,3);for(const y of [52,H-52]){line(accent,65,y,W*.36,y,2.5);path(accent,2.5,p=>{p.moveTo(W*.36,y);p.lineTo(W*.44,y);p.lineTo(W*.47,y-16);p.lineTo(W*.50,y+16);p.lineTo(W*.53,y-10);p.lineTo(W*.56,y);p.lineTo(W-65,y);});}break;
      case "gridPro":
        rect(dark,39,2);rect(accent,68,1);for(let x=76;x<W-65;x+=34){line(accent,x,39,x,49,1.4);line(accent,x,H-39,x,H-49,1.4);}for(let y=76;y<H-65;y+=34){line(accent,39,y,49,y,1.4);line(accent,W-39,y,W-49,y,1.4);}for(const [x,y,sx,sy] of corners)local(x,y,sx,sy,()=>{circle(accent,52,52,9,1.5);line(dark,52,34,52,70,1);line(dark,34,52,70,52,1);});break;
      case "mountain":
        for(const y of [0,H-38]){fill(dark,0,y,W,38);for(let j=0;j<5;j++){let x=j*W/5;ctx.globalAlpha=.8;poly(accent,[[x,y+38],[x+W/10,y+4],[x+W/5,y+38]]);ctx.globalAlpha=1;}}rect(accent,65,1);break;
      case "current":
        for(const [x,y,sx,sy] of [corners[0],corners[3]])local(x,y,sx,sy,()=>{ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(e*.47,0);ctx.bezierCurveTo(e*.22,18,55,100,0,128);ctx.closePath();ctx.fill();path(accent,8,p=>{p.moveTo(e*.50,0);p.bezierCurveTo(e*.22,28,68,111,0,141);});});line(accent,75,61,W-75,61,1.5);line(accent,75,H-61,W-75,H-61,1.5);break;
      case "imperial":
        fill(dark,0,0,W,44);fill(dark,0,H-44,W,44);fill(dark,0,0,44,H);fill(dark,W-44,0,44,H);
        rect(gold,19,3);rect(gold,57,4);rect(gold,70,1);
        for(const [x,y,sx,sy] of corners){cornerPoly(gold,x,y,sx,sy,[[44,44],[112,44],[44,112]]);cornerPoly(dark,x,y,sx,sy,[[46,46],[82,46],[46,82]]);}
        break;
      case "baroque":
        rect(gold,34,5);rect(gold,53,1.5);rect(gold,65,1);
        for(const [x,y,sx,sy] of corners){ctx.save();ctx.translate(x+sx*64,y+sy*64);ctx.scale(sx,sy);ctx.strokeStyle=gold;ctx.lineWidth=3;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(18+i*17,-12,65+i*9,30+i*6,95+i*12,0);ctx.stroke();ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-12,18+i*17,30+i*6,65+i*9,0,95+i*12);ctx.stroke();}ctx.restore();}diamond(W/2,47,13);diamond(W/2,H-47,13);break;
      case "deco":
        rect(dark,32,4);rect(gold,49,2);rect(gold,60,1);
        for(const [x,y,sx,sy] of corners){for(let i=0;i<5;i++){const a=36+i*13;line(gold,x+sx*a,y+sy*135,x+sx*a,y+sy*a,2);line(gold,x+sx*a,y+sy*a,x+sx*155,y+sy*a,2);}cornerPoly(dark,x,y,sx,sy,[[0,0],[105,0],[0,105]]);}
        diamond(W/2,48,12);diamond(W/2,H-48,12);break;
      case "academy":
        fill(dark,0,0,W,48);fill(accent,0,48,W,9);fill(dark,0,H-33,W,33);fill(accent,0,H-41,W,8);
        rect(accent,72,2);for(const [x,y,sx,sy] of corners)cornerPoly(accent,x,y,sx,sy,[[0,0],[e*.18,0],[0,112]]);break;
      case "sash":
        for(const [x,y,sx,sy] of [corners[0],corners[3]]){cornerPoly(dark,x,y,sx,sy,[[0,0],[e*.43,0],[0,e*(sy<0?.075:.19)]]);cornerPoly(accent,x,y,sx,sy,[[0,e*(sy<0?.075:.19)],[e*.43,0],[e*.48,0],[0,e*(sy<0?.085:.22)]]);}
        line(accent,68,65,W-68,65,2);line(accent,68,H-65,W-68,H-65,2);break;
      case "facet":
        for(const [x,y,sx,sy] of [corners[0],corners[3]]){cornerPoly(dark,x,y,sx,sy,[[0,0],[e*.32,0],[0,e*(sy<0?.07:.24)]]);cornerPoly(accent,x,y,sx,sy,[[0,e*(sy<0?.07:.24)],[e*.32,0],[e*.40,0],[0,e*(sy<0?.085:.30)]]);ctx.globalAlpha=.22;cornerPoly(accent,x,y,sx,sy,[[0,e*(sy<0?.085:.30)],[e*.40,0],[e*.46,0],[0,e*(sy<0?.095:.35)]]);ctx.globalAlpha=1;}
        line(accent,58,58,W-58,58,3);line(accent,58,H-58,W-58,H-58,3);break;
      case "tactical":
        fill(dark,0,0,W,40);fill(dark,0,H-40,W,40);fill(dark,0,0,43,H);fill(dark,W-43,0,43,H);rect(accent,57,4);
        for(const [x,y,sx,sy] of corners){cornerPoly(accent,x,y,sx,sy,[[0,0],[230,0],[155,40],[43,40],[43,145],[0,185]]);for(let i=0;i<4;i++)line(accent,x+sx*(85+i*18),y+sy*60,x+sx*(103+i*18),y+sy*78,3);}break;
      case "rescue":
        fill(dark,0,0,W,32);fill(dark,0,H-32,W,32);fill(accent,0,32,W,8);fill(accent,0,H-40,W,8);
        for(const [x,y,sx,sy] of corners){cornerPoly(dark,x,y,sx,sy,[[0,0],[190,0],[0,125]]);cornerPoly(accent,x,y,sx,sy,[[0,125],[190,0],[230,0],[0,155]]);}rect(accent,66,1.5);break;
      case "techpro":
        rect(dark,35,3);rect(accent,53,1.5);
        for(const [x,y,sx,sy] of corners){for(let i=0;i<5;i++){const a=43+i*12;line(accent,x+sx*a,y+sy*30,x+sx*a,y+sy*74,2);line(accent,x+sx*30,y+sy*a,x+sx*74,y+sy*a,2);}cornerPoly(dark,x,y,sx,sy,[[0,0],[160,0],[110,38],[0,38]]);}
        for(const y of [46,H-46]){line(accent,W*.33,y,W*.67,y,5);diamond(W/2,y,8);}break;
      case "editorial":
        fill(dark,0,0,26,H);fill(accent,26,0,9,H);fill(accent,W-35,0,9,H);fill(dark,W-26,0,26,H);line(accent,72,74,W-72,74,1.5);line(accent,72,H-74,W-72,H-74,1.5);break;
      case "medallion":
        rect(accent,35,4);rect(accent,53,1.5);rect(dark,68,1);
        for(const [x,y,sx,sy] of corners){cornerPoly(dark,x,y,sx,sy,[[0,0],[95,0],[0,95]]);for(let i=0;i<3;i++)line(accent,x+sx*(38+i*8),y+sy*105,x+sx*105,y+sy*(38+i*8),2);}
        for(const y of [43,H-43]){circle(accent,W/2,y,23,3);circle(accent,W/2,y,17,1);diamond(W/2,y,9);}break;
      case "folio":
        rect(accent,47,2);rect(accent,59,1);line(dark,90,84,W-90,84,3);line(dark,90,H-84,W-90,H-84,3);
        for(const [x,y,sx,sy] of corners){line(accent,x+sx*40,y+sy*140,x+sx*40,y+sy*40,5);line(accent,x+sx*40,y+sy*40,x+sx*140,y+sy*40,5);}break;
    }
    ctx.restore();
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
  function drawFrame(style){
    if(style==="none"||frameAlpha()===0||!frameKeys.has(style))return;
    if(window.K9_FRAME_VERSION!==STUDIO_VERSION||!window.K9PremiumFrames){
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
      const value = Number($(id).value);
      $(`${id}Value`).value = `${id !== "signatureBlockScale" && value > 0 ? "+" : ""}${value}%`;
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
  function gridCoordinate(value, extent, min=0, max=extent) {
    if(!showGrid)return value;
    const origin=extent/2, low=Math.ceil((min-origin)/GRID_STEP), high=Math.floor((max-origin)/GRID_STEP);
    if(low>high)return Math.max(min,Math.min(max,value));
    const n=Math.max(low,Math.min(high,Math.round((value-origin)/GRID_STEP)));
    return origin+n*GRID_STEP;
  }
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
  function render({visualOnly=false}={}) {
    if (pendingPreviewFrame) { cancelAnimationFrame(pendingPreviewFrame); pendingPreviewFrame = 0; visualOnly=false; }
    if (!state.exporting && !visualOnly) invalidateReadyBatch();
    syncAutomaticCode();
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
    const b=new Uint8Array(await blob.arrayBuffer()),v=new DataView(b.buffer);let w=0,h=0;
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
    const total=[state.backgroundImage,...state.logos.map(l=>l.image),state.leftSignatureImage,state.signatureImage,state.thirdSignatureImage].reduce((n,i)=>n+imagePixels(i),0);
    if(total-imagePixels(replaced)+imagePixels(image)>MAX_PROJECT_PIXELS)throw new Error("Limite immagini del progetto: 100 megapixel complessivi. Riduci una delle immagini prima di caricarla.");
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
        pages.push(await recordPage(sharedGraphics,allOps[i]));
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

  $("backgroundFile").addEventListener("change", guardAsync(e => loadImage(e.target.files[0], setBackground)));
  $("logoFile").addEventListener("change", guardAsync(e => loadImage(e.target.files[0], setLogo)));

  $("backgroundOpacity").addEventListener("input", e => {
    state.backgroundOpacity = Number(e.target.value);
    $("backgroundOpacityValue").value = `${state.backgroundOpacity}%`;
    queuePreviewRender();
  });
  $("backgroundScale").addEventListener("input", e => {
    state.backgroundScale = Number(e.target.value);
    $("backgroundScaleValue").value = `${state.backgroundScale}%`;
    queuePreviewRender();
  });
  $("backgroundX").addEventListener("change", () => {
    if(state.backgroundLocked)return;
    if(showGrid)$("backgroundX").value=String(Math.round(state.backgroundX/W*100));
  });
  $("backgroundX").addEventListener("input", e => {
    if(state.backgroundLocked)return;
    const value = Number(e.target.value);
    state.backgroundX = gridCoordinate((value / 100) * W, W);
    $("backgroundXValue").value = `${Math.round(state.backgroundX/W*100)}%`;
    queuePreviewRender();
  });
  $("backgroundY").addEventListener("change", () => {
    if(state.backgroundLocked)return;
    if(showGrid)$("backgroundY").value=String(Math.round(state.backgroundY/H*100));
  });
  $("backgroundY").addEventListener("input", e => {
    if(state.backgroundLocked)return;
    const value = Number(e.target.value);
    state.backgroundY = gridCoordinate((value / 100) * H, H);
    $("backgroundYValue").value = `${Math.round(state.backgroundY/H*100)}%`;
    queuePreviewRender();
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
    queuePreviewRender();
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
    queuePreviewRender();
  });

  $("logoScale").addEventListener("input", e => {
    const logo = getActiveLogo();
    if (!logo || logo.locked) return;
    logo.scale = Number(e.target.value);
    $("logoScaleValue").value = `${logo.scale}%`;
    queuePreviewRender();
  });

  $("logoX").addEventListener("change", () => {
    const logo=getActiveLogo();if(!logo || logo.locked)return;
    if(showGrid)$("logoX").value=String(Math.round(logo.x/W*100));
  });
  $("logoX").addEventListener("input", e => {
    const logo = getActiveLogo();
    if (!logo || logo.locked) return;
    const value = Number(e.target.value);
    logo.x = gridCoordinate((value / 100) * W, W);
    $("logoXValue").value = `${Math.round(logo.x/W*100)}%`;
    queuePreviewRender();
  });

  $("logoY").addEventListener("change", () => {
    const logo=getActiveLogo();if(!logo || logo.locked)return;
    if(showGrid)$("logoY").value=String(Math.round(logo.y/H*100));
  });
  $("logoY").addEventListener("input", e => {
    const logo = getActiveLogo();
    if (!logo || logo.locked) return;
    const value = Number(e.target.value);
    logo.y = gridCoordinate((value / 100) * H, H);
    $("logoYValue").value = `${Math.round(logo.y/H*100)}%`;
    queuePreviewRender();
  });

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
  $("downloadPdfBottom").addEventListener("click", downloadPdf);
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
    return {
      version: 2, id, name, updatedAt: new Date().toISOString(), form,
      designTheme: selectedTheme,
      importSourceKey:state.importSourceKey,
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
  function scheduleAutosave() {
    if (!state.initialized || state.exporting || recoveryBlocked) return;
    dirty=true;
    ++savedRevision; // un nuovo input non può essere marcato salvato da una scrittura precedente
    setSaveIndicator(state.currentProjectId ? "Salvataggio progetto…" : "Salvataggio lavoro…", "saving");
    clearTimeout(autosaveTimer);
    if (!pendingEditorOperations) autosaveTimer=setTimeout(()=>{void persistCurrentSnapshot();},250);
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
    const logos=[];
    for(const entry of data.logos){if(!entry || typeof entry!=="object")throw new Error("Logo non valido");logos.push(await decode(entry.blob));}
    const signatures={};
    for(const key of ["leftSignature","rightSignature","thirdSignature"]) signatures[key]=data[key]==null?null:await decode(data[key]);
    return {background,logos,signatures};
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
      populateFrameOptions();
      for(const id of formIds){
        const field=$(id), value=typeof migrated[id]==="string"?migrated[id]:String(fallback[id]??"");
        field.value=["themeBackgroundOpacity","frameOpacity"].includes(id)?normalizeThemeOpacity(value):value;
        if(field.tagName==="SELECT" && field.selectedIndex<0)field.value=String(fallback[id]??"");
      }
      const photo=photoKeyFor(activeBackgroundId());
      if(photo && themeBackgroundAlpha()>0){
        try{await ensurePhoto(photo);}catch(error){photoFailures.add(photo);console.warn(error);}
      }
      if($("frameStyle").value!=="none"){try{await window.K9PremiumFrames.ensure($("frameStyle").value);}catch(error){console.warn(error);setStatus(error.message,"warning");}}
      restoreSignatureControls(data.form);
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
    const blobBytes=items.reduce((sum,item)=>sum+[item.background?.blob,...item.logos.map(l=>l.blob),item.leftSignature,item.rightSignature,item.thirdSignature].reduce((n,b)=>n+(b?.size||0),0),0);
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
    const doc=canonicalJSON([form,item.designTheme,background,logos,item.activeLogoIndex??-1,await blobFingerprint(item.leftSignature),await blobFingerprint(item.rightSignature),await blobFingerprint(item.thirdSignature),item.rosterText||"",item.autoCertificateCode!==false]);
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
  const portableContent=p=>canonicalJSON([normalizeOpacityForm(migrateLayers(p.form,p.designTheme)),p.designTheme,p.background,p.logos,p.activeLogoIndex,p.leftSignature,p.rightSignature,p.thirdSignature,p.rosterText,p.autoCertificateCode]);
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
    const data={...entry,background:entry.background?{...entry.background,blob:await requiredImageBlob(entry.background.blob)}:null,logos:[],leftSignature:await dataURLToBlob(entry.leftSignature),rightSignature:await dataURLToBlob(entry.rightSignature),thirdSignature:await dataURLToBlob(entry.thirdSignature)};
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
  function snapSignatureAxis(id) {
    if(!showGrid || state.signatureBlockLocked || id==="signatureBlockScale")return;
    const input=$(id), raw=Number(input.value), axis=id==="signatureBlockX";
    const position=()=>{const g=signatureGeometry();return axis?(g.slots[0].x+g.slots[g.slots.length-1].x)/2:g.lineY;};
    const current=position();input.value=input.min;const lo=position();input.value=input.max;const hi=position();
    const target=gridCoordinate(current,axis?W:H,lo,hi);
    let best=raw, error=Infinity;
    for(let v=Number(input.min);v<=Number(input.max);v+=Number(input.step)||1){input.value=String(v);const d=Math.abs(position()-target);if(d<error){error=d;best=v;}}
    input.value=String(best);
  }
  for (const id of signatureControlIds) {
    $(id).addEventListener("input", () => {if (state.signatureBlockLocked) return;syncSignatureControls();deferSettingsSave();queuePreviewRender();});
    $(id).addEventListener("change", () => {if (state.signatureBlockLocked) return;snapSignatureAxis(id);syncSignatureControls();saveSettings();queuePreviewRender();});
  }
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
  $("themeBackgroundOpacity").addEventListener("input",()=>{syncThemeOpacity();deferSettingsSave();queuePreviewRender();});
  $("themeBackgroundOpacity").addEventListener("change",()=>{syncThemeOpacity();saveSettings();queuePreviewRender();});
  $("resetThemeBackgroundOpacity").addEventListener("click",()=>{
    $("themeBackgroundOpacity").value="100";syncThemeOpacity();saveSettings();queuePreviewRender();
  });
  $("frameOpacity").addEventListener("input",()=>{syncFrameOpacity();deferSettingsSave();queuePreviewRender();});
  $("frameOpacity").addEventListener("change",()=>{syncFrameOpacity();saveSettings();queuePreviewRender();});
  $("resetFrameOpacity").addEventListener("click",()=>{
    $("frameOpacity").value="100";syncFrameOpacity();saveSettings();queuePreviewRender();
  });
  $("removeThemeBackground").addEventListener("click",()=>{
    $("themeBackgroundId").value="none";syncDesignUI();saveSettings();render();
  });
  $("removeFrame").addEventListener("click",()=>{
    $("frameStyle").value="none";syncDesignUI();saveSettings();render();
  });
  for (const id of ["accentColor", "inkColor", "frameStyle", "ornamentStyle", "fontScale", "courseOutcome"]) {
    $(id).addEventListener("input", () => {
      // Changing frame or colors must not change the background identity.
      if(id==="frameStyle")frameFailures.delete($("frameStyle").value);
      syncDesignUI();deferSettingsSave();queuePreviewRender();
    });
    $(id).addEventListener("change", () => { saveSettings(); queuePreviewRender(); });
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
  $("quickDownloadPdf").addEventListener("click", downloadPdf);
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
