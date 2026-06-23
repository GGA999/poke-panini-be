import { Request, Response, NextFunction } from 'express';
import { User } from '@supabase/supabase-js';
// Sfruttiamo il tuo alias di percorso @ impostato nel tsconfig
import { supabase } from '@/config/supabase.js'; 

// Estendiamo l'interfaccia Request direttamente nel modulo per essere blindati con NodeNext
declare module 'express-serve-static-core' {
  interface Request {
    user?: User | null;
  }
}

/**
 * Funzione di utilità interna per estrarre e verificare il JWT di Supabase
 */
async function extractAndVerifyUser(req: Request): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // getUser valida crittograficamente la firma del JWT. Non ci fidiamo del body!
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      req.user = null;
      return;
    }

    // Appendiamo l'utente verificato alla richiesta con i claim essenziali
    req.user = user;
  } catch (err) {
    req.user = null;
  }
}

/**
 * Middleware Autenticazione OPZIONALE (BE-013)
 * Consente l'accesso sia agli utenti loggati che ai guest (MVP).
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  await extractAndVerifyUser(req);
  next();
}

/**
 * Middleware Autenticazione OBBLIGATORIA (BE-013)
 * Respinge la richiesta con 401 se il token è assente, non valido o scaduto.
 */
export async function requiredAuth(req: Request, res: Response, next: NextFunction) {
  await extractAndVerifyUser(req);

  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Accesso negato. Autenticazione tramite Bearer token valida richiesta.'
    });
  }

  next();
}