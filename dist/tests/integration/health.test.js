import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
describe('GET /health/live', () => {
    it('restituisce lo stato del processo', async () => {
        const response = await request(createApp()).get('/health/live');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'ok'
        });
    });
});
