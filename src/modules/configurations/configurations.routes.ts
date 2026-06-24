import { Router } from 'express';
import { handleValidateConfiguration } from './configurations.controller.js';

const router = Router();

router.post('/validate', handleValidateConfiguration);

export default router;
