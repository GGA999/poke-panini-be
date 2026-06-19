import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const requestIdPattern = /^[a-zA-Z0-9_-]+$/;

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  const incomingId = request.header('x-request-id');

  const isValid =
    incomingId !== undefined &&
    incomingId.length > 0 &&
    incomingId.length <= 100 &&
    requestIdPattern.test(incomingId);

  const requestId = isValid ? incomingId : randomUUID();

  request.requestId = requestId;
  response.setHeader('X-Request-ID', requestId);

  next();
}
