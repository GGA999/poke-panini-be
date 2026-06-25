import type { ErrorRequestHandler } from 'express';
import { logger } from '../../config/logger.js';
import { AppError } from './app-error.js';

interface HttpParserError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

function isHttpParserError(error: unknown): error is HttpParserError {
  return error instanceof Error;
}

// Duck-typing per intercettare gli errori custom in modo sicuro
function isAppError(error: any): boolean {
  return error && typeof error === 'object' && ('statusCode' in error || 'status' in error);
}

function toAppError(error: unknown): any {
  if (isAppError(error)) {
    const err = error as any;
    return {
      statusCode: err.statusCode || err.status || 500,
      code: err.code || err.errorCode || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Si è verificato un errore sul server.'
    };
  }

  if (isHttpParserError(error)) {
    if (error.type === 'entity.too.large' || error.status === 413) {
      return new AppError('PAYLOAD_TOO_LARGE', 413, 'Il payload della richiesta è troppo grande.');
    }

    if (error.type === 'entity.parse.failed' || error.status === 400) {
      return new AppError('BAD_REQUEST', 400, 'JSON della richiesta non valido.');
    }

    if (error.message === 'Origin not allowed') {
      return new AppError('CORS_ORIGIN_FORBIDDEN', 403, 'Origin non consentita.');
    }
  }

  return new AppError('INTERNAL_SERVER_ERROR', 500, 'Si è verificato un errore interno sul server.');
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
    logger.error({ err: error, requestId: request.requestId }, appError.message);
  } else {
    logger.warn({ err: error, requestId: request.requestId }, appError.message);
  }

  // Risposta standard piatta: niente nodi "error" e niente "details" che fanno crashare il parser
  return response.status(appError.statusCode).json({
    status: 'error',
    errorCode: appError.code || 'INTERNAL_SERVER_ERROR',
    message: appError.message,
    requestId: request.requestId
  });
};