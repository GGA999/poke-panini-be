import type { RequestHandler } from 'express';
import { z } from 'zod';
import { validateConfiguration } from './configurations.service.js';

const selectionSchema = z.object({
  ingredientId: z.string().uuid(),
  categoriaId: z.string().uuid(),
  quantita: z.number().int().positive()
});

const bodySchema = z.object({
  recipeId: z.string().uuid(),
  selections: z.array(selectionSchema).min(1)
});

export const handleValidateConfiguration: RequestHandler = async (
  request,
  response
) => {
  try {
    const parsedBody = bodySchema.safeParse(request.body as unknown);

    if (!parsedBody.success) {
      response.status(400).json({
        status: 'error',
        message: 'Payload configurazione non valido.'
      });
      return;
    }

    const { recipeId, selections } = parsedBody.data;
    const result = await validateConfiguration(recipeId, selections);

    response.status(200).json({
      status: 'success',
      message: 'Configurazione valida',
      warnings: result.warnings,
      data: result.normalizedConfig
    });
  } catch (error) {
    response.status(400).json({
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Errore durante la validazione della configurazione'
    });
  }
};
