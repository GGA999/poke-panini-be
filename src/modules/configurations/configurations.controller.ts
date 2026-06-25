import { Request, Response, NextFunction } from 'express';
import { validateConfiguration } from './configurations.service.js';


export const handleValidateConfiguration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipeId, selections } = req.body;

    // Mandiamo i dati al nostro motore di validazione
    const result = await validateConfiguration(recipeId, selections);

    // Se tutto va bene, restituiamo l'oggetto normalizzato e i warning separati!
    return res.status(200).json({
      status: 'success',
      message: 'Configurazione valida',
      warnings: result.warnings,
      data: result.normalizedConfig
    });
  } catch (error: any) {
    // Gestione degli errori bloccanti (es. min/max violati o duplicati)
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Errore durante la validazione della configurazione'
    });
  }
};