import type { PostgrestError } from '@supabase/supabase-js';

export type RepositoryErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'DATABASE_UNAVAILABLE'
  | 'DATABASE_ERROR';

export class RepositoryError extends Error {
  constructor(
    public readonly code: RepositoryErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export function mapSupabaseError(error: PostgrestError): RepositoryError {
  if (error.code === 'PGRST116') {
    return new RepositoryError('NOT_FOUND', 'Record non trovato.', error);
  }

  if (error.code === '23505') {
    return new RepositoryError('CONFLICT', 'Vincolo di unicita violato.', error);
  }

  if (error.code === '23503' || error.code === '23514') {
    return new RepositoryError('VALIDATION_ERROR', 'Vincolo database violato.', error);
  }

  if (error.code === '57014' || error.message.toLowerCase().includes('timeout')) {
    return new RepositoryError('DATABASE_UNAVAILABLE', 'Database non disponibile.', error);
  }

  return new RepositoryError('DATABASE_ERROR', 'Errore database.', error);
}
