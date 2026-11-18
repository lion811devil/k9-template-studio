# K9 Template Studio 4.9.20 — Precision & Performance

Aggiornamento della versione 4.9.19. Applicazione statica per GitHub Pages, nessun Supabase. Il database IndexedDB, il suo schema, i dati dei progetti e il formato dei backup V2 restano compatibili. Cataloghi grafici e identificativi invariati.

## Installazione

1. Prima dell'aggiornamento, dall'app originale esportare il backup completo dei progetti e, se necessario, il progetto corrente separatamente. Conservare la repository originale.
2. Sostituire **insieme** i sei file di questo pacchetto, rispettando i percorsi:
   - `index.html`
   - `css/style.css`
   - `js/app.js`
   - `js/pdf-vector.js`
   - `sw.js`
   - `README.md`
3. Non eliminare alcun file. Non toccare i nove `frames-*-a4-*.js`, i due cataloghi in `js/`, manifest e icone.
4. Dopo la pubblicazione, chiudere e riaprire l'app online. Controllare la versione `4.9.20-precision-performance`. Non cancellare i dati del sito, IndexedDB o localStorage.

## Correzioni

- Rimozione di un logo bloccato impedita sia nell'interfaccia sia nella funzione JavaScript.
- Tutti i 13 cursori dispongono di valore numerico, incremento/decremento e ripristino del valore iniziale; i controlli aggiuntivi rispettano i blocchi. Coordinate firme con passo 0,1%. Scala sfondo personale 25–300%, preservata al riavvio.
- Adattamento dei nomi e titoli lunghi: la dimensione iniziale per l'impaginazione su due righe segue il cursore. Scala firme richiesta ed effettiva distinte; il limite effettivo dipende dai margini e non modifica la preferenza salvata.
- Annulla/Ripristina: cronologia temporanea della sessione (fino a 15 modifiche, raggruppate dopo 350 ms di inattività, con limite di memoria indicativo di 64 MiB per i Blob storici). Si azzera cambiando progetto o riaprendo un modello. Non sostituisce lo storico persistente dei progetti. Se l'archivio è in recupero protetto non esegue ripristini automatici.
- Trascinamento dei loghi opzionale, con puntatore o touch; il logo bloccato non può essere spostato. Avvisi per loghi fuori foglio e possibili sovrapposizioni con altri loghi o testi; gli avvisi sui loghi non bloccano l'esportazione.
- PDF e PNG con scelta 150, 300 o 600 DPI, default storico 600. La scelta si conserva sul dispositivo. Il PDF resta A4 e conserva il testo vettoriale supportato dal motore originale. La risoluzione delle fotografie e cornici originali non aumenta: 600 DPI indica la risoluzione della grafica nel documento.
- Esportazione multipagina invariata; nuova alternativa ZIP con un PDF per corsista (massimo 30, limite di memoria e dimensione). I codici con iniziali duplicate possono essere corretti manualmente nel gruppo; la correzione è applicata al PDF e al nome del file, senza cambiare il codice del modello. Nomi di file ripetuti resi univoci solo se necessario, senza aggiungere progressivi al codice stampato.
- Registro: ricerca per nome, codice, corso o data; CSV include DPI e indicazione che il download è stato richiesto. Il browser non certifica il salvataggio effettivo del file.
- Font firma locale: si può caricare un proprio file TTF/OTF/WOFF/WOFF2 (fino a 1 MB) con licenza d'uso. Se lo spazio lo permette resta disponibile offline sullo stesso dispositivo. In assenza viene mostrato l'avviso di fallback. Il font non è distribuito nel pacchetto e non entra nei backup: per la stessa resa su dispositivi diversi usare lo stesso font locale, oppure firma grafica autorizzata.
- Ridotte le cache di immagini/miniature, retry delle risorse alla riconnessione, eliminazione di due funzioni non usate e rafforzato il controllo delle versioni del Service Worker. Nessuna modifica al formato dei cataloghi.

## Collaudo

Controlli eseguiti: sintassi JS, riferimenti HTML, motore in Chromium con asset iniettati, 13 controlli di precisione, blocco/rimozione logo, annulla/ripristina di un cursore in sessione, formato A4, codice con tutte le iniziali, PDF a 150 e 600 DPI, ZIP con due PDF individuali e codice duplicato corretto, verifica CRC e testo/MediaBox dei PDF.

Limite: in questo ambiente la navigazione normale e lo storage di Chromium sono bloccati. L'undo è stato verificato in un ambiente di test in memoria, non con persistenza reale. Dopo pubblicazione verificare sul dispositivo il salvataggio/ripristino dei progetti e backup, la cache offline, l'installazione PWA e il font locale.

## Cataloghi

Restano disponibili tutte le 303 cornici (260 storiche, 43 A4 Duo) e i fondali esistenti. La sostituzione delle sorgenti grafiche con immagini native ad alta definizione, il completamento delle collezioni e la migrazione delle immagini in file separati non fanno parte di questa patch: richiedono risorse grafiche nuove o una migrazione specifica per evitare regressioni nei progetti.
