import type { NextFunction, Request, Response } from 'express';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase.js';

// Estendiamo l'interfaccia Request direttamente nel modulo per essere blindati con NodeNext
declare module 'express-serve-static-core' {
  interface Request {
    user?: User | null;
  }
}

/**
 * Funzione di utilità interna per estrarre e verificare il JWT di Supabase
 */
async function extractAndVerifyUser(request: Request): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    request.user = null;
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    request.user = null;
    return;
  }

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      request.user = null;
      return;
    }

    request.user = user;
  } catch {
    request.user = null;
  }
}

/**
 * Middleware Autenticazione OPZIONALE (BE-013)
 * Consente l'accesso sia agli utenti loggati che ai guest (MVP).
 */
export async function optionalAuth(
  request: Request,
  _response: Response,
  next: NextFunction
): Promise<void> {
  await extractAndVerifyUser(request);
  next();
}

/**
 * Middleware Autenticazione OBBLIGATORIA (BE-013)
 * Respinge la richiesta con 401 se il token è assente, non valido o scaduto.
 */
export async function requiredAuth(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  await extractAndVerifyUser(request);

  if (!request.user) {
    response.status(401).json({
      status: 'error',
      message:
        'Accesso negato. Autenticazione tramite Bearer token valida richiesta.'
    });
    return;
  }

  next();
}
