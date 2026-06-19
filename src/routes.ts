import { Router } from 'express';
import { recipesRoutes } from './modules/recipes/recipes.routes.js';

export const apiRouter = Router();
  
apiRouter.get('/health/live', (_request, response) => {
  response.status(200).json({
    status: 'ok'
  });
});

// Usiamo apiRouter.use per agganciare le tue ricette direttamente al prefisso principale
apiRouter.use(recipesRoutes);

if (process.env.NODE_ENV === 'test') {
  apiRouter.post('/echo', (request, response) => {
    response.status(200).json(request.body);
  });

  apiRouter.get('/internal-error', () => {
    throw new Error('Test internal failure with stack');
  });
}