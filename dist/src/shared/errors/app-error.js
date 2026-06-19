export class AppError extends Error {
    code;
    statusCode;
    details;
    constructor(code, statusCode, message, details = []) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
