import { Router } from 'express';
import { logger } from '@/config/logger.js'; // Usiamo l'alias @/ configurato prima
import { AppError } from '../../shared/errors/app-error.js';

const router = Router();

// Endpoint POST /api/v1/orders
router.post('/', async (req, res, next) => {
  try {
    const requestId = (req as any).requestId || req.headers['x-request-id'] || 'unknown';
    const idempotencyKey = req.headers['x-idempotency-key'];

    // -----------------------------------------------------------------
    // 1. GESTIONE EVENTO: Idempotenza / Conflitto Ordine (order conflict)
    // -----------------------------------------------------------------
    // [SIMULAZIONE] Se la chiave inviata è uguale a una di test, simuliamo il blocco
    if (idempotencyKey === 'test-chiave-duplicata') {
      
      // 📊 BE-018: Log strutturato dell'evento business di conflitto
      logger.warn({
        requestId,
        event: 'order_conflict',
        idempotencyKey
      }, 'Rilevato tentativo di ordine duplicato tramite chiave di idempotenza');

      throw new AppError('CONFLICT', 409, 'Questo ordine è già stato elaborato.');
    }

    // -----------------------------------------------------------------
    // 2. SALVATAGGIO ORDINE (Simulazione successo)
    // -----------------------------------------------------------------
    // Qui andrebbe la logica del repository DB, creiamo un oggetto finto per il log
    const fakeNewOrder = {
      id: 'ord_' + Math.random().toString(36).substring(2, 11),
      total_amount: req.body.totalAmount || 14.50,
      status: 'created'
    };

    // -----------------------------------------------------------------
    // 3. GESTIONE EVENTO: Ordine Creato con Successo (order created)
    // -----------------------------------------------------------------
    
    // 📊 BE-018: Log strutturato dell'evento business di successo
    logger.info({
      requestId,
      event: 'order_created',
      orderId: fakeNewOrder.id,
      totalAmount: fakeNewOrder.total_amount
    }, `Nuovo ordine ${fakeNewOrder.id} configurato e registrato nel sistema con successo`);

    // Risposta al client
    return res.status(201).json(fakeNewOrder);

  } catch (error) {
    next(error);
  }
});

export const ordersRouter = router;