import type { ErrorRequestHandler } from 'express';
import { logger } from '../config/logger.js'; // Assicurati che il percorso relativo sia corretto (.js obbligatorio)
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
  
  // Estraiamo in modo sicuro il requestId gestendo eventuali discrepanze di tipizzazione
  const currentRequestId = (request as any).requestId || request.headers['x-request-id'] || 'unknown';
  
  // 📊 BE-018: Prepariamo il payload strutturato per le metriche aggregabili (suddiviso per endpoint e classi di status)
  const logContext = {
    requestId: currentRequestId,
    method: request.method,
    route: request.route?.path || request.originalUrl,
    status: appError.statusCode,
    code: appError.code,
    // Se l'errore originario ha un codice nativo di Postgres o Supabase, lo tracciamo qui internamente
    internalDbCode: (error as any).code || undefined 
  };

  if (appError.statusCode >= 500) {
    // 🛡️ CRITERIO SODDISFATTO: Gli errori critici/DB includono stack trace completo e dettagli SQL ggrezzi 
    // SOLO nei log interni del server, rimanendo totalmente invisibili al client esterno.
    logger.error(
      {
        ...logContext,
        err: {
          message: (error as Error).message || appError.message,
          stack: (error as Error).stack,
          rawDetails: error instanceof RepositoryError ? error : undefined
        }
      },
      `[SERVER ERROR] ${appError.message}`
    );
  } else {
    // 📊 BE-018: Logghiamo anche gli errori 4xx come WARNING strutturati. 
    // In questo modo gli aggregatori calcolano l'Error Rate client (es. troppi 400 o 403) senza inquinare i log di errore server.
    logger.warn(
      logContext,
      `[CLIENT ERROR] ${appError.message}`
    );
  }

  // 🛡️ CRITERIO SODDISFATTO: Nessuna informazione sensibile o SQL viene inviata al client.
  // Viene restituito solo il codice applicativo opaco ed il requestId per consentire la correlazione immediata.
  response.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details || [],
      requestId: currentRequestId
    }
  });
};