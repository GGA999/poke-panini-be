import { Router, Request, Response, json } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { validateRequest } from './middleware/validation.middleware.js';
import { validateConfiguration } from './modules/configurations/configurations.service.js';
import configurationRoutes from './modules/configurations/configurations.routes.js';
import { getPricePreview } from './modules/pricing/pricing.controller.js';

export const recipesRoutes = Router();
export const apiRouter = Router();

// --- Configurazione Rate Limit Specifico (BE-012) ---
const pricingPreviewLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // Limite di 60 richieste per IP al minuto
  standardHeaders: true, // Ritorna le info di rate limit negli header `RateLimit-*`
  legacyHeaders: false, // Disabilita i vecchi header `X-RateLimit-*`
  message: {
    status: 'error',
    message: 'Troppe richieste di anteprima prezzo. Riprova tra un minuto.'
  }
});

// --- Limite specifico sul Body (BE-012) ---
// Blocca richieste con payload superiori a 10KB (le combinazioni reali pesano meno di 1KB)
const strictBodyLimit = json({ limit: '10kb' });

// --- Rotte di Health ---
apiRouter.get('/health/live', (_request, response) => {
  response.status(200).json({
    status: 'ok'
  });
});

apiRouter.use(recipesRoutes);
apiRouter.use('/configurations', configurationRoutes);

// --- Rotta Dedicata Anteprima Prezzo con Protezioni (BE-012) ---
apiRouter.post(
  '/pricing/preview', 
  pricingPreviewLimiter, 
  strictBodyLimit, 
  getPricePreview
);

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

// --- Vecchia Rotta di Validazione di Backup ---
apiRouter.post('/configurations/validate', async (req: Request, res: Response) => {
  try {
    const { recipeId, selections } = req.body;
    const result = await validateConfiguration(recipeId, selections);

    return res.status(200).json({
      status: 'success',
      message: 'Configurazione valida',
      warnings: result.warnings,
      data: result.normalizedConfig
    });
  } catch (error: any) {
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Errore durante la validazione'
    });
  }
});