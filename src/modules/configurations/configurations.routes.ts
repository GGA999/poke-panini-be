import { Router } from 'express';
import { handleValidateConfiguration } from './configurations.controller.js';

const router = Router();

// Abbiamo tolto il guardiano così la richiesta va dritta al nostro servizio!
router.post('/validate', handleValidateConfiguration);

export default router;