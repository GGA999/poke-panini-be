import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { RepositoryError } from '../../src/db/repository-error.js';
import { errorMiddleware } from '../../src/middleware/error.middleware.js';
import { requestIdMiddleware } from '../../src/middleware/request-id.middleware.js';
function errorBody(response) {
    return response.body;
}
function createErrorApp(error) {
    const app = express();
    app.use(requestIdMiddleware);
    app.get('/boom', () => {
        throw error;
    });
    app.use(errorMiddleware);
    return app;
}
describe('middleware HTTP base', () => {
    it('include X-Request-ID nella risposta', async () => {
        const response = await request(createApp()).get('/health/live');
        expect(response.headers['x-request-id']).toEqual(expect.any(String));
    });
    it('mantiene un request ID valido', async () => {
        const response = await request(createApp())
            .get('/health/live')
            .set('X-Request-ID', 'valid-request_123');
        expect(response.headers['x-request-id']).toBe('valid-request_123');
    });
    it('sostituisce un request ID pericoloso', async () => {
        const response = await request(createApp())
            .get('/health/live')
            .set('X-Request-ID', 'bad request id');
        expect(response.headers['x-request-id']).toEqual(expect.any(String));
        expect(response.headers['x-request-id']).not.toBe('bad request id');
    });
    it('restituisce 400 per JSON malformato', async () => {
        const response = await request(createApp())
            .post('/api/v1/echo')
            .set('Content-Type', 'application/json')
            .send('{"bad":');
        expect(response.status).toBe(400);
        expect(errorBody(response).error.code).toBe('BAD_REQUEST');
    });
    it('restituisce 413 per payload troppo grande', async () => {
        const response = await request(createApp())
            .post('/api/v1/echo')
            .send({ value: 'x'.repeat(2_000) });
        expect(response.status).toBe(413);
        expect(errorBody(response).error.code).toBe('PAYLOAD_TOO_LARGE');
    });
    it('accetta una origin ammessa', async () => {
        const response = await request(createApp())
            .get('/health/live')
            .set('Origin', 'http://localhost:5173');
        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
    it('blocca una origin vietata', async () => {
        const response = await request(createApp())
            .get('/health/live')
            .set('Origin', 'https://evil.example');
        expect(response.status).toBe(403);
        expect(errorBody(response).error.code).toBe('CORS_ORIGIN_FORBIDDEN');
    });
    it('non espone x-powered-by', async () => {
        const response = await request(createApp()).get('/health/live');
        expect(response.headers['x-powered-by']).toBeUndefined();
    });
    it('restituisce un errore standard per endpoint inesistente', async () => {
        const response = await request(createApp()).get('/api/v1/missing');
        expect(response.status).toBe(404);
        expect(errorBody(response).error).toMatchObject({
            code: 'RESOURCE_NOT_FOUND',
            message: 'La risorsa richiesta non esiste.',
            details: []
        });
        expect(errorBody(response).error.requestId).toEqual(expect.any(String));
    });
    it('non espone stack trace per errori interni', async () => {
        const response = await request(createApp()).get('/api/v1/internal-error');
        expect(response.status).toBe(500);
        expect(errorBody(response).error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(JSON.stringify(response.body)).not.toContain('stack');
        expect(JSON.stringify(response.body)).not.toContain('Test internal failure');
    });
    it('traduce gli errori repository database in un 503 esplicito', async () => {
        const response = await request(createErrorApp(new RepositoryError('DATABASE_ERROR', 'Errore database.'))).get('/boom');
        expect(response.status).toBe(503);
        expect(errorBody(response).error).toMatchObject({
            code: 'DATABASE_ERROR',
            message: 'Database non disponibile o schema non allineato.',
            details: []
        });
    });
    it('restituisce 415 per content type non JSON sugli endpoint con body', async () => {
        const response = await request(createApp())
            .post('/api/v1/echo')
            .set('Content-Type', 'text/plain')
            .send('hello');
        expect(response.status).toBe(415);
        expect(errorBody(response).error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });
    it('produce 429 quando il rate limit viene superato', async () => {
        const app = createApp();
        let status = 200;
        for (let index = 0; index < 110; index += 1) {
            const response = await request(app).get('/api/v1/health/live');
            status = response.status;
            if (status === 429) {
                break;
            }
        }
        expect(status).toBe(429);
    });
});
