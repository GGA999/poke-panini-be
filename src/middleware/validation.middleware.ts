import type { RequestHandler } from 'express';
import { z, ZodError } from 'zod';

interface RequestParts {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function replaceObject(target: object, value: unknown): void {
  if (!isRecord(value)) {
    return;
  }

  for (const key of Object.keys(target)) {
    delete (target as Record<string, unknown>)[key];
  }

  Object.assign(target, value);
}

export const validateRequest = (
  schema: z.ZodType<RequestParts>
): RequestHandler => {
  return async (request, response, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: request.body as unknown,
        query: request.query as unknown,
        params: request.params as unknown
      });

      if (parsed.body) {
        replaceObject(request.body as object, parsed.body);
      }

      if (parsed.query) {
        replaceObject(request.query, parsed.query);
      }

      if (parsed.params) {
        replaceObject(request.params, parsed.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.flatten().fieldErrors;

        response.status(400).json({
          status: 'fail',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'I dati inseriti non sono validi.',
            details: fieldErrors,
            requestId: request.requestId
          }
        });
        return;
      }

      next(error);
    }
  };
};
