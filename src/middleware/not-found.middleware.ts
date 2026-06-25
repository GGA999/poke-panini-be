import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '@/middleware/errors/error-classes.js';

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction) {
  console.log("💥 BINGO! SONO NEL NOT FOUND!"); // <-- Aggiungi questo!
  const error = new NotFoundError(`Risorsa non trovata: ${req.method} ${req.originalUrl}`);
  next(error);
}