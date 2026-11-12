(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const canvas = $("certificateCanvas");
  let ctx = canvas.getContext("2d", { alpha: false });
  let pdfTextOps = null;
  let layoutWarnings = [];
  let textBounds = [];
  let W = canvas.width;
  let H = canvas.height;
  const A4_STAGE = Object.freeze({
    landscape: {w:1683,h:1190,outputW:3508,outputH:2480},
    portrait: {w:1190,h:1683,outputW:2480,outputH:3508}
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
    currentProjectId: null, initialized: false, exporting: false
  };

  const textIds = ["recipientName", "bodyText", "courseName", "place", "leftSignatureRole", "leftSignatureName", "signatureRole", "signatureName", "thirdSignatureRole", "thirdSignatureName", "certificateCode", "certificateDiscipline", "courseHours"];
  const designIds = ["designTheme", "accentColor", "inkColor", "frameStyle", "ornamentStyle", "fontScale"];
  const formIds = ["pageOrientation", "documentType", "certificateDate", ...textIds, "courseOutcome", "leftSignatureMode", "signatureMode", "thirdSignatureMode", ...designIds.filter(id => id !== "designTheme")];
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
  };
  // Stili storici conservati per i progetti esistenti, esclusi dalla nuova galleria.
  const archivedThemeIds = new Set(["emerald", "navy", "burgundy", "academic", "sage", "coral", "alpine", "olive", "moss", "dusk", "bark", "lavender", "ice", "coastal", "copper", "ocean", "imperialNavy", "baroqueRuby", "artDecoTeal", "academyCrimson", "executiveTeal", "corporateGraphite", "k9Urban", "sarField", "hrddPro", "editorialBlue", "honorBlue", "diplomaSilver"]);
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
  let pendingPreviewFrame = 0;
  let settingsSaveTimer;
  let exportLock = false;
  let pendingEditorOperations=0;
  function guardAsync(handler) {
    return async (...args)=>{
      if (state.exporting) return;
      pendingEditorOperations++;
      try {return await handler(...args);} finally {pendingEditorOperations--;}
    };
  }
  function beginExport() {
    if (state.exporting || pendingEditorOperations || !state.initialized) { if (!state.exporting) setStatus("Completa prima l'operazione in corso"); return false; }
    clearTimeout(autosaveTimer);clearTimeout(settingsSaveTimer);saveSettings();
    state.exporting=true;exportLock=true;
    document.activeElement?.blur();
    document.body.setAttribute("aria-busy","true");
    document.body.classList.add("export-locked");
    for(const el of document.querySelectorAll(".controls,.preview-toolbar,.header-actions,.pdf-button"))el.inert=true;
    return true;
  }
  function endExport() {
    state.exporting=false;exportLock=false;
    document.body.removeAttribute("aria-busy");document.body.classList.remove("export-locked");
    for(const el of document.querySelectorAll(".controls,.preview-toolbar,.header-actions,.pdf-button"))el.inert=false;
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

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("k9-certificati-settings") || "{}");
      setPageOrientation(saved.pageOrientation, false);
      $("documentType").value = escapeStored(saved.documentType, defaults.documentType);
      textIds.forEach(id => { $(id).value = escapeStored(saved[id], defaults[id]); });
      $("certificateDate").value = escapeStored(saved.certificateDate, todayISO());
      $("courseOutcome").value = escapeStored(saved.courseOutcome, "");
      $("thirdSignatureMode").value = ["off","auto","image","none"].includes(saved.thirdSignatureMode) ? saved.thirdSignatureMode : "off";
      $("autoCertificateCode").checked = saved.autoCertificateCode !== false;
      for (const id of designIds.filter(k => k !== "designTheme")) {
        if (saved[id] !== undefined) $(id).value = saved[id];
      }
      if (saved.ornamentStyle === undefined) $("ornamentStyle").value = themePalettes[saved.designTheme]?.ornament || "none";
      selectedTheme = saved.designTheme === "custom" ? "custom" : themePalettes[saved.designTheme] ? saved.designTheme : "classic";
      syncDesignUI();
    } catch {
      setPageOrientation("landscape", false);
      $("certificateDate").value = todayISO();
      $("autoCertificateCode").checked = true;
      $("ornamentStyle").value = "none";
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
    data.autoCertificateCode = $("autoCertificateCode").checked;
    data.designTheme = selectedTheme;
    designIds.filter(id => id !== "designTheme").forEach(id => data[id] = $(id).value);
    try { localStorage.setItem("k9-certificati-settings", JSON.stringify(data)); } catch {}
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
    const initials = words.map(word => asciiUpper(word).match(/[A-Z]/)?.[0]);
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
    const safe=String(code||"").replace(/\.+$/, "").replace(/[^a-zA-Z0-9_.-]/g, "_");
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
  const professionalOrnaments = new Set(Object.keys(profileByOrnament));


  // Catalogo locale: nessun asset esterno e nessun progetto creato automaticamente.
  // Ogni anteprima applica lo stile solo con un tocco esplicito dell'utente.
  function populateThemeGallery() {
    const grid = $("themeGrid");
    const query = ($("themeSearch").value || "").trim().toLocaleLowerCase("it");
    const category = $("themeCategory").value;
    const visible = catalogThemes.filter(([, theme]) =>
      (category === "all" || theme.category === category) &&
      `${theme.label} ${theme.detail} ${theme.category}`.toLocaleLowerCase("it").includes(query));
    const fragment = document.createDocumentFragment();
    for (const [id, theme] of visible) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-choice";
      button.dataset.theme = id;
      button.setAttribute("aria-label", `Carica stile ${theme.label}, ${theme.detail}`);
      button.setAttribute("aria-pressed", String(selectedTheme === id));
      if (selectedTheme === id) button.classList.add("selected");
      const preview = document.createElement("canvas");
      preview.className = "theme-preview";
      preview.dataset.ornament = theme.ornament;
      preview.dataset.frame = theme.frame;
      preview.style.setProperty("--preset-accent", theme.accent);
      preview.style.setProperty("--preset-ink", theme.ink);
      preview.setAttribute("aria-hidden", "true");
      drawThemeThumbnail(preview, theme);
      const title = document.createElement("strong");
      title.textContent = theme.label;
      const detail = document.createElement("small");
      detail.textContent = theme.detail;
      button.append(preview, title, detail);
      fragment.appendChild(button);
    }
    grid.replaceChildren(fragment);
    $("themeCount").textContent = `${visible.length} stili su ${catalogThemes.length}`;
    $("themeEmpty").classList.toggle("hidden", visible.length !== 0);
  }

  function applyCatalogTheme(id) {
    const theme = themePalettes[id];
    if (!theme) return;
    selectedTheme = id;
    $("accentColor").value = theme.accent;
    $("inkColor").value = theme.ink;
    $("frameStyle").value = theme.frame;
    $("ornamentStyle").value = theme.ornament;
    syncDesignUI(); saveSettings(); render();
    setStatus(`Stile «${theme.label}» caricato nel progetto`);
  }

  function syncDesignUI() {
    document.querySelectorAll(".theme-choice").forEach(btn => {
      const chosen = btn.dataset.theme === selectedTheme;
      btn.setAttribute("aria-pressed", String(chosen));
      btn.classList.toggle("selected", chosen);
    });
    $("fontScaleValue").value = `${$("fontScale").value}%`;
    $("themeLoaded").textContent = selectedTheme === "custom" ? "Personalizzato" : (themePalettes[selectedTheme]?.label || "Classico");
  }

  // Motivi leggeri ai margini: conservano leggibili i testi A4 in ogni orientamento.
  // Sono disegnati anche in drawGraphics(), quindi compaiono in PDF e PNG.
  function drawCatalogOrnament(ornament = $("ornamentStyle").value, color = designColor("accentColor", "#735a2f"), ink = designColor("inkColor", "#26231f")) {
    if (!ornament || ornament === "none") return;
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
    preview.width=portrait?128:180;preview.height=portrait?180:128;
    try {
      ctx=preview.getContext("2d");W=portrait?1190:1683;H=portrait?1683:1190;
      ctx.scale(preview.width/W,preview.height/H);
      ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);
      drawCatalogOrnament(theme.ornament,theme.accent,theme.ink);
      drawFrame(theme.frame,theme.accent);
      const profile=layoutProfile(theme,theme.ornament);
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle=theme.accent;ctx.font=`700 ${portrait?93:100}px ${profile.title}`;ctx.fillText("ATTESTATO",W/2,H*.32);
      ctx.fillStyle=theme.ink;ctx.font=`700 ${portrait?78:90}px ${profile.name}`;ctx.fillText("NOME COGNOME",W/2,H*.48);
      ctx.globalAlpha=.50;ctx.fillRect(W*.27,H*.56,W*.46,12);ctx.fillRect(W*.34,H*.59,W*.32,9);
      ctx.globalAlpha=1;ctx.fillStyle=theme.accent;ctx.font=`700 52px ${profile.course}`;ctx.fillText("CORSO",W/2,H*.68);
      ctx.fillRect(W*.18,H*.82,W*.22,5);ctx.fillRect(W*.60,H*.82,W*.22,5);
    } finally {ctx=prior.ctx;W=prior.W;H=prior.H;}
  }
  function drawBase() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    if (state.backgroundImage) {
      const scale = state.backgroundFitScale * (state.backgroundScale / 100);
      drawImagePositioned(state.backgroundImage, scale, state.backgroundOpacity / 100, state.backgroundX, state.backgroundY);
    }

    drawCatalogOrnament();
    drawFrame($("frameStyle").value,designColor("accentColor", "#735a2f"));
  }
  function drawFrame(style,accent) {
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
    maxWidth = Math.min(maxWidth, W - (currentOrientation() === "portrait" ? 145 : 145));
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
    ctx.fillText(text, x, y);
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
    const top = portrait ? 850 : 610, bottom = portrait ? 1015 : 699;
    const maxWidth = portrait ? 920 : 1220;
    for (let size = Math.round((portrait ? 32 : 32) * fontRatio()); size >= 17; size--) {
      const font = `500 ${size}px ${family}`;
      const lines = wrapLines(text, maxWidth, font);
      const spacing = size + 8;
      if (lines.length * spacing <= bottom - top + spacing) return { lines, size, spacing, top, bottom, fits: true };
    }
    const lines = wrapLines(text, maxWidth, `500 18px ${family}`);
    const capacity=Math.floor((bottom-top)/24)+1;
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
    const family = '"Brush Script MT", "Segoe Script", "Snell Roundhand", "URW Chancery L", cursive';
    let size = startSize;
    do {
      ctx.font = `italic 500 ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    } while (size > minSize);
    return minSize;
  }

  // La terza firma è facoltativa e appare al centro; due firme restano identiche ai progetti storici.
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

  function drawSignatureArtwork(centerX, name, prefix) {
    const mode = $(`${prefix}Mode`).value, image = state[`${prefix}Image`];
    const maxWidth = signatureWidth(currentOrientation() === "portrait" ? 335 : 405);
    const lineY = currentOrientation() === "portrait" ? 1530 : 980;
    if (mode === "image" && image) {
      const ratio = image.naturalWidth / image.naturalHeight;
      const w = Math.min(maxWidth, (currentOrientation() === "portrait" ? 54 : 44) * ratio);
      const h = w / ratio;
      ctx.drawImage(image, centerX - w / 2, lineY - h - 3, w, h);
    } else if (mode === "auto" && name) {
      const signatureFamily = '"Brush Script MT", "Segoe Script", "Snell Roundhand", "URW Chancery L", cursive';
      const sigSize = fitSignatureFont(name, maxWidth, 46, 20);
      ctx.font = `italic 500 ${sigSize}px ${signatureFamily}`;
      ctx.fillStyle = "#25221d";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, centerX, lineY - 18, maxWidth);
    }
  }

  function signatureCenters() { return signatureSlots().map(slot => slot.x); }

  function drawSignatureLines() {
    const portrait = currentOrientation() === "portrait";
    const lineY = portrait ? 1530 : 980;
    const halfWidth = signatureWidth(portrait ? 336 : 430) / 2;
    for (const x of signatureCenters()) {
      ctx.save();
      ctx.strokeStyle = "rgba(50,45,36,.62)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - halfWidth, lineY);
      ctx.lineTo(x + halfWidth, lineY);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSignatureBlock(centerX, role, name) {
    const portrait = currentOrientation() === "portrait";
    const maxWidth = signatureWidth(portrait ? 350 : 412);
    const roleY = portrait ? 1445 : 900;
    const printedY = portrait ? 1580 : 1025;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#55524c";
    const family=layoutProfile().body;
    const roleSize = fitFont(role, maxWidth, 26, $("thirdSignatureMode").value === "off" ? 18 : 14, family, "700");
    ctx.font = `700 ${roleSize}px ${family}`;
    if (ctx.measureText(role).width > maxWidth) layoutWarnings.push("Una qualifica firma è troppo lunga.");
    drawText(role, centerX, roleY);
    if (name) {
      const printedFamily = family;
      const printedSize = fitFont(name, maxWidth, 25, $("thirdSignatureMode").value === "off" ? 18 : 14, printedFamily, "900");
      ctx.font = `900 ${printedSize}px ${printedFamily}`;
      ctx.fillStyle = "#3d3a35";
      if (ctx.measureText(name).width > maxWidth) layoutWarnings.push("Un nome firmatario è troppo lungo.");
      drawText(name, centerX, printedY);
    }
    ctx.restore();
  }

  function drawTextLayout() {
    textBounds=[];
    const [title, subtitle] = $("documentType").value.split("|");
    const ink = designColor("inkColor", "#26231f");
    const gold = designColor("accentColor", "#735a2f");
    const fontAdj = fontRatio();
    const profile=layoutProfile();
    const portrait = currentOrientation() === "portrait";
    // Il verticale ha spaziature dedicate, non è il foglio orizzontale ruotato.
    drawCentered(title, (portrait ? 475 : 370)+profile.dy, Math.min(portrait?95:91,Math.round((portrait ? 78 : 82) * fontAdj*profile.scale)), profile.title, gold, "700", portrait ? 990 : 1380);
    drawCentered(subtitle, (portrait ? 555 : 438)+profile.dy, Math.min(44,Math.round((portrait ? 39 : 40) * fontAdj)), profile.body, ink, "700", portrait ? 940 : 1260);

    ctx.save();
    ctx.strokeStyle = gold;
    ctx.globalAlpha = .55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - (portrait ? 210 : 282)*profile.rule, portrait ? 615 : 482);
    ctx.lineTo(W / 2 + (portrait ? 210 : 282)*profile.rule, portrait ? 615 : 482);
    ctx.stroke();
    ctx.restore();

    const recipient = $("recipientName").value.trim().toUpperCase();
    const nameY=portrait?730:550, nameWidth=portrait?995:1340;
    const nameSize=Math.min(portrait?80:77,Math.round((portrait?67:72)*fontAdj*profile.nameScale));
    const fitted=fitFont(recipient,nameWidth,nameSize,Math.min(nameSize,portrait?38:35),profile.name,"700");
    ctx.font=`700 ${fitted}px ${profile.name}`;
    if (recipient && ctx.measureText(recipient).width>nameWidth) {
      let found=false;
      for(let size=portrait?55:43;size>=20;size--){
        const lines=wrapLines(recipient,nameWidth,`700 ${size}px ${profile.name}`);
        if(lines.length<=2 && lines.every(line=>ctx.measureText(line).width<=nameWidth)){
          lines.forEach((line,i)=>drawCentered(line,nameY+(i-(lines.length-1)/2)*(size+3),size,profile.name,ink,"700",nameWidth));found=true;break;
        }
      }
      if(!found)layoutWarnings.push("Nominativo troppo lungo per lo spazio disponibile.");
    } else drawCentered(recipient,nameY,fitted,profile.name,ink,"700",nameWidth);

    const body = bodyLayout();
    if (!body.fits) layoutWarnings.push("Testo centrale troppo lungo: riducilo prima di creare il PDF.");
    ctx.font = `500 ${body.size}px ${profile.body}`;
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const bodyStart = (body.top + body.bottom) / 2 - (body.lines.length - 1) * body.spacing / 2;
    body.lines.forEach((line, i) => drawText(line, W / 2, bodyStart + i * body.spacing, "regular"));

    const course=$("courseName").value.trim().toUpperCase(), courseY=portrait?1100:750, courseWidth=portrait?990:1280;
    const courseSize=Math.min(52,Math.round((portrait?47:48)*fontAdj));
    const courseFit=fitFont(course,courseWidth,courseSize,Math.min(courseSize,29),profile.course,"700");
    ctx.font=`700 ${courseFit}px ${profile.course}`;
    if(course&&ctx.measureText(course).width>courseWidth){
      let found=false;
      for(let size=portrait?38:30;size>=18;size--){
        const lines=wrapLines(course,courseWidth,`700 ${size}px ${profile.course}`);
        if(lines.length<=2){lines.forEach((line,i)=>drawCentered(line,courseY+(i-(lines.length-1)/2)*(size+3),size,profile.course,gold,"700",courseWidth));found=true;break;}
      }
      if(!found)layoutWarnings.push("Titolo del corso troppo lungo: riducilo prima di esportare.");
    }else drawCentered(course,courseY,courseFit,profile.course,gold,"700",courseWidth);

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

    for (const {prefix,x} of signatureSlots()) drawSignatureBlock(x, $(`${prefix}Role`).value.trim(), $(`${prefix}Name`).value.trim());
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
    drawSignatureLines();
    ctx.save();
    for (const {prefix,x} of signatureSlots()) drawSignatureArtwork(x, $(`${prefix}Name`).value.trim(), prefix);
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
    if (window.K9PDF?.canEncode) {
      for (const id of ["recipientName", "bodyText", "courseName", "place", "certificateCode", "courseHours", "leftSignatureRole", "leftSignatureName", "signatureRole", "signatureName", ...($("thirdSignatureMode").value === "off" ? [] : ["thirdSignatureRole","thirdSignatureName"])]) {
        const content = $(id).value;
        if (content && !window.K9PDF.canEncode(content)) {
          issues.push(`Il campo «${$(id).closest("label")?.firstChild?.textContent?.trim() || id}» contiene caratteri non supportati dal PDF`);
          break;
        }
      }
    }
    return issues;
  }

  // Una sola anteprima per frame anche durante digitazione e regolazione continua degli slider.
  function queuePreviewRender() {
    if (pendingPreviewFrame) return;
    pendingPreviewFrame = requestAnimationFrame(() => {
      pendingPreviewFrame = 0;
      render();
    });
  }
  function render() {
    if (pendingPreviewFrame) { cancelAnimationFrame(pendingPreviewFrame); pendingPreviewFrame = 0; }
    if (!state.exporting) invalidateReadyBatch();
    syncAutomaticCode();
    layoutWarnings = [];
    drawGraphics();
    drawTextLayout();
    if (showGuides) drawSafetyGuides(); // Solo anteprima, mai nel PDF o nel PNG.
    syncQuickFromEditor();
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
    pendingEditorOperations++;
    try { const image=await imageFromBlob(file); if(!state.exporting){onLoad(image,file);render();} }
    catch (err) { console.error(err); setStatus("Immagine non leggibile"); }
    finally {pendingEditorOperations--;}
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
    if (state.logos.length >= MAX_LOGOS) {
      setStatus(`Massimo ${MAX_LOGOS} loghi: rimuovine uno prima di aggiungerne altri`);
      $("logoFile").value = "";
      return;
    }
    const logo = {
      image: img, blob,
      scale: 100,
      x: W / 2,
      y: Math.round(H * 150 / 1190),
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
    const {outputW:outW, outputH:outH} = pageSize();
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
      const {outputW, outputH} = pageSize();
      return { image: jpg, width: outputW, height: outputH, stageWidth: W, stageHeight: H, orientation: currentOrientation(), texts: ops };
    } finally { pdfTextOps = null; }
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

  async function insertPngDpi(blob, dpi = 300) {
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
      if(type!=="pHYs") parts.push(src.slice(pos,pos+len+12));
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
      render();
      const problems = documentProblems().filter(s => !s.includes("caratteri non supportati"));
      if (problems.length) throw new Error(problems[0]);
      setStatus("Preparazione PNG 300 DPI…");
      high = document.createElement("canvas");
      const {outputW, outputH} = pageSize();
      high.width = outputW; high.height = outputH;
      ctx = high.getContext("2d", {alpha:false});
      ctx.scale(high.width/W,high.height/H);
      pdfTextOps = null;
      drawGraphics();
      drawTextLayout();
      if (layoutWarnings.length) throw new Error(layoutWarnings[0]);
      ctx = oldCtx;
      pdfTextOps = oldOps;
      const blob = await new Promise((resolve,reject) => high.toBlob(b=>b ? resolve(b) : reject(new Error("Esportazione PNG non disponibile")), "image/png"));
      const code=$("certificateCode").value.trim();
      if (!(await verifyCodes([code]))) {setStatus("Esportazione annullata");return;}
      offerDownload(await insertPngDpi(blob), `${certificateFilename(code, safeFilename())}.png`);
      setStatus("PNG 300 DPI pronto");
      await registerExport([{name:$("recipientName").value.trim(),course:$("courseName").value.trim(),code,certificateDate:$("certificateDate").value,format:"PNG"}]);
    } catch (err) {console.error(err);setStatus(err.message || "Errore PNG");}
    finally {
      ctx = oldCtx;pdfTextOps = oldOps;
      if (high) {high.width=1;high.height=1;}
      endExport();render();
    }
  }

  async function downloadPdf() {
    if (!beginExport()) return;
    try {
      setStatus("Creazione PDF...");
      const page = recordPage();
      const code=$("certificateCode").value.trim();
      if (!(await verifyCodes([code]))) {setStatus("Esportazione annullata");return;}
      offerDownload(window.K9PDF.create([page]), `${certificateFilename(code, safeFilename())}.pdf`);
      setStatus("PDF A4 creato");
      await registerExport([{name:$("recipientName").value.trim(),course:$("courseName").value.trim(),code,certificateDate:$("certificateDate").value,format:"PDF"}]);
    } catch (err) { console.error(err); setStatus(err.message || "Errore PDF"); }
    finally { endExport(); render(); }
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
    const automatic = $("autoCertificateCode").checked;
    if (!beginExport()) return;
    const pages = [];
    try {
      if (names.some(n => !window.K9PDF.canEncode(n))) throw new Error("Un nominativo contiene caratteri non supportati dal PDF");
      const repeated = duplicateNames(names);
      if (repeated.length && !confirm(`Sono presenti ${repeated.length} nominativi ripetuti. Continuare?`)) return;
      if (names.length > 1 && !automatic && oldCode.trim() && !confirm("Codice manuale: tutte le pagine avranno lo stesso codice. Continuare?")) return;
      // La grafica delle pagine è identica: la preparo una volta sola.
      // Nominali e codici rimangono testo PDF indipendente per pagina.
      const codes=names.map(name=>automatic ? automaticCode(name) : oldCode.trim());
      if (!(await verifyCodes(codes))) {setStatus("Esportazione annullata");return;}
      const sharedGraphics = composePage();
      for (let i = 0; i < names.length; i++) {
        $("recipientName").value = names[i];
        $("certificateCode").value = codes[i];
        setStatus(`Pagina ${i + 1}/${names.length}`);
        pages.push(recordPage(sharedGraphics));
        // Cede il controllo all'interfaccia (soprattutto su smartphone).
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const pdf = window.K9PDF.create(pages);
      invalidateReadyBatch();
      lastBatchUrl = URL.createObjectURL(pdf);
      const ready = $("readyBatchLink");
      ready.href = lastBatchUrl;
      ready.download = `K9_${disciplineCode()}_${certificateDateCode()}_corsisti.pdf`;
      ready.classList.remove("hidden");
      const quickReady = $("quickReadyBatchLink");
      if (quickReady) {quickReady.href = ready.href;quickReady.download = ready.download;quickReady.classList.remove("hidden");}
      const entries=names.map((name,i)=>({name,course:$("courseName").value.trim(),code:codes[i],certificateDate:$("certificateDate").value,format:"PDF multipagina"}));
      let registered = false;
      const recordOnce = () => {if (!registered) {registered = true;registerExport(entries);}};
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
        scheduleAutosave();
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
  $("backgroundX").addEventListener("input", e => {
    const value = Number(e.target.value);
    state.backgroundX = (value / 100) * W;
    $("backgroundXValue").value = `${value}%`;
    queuePreviewRender();
  });
  $("backgroundY").addEventListener("input", e => {
    const value = Number(e.target.value);
    state.backgroundY = (value / 100) * H;
    $("backgroundYValue").value = `${value}%`;
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

  $("logoX").addEventListener("input", e => {
    const logo = getActiveLogo();
    if (!logo || logo.locked) return;
    const value = Number(e.target.value);
    logo.x = (value / 100) * W;
    $("logoXValue").value = `${value}%`;
    queuePreviewRender();
  });

  $("logoY").addEventListener("input", e => {
    const logo = getActiveLogo();
    if (!logo || logo.locked) return;
    const value = Number(e.target.value);
    logo.y = (value / 100) * H;
    $("logoYValue").value = `${value}%`;
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
    render();
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
      const req = indexedDB.open(DB_NAME, 3);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("projects")) req.result.createObjectStore("projects", { keyPath: "id" });
        if (!req.result.objectStoreNames.contains("exports")) req.result.createObjectStore("exports", { keyPath: "id" });
        if (!req.result.objectStoreNames.contains("templates")) req.result.createObjectStore("templates", { keyPath: "id" });
      };
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
  const putTemplate = value => templateTask("readwrite", store => store.put(value));
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
    try {
      for (const record of records) {
        await putExport({...record,id:`e_${Date.now()}_${Math.random().toString(36).slice(2,10)}`,exportedAt:new Date().toISOString()});
      }
      await refreshExports();
    } catch(error) {console.warn("Esportazione avvenuta, ma registrazione non riuscita",error);setStatus("Documento creato, ma registro non aggiornato");}
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
      const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;
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
      thirdSignature: state.thirdSignatureBlob,
      workingName: $("projectName").value,
      currentProjectId: state.currentProjectId,
      rosterText: $("batchNames").value,
      autoCertificateCode: $("autoCertificateCode").checked
    };
  }

  async function persistCurrentSnapshot() {
    clearTimeout(autosaveTimer);
    if (!state.initialized || state.exporting) return;
    const revision=++savedRevision;
    const workspace=snapshot();
    const projectId=state.currentProjectId;
    const projectName=$("projectName").value.trim() || lastSavedProjectName || "Progetto";
    activeWrites=activeWrites.catch(()=>{}).then(async () => {
      await writeArchiveAtomically([workspace,...(projectId?[{...workspace,id:projectId,name:projectName,workingName:projectName,currentProjectId:projectId}]:[])],[],[]);
    });
    try {
      await activeWrites;
      if (revision===savedRevision) {
        if (projectId) {lastSavedProjectName=projectName;await refreshProjectList();}
        setSaveIndicator(`${projectId ? "Progetto e lavoro" : "Lavoro"} salvati alle ${localClock()}`);
      }
    } catch(err) {
      console.warn("Autosave:",err);
      setSaveIndicator("Salvataggio non disponibile", "error");
      setStatus("Memoria non disponibile: esporta backup JSON");
    }
  }
  function scheduleAutosave() {
    if (!state.initialized || state.exporting) return;
    setSaveIndicator(state.currentProjectId ? "Salvataggio progetto…" : "Salvataggio lavoro…", "saving");
    clearTimeout(autosaveTimer);
    autosaveTimer=setTimeout(()=>{persistCurrentSnapshot();},650);
  }

  function flushPendingSave() {
    if (!state.initialized || state.exporting) return;
    clearTimeout(settingsSaveTimer);saveSettings();
    if(pendingPreviewFrame){cancelAnimationFrame(pendingPreviewFrame);pendingPreviewFrame=0;syncAutomaticCode();}
    void persistCurrentSnapshot();
  }
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flushPendingSave();});
  window.addEventListener("pagehide",flushPendingSave);
  function goodNumber(value, fallback, min, max) {
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  }

  async function restoreSnapshot(data) {
    if (!data || data.version !== 2 || !data.form || !Array.isArray(data.logos)) throw new Error("Backup non valido");
    if (data.logos.length > MAX_LOGOS) throw new Error(`Troppi loghi nel progetto: massimo ${MAX_LOGOS}`);
    state.initialized = false;
    clearTimeout(autosaveTimer);
    try {
    // Cambia dimensioni del foglio PRIMA di ricostruire sfondi e loghi.
    setPageOrientation(data.form.pageOrientation, false);
    for (const id of formIds) {
      if (typeof data.form[id] === "string") $(id).value = data.form[id];
      else if (id === "accentColor") $(id).value = themePalettes.classic.accent;
      else if (id === "inkColor") $(id).value = themePalettes.classic.ink;
      else if (id === "frameStyle") $(id).value = themePalettes.classic.frame;
      else if (id === "ornamentStyle") $(id).value = themePalettes[data.designTheme]?.ornament || "none";
      else if (id === "fontScale") $(id).value = "100";
      else if (id === "thirdSignatureMode") $(id).value = "off";
      else if (["certificateCode", "courseHours", "courseOutcome", "thirdSignatureName", "thirdSignatureRole"].includes(id)) $(id).value = "";
    }
    selectedTheme = data.designTheme === "custom" ? "custom" : themePalettes[data.designTheme] ? data.designTheme : "classic";
    syncDesignUI();
    for (const id of ["leftSignatureMode", "signatureMode"]) {
      if (!["auto", "image", "none"].includes($(id).value)) $(id).value = "auto";
    }
    if (!["off","auto","image","none"].includes($("thirdSignatureMode").value)) $("thirdSignatureMode").value = "off";
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
    if (data.logos.length > MAX_LOGOS) throw new Error(`Il progetto supera il limite di ${MAX_LOGOS} loghi: nessun elemento verrà eliminato automaticamente`);
    for (const entry of data.logos) {
      if (!(entry.blob instanceof Blob)) throw new Error("Logo del progetto non valido");
      const image = await imageFromBlob(entry.blob);
      state.logos.push({ image, blob: entry.blob, scale: goodNumber(entry.scale, 100, 20, 300),
        x: goodNumber(entry.x, W / 2, 0, W), y: goodNumber(entry.y, 150, 0, H), locked: !!entry.locked });
    }
    state.activeLogoIndex = state.logos.length ? Math.min(state.logos.length - 1, Math.max(0, Number(data.activeLogoIndex) || 0)) : -1;
    for (const [key, prop] of [["leftSignature", "leftSignature"], ["rightSignature", "signature"], ["thirdSignature", "thirdSignature"]]) {
      state[`${prop}Blob`] = data[key] instanceof Blob ? data[key] : null;
      state[`${prop}Image`] = state[`${prop}Blob`] ? await imageFromBlob(state[`${prop}Blob`]) : null;
      const modeId = `${prop}Mode`;
      if ($(modeId).value === "image" && !state[`${prop}Image`]) $(modeId).value = "none";
    }
    $("projectName").value = String(data.workingName || data.name || "");
    state.currentProjectId = data.currentProjectId || (data.id !== "__workspace__" ? data.id : null);
    lastSavedProjectName=String(data.name || data.workingName || "");
    selectedQuickDiscipline = "";
    $("batchNames").value=typeof data.rosterText === "string" ? data.rosterText : "";
    $("quickBatchNames").value=$("batchNames").value;
    $("autoCertificateCode").checked = data.autoCertificateCode !== false;
    syncAutomaticCode();
    updateBatchCount();
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
    for (const entry of entries) {
      const orientation = entry.form?.pageOrientation === "portrait" ? "A4 verticale" : "A4 orizzontale";
      selector.add(new Option(`${entry.name || "Senza nome"} · ${orientation}`, entry.id));
    }
    selector.value = entries.some(p => p.id === chosen) ? chosen : state.currentProjectId || "";
  }

  async function saveProject(duplicate) {
    clearTimeout(autosaveTimer);
    await activeWrites.catch(()=>{});
    const name = $("projectName").value.trim();
    if (!name) { setStatus("Assegna un nome al progetto"); $("projectName").focus(); return; }
    try {
      const id = !duplicate && state.currentProjectId ? state.currentProjectId : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      if (!duplicate && state.currentProjectId && !confirm(`Aggiornare il progetto «${name}»?`)) return;
      const data = snapshot(id, name);
      data.currentProjectId = id;
      await writeArchiveAtomically([data,{...data,id:"__workspace__"}],[],[]);
      state.currentProjectId = id;
      lastSavedProjectName = name;
      await refreshProjectList();
      $("projectSelector").value = id;
      scheduleAutosave();
      setSaveIndicator(`Salvato alle ${localClock()}`);
      setStatus(`${duplicate ? "Copia progetto" : "Progetto"} A4 ${currentOrientation() === "portrait" ? "verticale" : "orizzontale"} salvato`);
    } catch (err) { console.error(err); setStatus("Salvataggio impossibile: esporta un backup"); }
  }

  async function openProject() {
    const id = $("projectSelector").value;
    if (!id) { setStatus("Seleziona un progetto"); return; }
    if (!confirm("Aprire il progetto scelto? Il lavoro attuale viene salvato automaticamente prima del cambio.")) return;
    try {
      await persistCurrentSnapshot();
      clearTimeout(autosaveTimer);
      await activeWrites.catch(()=>{});
      const data = await dbGet(id);
      if (!data) throw new Error("Progetto non trovato");
      // Apri sempre il progetto scelto, anche se un vecchio backup contiene
      // un currentProjectId differente: il salvataggio non crea nuove copie.
      await restoreSnapshot({...data, currentProjectId: id});
      state.currentProjectId = id;
      $("projectSelector").value = id;
      scheduleAutosave();
      setStatus(`Progetto «${data.name || "Senza nome"}» riaperto in A4 ${currentOrientation() === "portrait" ? "verticale" : "orizzontale"}`);
    } catch (err) { console.error(err); setStatus("Impossibile aprire il progetto"); }
  }

  async function deleteProject() {
    const id = $("projectSelector").value;
    if (!id) { setStatus("Seleziona un progetto"); return; }
    if (!confirm("Eliminare definitivamente questo progetto salvato? Il modello aperto non cambia.")) return;
    try {
      clearTimeout(autosaveTimer);
      const wasCurrent=state.currentProjectId===id;
      if(wasCurrent){state.currentProjectId=null;lastSavedProjectName="";}
      await activeWrites.catch(()=>{});
      try{await dbDelete(id);}catch(error){if(wasCurrent)state.currentProjectId=id;throw error;}
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

  async function requiredImageBlob(data){const blob=await dataURLToBlob(data);if(!blob)throw new Error("Immagine obbligatoria mancante nel backup");return blob;}
  async function dataURLToBlob(data) {
    if (!data) return null;
    if (typeof data !== "string" || !/^data:image\/(png|jpeg|webp);base64,/.test(data) || data.length > MAX_IMAGE_MB * 1400000) {
      throw new Error("Immagine backup non valida");
    }
    const response = await fetch(data);
    const blob = await response.blob();
    if (blob.size > MAX_IMAGE_MB * 1048576) throw new Error("Immagine troppo grande");
    await imageFromBlob(blob); // Verifica che i dati siano realmente un'immagine decodificabile.
    return blob;
  }

  const bytesBase64=bytes=>{
    let out="";
    for(let i=0;i<bytes.length;i+=8192) out+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(out);
  };
  const base64Bytes=str=>Uint8Array.from(atob(str),c=>c.charCodeAt(0));
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
      const current = snapshot(state.currentProjectId || "export", $("projectName").value.trim());
      const backup = {
        ...current,
        background: current.background ? { ...current.background, blob: await blobToDataURL(current.background.blob) } : null,
        logos: await Promise.all(current.logos.map(async logo => ({ ...logo, blob: await blobToDataURL(logo.blob) }))),
        leftSignature: current.leftSignature ? await blobToDataURL(current.leftSignature) : null,
        rightSignature: current.rightSignature ? await blobToDataURL(current.rightSignature) : null,
        thirdSignature: current.thirdSignature ? await blobToDataURL(current.thirdSignature) : null
      };
      const json = await protectBackup(backup);
      offerDownload(json, `K9_progetto_${safeProjectName(current.name || "certificato")}.json`);
      setStatus("Backup completo esportato");
    } catch (err) { console.error(err); setStatus(err.message || "Impossibile esportare il backup"); }
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
      const item = await decodeBackup(file);
      if (item.version !== 2 || !item.form || !Array.isArray(item.logos) || item.logos.length > MAX_LOGOS) throw new Error("Formato non supportato");
      const data = {
        ...item, id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: String(item.name || "Backup importato").slice(0, 100),
        workingName: String(item.name || "Backup importato").slice(0, 100),
        updatedAt: new Date().toISOString(),
        background: item.background ? { ...item.background, blob: await dataURLToBlob(item.background.blob) } : null,
        logos: await Promise.all(item.logos.map(async logo => ({ ...logo, blob: await requiredImageBlob(logo.blob) }))),
        leftSignature: await dataURLToBlob(item.leftSignature),
        rightSignature: await dataURLToBlob(item.rightSignature),
        thirdSignature: await dataURLToBlob(item.thirdSignature)
      };
      data.currentProjectId = data.id;
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
    return {
      ...item,
      background: item.background ? {...item.background, blob: await blobToDataURL(item.background.blob)} : null,
      logos: await Promise.all(item.logos.map(async l => ({...l, blob: await blobToDataURL(l.blob)}))),
      leftSignature: item.leftSignature ? await blobToDataURL(item.leftSignature) : null,
      rightSignature: item.rightSignature ? await blobToDataURL(item.rightSignature) : null,
      thirdSignature: item.thirdSignature ? await blobToDataURL(item.thirdSignature) : null
    };
  }

  async function exportArchive() {
    try {
      setStatus("Creazione archivio…");
      // Prima esporta in archivio anche le modifiche non ancora salvate come progetto.
      await persistCurrentSnapshot();
      await activeWrites.catch(()=>{});
      const allProjects = await dbAll();
      const saved = allProjects.filter(item => item.id !== "__workspace__");
      const workspace = snapshot("__workspace__", "Lavoro corrente");
      const savedTemplates = await allTemplates();
      if (saved.length > 100) throw new Error("Troppi progetti per un singolo backup");
      const projects = [];
      for (const item of saved) projects.push(await portableProject(item));
      let registry=[];
      try {registry=await allExports();} catch(error) {console.warn("Registro non disponibile nel backup",error);}
      const templates = [];
      for (const preset of savedTemplates) templates.push(await portableProject(preset));
      const doc = {kind:"k9-certificati-archive",archiveVersion:1,createdAt:new Date().toISOString(),projects,registry,templates,workspace:await portableProject(workspace)};
      offerDownload(await protectBackup(doc),`K9_archivio_${todayISO()}.json`);
      setStatus(`Backup: lavoro corrente, ${projects.length} progetti, ${templates.length} modelli e ${registry.length} registrazioni`);
    } catch (err) {console.error(err);setStatus(err.message || "Archivio non esportato: spazio insufficiente?");}
  }

  async function writeArchiveAtomically(projects,templates,records) {
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(["projects","templates","exports"],"readwrite");
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error("Salvataggio archivio annullato"));
      try {for(const [store,items] of [["projects",projects],["templates",templates],["exports",records]])for(const item of items)tx.objectStore(store).put(item);}
      catch(error){try{tx.abort();}catch{}reject(error);}
    });
  }
  async function importArchive(event) {
    const file = event.target.files[0];event.target.value="";
    if (!file) return;
    if (file.size > 180 * 1048576) {setStatus("Archivio troppo grande (max 180 MB)");return;}
    try {
      const archive = await decodeBackup(file);
      if (archive.kind !== "k9-certificati-archive" || archive.archiveVersion !== 1 || !Array.isArray(archive.projects) || archive.projects.length > 100) throw new Error("Formato archivio non valido");
      for(const key of ["templates","registry"])if(archive[key]!==undefined&&!Array.isArray(archive[key]))throw new Error("Sezione archivio non valida: "+key);
      const hasWorkspace = !!archive.workspace;
      if (!archive.projects.length && !(Array.isArray(archive.templates) && archive.templates.length) && !(Array.isArray(archive.registry) && archive.registry.length) && !hasWorkspace) {setStatus("Archivio vuoto");return;}
      if (!confirm(`Importare ${archive.projects.length} progetti, ${(archive.templates || []).length} modelli, ${(archive.registry || []).length} registrazioni${hasWorkspace ? " e una copia del lavoro corrente" : ""}? I modelli già presenti non saranno sovrascritti.`)) return;
      const items = [];
      for (const entry of archive.projects) {
        if (entry.version !== 2 || !entry.form || !Array.isArray(entry.logos) || entry.logos.length > MAX_LOGOS) throw new Error("Progetto non valido");
        const name = String(entry.name || "Progetto importato").slice(0,100);
        const id = `p_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        items.push({ ...entry,id,name,workingName:name,currentProjectId:id,updatedAt:new Date().toISOString(),
          background:entry.background ? {...entry.background,blob:await dataURLToBlob(entry.background.blob)} : null,
          logos:await Promise.all(entry.logos.map(async l=>({...l,blob:await requiredImageBlob(l.blob)}))),
          leftSignature:await dataURLToBlob(entry.leftSignature),rightSignature:await dataURLToBlob(entry.rightSignature),thirdSignature:await dataURLToBlob(entry.thirdSignature)});
      }
      if (hasWorkspace) {
        const entry = archive.workspace;
        if (entry.version !== 2 || !entry.form || !Array.isArray(entry.logos) || entry.logos.length > MAX_LOGOS) throw new Error("Lavoro corrente del backup non valido");
        const name = `Lavoro recuperato ${new Date().toLocaleDateString("it-IT")}`;
        const id = `p_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        items.push({...entry,id,name,workingName:name,currentProjectId:id,updatedAt:new Date().toISOString(),
          background:entry.background ? {...entry.background,blob:await dataURLToBlob(entry.background.blob)} : null,
          logos:await Promise.all(entry.logos.map(async l=>({...l,blob:await requiredImageBlob(l.blob)}))),
          leftSignature:await dataURLToBlob(entry.leftSignature),rightSignature:await dataURLToBlob(entry.rightSignature),thirdSignature:await dataURLToBlob(entry.thirdSignature)});
      }
      const presets=[], records=[];
      let importedTemplates = 0;
      if (Array.isArray(archive.templates)) {
        if (archive.templates.length > 30) throw new Error("Troppi modelli per disciplina nel backup");
        for (const entry of archive.templates) {
          if (entry.version !== 2 || !entry.form || !Array.isArray(entry.logos) || entry.logos.length > MAX_LOGOS || !/^t_[A-Z0-9_]{1,45}$/.test(entry.id)) throw new Error("Modello disciplina non valido");
          if (await getTemplate(entry.id)) continue; // Non sovrascrivere modelli del dispositivo.
          const preset = {...entry,
            background:entry.background ? {...entry.background,blob:await dataURLToBlob(entry.background.blob)} : null,
            logos:await Promise.all(entry.logos.map(async l=>({...l,blob:await requiredImageBlob(l.blob)}))),
            leftSignature:await dataURLToBlob(entry.leftSignature),rightSignature:await dataURLToBlob(entry.rightSignature),thirdSignature:await dataURLToBlob(entry.thirdSignature)};
          if(presets.some(p=>p.id===preset.id))throw new Error("Modello duplicato nel backup");
          presets.push(preset); importedTemplates++;
        }
      }
      let importedRecords=0;
      if (Array.isArray(archive.registry)) {
        if (archive.registry.length > 10000) throw new Error("Registro troppo grande");
        for (const record of archive.registry) {
          if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("Registrazione non valida");
          records.push({...record,id:`e_${Date.now()}_${Math.random().toString(36).slice(2,10)}`});
          importedRecords++;
        }
      }
      await writeArchiveAtomically(items,presets,records);
      await refreshProjectList();
      await refreshExports();
      await refreshQuickTemplateInfo();
      setStatus(`${items.length} progetti, ${importedTemplates} modelli e ${importedRecords} registrazioni importati`);
    } catch (err) {console.error(err);setStatus(err.message || "Archivio non importato: formato o spazio insufficiente");}
  }
  $("exportArchive").addEventListener("click", exportArchive);
  $("importArchive").addEventListener("change", guardAsync(importArchive));

  $("resetAll").addEventListener("click", async () => {
    if (!confirm("Ripristinare il modello iniziale? I progetti salvati rimangono disponibili.")) return;
    state.initialized = false;
    clearTimeout(autosaveTimer);
    localStorage.removeItem("k9-certificati-settings");
    setPageOrientation("landscape", false);
    $("documentType").value = defaults.documentType;
    textIds.forEach(id => { $(id).value = defaults[id]; });
    $("certificateDate").value = todayISO();
    $("leftSignatureMode").value = "auto";
    $("signatureMode").value = "auto";
    $("thirdSignatureMode").value = "off";
    $("courseOutcome").value = "";
    selectedTheme = "classic";
    $("accentColor").value = themePalettes.classic.accent;
    $("inkColor").value = themePalettes.classic.ink;
    $("frameStyle").value = themePalettes.classic.frame;
    $("ornamentStyle").value = "none";
    $("fontScale").value = "100";
    state.backgroundImage = null; state.backgroundBlob = null;
    state.backgroundScale = 100; state.backgroundOpacity = 100;
    state.backgroundX = W / 2; state.backgroundY = H / 2; state.backgroundLocked = false;
    state.leftSignatureBlob = null; state.leftSignatureImage = null;
    state.signatureBlob = null; state.signatureImage = null;
    state.thirdSignatureBlob = null; state.thirdSignatureImage = null;
    state.logos = []; state.activeLogoIndex = -1; state.currentProjectId = null;lastSavedProjectName="";
    selectedQuickDiscipline = "";
    $("batchNames").value="";$("quickBatchNames").value="";$("autoCertificateCode").checked=true;
    syncAutomaticCode();
    $("projectName").value = ""; $("projectSelector").value = "";
    $("backgroundFile").value = ""; $("logoFile").value = "";
    ["leftSignatureFile", "signatureFile", "thirdSignatureFile"].forEach(id => $(id).value = "");
    syncAllControls();
    try { await dbDelete("__workspace__"); } catch (e) { console.warn(e); }
    state.initialized = true;
    render(); setStatus("Modello ripristinato");
  });

  for (const [side, fileId, modeId, removeId] of [
    ["left", "leftSignatureFile", "leftSignatureMode", "removeLeftSignature"],
    ["right", "signatureFile", "signatureMode", "removeSignature"],
    ["third", "thirdSignatureFile", "thirdSignatureMode", "removeThirdSignature"]
  ]) {
    $(fileId).addEventListener("change", e => loadImage(e.target.files[0], (image, blob) => {
      const prefix = side === "left" ? "leftSignature" : side === "third" ? "thirdSignature" : "signature";
      state[`${prefix}Image`] = image;
      state[`${prefix}Blob`] = blob;
      $(modeId).value = "image";
      $(fileId).value = "";
      saveSettings(); render();
      setStatus("Firma grafica caricata");
    }));
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

  // L'archivio grafico è incorporato nell'app: nessuna rete e nessun caricamento all'apertura.
  populateThemeGallery();
  $("themeSearch").addEventListener("input", populateThemeGallery);
  $("themeCategory").addEventListener("change", populateThemeGallery);
  $("themeGrid").addEventListener("click", event => {
    const button = event.target.closest(".theme-choice");
    if (button && $("themeGrid").contains(button)) applyCatalogTheme(button.dataset.theme);
  });
  for (const id of ["accentColor", "inkColor", "frameStyle", "ornamentStyle", "fontScale", "courseOutcome"]) {
    $(id).addEventListener("input", () => {
      if (["accentColor", "inkColor", "frameStyle", "ornamentStyle"].includes(id)) selectedTheme = "custom";
      syncDesignUI();deferSettingsSave();queuePreviewRender();
    });
    $(id).addEventListener("change", () => { saveSettings(); queuePreviewRender(); });
  }

  document.querySelectorAll(".quick-link").forEach(btn => btn.addEventListener("click", () => {
    const panels = document.querySelectorAll(".controls > details.panel");
    const panel = panels[Number(btn.dataset.panelIndex)];
    if (!panel) return;
    panel.open = true;
    const stickyHeight = innerWidth < 900 ? document.querySelector(".preview-panel")?.getBoundingClientRect().height || 0 : 0;
    const top = window.scrollY + panel.getBoundingClientRect().top - stickyHeight - 14;
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
      else if(closed&&ch.trim())throw new Error("CSV non valido: caratteri dopo le virgolette");
      else if(!closed)value+=ch;
    }
    if(inQuote)throw new Error("CSV non valido: virgolette non chiuse");
    push();rows.push(row);
    const headers=rows[0].map(x=>x.toLocaleLowerCase("it-IT").trim());
    const first=headers.findIndex(h=>["nome","first name"].includes(h));
    const last=headers.findIndex(h=>["cognome","surname","last name"].includes(h));
    const full=headers.findIndex(h=>["nome e cognome","nome cognome","nominativo","corsista","nome completo","full name"].includes(h));
    return (first>=0||last>=0||full>=0?rows.slice(1):rows).map(parts=>{
      if(full>=0)return parts[full]||"";
      if(first>=0||last>=0)return `${first>=0?parts[first]||"":""} ${last>=0?parts[last]||"":""}`;
      return parts.filter(Boolean).slice(0,2).join(" ");
    }).map(x=>x.trim().replace(/\s+/g," ")).filter(Boolean);
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
  $("exportProject").addEventListener("click", exportProject);
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
    document.querySelector(".quick-nav")?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",block:"start"});
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
    if (state.initialized) await persistCurrentSnapshot();
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
      const key = `t_${chosen}`;
      try {
        if (await getTemplate(key)) {
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
  function quickTemplateKey() {
    // Niente nomi personalizzati impliciti: solo disciplina verificabile.
    const discipline = detectedDiscipline();
    return discipline && /^[A-Z0-9_]{1,45}$/.test(discipline) ? `t_${discipline}` : "";
  }
  let templateLookupSequence = 0;
  async function refreshQuickTemplateInfo() {
    const seq = ++templateLookupSequence;
    const info = $("quickTemplateInfo"), key = quickTemplateKey();
    if (!key) {info.textContent="Inserisci una disciplina per usare i modelli";$("quickLoadTemplate").disabled=true;return;}
    try {
      const item = await getTemplate(key);
      if (seq !== templateLookupSequence) return;
      info.textContent = item ? `Modello salvato per ${key.slice(2).replace(/_/g," ")}` : "Nessun modello salvato: puoi creare e salvare il primo";
      $("quickLoadTemplate").disabled = !item;
    } catch {info.textContent = "Archivio modelli non disponibile";$("quickLoadTemplate").disabled=true;}
  }
  async function saveDisciplineTemplate() {
    try {
      const key = quickTemplateKey();
      if (!key) throw new Error("Inserisci prima la disciplina");
      if (await getTemplate(key) && !confirm(`Sostituire il modello già salvato per ${key.slice(2).replace(/_/g," ")}?`)) return;
      const item = snapshot(key,`Modello ${key.slice(2).replace(/_/g," ")}`);
      // Un modello non contiene nominativi o elenchi corsisti.
      item.form.recipientName = "";item.form.certificateCode = "";item.rosterText = "";
      item.currentProjectId = null;item.workingName = "";
      await putTemplate(item);
      await refreshQuickTemplateInfo();
      setStatus(`Modello A4 ${currentOrientation() === "portrait" ? "verticale" : "orizzontale"} salvato con loghi e firme`);
    } catch(error) {console.error(error);setStatus(error.message || "Modello non salvato");}
  }
  async function loadDisciplineTemplate({key = quickTemplateKey(), skipConfirm = false, skipSave = false} = {}) {
    try {
      const preset = key && await getTemplate(key);
      if (!preset) {setStatus("Nessun modello salvato per questa disciplina");return;}
      if (!skipConfirm && !confirm("Caricare grafica, testi, loghi e firme del modello? Il lavoro corrente verrà salvato prima del cambio.")) return;
      if (!skipSave) await persistCurrentSnapshot();
      const name = $("recipientName").value, date = $("certificateDate").value, roster = $("batchNames").value;
      await restoreSnapshot(preset);
      $("recipientName").value = name;$("certificateDate").value = date;
      $("batchNames").value = roster;$("quickBatchNames").value = roster;
      $("autoCertificateCode").checked = true;
      state.currentProjectId = null;lastSavedProjectName = "";$("projectName").value = "";$("projectSelector").value = "";
      syncAutomaticCode();updateBatchCount();saveSettings();render();
      setStatus("Modello caricato: nominativo e data mantenuti");
    } catch(error) {console.error(error);setStatus("Impossibile aprire il modello");}
  }
  $("quickSaveTemplate").addEventListener("click",guardAsync(saveDisciplineTemplate));
  $("quickLoadTemplate").addEventListener("click",guardAsync(loadDisciplineTemplate));

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
    $("quickBatchNames").value = $("batchNames").value;
    try {setEditorMode(localStorage.getItem("k9-certificati-editor-mode") || "quick", false);} catch {setEditorMode("quick", false);}
    render();
    updateBatchCount();
    await refreshQuickTemplateInfo();
    await refreshExports();
    setSaveIndicator(archiveAvailable ? "Archivio locale pronto" : "Archivio non disponibile", archiveAvailable ? "" : "error");
  }
  // L'anteprima è l'unico elemento fisso: i salti ai pannelli rispettano la sua altezza reale.
  const fixedPreview = document.querySelector(".preview-panel");
  function syncStickyPreviewHeight(){
    document.documentElement.style.setProperty("--sticky-preview-height", `${Math.ceil(fixedPreview.getBoundingClientRect().height)}px`);
  }
  if ("ResizeObserver" in window) new ResizeObserver(syncStickyPreviewHeight).observe(fixedPreview);
  window.addEventListener("resize", syncStickyPreviewHeight);
  syncStickyPreviewHeight();
  initialize();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
