import { Server } from 'http';
import { logger } from './logger.js';

export const lifecycle = {
  isShuttingDown: false,
};

export function setupGracefulShutdown(server: Server) {
  const handleShutdown = async (signal: string) => {
    if (lifecycle.isShuttingDown) return;
    
    lifecycle.isShuttingDown = true;
    logger.warn({ signal, event: 'shutdown_initiated' }, `Ricevuto segnale di stop (${signal}). Avvio del Graceful Shutdown...`);

    // 🕒 5 secondi di Grace Period per permettere al Load Balancer di accorgersi del 503 della readiness
    const GRACE_PERIOD_MS = 5000;
    logger.info({ event: 'shutdown_grace_period' }, `Attesa di ${GRACE_PERIOD_MS / 1000}s per svuotamento traffico dei client...`);
    
    await new Promise((resolve) => setTimeout(resolve, GRACE_PERIOD_MS));

    // Chiudiamo il server HTTP in modo da non accettare nuove connessioni
    server.close((err) => {
      if (err) {
        logger.error({ err, event: 'shutdown_server_error' }, 'Errore durante la chiusura del server HTTP');
        process.exit(1);
      }
      
      logger.info({ event: 'shutdown_server_clean' }, 'Server HTTP chiuso correttamente. Nessuna richiesta pendente.');
      process.exit(0);
    });

    // Timeout di sicurezza stringente (15s) per evitare processi appesi nel cloud
    setTimeout(() => {
      logger.fatal({ event: 'shutdown_timeout_forced' }, 'Forzato shutdown brusco: superato il limite massimo di attesa.');
      process.exit(1);
    }, 15000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}