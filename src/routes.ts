import { Router } from 'express';
import { z } from 'zod';
import { env } from './config/env.js';
import { validateRequest } from './middleware/validation.middleware.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import configurationRoutes from './modules/configurations/configurations.routes.js';
import { optionalAuth, requiredAuth } from './middleware/auth.middleware.js';
import { getPricePreview } from './modules/pricing/pricing.controller.js';
import { pricingRateLimiter } from './middleware/rate-limit.middleware.js';
import { recipesRouter } from './modules/recipes/recipes.routes.js';
import { ordersRouter } from './modules/orders/orders.router.js';

export const apiRouter = Router();

apiRouter.get('/health/live', (_request, response) => {
  response.status(200).json({
    status: 'ok'
  });
});

apiRouter.use('/configurators', catalogRouter);
apiRouter.use('/brand-recipes', recipesRouter);
apiRouter.use('/configurations', configurationRoutes);
apiRouter.use('/orders', ordersRouter);
apiRouter.post('/pricing/preview', pricingRateLimiter, getPricePreview);

const echoValidationSchema = z.object({
  body: z
    .object({
      id: z.string().uuid({ message: "L'id deve essere un UUID valido" }),
      code: z
        .string()
        .trim()
        .min(1, { message: 'Il code non può essere vuoto' }),
      quantita: z.number().int().positive({
        message: 'La quantità deve essere un intero positivo >= 1'
      }),
      selections: z
        .array(z.string().trim())
        .max(10, { message: 'Massimo 10 opzioni consentite' })
        .optional()
    })
    .strict(),
  query: z.object({}).strict(),
  params: z.object({}).strict()
});

apiRouter.post(
  '/echo',
  validateRequest(echoValidationSchema),
  (request, response) => {
    response.status(200).json(request.body);
  }
);

apiRouter.get('/auth/session-preview', optionalAuth, (request, response) => {
  if (request.user) {
    response.status(200).json({
      status: 'success',
      authenticated: true,
      userId: request.user.id,
      email: request.user.email,
      message: 'Navigazione come utente registrato autenticato.'
    });
    return;
  }

  response.status(200).json({
    status: 'success',
    authenticated: false,
    userId: null,
    message: 'Navigazione come utente ospite (Guest). Endpoint accessibile.'
  });
});

apiRouter.get('/auth/secure-profile', requiredAuth, (request, response) => {
  response.status(200).json({
    status: 'success',
    userId: request.user?.id,
    email: request.user?.email,
    role: request.user?.role
  });
});

if (env.NODE_ENV !== 'production') {
  apiRouter.get('/internal-error', () => {
    throw new Error('Test internal failure');
  });
}
