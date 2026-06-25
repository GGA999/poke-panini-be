import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';

// Usiamo una chiave segreta interna del server per firmare il token
const SECRET = env.DATABASE_URL || 'chiave-segreta-di-fallback-poke'; 
const TOKEN_DURATION_MS = 24 * 60 * 60 * 1000; // Il token dura 24 ore

interface GuestTokenPayload {
  orderId: string;
  exp: number;
}

export function generateGuestToken(orderId: string): string {
  const payload: GuestTokenPayload = {
    orderId,
    exp: Date.now() + TOKEN_DURATION_MS
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(payloadBase64).digest('base64url');

  // Il token finale è una stringa separata da un punto: payload.firma
  return `${payloadBase64}.${signature}`;
}

export function verifyGuestToken(token: string, orderId: string): boolean {
  try {
    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) return false;

    // Ricreiamo la firma per fare il confronto di sicurezza
    const expectedSignature = createHmac('sha256', SECRET).update(payloadBase64).digest('base64url');
    
    // timingSafeEqual previene gli attacchi a tempo (Timing Attacks) richiesti dai criteri
    const isSignatureValid = timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isSignatureValid) return false;

    const payload: GuestTokenPayload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf8')
    );

    // Controlla che il token non sia scaduto e appartenga esattamente a quell'ordine
    if (Date.now() > payload.exp) return false;
    if (payload.orderId !== orderId) return false;

    return true;
  } catch {
    return false;
  }
}