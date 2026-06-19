import { AppError } from '../shared/errors/app-error.js';
export function notFoundMiddleware(_request, _response, next) {
    next(new AppError('RESOURCE_NOT_FOUND', 404, 'La risorsa richiesta non esiste.'));
}
