import cors, { type CorsOptions } from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import checkSupabaseConnection from './config/supabase.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { publicRateLimiter } from './middleware/rate-limit.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { requireJsonMiddleware } from './middleware/require-json.middleware.js';
import { apiRouter } from './routes.js';
import { withTimeout } from './shared/utils/with-timeout.js';

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (env.corsAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'Idempotency-Key'
  ],
  exposedHeaders: ['X-Request-ID'],
  credentials: true,
  maxAge: 600
};

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // 1. Il Request ID deve sempre essere il primo in assoluto
  app.use(requestIdMiddleware);
  
  // 📊 BE-018: Ottimizzazione Pino-HTTP per metriche e log strutturati completi
  app.use(
    pinoHttp<Request, Response>({
      logger,
      // Collega il requestId generato precedentemente a ogni singolo log HTTP
      customProps: (request) => ({
        requestId: request.requestId
      }),
      // ✨ SOTTO-TASK: Appiattiamo i campi chiave alla fine delle richieste andate a buon fine (2xx, 3xx)
      customSuccessObject: (request: any, response) => ({
        route: request.route?.path || request.originalUrl || request.url,
        status: response.statusCode
        // Nota: la duration viene inserita automaticamente da pino-http come "responseTime" alla radice del JSON!
      }),
      // ✨ SOTTO-TASK: Facciamo lo stesso per le richieste che si piantano (4xx, 5xx)
      customErrorObject: (request: any, response) => ({
        route: request.route?.path || request.originalUrl || request.url,
        status: response.statusCode
      }),
      customSuccessMessage: (request, response) =>
        `${request.method} ${request.url} ${response.statusCode}`
    })
  );
  
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(requireJsonMiddleware);
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT, strict: true }));
  app.use(publicRateLimiter);

  app.get('/health/live', (_request, response) => {
    response.status(200).json({
      status: 'ok'
    });
  });

  app.get('/health/ready', async (_request, response) => {
    const isReady = await withTimeout(
      (signal) => checkSupabaseConnection(signal),
      3_000
    ).catch(() => false);

    response.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'unavailable'
    });
  });

  app.use(env.API_PREFIX, apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}