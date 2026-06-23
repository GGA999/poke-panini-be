# Documentazione Rotte API - Poke & Panini BE

Questo file contiene l'elenco ufficiale, le specifiche e gli esempi di utilizzo delle rotte esposte dal backend. Viene aggiornato costantemente con l'avanzamento dei task di sviluppo.

## Informazioni Generali
* Prefisso Base: /api/v1
* Formato Dati: application/json

---

## Elenco delle Rotte

| Modulo | Metodo | Endpoint | Descrizione | Stato |
| :--- | :--- | :--- | :--- | :--- |
| Utility | GET | /health/live | Verifica lo stato di salute dell'applicazione | Attivo |
| Utility | POST | /echo | Endpoint di test per la validazione strutturale dei payload | Attivo |
| Configurations | POST | /configurations/validate | Valida la composizione della poke, i limiti di categoria e calcola il prezzo | Attivo |

---

## Dettaglio Endpoint

### 1. Utility

#### GET /health/live
Verifica che il server sia acceso e raggiungibile.

* Response (200 OK):
```json
{
  "status": "ok"
}

POST /echo
Ritorna esattamente il body inviato se rispetta la validazione dello schema Zod.

Headers: Content-Type: application/json

Response (200 OK): Ritorna lo stesso oggetto inviato nel body.

2. Configurations (Configurazioni Poke)
POST /configurations/validate
Prende in carico la composizione della Poke scelta dall'utente sul frontend, verifica la validità degli ingredienti su Supabase in batch, controlla che vengano rispettati i limiti di min_select e max_select impostati per ogni categoria e calcola il prezzo autorevole in centesimi (senza floating point).

Headers: Content-Type: application/json

Request Body:

{
  "recipeId": "string (UUID)",
  "selections": [
    {
      "ingredientId": "string (UUID)",
      "categoriaId": "string (UUID)",
      "quantita": "number (int >= 1)"
    }
  ]
}

Response Successo (200 OK):
Restituisce il successo dell'operazione, eventuali warning non bloccanti, il breakdown finanziario calcolato al centesimo e l'oggetto normalizzato.

{
  "status": "success",
  "message": "Configurazione valida e prezzo calcolato",
  "warnings": [],
  "pricing": {
    "basePriceCents": 750,
    "items": [
      {
        "name": "Salmone",
        "type": "ingredient",
        "unitPriceCents": 150,
        "quantita": 1,
        "totalPriceCents": 150
      }
    ],
    "subtotalCents": 900,
    "totalCents": 900
  },
  "data": {
    "recipeId": "c8a41162-8cfb-4a57-bc47-1f481c96a324",
    "ingredients": [
      {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "code": "SALM-01",
        "name": "Salmone",
        "categoriaId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "quantita": 1
      }
    ],
    "summary": {
      "totalIngredients": 1,
      "categoriesInvolved": 1
    }
  }
}

Response Errore Bloccante (400 Bad Request):
Restituisce il motivo specifico del fallimento della validazione di business (es. limiti violati, ingredienti non attivi o non trovati nel catalogo).

{
  "status": "error",
  "message": "Uno o più ingredienti selezionati non sono stati trovati nel catalogo."
}

#### POST `/pricing/preview`
Endpoint dedicato al configuratore frontend per ottenere un'anteprima in tempo reale del prezzo e la validazione della Poke. Non scrive sul database, ha un rate-limit dedicato e un body limit di 10KB.

* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "recipeId": "string (UUID)",
  "selections": [
    {
      "ingredientId": "string (UUID)",
      "categoriaId": "string (UUID)",
      "quantita": "number (int >= 1)"
    }
  ]
}
Response Successo (200 OK):

{
  "status": "success",
  "pricing": {
    "basePriceCents": 750,
    "items": [
      {
        "name": "Salmone",
        "type": "ingredient",
        "unitPriceCents": 150,
        "quantita": 1,
        "totalPriceCents": 150
      }
    ],
    "subtotalCents": 900,
    "totalCents": 900,
    "currency": "EUR"
  },
  "warnings": [],
  "data": {
    "recipeId": "c8a41162-8cfb-4a57-bc47-1f481c96a324",
    "ingredients": [ ... ]
  }
}

Response Errore Configurazione Non Valida (422 Unprocessable Entity):

{
  "status": "invalid_configuration",
  "message": "Uno o più ingredienti selezionati non sono stati trovati nel catalogo."
}

