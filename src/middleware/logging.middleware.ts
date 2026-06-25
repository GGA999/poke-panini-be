import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger.js';

export const loggingMiddleware = (request: Request, response: Response, next: NextFunction) => {
  const startTime = process.hrtime();

  // Al termine della risposta HTTP (quando Express ha finito di inviare i dati)
  response.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2); // Calcolo preciso in millisecondi

    const currentRequestId = (request as any).requestId || request.headers['x-request-id'] || 'unknown';

    // Logghiamo le richieste di successo (i 4xx e 5xx sono già gestiti egregiamente dall'errorMiddleware)
    if (response.statusCode < 400) {
      logger.info({
        requestId: currentRequestId,
        method: request.method,
        route: request.route?.path || request.originalUrl,
        status: response.statusCode,
        duration: parseFloat(durationMs),
        event: 'http_request_success'
      }, `GET/POST ${request.originalUrl} completata in ${durationMs}ms`);
    }
  });

  next();
};