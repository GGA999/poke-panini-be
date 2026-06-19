# Task Backend — Configuratore Poke e Panino

> Stack: Node.js, Express e Supabase/PostgreSQL.
> I task sono ordinati secondo la sequenza consigliata di implementazione.

## Legenda

- **P0**: necessario per l'MVP.
- **P1**: importante, ma pianificabile dopo il nucleo MVP.
- **Taglie**: `XS` poche ore, `S` mezza/una giornata, `M` 1–2 giornate, `L` 3–5 giornate, `XL` da suddividere o pianificare con attenzione.

## Milestone

| Milestone | Task | Risultato atteso |
|---|---|---|
| M1 — Fondazioni DB/API | BE-001–BE-006 | Schema, seed e servizio base pronti. |
| M2 — Catalogo e pricing | BE-007–BE-012 | Il frontend può costruire e prezzare configurazioni. |
| M3 — Ordini sicuri | BE-013–BE-017 | Creazione e lettura ordine, autenticazione e RLS. |
| M4 — Hardening e rilascio | BE-018–BE-023 | Test, osservabilità, documentazione e deploy. |

## Backlog completo

## [ ] BE-001 — Bootstrap Node.js/Express e standard progetto

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** S
- **Dipendenze:** —
- **Obiettivo:** Creare un servizio riproducibile, tipizzato e pronto alla CI.

### Sotto-task

- [ ] Inizializzare Node.js, Express e TypeScript; in alternativa JS con JSDoc mantenendo le stesse interfacce.
- [ ] Configurare script dev, build, start, lint, test e test:integration.
- [ ] Configurare ESLint, Prettier, tsconfig e import alias.
- [ ] Aggiungere .env.example e validazione delle variabili all’avvio.
- [ ] Separare app.ts da server.ts per facilitare i test.
- [ ] Gestire graceful shutdown su SIGTERM/SIGINT.

### Criteri di accettazione

- [ ] Il server non si avvia se mancano variabili obbligatorie.
- [ ] Build, lint e test terminano senza errori.
- [ ] L’app Express è importabile nei test senza aprire una porta.
- [ ] Lo shutdown chiude connessioni e smette di accettare richieste.

---

## [ ] BE-002 — Middleware base e hardening HTTP

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** M
- **Dipendenze:** BE-001
- **Obiettivo:** Stabilire comportamento uniforme per sicurezza, parsing e diagnosi.

### Sotto-task

- [ ] Aggiungere request id accettando un id valido in ingresso o generandone uno.
- [ ] Configurare JSON body limit e rifiuto payload malformati.
- [ ] Configurare CORS con allowlist ambiente-specifica.
- [ ] Aggiungere header di sicurezza con middleware dedicato.
- [ ] Aggiungere compression solo dopo verifica del deploy/proxy.
- [ ] Aggiungere rate limit distinto per GET pubbliche, pricing e order creation.
- [ ] Disabilitare x-powered-by e configurare trust proxy correttamente.

### Criteri di accettazione

- [ ] Ogni risposta include o rende tracciabile il requestId.
- [ ] Origini non consentite non possono usare l’API dal browser.
- [ ] Payload eccessivi ricevono status appropriato.
- [ ] Il rate limit non usa l’IP sbagliato dietro proxy configurato.
- [ ] Gli header non espongono dettagli del framework.

---

## [ ] BE-003 — Client Supabase server-side e repository base

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** M
- **Dipendenze:** BE-001
- **Obiettivo:** Centralizzare accesso a Supabase e conversione errori.

### Sotto-task

- [ ] Creare client Supabase con URL e service-role key caricati da env.
- [ ] Impedire log accidentale della chiave o dell’header Authorization.
- [ ] Creare helper repository per distinguere not-found, conflict e database unavailable.
- [ ] Aggiungere timeout applicativi dove il client lo consente o tramite AbortSignal.
- [ ] Definire mapping snake_case DB ↔ camelCase API.
- [ ] Creare test di connettività usato dal readiness check.

### Criteri di accettazione

- [ ] Nessun modulo crea client Supabase ad hoc.
- [ ] Gli errori DB non vengono restituiti integralmente al client.
- [ ] Le query sono annullabili o limitate temporalmente.
- [ ] Il mapping dei dati è testato.

---

## [ ] BE-004 — Migrazioni schema catalogo

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** L
- **Dipendenze:** BE-003
- **Obiettivo:** Creare le tabelle e i vincoli del catalogo.

### Sotto-task

