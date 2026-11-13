# K9 Template Studio — versione 4.7.1 (12 novembre 2026)

Applicazione statica per creare attestati e certificati in **A4 verticale (210 × 297 mm)** o **A4 orizzontale (297 × 210 mm)**, con PDF singoli o multipagina e PNG a 600 DPI.

**Gestione progetti:** dopo aver salvato un progetto in A4 verticale o orizzontale, lo si riapre dall'elenco «Progetti salvati» con «Apri progetto». Si recuperano lo stesso progetto (stesso identificativo), l'orientamento, i testi, lo sfondo, i loghi, le firme e l'elenco corsisti. **Non viene creata una copia automaticamente.** Se si cambia orientamento in un progetto già aperto, il formato viene salvato nel progetto esistente tramite autosalvataggio; premendo «Salva progetto» si aggiorna lo stesso progetto. Solo il pulsante facoltativo «Duplica come nuovo» crea una copia distinta. Il lavoro in corso viene inoltre recuperato in apertura dell'app se l'archivio locale del dispositivo è disponibile.

**Nota:** l'archivio dei progetti è locale al browser/dispositivo. Per accedere ai progetti da altri dispositivi o dopo la cancellazione dei dati del sito, occorre trasferirli tramite un backup JSON.

**Firme:** due firme predefinite e una terza facoltativa, al centro, con ruolo, nome in corsivo, immagine autorizzata o sola riga. La terza firma è disattivata nei progetti precedenti; viene conservata nei progetti, nei modelli e nei backup. Fino a 50 loghi per progetto, PNG/JPG/WEBP, massimo 15 MB ciascuno; il limite effettivo dipende dalla memoria del dispositivo.

**Regolazione del blocco firme:** nel pannello «Testi e firme» tre cursori modificano insieme posizione orizzontale, verticale e dimensione (50–115%) delle due o tre firme, comprese immagini, ruoli, nomi e righe. La posizione 0% coincide con quella iniziale; il movimento si adatta allo spazio disponibile nel foglio. Il pulsante «Posizione e dimensione iniziali» ripristina solo queste regolazioni. Il pulsante «Blocca firme» disabilita i tre cursori e il ripristino della posizione; «Sblocca firme» li riattiva senza cambiare i valori. Il blocco riguarda solo posizione e dimensione, non i testi o le immagini dei firmatari. I valori e lo stato di blocco sono salvati nel progetto, nei modelli e nei backup; i vecchi progetti mantengono la disposizione precedente e si aprono con i cursori sbloccati.

**Codici:** con la generazione automatica vengono utilizzate tutte le iniziali: `Alessio Dando Fido` → `A.D.F.`. Se scegli il codice manuale, è obbligatorio compilare il campo prima di esportare PDF o PNG. Il codice manuale ripetuto in un documento multipagina richiede conferma.

**Importazione:** gli elenchi CSV con intestazione `Nominativo` (anche a colonna singola), oppure con colonne `Nome` e `Cognome`, non importano la riga di intestazione come corsista.

**Registro esportazioni:** nel pannello «Progetti», «Azzera registro esportazioni» cancella, dopo conferma, esclusivamente lo storico locale delle esportazioni PDF e PNG, inclusi i codici già utilizzati. Non elimina progetti, modelli, immagini, firme o documenti già scaricati. Le esportazioni successive ricostruiscono il registro. Un vecchio backup completo che contiene il registro può reimportare le voci precedenti. Il pulsante «Esporta registro CSV» permette di conservarne una copia prima dell’azzeramento.

**Pubblicazione:** la configurazione Pages rimane sul ramo `main` e sulla cartella `/(root)`. Nessuna impostazione GitHub Pages viene cambiata con questo aggiornamento. L’eventuale file `.nojekyll` è indipendente da queste modifiche e non risolve da solo un errore `Startup failure` di GitHub Actions.

**Aggiornamento 4.7.1:** sostituire `index.html`, `css/style.css`, `js/app.js`, `js/pdf-vector.js`, `sw.js` e `README.md`. Non sono necessari nuovi file e non va eliminato nessun file. Prima di pubblicare, esportare un backup dei progetti.

