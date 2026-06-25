import cors, { type CorsOptions } from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { lifecycle } from './config/lifecycle.js'; // ✨ BE-019: Importiamo lo stato del ciclo di vita
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
      customProps: (request) => ({
        requestId: request.requestId
      }),
      customSuccessObject: (request: any, response) => ({
        route: request.route?.path || request.originalUrl || request.url,
        status: response.statusCode
      }),
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

  // 🟢 BE-019: Liveness Probe - Isolata da dipendenze lente o DB
  app.get('/health/live', (_request, response) => {
    response.status(200).json({
      status: 'ok'
    });
  });

  // 🟢 BE-019: Readiness Probe - Controlla la salute del DB e lo Shutdown imminente
  app.get('/health/ready', async (_request, response) => {
    // 🛡️ CRITERIO SODDISFATTO: Se l'istanza è in fase di spegnimento, fallisce subito la readiness (503)
    // in modo che il Load Balancer la tolga dal traffico prima che il server muoia fisicamente.
    if (lifecycle.isShuttingDown) {
      return response.status(503).json({
        status: 'terminating'
      });
    }

    // Gestione del timeout a 3 secondi sulla query leggera del database
    const isReady = await withTimeout(
      (signal) => checkSupabaseConnection(signal),
      3_000
    ).catch(() => false);

    // 🛡️ CRITERIO SODDISFATTO: Nessun segreto o versione di codice esposta nell'health check pubblico
    response.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'unavailable'
    });
  });

  app.use(env.API_PREFIX, apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
