import type { RequestHandler } from 'express';
import { z } from 'zod';
import { logger } from '../../config/logger.js';
import { validateConfiguration } from '../configurations/configurations.service.js';
import { calculatePokePrice } from './pricing.service.js';

const previewBodySchema = z.object({
  recipeId: z.string().uuid(),
  selections: z.array(
    z.object({
      ingredientId: z.string().uuid(),
      categoriaId: z.string().uuid(),
      quantita: z.number().int().positive()
    })
  )
});

export const getPricePreview: RequestHandler = async (request, response) => {
  const startTime = process.hrtime();

  try {
    const parsedBody = previewBodySchema.safeParse(request.body as unknown);

    if (!parsedBody.success) {
      response.status(400).json({
        status: 'error',
        message: 'Payload non valido. recipeId e selections sono obbligatori.'
      });
      return;
    }

    const { recipeId, selections } = parsedBody.data;
    let validationResult: Awaited<ReturnType<typeof validateConfiguration>>;

    try {
      validationResult = await validateConfiguration(recipeId, selections);
    } catch (validationError) {
      response.status(422).json({
        status: 'invalid_configuration',
        message:
          validationError instanceof Error
            ? validationError.message
            : 'La configurazione della Poke non è valida.'
      });
      return;
    }

    const priceBreakdown = await calculatePokePrice(recipeId, selections);

    const diff = process.hrtime(startTime);
    const durationInMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);
    logger.info(
      { durationInMs, requestId: request.requestId },
      'POST /pricing/preview elaborato'
    );

    response.status(200).json({
      status: 'success',
      pricing: {
        basePriceCents: priceBreakdown.basePriceCents,
        items: priceBreakdown.items,
        subtotalCents: priceBreakdown.subtotalCents,
        totalCents: priceBreakdown.totalCents,
        currency: 'EUR'
      },
      warnings: validationResult.warnings,
      data: validationResult.normalizedConfig
    });
  } catch (error) {
    const diff = process.hrtime(startTime);
    const durationInMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);
    logger.error(
      { err: error, durationInMs, requestId: request.requestId },
      'Fallimento preview prezzo'
    );

    response.status(500).json({
      status: 'error',
      message: "Errore interno durante il calcolo dell'anteprima."
    });
  }
};
