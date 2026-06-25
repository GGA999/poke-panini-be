export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, errorCode: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    
    // Ripristina il corretto prototipo per le estensioni di classi native
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// --- Sotto-classi specifiche richieste dai sotto-task ---

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class UnavailableError extends AppError {
  constructor(message: string) {
    super(message, 410, 'INGREDIENT_UNAVAILABLE');
  }
}

export class ConfigurationInvalidError extends AppError {
  constructor(message: string) {
    super(message, 422, 'INVALID_CONFIGURATION');
  }
}