- [ ] Creare migrazione per configurator_types e sizes.
- [ ] Creare ingredient_categories e ingredients con regole min/max.
- [ ] Creare ingredient_size_rules e ingredient_incompatibilities.
- [ ] Creare brand_recipes e brand_recipe_ingredients.
- [ ] Aggiungere check, foreign key, unique e indici descritti nel modello.
- [ ] Aggiungere updated_at dove utile e strategia di manutenzione.
- [ ] Eseguire migrazione su database locale/staging pulito.

### Criteri di accettazione

- [ ] Le migrazioni si applicano in ordine su un progetto vuoto.
- [ ] I vincoli impediscono min/max incoerenti e duplicati chiave.
- [ ] Le query principali usano indici adeguati.
- [ ] Il rollback o una procedura di forward-fix è documentato.

---

## [ ] BE-005 — Migrazioni schema ordini e idempotenza

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** L
- **Dipendenze:** BE-004
- **Obiettivo:** Creare persistenza immutabile degli ordini.

### Sotto-task

- [ ] Creare orders, order_items e order_item_ingredients.
- [ ] Aggiungere idempotency_key con vincolo unique nello scope definito.
- [ ] Valutare tabella idempotency_keys per memorizzare response body e request hash.
- [ ] Aggiungere order_status_history come P1 o includerla subito se il flusso operativo lo richiede.
- [ ] Definire enum/check per status ordine.
- [ ] Aggiungere indici per user_id, created_at e status.
- [ ] Definire policy di conservazione dati personali.

### Criteri di accettazione

- [ ] Un ordine conserva nomi e prezzi anche se il catalogo cambia.
- [ ] La stessa idempotency key non produce ordini duplicati.
- [ ] Le quantità e gli importi non accettano valori negativi o null non previsti.
- [ ] La cancellazione di ingredienti di catalogo non distrugge la storia ordine.

---

## [ ] BE-006 — Seed catalogo Poke e Panino

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** M
- **Dipendenze:** BE-004
- **Obiettivo:** Popolare un catalogo iniziale ripetibile.

### Sotto-task

- [ ] Inserire le due tipologie con code poke e sandwich.
- [ ] Inserire dimensioni Poke Small/Regular/Large e Panino Normale/Maxi.
- [ ] Inserire tutte le categorie con step_number da 1 a 4.
- [ ] Inserire ingredienti elencati nel requisito, code stabili e display_order.
- [ ] Impostare prezzi base e supplementi iniziali come parametri facilmente modificabili.
- [ ] Inserire allergeni e dietary tags solo dopo validazione del business.
- [ ] Rendere lo script idempotente o prevedere reset controllato per test.

### Criteri di accettazione

- [ ] Il seed produce un catalogo completo leggibile dall’API.
- [ ] Una seconda esecuzione non crea duplicati.
- [ ] Code e relazioni sono stabili tra ambienti.
- [ ] I dati test sono chiaramente separati dai dati produzione.

---

## [ ] BE-007 — API elenco e dettaglio configuratori

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** L
- **Dipendenze:** BE-003, BE-006
- **Obiettivo:** Esporre il catalogo attivo nel formato richiesto dal frontend.

### Sotto-task

- [ ] Implementare GET /api/v1/configurators con tipologie attive e metadati.
- [ ] Implementare GET /api/v1/configurators/:code con size, categorie, ingredienti e regole.
- [ ] Filtrare is_active e rispettare display_order.
- [ ] Esporre isAvailable separatamente da isActive per opzioni temporaneamente non ordinabili.
- [ ] Restituire importi in cents e currency esplicita.
- [ ] Aggiungere ETag o Cache-Control prudente se coerente con aggiornamenti catalogo.
- [ ] Mappare code non valido/non attivo in 404.

### Criteri di accettazione

- [ ] La risposta contiene tutto il necessario per generare gli step senza hardcode.
- [ ] L’ordine di categorie e ingredienti è deterministico.
- [ ] Ingredienti non attivi non vengono esposti.
- [ ] Le query non soffrono di N+1 evidente.
- [ ] Schema e fixture di risposta sono testati.

---

## [ ] BE-008 — API creazioni del brand

- **Stato:** Da prendere in carico
- **Priorità:** P1
- **Taglia:** M
- **Dipendenze:** BE-003, BE-006
- **Obiettivo:** Esporre ricette predefinite e composizione.

### Sotto-task

