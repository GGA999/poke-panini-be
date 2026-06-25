import { createApp } from './app.js';
import { setupGracefulShutdown } from './config/lifecycle.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const app = createApp();

// Avviamo il server HTTP salvando l'istanza nella costante 'server'
const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(`[SERVER] Applicazione attiva con successo su http://${env.HOST}:${env.PORT}`);
});

// 🔥 BE-019: Integriamo il Graceful Shutdown e la gestione dei segnali SIGTERM/SIGINT
setupGracefulShutdown(server);