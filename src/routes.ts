import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateRequest } from './middleware/validation.middleware.js';
import { validateConfiguration } from './modules/configurations/configurations.service.js';
import configurationRoutes from './modules/configurations/configurations.routes.js';
import { calculatePokePrice } from './modules/pricing/pricing.service.js';


export const recipesRoutes = Router();
export const apiRouter = Router();

// --- Rotte di Health ---
apiRouter.get('/health/live', (_request, response) => {
  response.status(200).json({
    status: 'ok'
  });
});

apiRouter.use(recipesRoutes);
apiRouter.use('/configurations', configurationRoutes);

// --- Validazione e Rotta Echo ---
const echoValidationSchema = z.object({
  body: z.object({
    id: z.string().uuid({ message: "L'id deve essere un UUID valido" }),
    code: z.string().trim().min(1, { message: "Il code non può essere vuoto" }),
    quantita: z.number().int().positive({ message: "La quantità deve essere un intero positivo >= 1" }),
    selections: z.array(z.string().trim()).max(10, { message: "Massimo 10 opzioni consentite" }).optional()
  }).strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict()
});

apiRouter.post('/echo', validateRequest(echoValidationSchema), (request, response) => {
  response.status(200).json(request.body);
});

// --- Rotta Forzata Validazione Configurazione Poke e Calcolo Prezzo ---
apiRouter.post('/configurations/validate', async (req: Request, res: Response) => {
  try {
    const { recipeId, selections } = req.body;

    // 1. Validazione di business (Task BE-010)
    const result = await validateConfiguration(recipeId, selections);

    // 2. Calcolo del prezzo autorevole in centesimi (Task BE-011)
    const priceBreakdown = await calculatePokePrice(recipeId, selections);

    // 3. Risposta combinata con breakdown completo
    return res.status(200).json({
      status: 'success',
      message: 'Configurazione valida e prezzo calcolato',
      warnings: result.warnings,
      pricing: {
        basePriceCents: priceBreakdown.basePriceCents,
        items: priceBreakdown.items,
        subtotalCents: priceBreakdown.subtotalCents,
        totalCents: priceBreakdown.totalCents
      },
      data: result.normalizedConfig
    });
  } catch (error: any) {
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Errore durante l\'elaborazione'
    });
  }
});