- [ ] Implementare GET /api/v1/brand-recipes con filtri type, featured e limit.
- [ ] Implementare GET /api/v1/brand-recipes/:id.
- [ ] Risoluzione default size e ingredienti ordinati per categoria.
- [ ] Calcolare o ottenere il prezzo corrente con il servizio pricing, non con valore statico non verificato.
- [ ] Segnalare se la ricetta è personalizzabile.
- [ ] Escludere ricette inattive e gestire ingredienti non disponibili.

### Criteri di accettazione

- [ ] Una ricetta completa può inizializzare il configuratore frontend.
- [ ] Il prezzo esposto è coerente con il catalogo corrente.
- [ ] I filtri non espongono ricette di altre tipologie.
- [ ] Una ricetta non valida è esclusa o segnalata in modo controllato.

---

## [ ] BE-009 — Schema di validazione delle richieste

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** M
- **Dipendenze:** BE-001
- **Obiettivo:** Rifiutare input non valido prima della logica business.

### Sotto-task

- [ ] Definire schema per parametri, query e body di ogni endpoint.
- [ ] Validare UUID, code, quantità intere positive e limiti array.
- [ ] Imporre dimensione massima a selections e items ordine.
- [ ] Normalizzare stringhe cliente senza modificare dati significativi.
- [ ] Rifiutare campi prezzo/nome se non previsti.
- [ ] Produrre fieldErrors stabili per il frontend.

### Criteri di accettazione

- [ ] Input malformati restituiscono 400 o 422 coerente con convenzione scelta.
- [ ] Il controller riceve dati già validati e tipizzati.
- [ ] Payload eccessivi o duplicati non causano carico anomalo.
- [ ] Gli errori non espongono stack trace in produzione.

---

## [ ] BE-010 — Motore di validazione configurazione

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** L
- **Dipendenze:** BE-007, BE-009
- **Obiettivo:** Applicare tutte le regole correnti di catalogo a una selezione.

### Sotto-task

- [ ] Verificare tipologia e dimensione attive/disponibili.
- [ ] Caricare ingredienti selezionati in una sola query o query batch.
- [ ] Verificare appartenenza alla tipologia e categoria corretta.
- [ ] Aggregare quantità per ingrediente e rifiutare duplicati ambigui.
- [ ] Verificare min_select/max_select per categoria e selection_mode.
- [ ] Applicare ingredient_size_rules e incompatibilità.
- [ ] Restituire warning separati dagli errori bloccanti.
- [ ] Produrre un oggetto NormalizedConfiguration usato anche dal pricing.

### Criteri di accettazione

- [ ] Non è possibile selezionare un ingrediente di un altro prodotto.
- [ ] Ingredienti inattivi o non disponibili vengono rifiutati con codice specifico.
- [ ] I limiti sono applicati usando quantità normalizzate.
- [ ] La funzione è deterministica e coperta da test di tabella.
- [ ] Il risultato contiene dati sufficienti senza nuova query nel pricing.

---

## [ ] BE-011 — Servizio di calcolo prezzo

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** L
- **Dipendenze:** BE-010
- **Obiettivo:** Calcolare il totale in modo autorevole e spiegabile.

### Sotto-task

- [ ] Partire da base_price_cents della size.
- [ ] Sommarizzare price_delta_cents per ingrediente × quantità.
- [ ] Applicare price_delta_override_cents per size quando presente.
- [ ] Gestire ingredienti inclusi gratuitamente o soglie solo se richiesto, con regole esplicite.
- [ ] Restituire breakdown base, supplementi per voce, subtotal e total.
- [ ] Usare esclusivamente interi in cents.
- [ ] Versionare o rendere tracciabile la logica prezzo nel log/ordine se necessario.

### Criteri di accettazione

- [ ] Nessun calcolo usa floating point.
- [ ] La somma del breakdown coincide con il totale.
- [ ] L’ordine degli elementi nel breakdown è deterministico.
- [ ] Test di casi limite includono quantità, override e supplemento zero.
- [ ] Il servizio non accetta prezzi forniti dal client.

---

## [ ] BE-012 — Endpoint anteprima prezzo

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** M
- **Dipendenze:** BE-009, BE-011
- **Obiettivo:** Esporre validazione e pricing al configuratore.

### Sotto-task

- [ ] Implementare POST /api/v1/pricing/preview.
- [ ] Applicare rate limit specifico e body limit.
- [ ] Invocare validazione configurazione e servizio pricing.
- [ ] Restituire configurazione normalizzata, breakdown, total, currency e warnings.
- [ ] Usare 422 per configurazione semanticamente non valida secondo convenzione.
- [ ] Aggiungere log di durata senza registrare dati cliente.

