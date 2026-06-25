import { Router } from 'express';
import { createOrder } from './orders.controller.js';
import { createOrderSchema } from './orders.schema.js';
import { AppError } from '../../shared/errors/app-error.js';

const router = Router();

// Middleware al volo per validare lo schema Zod del body
const validateBody = (schema: typeof createOrderSchema) => (req: any, res: any, next: any) => {
  const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!result.success) {
    return next(new AppError('BAD_REQUEST', 400, 'I dati inviati non sono validi.'));
  }
  next();
};

router.post('/', validateBody(createOrderSchema), (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return next(new AppError('BAD_REQUEST', 400, "L'header 'Idempotency-Key' è obbligatorio."));
  }

  createOrder(req, res, next).catch(next);
});

export const ordersRouter = router;