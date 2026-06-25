import type { RequestHandler } from 'express';
import { ZodError } from 'zod';

export const validateRequest = (schema: any): RequestHandler => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // 🔥 TRUCCO AZIENDALE: Svuotiamo e ripopoliamo i vecchi oggetti senza cambiare il riferimento di Express
      if (parsed.body) {
        Object.keys(req.body).forEach(key => delete req.body[key]);
        Object.assign(req.body, parsed.body);
      }
      if (parsed.query) {
        Object.keys(req.query).forEach(key => delete req.query[key]);
        Object.assign(req.query, parsed.query);
      }
      if (parsed.params) {
        Object.keys(req.params).forEach(key => delete req.params[key]);
        Object.assign(req.params, parsed.params);
      }

      next();
    } catch (error) {
      console.error("🔴 ERRORE NEL MIDDLEWARE DI VALIDAZIONE:", error);

      if (error instanceof ZodError) {
        const fieldErrors = error.flatten().fieldErrors;
        
        res.status(400).json({
          status: 'fail',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'I dati inseriti non sono validi.',
            details: fieldErrors
          }
        });
        return; 
      }

      next(error);
    }
  };
};