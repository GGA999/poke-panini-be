import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateRequest } from './middleware/validation.middleware.js';
import { validateConfiguration } from './modules/configurations/configurations.service.js';
import configurationRoutes from './modules/configurations/configurations.routes.js';
import { optionalAuth, requiredAuth } from './middleware/auth.middleware.js';


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

// --- Rotta Forzata Validazione Configurazione Poke ---
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

// 1. Endpoint Pubblico / Guest-Friendly (Usa optionalAuth)
apiRouter.get('/auth/session-preview', optionalAuth, (req: Request, res: Response) => {
  if (req.user) {
    return res.status(200).json({
      status: 'success',
      authenticated: true,
      userId: req.user.id,
      email: req.user.email,
      message: 'Navigazione come utente registrato autenticato.'
    });
  }

  return res.status(200).json({
    status: 'success',
    authenticated: false,
    userId: null,
    message: 'Navigazione come utente ospite (Guest). Endpoint accessibile.'
  });
});

// 2. Endpoint Privato / Protetto (Usa requiredAuth)
apiRouter.get('/auth/secure-profile', requiredAuth, (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'success',
    userId: req.user!.id,
    email: req.user!.email,
    role: req.user!.role
  });
});