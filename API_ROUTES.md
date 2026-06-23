# Documentazione Rotte API - Modulo Ordini & Autenticazione

Questo file tiene traccia degli endpoint esposti a partire dal Blocco Ordini (Task BE-013+).

## Informazioni Generali
* Prefisso Base: `/api/v1`
* Formato Dati: `application/json`

---

## 🔐 Modulo Autenticazione & Contesto Utente (BE-013)
Gestione dell'autenticazione delegata a Supabase tramite JWT Bearer Token. Permette di identificare se un utente sta ordinando come Guest o come utente registrato.

#### 🔵 GET `/auth/session-preview`
Endpoint pubblico che sfrutta il middleware `optionalAuth`. Identifica il contesto dell'utente senza bloccare la richiesta se il token è assente.

* **Headers:** `Authorization: Bearer <JWT_TOKEN>` (Opzionale)
* **Response Guest (200 OK):**
```json
{
  "status": "success",
  "authenticated": false,
  "userId": null,
  "message": "Navigazione come utente ospite (Guest). Endpoint accessibile."
}

GET /auth/secure-profile
Endpoint protetto tramite il middleware requiredAuth. Richiede obbligatoriamente un token valido, integro e non scaduto.

Headers: Authorization: Bearer <JWT_TOKEN> (Obbligatorio)

Response Errore Anonimo / Token Scaduto (401 Unauthorized):

JSON
{
  "status": "error",
  "message": "Accesso negato. Autenticazione tramite Bearer token valida richiesta."
}