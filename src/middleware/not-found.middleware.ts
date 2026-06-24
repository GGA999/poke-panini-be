import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../shared/errors/app-error.js';

export function notFoundMiddleware(
  _request: Request,
  _response: Response,
  next: NextFunction
): void {
  next(
    new AppError('RESOURCE_NOT_FOUND', 404, 'La risorsa richiesta non esiste.')
  );
}
