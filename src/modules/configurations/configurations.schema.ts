import { z } from 'zod';

export const validateConfigurationSchema = z.object({
  body: z.object({
    // ID della ricetta base o tipologia di menu (es. "Poke Grande")
    recipeId: z.string().uuid({ message: "L'id della ricetta base deve essere un UUID valido" }),
    
    // Array delle selezioni fatte dall'utente
    selections: z.array(
      z.object({
        ingredientId: z.string().uuid({ message: "L'id dell'ingrediente deve essere un UUID valido" }),
        categoriaId: z.string().uuid({ message: "L'id della categoria deve essere un UUID valido" }),
        quantita: z.number().int().positive({ message: "La quantità deve essere un intero positivo >= 1" })
      })
    ).min(1, { message: "Devi selezionare almeno un ingrediente" })
  }).strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict()
});