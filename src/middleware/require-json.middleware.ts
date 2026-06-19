import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../shared/errors/app-error.js';

const methodsWithBody = new Set(['POST', 'PUT', 'PATCH']);

export function requireJsonMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction
): void {
  if (!methodsWithBody.has(request.method)) {
    next();
    return;
  }

  if (request.is('application/json')) {
    next();
    return;
  }

  next(
    new AppError(
      'UNSUPPORTED_MEDIA_TYPE',
      415,
      'Il content type deve essere application/json.'
    )
  );
}
