import { createHash } from 'node:crypto';

/**
 * Genera un hash SHA-256 stabile da un payload JSON
 */
export function calculateRequestHash(payload: unknown): string {
  if (!payload) return '';
  // Ordiniamo le chiavi per garantire che lo stesso oggetto generi sempre lo stesso hash
  const stableString = JSON.stringify(payload, Object.keys(payload as object).sort());
  return createHash('sha256').update(stableString).digest('hex');
}