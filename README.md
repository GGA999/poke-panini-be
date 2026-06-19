# Backend

Backend Express TypeScript per API server-side.

## Comandi

- `npm run dev`: avvia il server in sviluppo.
- `npm run build`: compila in `dist/`.
- `npm run test`: esegue i test.
- `npm run lint`: controlla il codice.
- `npm run check`: esegue typecheck, lint, test e build.

## Ambiente

Copiare `.env.example` in `.env` e valorizzare `SUPABASE_URL` e `SUPABASE_SECRET_KEY`.
Il server termina all'avvio se la configurazione ambiente non e valida.
