import type { ErrorRequestHandler } from 'express';
import { logger } from '../config/logger.js';
import { RepositoryError } from '../db/repository-error.js';
import { AppError } from '../shared/errors/app-error.js';

interface HttpParserError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

function isHttpParserError(error: unknown): error is HttpParserError {
  return error instanceof Error;
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof RepositoryError) {
    switch (error.code) {
      case 'NOT_FOUND':
        return new AppError('NOT_FOUND', 404, 'Risorsa non trovata.');
      case 'CONFLICT':
        return new AppError(
          'CONFLICT',
          409,
          'Conflitto con i dati esistenti.'
        );
      case 'VALIDATION_ERROR':
        return new AppError('VALIDATION_ERROR', 422, 'Dati non validi.');
      case 'DATABASE_UNAVAILABLE':
        return new AppError(
          'DATABASE_UNAVAILABLE',
          503,
          'Database non disponibile.'
        );
      case 'DATABASE_ERROR':
        return new AppError(
          'DATABASE_ERROR',
          503,
          'Database non disponibile o schema non allineato.'
        );
    }
  }

  if (isHttpParserError(error)) {
    if (error.type === 'entity.too.large' || error.status === 413) {
      return new AppError(
        'PAYLOAD_TOO_LARGE',
        413,
        'Il payload della richiesta e troppo grande.'
      );
    }

    if (error.type === 'entity.parse.failed' || error.status === 400) {
      return new AppError(
        'BAD_REQUEST',
        400,
        'JSON della richiesta non valido.'
      );
    }

    if (error.message === 'Origin not allowed') {
      return new AppError(
        'CORS_ORIGIN_FORBIDDEN',
        403,
        'Origin non consentita.'
      );
    }
  }

  return new AppError(
    'INTERNAL_SERVER_ERROR',
    500,
    'Errore interno del server.'
  );
}

export const errorMiddleware: ErrorRequestHandler = (
  error,
  request,
  response,
  next
) => {
  void next;
  const appError = toAppError(error);

  if (appError.statusCode >= 500) {
    logger.error(
      { err: error, requestId: request.requestId },
      appError.message
    );
  }

  response.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      requestId: request.requestId
    }
  });
};
