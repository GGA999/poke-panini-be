import { Router } from 'express';
export const recipesRoutes = Router();
import { validateRequest } from './middleware/validation.middleware.js';
import { z } from 'zod';

export const apiRouter = Router();
  
apiRouter.get('/health/live', (_request, response) => {
  response.status(200).json({
    status: 'ok'
  });
});

apiRouter.use(recipesRoutes);

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

// Cambiamo la stringa in '/echo' così si aggancia al prefisso /api/v1/echo dell'app
apiRouter.post('/echo', validateRequest(echoValidationSchema), (request, response) => {
  response.status(200).json(request.body);
});