### Criteri di accettazione

- [ ] Una configurazione valida restituisce sempre breakdown coerente.
- [ ] Una configurazione non valida restituisce errori azionabili dal frontend.
- [ ] L’endpoint non scrive sul database.
- [ ] Il tempo di risposta è monitorato e non usa query N+1.

---

## [ ] BE-013 — Autenticazione Supabase opzionale e contesto utente

- **Stato:** Da prendere in carico
- **Priorità:** P1
- **Taglia:** M
- **Dipendenze:** BE-002, BE-003
- **Obiettivo:** Supportare utenti autenticati senza rendere obbligatorio il login MVP.

### Sotto-task

- [ ] Creare middleware che estrae Bearer token e verifica il JWT Supabase.
- [ ] Esporre req.user con id e claim minimi.
- [ ] Distinguere middleware requiredAuth e optionalAuth.
- [ ] Non fidarsi di user_id inviato nel body.
- [ ] Gestire token scaduto, non valido e assente con codici coerenti.
- [ ] Aggiungere test con token/claim mock o ambiente Supabase test.

### Criteri di accettazione

- [ ] Un utente autenticato viene associato all’ordine tramite token verificato.
- [ ] Un guest non può impersonare un user_id.
- [ ] I claim non necessari non vengono propagati o loggati.
- [ ] Gli endpoint pubblici restano accessibili senza token.

---

## [ ] BE-014 — Creazione ordine transazionale e idempotente

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** XL
- **Dipendenze:** BE-005, BE-011, BE-013
- **Obiettivo:** Validare nuovamente, calcolare e salvare un ordine senza duplicati.

### Sotto-task

- [ ] Validare customer data e lista item con limiti server-side.
- [ ] Per ogni item, eseguire validazione configurazione e pricing sul catalogo corrente.
- [ ] Calcolare subtotal e total dell’ordine solo lato server.
- [ ] Confrontare eventuale expectedTotal client solo per rilevare variazione e restituire 409 se necessario.
- [ ] Usare idempotency key obbligatoria; confrontare request hash in caso di riuso.
- [ ] Inserire orders, order_items e snapshot ingredienti in una transazione DB/RPC.
- [ ] Salvare recipe_id come riferimento informativo quando presente.
- [ ] Restituire la stessa risposta per retry identico della medesima chiave.
- [ ] Non svuotare o modificare dati client: il backend restituisce solo esito.

### Criteri di accettazione

- [ ] Un errore a metà inserimento non lascia ordine parziale.
- [ ] Retry con stessa chiave e stesso payload restituisce lo stesso orderId.
- [ ] Stessa chiave con payload diverso restituisce conflict.
- [ ] Prezzi e nomi salvati sono snapshot dei dati correnti.
- [ ] Un ingrediente divenuto indisponibile blocca l’ordine con dettaglio item.
- [ ] Il totale ordine coincide con la somma degli item × quantità.

---

## [ ] BE-015 — Lettura ordine e token guest

- **Stato:** Da prendere in carico
- **Priorità:** P1
- **Taglia:** L
- **Dipendenze:** BE-014
- **Obiettivo:** Consentire pagina conferma senza esporre ordini altrui.

### Sotto-task

- [ ] Implementare GET /api/v1/orders/:id.
- [ ] Per utenti autenticati, verificare orders.user_id = req.user.id.
- [ ] Per guest, emettere al create un token firmato a breve/lunga durata definita e verificarlo in lettura.
- [ ] Limitare i campi restituiti e mascherare dati personali non necessari.
- [ ] Restituire item e snapshot ingredienti ordinati.
- [ ] Gestire ordine non trovato e non autorizzato senza leakage informativo.

### Criteri di accettazione

- [ ] Un utente non può leggere ordini di altri.
- [ ] Il token guest non contiene segreti e ha scadenza.
- [ ] La risposta è sufficiente per la pagina conferma.
- [ ] I tempi di risposta non dipendono in modo evidente dall’esistenza di ordini non autorizzati.

---

## [ ] BE-016 — Gestione centralizzata degli errori

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** M
- **Dipendenze:** BE-002, BE-009
- **Obiettivo:** Produrre errori coerenti e sicuri.

### Sotto-task

- [ ] Definire classi/codici per validation, not found, conflict, unavailable e internal.
- [ ] Creare middleware finale che mappa errori in status e formato standard.
- [ ] Includere requestId in ogni errore.
- [ ] Loggare stack e causa solo server-side.
- [ ] Mappare errori Supabase/Postgres noti senza esporre dettagli SQL.
- [ ] Gestire 404 route e metodo non supportato secondo convenzione.

