import { z } from 'zod';

export const createOrderSchema = z.object({
  // 1. Validazione del BODY della richiesta
  body: z.object({
    // Valida UUID versione 4 e pulisce gli spazi vuoti
    clienteId: z.string().uuid({ message: "L'id cliente deve essere un UUID valido" }),
    
    noteCliente: z.string().trim().max(500).optional(), // Normalizza stringhe senza alterare i dati significativi

    // Impone dimensione massima e minima all'array di items
    items: z.array(
      z.object({
        prodottoId: z.string().uuid({ message: "L'id prodotto deve essere un UUID valido" }),
        // Quantità intera positiva obbligatoria
        quantita: z.number().int().positive({ message: "La quantità deve essere un intero positivo >= 1" }),
        
        selections: z.array(z.string().trim()).max(10, { message: "Massimo 10 personalizzazioni consentite" }).optional()
      })
    ).min(1, { message: "L'ordine deve contenere almeno un articolo" })
     .max(50, { message: "Payload eccessivo: massimo 50 articoli per ordine" }) // Evita carico anomalo
  }).strict(), // 🔥 RIFIUTA campi extra come prezzo/nome se non previsti nel body!

  // 2. Validazione di eventuali QUERY (es. ?limit=10)
  query: z.object({}).strict(),

  // 3. Validazione di eventuali PARAMS (es. /orders/:id)
  params: z.object({}).strict()
});

// Questo esporta il tipo TypeScript già pronto e validato per il tuo controller!
export type CreateOrderInput = z.infer<typeof createOrderSchema>;