**Grafica e impaginazione automatica:** 121 stili selezionabili (100 precedenti + 21 nuove composizioni; varianti storiche conservate per compatibilità), miniature reali per il formato A4 selezionato, font coordinati e ridimensionamento dei nominativi. Il testo non viene riscritto. PDF vettoriale con font Times e Helvetica standard, grafica rasterizzata nativamente a 600 DPI (7016 × 4961 pixel in orizzontale e 4961 × 7016 in verticale). Testi che non entrano nello spazio disponibile sono segnalati prima dell’esportazione. I progetti esistenti mantengono ID, testi, immagini e orientamento; il nuovo motore può modificarne l’aspetto tipografico.

**Qualità Ultra HD:** 600 DPI per tutti i temi anche storici, disegnati nuovamente in esportazione. PNG con metadati 600 DPI, PDF con testo vettoriale e grafica JPEG di alta qualità. Le immagini personali conservano il dettaglio della sorgente. La generazione richiede circa 133 MiB per il solo canvas UHD; il PDF multipagina riutilizza una sola grafica.

**Galleria:** sezioni Top professionali, K9 operativi, Cerimoniali, Accademici, Eleganti e creativi, Classici; filtro Selezione top. Miniature a 320 pixel sul lato lungo.

**Anteprima compatta:** il foglio A4 rimane fisso in alto durante lo scorrimento. Il pulsante Griglia affianca Scarica PDF: le linee e gli assi centrali sono visibili solo in anteprima e la preferenza resta salvata sul dispositivo. Non ci sono intestazioni o comandi sopra il foglio; il formato, le guide, l’ingrandimento e il ripristino sono nel pannello «Progetti». Gli avvisi grafici ripetitivi non compaiono nell’anteprima. Le sovrapposizioni intenzionali dei loghi non bloccano il PDF; eventuali problemi realmente bloccanti (testo fuori spazio, dati mancanti, caratteri non supportati) sono comunicati soltanto al tentativo di esportazione.

**Stabilità:** blocco delle modifiche durante l’esportazione, controllo CSV, importazione dell’archivio in un’unica transazione, registro PNG e avviso codici coincidenti. Salvataggio richiesto anche quando la pagina viene nascosta (il sistema operativo può comunque interrompere le scritture in corso). Nessun nuovo menu obbligatorio.

---

## Storico delle versioni precedenti

Le note seguenti descrivono il comportamento delle **versioni storiche** e possono non corrispondere all'implementazione attuale 4.7.1. In caso di differenze, fa fede la sezione aggiornata qui sopra.

## V4.2.1 — Aggiornamento correttivo

- Controllo prima di stampare dei firmatari ancora indicati come «Nome Cognome»: il PDF viene bloccato finché il testo provvisorio non viene sostituito (anche nella modalità rapida). La scelta «senza firma» rimane utilizzabile, purché il nominativo stampato non sia provvisorio.
- Coerenza tra disciplina e corso: la modalità rapida aggiorna la disciplina quando riconosce in modo univoco un'altra disciplina nel titolo; il controllo stampa segnala eventuali incongruenze.
- Alla selezione della disciplina, se esiste un modello predefinito, l'app propone subito di applicarlo. Il cambio richiede conferma perché potrebbe sovrascrivere la grafica attuale; corsista, data e lista dei corsisti vengono conservati.
- Nella modalità rapida l'uso di un codice manuale è ora chiaramente segnalato, con un comando per ripristinare quello automatico (senza numerazione progressiva).
- Backup generale completo: comprende il lavoro corrente anche se non è nominato, gli altri progetti, i modelli e il registro. Al ripristino il lavoro corrente viene importato come nuovo progetto denominato «Lavoro recuperato», senza sovrascrivere quello aperto. I backup precedenti restano importabili.
- Avvisi di errore ben visibili e persistenti fino a un nuovo messaggio; gli avvisi informativi rimangono per 6 secondi.
- Cache PWA aggiornata alla versione 4.2.1.

**Non modificato:** lo spostamento di sfondi/loghi, le barre di posizionamento, i blocchi, il PDF A4 e la numerazione tramite sole iniziali.

# K9 Certificati — V4.2 (include gli aggiornamenti precedenti)

