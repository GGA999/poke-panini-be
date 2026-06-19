import { Router } from 'express';
export const apiRouter = Router();
apiRouter.get('/health/live', (_request, response) => {
    response.status(200).json({
        status: 'ok'
    });
});
if (process.env.NODE_ENV === 'test') {
    apiRouter.post('/echo', (request, response) => {
        response.status(200).json(request.body);
    });
    apiRouter.get('/internal-error', () => {
        throw new Error('Test internal failure with stack');
    });
}