### Criteri di accettazione

- [ ] Tutti gli endpoint usano lo stesso envelope errore.
- [ ] In produzione non compare stack trace nella risposta.
- [ ] Gli errori attesi non vengono loggati come fatal.
- [ ] Il frontend può distinguere errori di prezzo, disponibilità e validazione.

---

## [ ] BE-017 — Policy RLS e privilegi Supabase

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** L
- **Dipendenze:** BE-004, BE-005
- **Obiettivo:** Ridurre l’impatto di accessi diretti o credenziali errate.

### Sotto-task

- [ ] Abilitare RLS sulle tabelle esposte tramite API Supabase.
- [ ] Definire policy SELECT pubblica solo per catalogo attivo se si prevede accesso diretto anon; altrimenti nessuna policy anon e accesso solo Express.
- [ ] Consentire lettura ordini all’utente solo sui propri record se è previsto accesso diretto autenticato.
- [ ] Negare INSERT/UPDATE ordini dal client anon; le scritture passano dal backend/service role.
- [ ] Separare eventuali ruoli admin e non usare claim modificabili dall’utente.
- [ ] Testare policy con anon key, user token e service role.

### Criteri di accettazione

- [ ] Anon non può creare o modificare ordini direttamente.
- [ ] Un utente non può leggere righe di altri utenti.
- [ ] Il backend service role esegue le operazioni necessarie.
- [ ] Le policy sono versionate in migrazione e testate.

---

## [ ] BE-018 — Logging strutturato e metriche

- **Stato:** Da prendere in carico
- **Priorità:** P1
- **Taglia:** M
- **Dipendenze:** BE-002, BE-016
- **Obiettivo:** Rendere il servizio diagnosticabile senza esporre dati sensibili.

### Sotto-task

- [ ] Usare logger JSON con level, timestamp, requestId, route, status e duration.
- [ ] Redigere authorization, cookie, service keys, email e telefono.
- [ ] Loggare eventi business essenziali: preview invalid, order created, order conflict.
- [ ] Aggiungere metriche o log aggregabili per latency, error rate e DB errors.
- [ ] Correlare errori backend con requestId restituito al client.
- [ ] Definire retention e accesso ai log.

### Criteri di accettazione

- [ ] Nessun segreto o PII completa appare nei log di test.
- [ ] È possibile seguire una richiesta dal gateway al service tramite requestId.
- [ ] Le metriche distinguono endpoint e classe di status.
- [ ] Gli errori di database sono diagnosticabili senza mostrare SQL al client.

---

## [ ] BE-019 — Health, readiness e shutdown

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** S
- **Dipendenze:** BE-003
- **Obiettivo:** Supportare deploy e orchestrazione affidabili.

### Sotto-task

- [ ] Implementare liveness senza dipendenze lente.
- [ ] Implementare readiness che verifica configurazione e una query DB leggera.
- [ ] Non esporre versioni o segreti nei dettagli health pubblici.
- [ ] Gestire timeout della readiness.
- [ ] Integrare graceful shutdown e stop readiness durante terminazione.

### Criteri di accettazione

- [ ] Liveness resta disponibile se il DB è momentaneamente lento.
- [ ] Readiness fallisce quando il servizio non può servire richieste reali.
- [ ] Il deploy può rimuovere l’istanza dal traffico prima dello shutdown.
- [ ] Le risposte health sono rapide e stabili.

---

## [ ] BE-020 — Test unitari del dominio

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** L
- **Dipendenze:** BE-010, BE-011, BE-016
- **Obiettivo:** Coprire le regole ad alto rischio senza database reale.

### Sotto-task

- [ ] Creare fixture per Poke e Panino con categorie e prezzi.
- [ ] Testare min/max, selezione singola, ingredienti duplicati e quantità.
- [ ] Testare disponibilità, size rules e incompatibilità.
- [ ] Testare pricing base, supplementi, override e totale.
- [ ] Testare error mapping e request schema.
- [ ] Usare test parametrizzati per molte combinazioni.

### Criteri di accettazione

- [ ] La logica di dominio è testata in modo deterministico.
- [ ] Ogni codice errore business ha almeno un caso di test.
- [ ] I test non richiedono rete o Supabase.
- [ ] Regressioni su arrotondamenti sono impossibili perché si usano interi.

---

