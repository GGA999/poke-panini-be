import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
const app = createApp();
const server = http.createServer(app);
let isShuttingDown = false;
function shutdown(signal) {
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;
    logger.info({ signal }, 'Shutdown avviato');
    const forceExitTimeout = setTimeout(() => {
        logger.error('Shutdown forzato');
        process.exit(1);
    }, 10_000);
    forceExitTimeout.unref();
    server.close((error) => {
        clearTimeout(forceExitTimeout);
        if (error) {
            logger.error(error);
            process.exit(1);
        }
        process.exit(0);
    });
}
server.listen(env.PORT, env.HOST, () => {
    logger.info(`API avviata su ${env.HOST}:${env.PORT}`);
});
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
