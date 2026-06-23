import { Request, Response } from 'express';
import { validateConfiguration } from '../configurations/configurations.service.js';
import { calculatePokePrice } from './pricing.service.js';

export async function getPricePreview(req: Request, res: Response) {
  // Avviamo il timer ad alta precisione per tracciare la durata
  const startTime = process.hrtime();

  try {
    const { recipeId, selections } = req.body;

    if (!recipeId || !Array.isArray(selections)) {
      return res.status(400).json({
        status: 'error',
        message: 'Payload non valido. recipeId e selections sono obbligatori.'
      });
    }

    // 1. Invochiamo la validazione della configurazione di business (Task BE-010)
    let validationResult;
    try {
      validationResult = await validateConfiguration(recipeId, selections);
    } catch (validationError: any) {
      // Come da criteri di accettazione: usiamo 422 per configurazione semanticamente non valida
      return res.status(422).json({
        status: 'invalid_configuration',
        message: validationError.message || 'La configurazione della Poke non è valida.'
      });
    }

    // 2. Invochiamo il servizio di pricing (Task BE-011) - Ottimizzato in O(1) con Map, no query N+1
    const priceBreakdown = await calculatePokePrice(recipeId, selections);

    // Calcolo della durata della richiesta
    const diff = process.hrtime(startTime);
    const durationInMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);
    console.log(`[PERFORMANCE LOG] - POST /pricing/preview elaborato in ${durationInMs}ms`);

    // 3. Risposta di successo conforme alle specifiche
    return res.status(200).json({
      status: 'success',
      pricing: {
        basePriceCents: priceBreakdown.basePriceCents,
        items: priceBreakdown.items,
        subtotalCents: priceBreakdown.subtotalCents,
        totalCents: priceBreakdown.totalCents,
        currency: 'EUR' // Stringa esplicita richiesta dalle specifiche
      },
      warnings: validationResult.warnings,
      data: validationResult.normalizedConfig
    });

  } catch (error: any) {
    const diff = process.hrtime(startTime);
    const durationInMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);
    console.error(`[ERROR LOG] - Fallimento preview in ${durationInMs}ms:`, error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Errore interno durante il calcolo dell\'anteprima.'
    });
  }
}