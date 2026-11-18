# K9 Template Studio — 4.9.18 Clean Studio

Aggiornamento dalla repository 4.9.17 A4 Personal. Applicazione statica per GitHub Pages; nessun Supabase. L'archivio locale, i progetti, i modelli, la cronologia e il formato dei backup non cambiano.

## Installazione

1. Esporta un backup dell'archivio dall'app e conserva lo ZIP originale della repository.
2. Sostituisci insieme `index.html`, `css/style.css`, `js/app.js`, `sw.js`, `README.md` con i file del pacchetto. Mantieni le cartelle di destinazione.
3. Elimina soltanto i 29 file obsoleti elencati sotto. È possibile farlo anche dopo aver verificato l'app: non sono necessari alla nuova versione.
4. Riapri l'app online dopo la pubblicazione. Controlla `v4.9.18-clean-studio`. Non cancellare i dati del sito, IndexedDB o localStorage.

## Eliminazioni (solo file nella radice)

- `app.js`, `style.css`, `premium-frames.js`
- `frames-mantrailing-01.js` ... `frames-mantrailing-08.js`
- `frames-hrdd-01.js` ... `frames-hrdd-08.js`
- `frames-detection-01.js` ... `frames-detection-08.js`
- `frames-dogsitter-01.js`, `frames-dogsitter-02.js`

**Non eliminare** i file `frames-*-a4-*.js`, `js/premium-frames.js`, `js/realistic-backgrounds.js`, `js/pdf-vector.js`, `css/style.css`, `js/app.js`, il manifest e le icone. Il catalogo e i blocchi A4 restano alla versione asset 4.9.17 per evitare di ricaricare decine di MB. La versione dell'editor e della cache è 4.9.18.

## Novità

- 303 cornici conservate: 260 storiche e 43 A4 Duo, con identificativi invariati. Filtri disciplina e collezione; precedente/successiva seguono il filtro. Il cambio filtro non modifica la cornice attiva. I filtri si riallineano al ripristino di un progetto.
- 266 stili di sfondo, di cui 120 fotografici. Nessuna modifica alle sorgenti grafiche o alla qualità di esportazione. Le sorgenti non sono native Ultra HD.
- Un solo pulsante PDF singolo, fisso in anteprima; mantenuti PNG e PDF multipagina. Adattamento A4 delle cornici personali automatico, senza deformazioni. Per ripristinare l'opacità, porta il relativo cursore al 100%.
- Nuove cornici personali PNG/WebP: almeno il 90% dei pixel campionati nella zona centrale (dal 18,75% all'81,25% di larghezza e altezza) deve avere alfa <=5/255. La verifica non altera i file e non si applica retroattivamente ai progetti salvati. Limiti precedenti: 15 MiB e 40 MP per immagine, 100 MP per progetto.
- Blocco sfondo personale esteso a sostituzione/rimozione e adattamento.
- Eliminato il motore decorativo non richiamato (1.007 righe). Cache grafiche non attive liberate prima dell'esportazione; rilascio anticipato del canvas 600 DPI dopo JPEG. Il PDF multipagina riusa la grafica quando possibile; soglia di 96 MiB per i raster distinti, con messaggio per suddividere l'elenco se necessario. Non viene ridotta la risoluzione di esportazione.
- Backup, registro, firme, loghi, griglia, colori coordinati, codice automatico e modalità rapida/full conservati. Nessuna libreria personale aggiuntiva: le cornici personali restano nei progetti e nei backup; l'archivio galleria resta esterno.

## Verifiche

Controlli sintattici, riferimenti HTML, catalogo preservato, navigazione e filtri, blocco, A4, indipendenza sfondo, verifica trasparenza, ripristino snapshot e creazione PDF a 7016×4961 pixel in Chromium. Il test usa asset iniettati localmente; la persistenza reale IndexedDB e la pubblicazione GitHub Pages richiedono prova sul dispositivo.