Generatore di attestati e certificati in A4 (all'epoca soltanto orizzontale).

Funzioni incluse:
- sfondo personale con trasparenza e dimensione regolabili;
- testi preimpostati e modificabili;
- nome del corsista in corsivo leggibile;
- due blocchi firma, sinistra e destra, con ruolo e nominativo modificabili;
- nomi firma sempre in corsivo leggibile;
- logo caricabile, ridimensionabile e posizionabile tramite barre scorrevoli;
- anteprima immediata e generazione PDF locale;
- interfaccia chiara e ottimizzata anche per smartphone.

Il pacchetto di aggiornamento contiene solo i file modificati o aggiunti, da caricare nelle medesime cartelle della repository.


## Aggiornamento firma automatica
- Fondo base del certificato bianco puro.
- Il nome del Docente e del Responsabile viene inserito una sola volta.
- Lo stesso valore genera automaticamente la firma corsiva sulla riga e il nome leggibile sotto la firma.
- L'immagine di sfondo resta separata e regolabile in trasparenza e dimensione.


## V1.1.3
- Nome e cognome del corsista in grassetto pieno e leggibile.
- Nominativi stampati di docente e responsabile in grassetto; firma manoscritta invariata.
- Fascia superiore riservata al logo e impaginazione testi riequilibrata per non invadere la sua area standard.
- Logo predefinito leggermente più compatto, sempre liberamente ridimensionabile e spostabile con slider.


## V1.1.3
Tipografia del certificato completamente ridimensionata: titolo, sottotitolo, nominativo, testo centrale, corso, luogo/data e firme sono più grandi. Il nominativo del corsista e i nominativi stampati sotto le firme usano un carattere realmente pesante (Arial Black/900).


## V1.1.4
- Barre scorrevoli X/Y anche per lo sfondo.
- Anteprima bloccata (sticky) e sempre visibile durante le regolazioni, anche su smartphone.


## V1.1.5
- Canvas e anteprima impostati su proporzione A4 orizzontale reale 297×210.
- Blocco/sblocco indipendente per sfondo e logo.
- Quando bloccati, dimensione, posizione e trasparenza/scala non possono essere modificati accidentalmente.


## V1.1.6
- Anteprima mobile ridimensionata automaticamente mantenendo il rapporto A4 297×210.
- Anteprima sticky sempre visibile, ma più compatta su smartphone.
- Canvas interno invariato a rapporto A4 reale; cambia solo la scala visiva dell'anteprima.


## V1.1.7
- Anteprima smartphone quasi a tutta larghezza, con altezza calcolata direttamente dal rapporto A4 297×210.
- Nessuna deformazione del PDF: cambia solo la resa responsiva dell'anteprima.
- Tipografia del certificato rivista con font serif classici, nome e corso in stampatello grassetto, testi più grandi e formali.


## V1.1.8
- Testi principali ridimensionati e riequilibrati.
- Fascia superiore ampliata e lasciata libera per il logo.
- Nome, corso, corpo testo e firme mantengono leggibilità senza dominare il certificato.


## V1.1.9
- Nuova icona app dedicata a K9 Certificati.
- Icone PWA aggiornate nei formati 192×192 e 512×512.
- Cache PWA aggiornata per forzare il caricamento della nuova icona.

## V1.2.0
- Supporto a più loghi senza duplicare i controlli.
- Ogni nuovo caricamento aggiunge un logo indipendente.
- Un solo pannello controlla sempre il logo attivo.
- Ogni logo conserva posizione, dimensione e stato bloccato/sbloccato.
- Selettore compatto per tornare a un logo già inserito.
- Dopo aver bloccato un logo puoi caricarne subito un altro con lo stesso comando.


## V2.0 — Progetti completi, PDF vettoriale e multipagina

Aggiornamento incrementale dell'app K9 Certificati. Nessun servizio esterno,
login, account o Supabase richiesto.

### Progetti
- **Salva progetto** memorizza testo, data, sfondo, più loghi, posizione,
  dimensione, trasparenza, blocchi e firme su questo dispositivo (IndexedDB).
- **Apri** ricarica le immagini originali e i parametri del modello.
- **Duplica**, **Elimina salvato**, **Esporta backup JSON** e **Importa backup**
  consentono di creare versioni e trasferire dati tra dispositivi.
- Il lavoro corrente viene salvato automaticamente nel browser, se IndexedDB
  è disponibile. I progetti non vengono sincronizzati tra dispositivi: esporta
  periodicamente un backup per evitare perdite di dati.
- La funzione Ripristina pulisce il modello corrente, non i progetti nominati.

### Testi e PDF
- Testo centrale su righe dinamiche; se non può entrare nello spazio disponibile,
  compare un avviso e il PDF non viene generato. Il programma non elimina righe.
- A4 orizzontale reale, 297 × 210 mm.
- Titoli, nominativi e testi sono oggetti PDF vettoriali e selezionabili con
  font PDF standard Times, non incorporati. Sono supportati i caratteri comuni
  dell'alfabeto latino occidentale (WinAnsi). Per caratteri non supportati la
  generazione si interrompe con un messaggio esplicito.
- Cornici, sfondi, loghi e firme grafiche vengono esportati come immagine di
  3508 × 2480 pixel, equivalente a 300 DPI sull'A4 orizzontale.
- La risoluzione effettiva dei loghi e degli sfondi dipende sempre dai file
  sorgente: un'immagine di bassa qualità non diventa nitida automaticamente.

### Firme
- Per ciascuna firma: nome in corsivo grafico, immagine PNG/JPG/WEBP autorizzata
  oppure firma assente. Il nominativo stampato resta leggibile.
- Una firma in corsivo tipografico o un'immagine di firma non costituiscono
  automaticamente una firma digitale qualificata.

### Generazione multipla
- Scrivere fino a 30 nominativi (uno per riga) in Attestati multipli.
- Toccare **Prepara PDF multipagina**, poi **Scarica PDF multipagina pronto**.
  Il secondo tocco garantisce un'azione diretta dell'utente anche sui browser
  mobili che bloccano i download automatici avviati dopo elaborazioni lunghe.
- Viene prodotto un singolo PDF, una pagina nominativa per corsista, senza
  modificare in modo permanente il nominativo del modello aperto.

### File aggiornati
- index.html
- css/style.css
- js/app.js
- js/pdf-vector.js (nuovo)
- sw.js
- README.md
- manifest.webmanifest (V3)

Dopo la pubblicazione su GitHub Pages, ricaricare l'app e, se necessario,
chiuderla e riaprirla affinché il service worker aggiornato sia attivato.


## V3.0 — Nuova interfaccia e funzioni aggiuntive (include tutte le funzioni V2)

- 5 stili grafici predefiniti: Classico, Istituzionale, Naturale, Prestigio e Minimal; scelta indipendente dei colori principale/testo, cornice e scala dei caratteri (85–110%).
- Interfaccia ridisegnata, anteprima A4 sempre visibile su smartphone, pulsante per chiudere/riaprire tutti i pannelli e comandi touch.
- Sistema originale di spostamento di logo e sfondo **invariato**: controlli di posizione tramite barre orizzontale e verticale, blocco/sblocco e ridimensionamento come prima.
- Campi facoltativi per **codice attestato**, **durata del corso** ed **esito/valutazione**; non compaiono se vuoti.
- Importazione corsisti da CSV (colonne Nome e Cognome, o Nominativo) e TXT; esportazione multipagina mantenuta.
- Nella V3 era presente una numerazione progressiva opzionale; dalla **V4.1** questa funzione è stata sostituita dal codice `K9_DISCIPLINA_GGMMAAAA_INIZIALI`, senza progressivi.
- Salvataggi e backup V2 ancora validi: il formato interno resta version 2, con campi nuovi aggiunti in modo compatibile.
- Nessuna modifica a sistemi esterni, nessuna dipendenza aggiunta. Colori PWA aggiornati e cache service worker aggiornata a `k9-certificati-v3.0.0`, senza cancellare cache appartenenti ad altre app sullo stesso dominio.

**Installazione da V1:** caricare direttamente i file del pacchetto V3 nella repository originaria, senza caricare prima V2. I file sono elencati nel pacchetto. L'aggiornamento non cancella i progetti precedentemente salvati sullo stesso browser.


## V4.0 — Qualità di stampa, archivio completo e anteprima accessibile

- Repository di partenza: K9 Certificati V3.0; tutti i suoi file sono stati mantenuti.
- Generazione PDF multipagina ottimizzata: sfondo, loghi, cornice e firme sono composti una volta sola e riutilizzati tra le pagine PDF; resta un testo indipendente per ogni corsista.
- Controllo stampa visibile: verifica il nominativo, il corso, gli spazi di testo e l'alfabeto supportato nel PDF.
- Evidenziazione dei duplicati nell'elenco corsisti e conferma prima di produrre pagine con nomi o codici ripetuti.
- Anteprima ingrandita in finestra dedicata; guide di sicurezza attivabili (SOLO anteprima, MAI esportazione).
- Salvataggio automatico con indicatore di stato, senza dichiarare riuscito un salvataggio che ha dato errore.
- Backup/ripristino dell'intero archivio di progetti con un unico file JSON, aggiungendo i progetti senza sovrascrivere quelli esistenti. Restano supportati i backup individuali della V2/V3.
- Esportazione PNG a 300 DPI di un singolo certificato (immagine; non PDF vettoriale).
- Interfaccia rifinita per il controllo su smartphone, colori, spaziature, pulsanti, navigazione rapida tra i pannelli e testi di aiuto. Nessuna modifica alla gestione delle barre X/Y di sfondi e loghi.
- Cache PWA aggiornata alla versione 4.0.0 per la pubblicazione.
- **Privacy:** i progetti rimangono nel browser locale e nei file esportati dall'utente; nessun server aggiunto. Il backup JSON può contenere dati personali e immagini di firma: custodirlo in modo appropriato.

File da sostituire: `index.html`, `css/style.css`, `js/app.js`, `js/pdf-vector.js`, `sw.js`, `README.md`. Nessuna eliminazione, nessuna modifica al database.


## V4.1 — Aggiornamento correttivo (6 novembre 2026)

- Il sistema di posizione di loghi e sfondo (barre, scala, blocco/sblocco) rimane invariato.
- Corretta la perdita silenziosa dei loghi dal numero 21: il limite è 50, controllato all'inserimento e all'importazione. Oltre il limite, il caricamento viene rifiutato senza cancellare loghi esistenti.
- Dopo il primo salvataggio esplicito, un progetto aperto si aggiorna automaticamente; viene mantenuta anche una copia del lavoro in corso in IndexedDB. Il salvataggio è locale e dipende dallo spazio disponibile nel browser.
- Gli elenchi corsisti e la scelta di codice automatico vengono conservati nei progetti, nei backup e nell'ultimo lavoro; importando un CSV sopra un elenco esistente compare una conferma.
- Registro locale delle **esportazioni** in IndexedDB, con corsista, corso, codice, data e formato. Segnalazione dei codici già registrati, esportazione del registro CSV e inclusione nel backup completo. Non costituisce verifica pubblica o archivio centralizzato su più dispositivi.
- I nuovi backup JSON (singoli e archivio) possono essere protetti da password tramite AES-256-GCM e PBKDF2-SHA256; opzione selezionata per impostazione predefinita. Password non salvata: se smarrita, il backup è irrecuperabile. Restano importabili i backup non cifrati V2–V4.
- L'esportazione PNG include il metadato fisico pHYs a 300 DPI, oltre alla dimensione 3508 × 2480 px.
- I testi dell'anteprima usano una famiglia Times più vicina ai font Times standard del PDF. Una corrispondenza *tipografica perfetta* su ogni dispositivo non è garantita, poiché i font PDF non sono incorporati. Le firme grafiche rimangono nell'immagine di fondo.
- Aggiornata la cache PWA a 4.1.0.

**Attenzione:** i backup senza password e l'archivio del browser non sono cifrati; la protezione con password riguarda soltanto i file JSON esportati. Conservare password e file separatamente.


### Codice automatico per disciplina e iniziali (richiesta integrativa V4.1)

- Formato: `K9_DISCIPLINA_GGMMAAAA_N.C.`; esempio `K9_DETECTION_06112006_M.R.`.
- La disciplina è selezionabile da un campo con suggerimenti oppure, se vuota, derivata dal nome del corso. La data è quella indicata sul certificato.
- Il codice è applicato al PDF singolo e **a ogni pagina** del PDF multipagina; a partire dalla versione 4.2.2 le iniziali corrispondono a tutte le parole del nome e cognome. Non sono inseriti progressivi `001`, `002` o simili.
- I file singoli sono nominati usando lo stesso codice, rimuovendo il punto terminale prima dell'estensione per evitare `..pdf`.
- Il registro locale segnala codici ripetuti: corsisti con le medesime iniziali, disciplina e data avranno lo stesso codice. La correzione non aggiunge numeri arbitrari; segnala il conflitto e chiede se proseguire.
- La casella «Genera automaticamente» è attiva per impostazione predefinita. Disattivandola rimane possibile inserire un codice manuale, per compatibilità con lavori precedenti.


## V4.2 — Modalità rapida, modalità completa e ottimizzazione dell'anteprima (6 novembre 2026)

- **Modalità rapida (predefinita):** disciplina, titolo del corso, nome e cognome, data e codice automatico nella stessa schermata. Permette PDF singolo e multipagina usando il motore PDF già esistente.
- **Modalità completa:** conserva i pannelli originali Progetti, Design, Sfondo, Testi, Loghi e Attestati multipli. Le barre per posizione, scala e blocco di loghi/sfondi non sono state cambiate.
- **Dati condivisi:** i campi della modalità rapida aggiornano esattamente gli stessi campi della modalità completa. Il cambio modalità non crea un secondo certificato.
- **Modelli per disciplina:** i pulsanti “Salva come modello” e “Carica modello” usano l'archivio locale IndexedDB. Conservano grafica, sfondo, loghi, firme e impostazioni. Al caricamento mantengono nominativo e data del corsista corrente. Il modello caricato diventa una nuova copia di lavoro, senza sovrascrivere il progetto precedente.
- **Backup modelli:** “Backup di tutti i progetti” include anche i modelli per disciplina. Il ripristino importa i modelli mancanti senza sovrascrivere quelli già salvati sul dispositivo. Il formato di backup resta compatibile con V4.1.
- **Migliore fluidità:** le modifiche continue (digitazione, slider esistenti, colori) raggruppano i ridisegni attraverso `requestAnimationFrame`; le esportazioni PDF/PNG mantengono invece il disegno sincrono richiesto per la qualità del documento. La scrittura delle ultime impostazioni testuali è ritardata di 250 ms per evitare accessi ripetuti a localStorage ad ogni carattere.
- **PWA:** cache aggiornata a 4.2.0.

### Installazione

Partire dalla repository con V4.1. Sostituire **solo** `index.html`, `css/style.css`, `js/app.js`, `sw.js` e `README.md`. Non sostituire `js/pdf-vector.js`, le icone o il manifesto. Se è già installata come PWA, ricaricare la pagina con connessione attiva per ottenere la nuova cache.

### Limiti e cautela

I modelli per disciplina sono **locali al dispositivo**, non sincronizzati online. Per trasferirli usare il backup dell'archivio (selezionare la protezione con password e custodire il file in modo sicuro). Le iniziali non garantiscono un identificativo univoco fra corsisti omonimi nelle iniziali; gli avvisi del registro V4.1 rimangono attivi. La prova browser effettuata su questa versione è in ambiente simulato, non su smartphone fisico.


## Archivio stili grafici (4.3.0)

- 40 stili grafici locali pronti da caricare, inclusi i 5 originali (inalterati), filtrabili per categoria e per ricerca.
- Scegliere uno stile cambia **solo** colori, cornice e decorazione. Non sostituisce sfondi personalizzati, loghi, testi, corsisti, firme o l'orientamento A4.
- Le decorazioni sono disegnate nell'anteprima e nella grafica a 300 DPI di PDF/PNG, senza immagini esterne e senza dipendenza da Internet.
- Lo stile scelto è conservato nel progetto esistente, nell'autosalvataggio, nei modelli per disciplina e nei backup. Aprire un progetto precedente senza decorazione continua a funzionare: la decorazione predefinita è «Nessuna».
- La ricerca e il filtro **non** applicano uno stile; l'applicazione avviene solo quando si tocca la scheda di uno stile.
- Il campo «Decorazione grafica» permette di disabilitare o modificare un motivo. La personalizzazione di colori, cornice o decorazione non cancella il progetto: lo stile diventa «Personalizzato».