## [ ] BE-021 — Test integrazione API e database

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** XL
- **Dipendenze:** BE-014, BE-017, BE-020
- **Obiettivo:** Validare Express, migrazioni, query e transazioni insieme.

### Sotto-task

- [ ] Avviare database/Supabase test con schema migrato e seed dedicato.
- [ ] Testare GET catalogo e ricette con ordinamento e filtri.
- [ ] Testare price preview valido e casi 422.
- [ ] Testare order creation, snapshot e rollback su errore.
- [ ] Testare idempotenza stessa chiave/stesso payload e conflitto payload diverso.
- [ ] Testare auth/ownership e RLS con ruoli diversi.
- [ ] Pulire o isolare dati tra test tramite transazioni/schema dedicato.

### Criteri di accettazione

- [ ] La suite parte da ambiente pulito e ripetibile.
- [ ] Gli endpoint principali sono testati tramite HTTP, non chiamando direttamente i controller.
- [ ] L’atomicità ordine è verificata interrogando le tabelle.
- [ ] Le policy RLS falliscono correttamente per ruoli non autorizzati.

---

## [ ] BE-022 — Documentazione OpenAPI e collezione di test

- **Stato:** Da prendere in carico
- **Priorità:** P1
- **Taglia:** M
- **Dipendenze:** BE-007–BE-016
- **Obiettivo:** Rendere il contratto integrabile e verificabile.

### Sotto-task

- [ ] Descrivere endpoint, parametri, body, response e codici errore in OpenAPI.
- [ ] Aggiungere esempi per Poke, Panino e ordine.
- [ ] Documentare idempotency header e autenticazione.
- [ ] Generare o mantenere una collezione HTTP/Postman/Bruno coerente.
- [ ] Validare che gli esempi passino contro staging.
- [ ] Versionare breaking changes tramite /api/v2 o strategia dichiarata.

### Criteri di accettazione

- [ ] Il frontend può implementare senza leggere il codice backend.
- [ ] Ogni endpoint MVP ha almeno una response di successo e una di errore documentate.
- [ ] Gli esempi non contengono segreti reali.
- [ ] La documentazione viene aggiornata nella stessa PR del contratto.

---

## [ ] BE-023 — CI/CD, migrazioni e deploy

- **Stato:** Da prendere in carico
- **Priorità:** P0
- **Taglia:** L
- **Dipendenze:** BE-020, BE-021
- **Obiettivo:** Automatizzare rilascio sicuro e ripetibile.

### Sotto-task

- [ ] Pipeline con install pulita, lint, unit, integration e build.
- [ ] Eseguire scansione dipendenze e secret scanning.
- [ ] Applicare migrazioni con step controllato prima o durante deploy.
- [ ] Separare env staging/production e limitare accesso ai segreti.
- [ ] Configurare runtime Node supportato e health check.
- [ ] Definire rollback applicazione e strategia forward-only per migrazioni distruttive.
- [ ] Eseguire smoke test post-deploy su health, catalogo e preview.

### Criteri di accettazione

- [ ] Nessun deploy produzione avviene con test P0 falliti.
- [ ] Le migrazioni sono tracciate e non applicate manualmente senza audit.
- [ ] I segreti non sono presenti in repository o log CI.
- [ ] È documentata una procedura di rollback applicativo.
- [ ] Lo smoke test verifica almeno un percorso Poke e Panino.

---

## Definition of Done comune

- [ ] Endpoint e service rispettano schema, formato errori e autorizzazioni definiti.
- [ ] Migrazioni e seed sono versionati e ripetibili.
- [ ] I test unitari e di integrazione pertinenti passano in CI.
- [ ] Nessun prezzo o dato di catalogo inviato dal client viene considerato autorevole.
- [ ] Log e risposte non contengono segreti o dati personali non necessari.
- [ ] OpenAPI e `.env.example` sono aggiornati.
- [ ] Le query principali sono controllate per problemi N+1 e uso degli indici.
- [ ] Ogni modifica allo schema include una strategia di rollback o forward-fix.

## Ordine consigliato di presa in carico

1. **Fondazioni:** BE-001, BE-002, BE-003.
2. **Database e dati iniziali:** BE-004, BE-005, BE-006.
3. **Catalogo e ricette:** BE-007, BE-008.
4. **Validazione e pricing:** BE-009, BE-010, BE-011, BE-012.
5. **Autenticazione e ordini:** BE-013, BE-014, BE-015, BE-016, BE-017.
6. **Operatività e qualità:** BE-018, BE-019, BE-020, BE-021.
7. **Contratto e rilascio:** BE-022, BE-023.
