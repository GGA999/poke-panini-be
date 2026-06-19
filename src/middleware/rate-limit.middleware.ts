import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

export const publicRateLimiter = rateLimit({
  windowMs: env.PUBLIC_RATE_LIMIT_WINDOW_MS,
  limit: env.PUBLIC_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

export const pricingRateLimiter = rateLimit({
  windowMs: env.PRICING_RATE_LIMIT_WINDOW_MS,
  limit: env.PRICING_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

export const orderRateLimiter = rateLimit({
  windowMs: env.ORDER_RATE_LIMIT_WINDOW_MS,
  limit: env.ORDER_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});
