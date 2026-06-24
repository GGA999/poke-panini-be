import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/app-error.js';
import {
  type BrandRecipe,
  type BrandRecipeFilters,
  RecipesService
} from './recipes.service.js';

export interface RecipesReader {
  getBrandRecipes(filters?: BrandRecipeFilters): Promise<BrandRecipe[]>;
}

const querySchema = z.object({
  type: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9_-]*$/)
    .optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(20).optional()
});

export function createRecipesController(
  service: RecipesReader = new RecipesService()
) {
  const listBrandRecipes: RequestHandler = async (request, response, next) => {
    try {
      const parsedQuery = querySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        throw new AppError(
          'VALIDATION_ERROR',
          400,
          'Parametri ricette non validi.',
          [parsedQuery.error.flatten().fieldErrors]
        );
      }

      const filters: BrandRecipeFilters = {};

      if (parsedQuery.data.type !== undefined) {
        filters.type = parsedQuery.data.type;
      }

      if (parsedQuery.data.featured !== undefined) {
        filters.featured = parsedQuery.data.featured;
      }

      if (parsedQuery.data.limit !== undefined) {
        filters.limit = parsedQuery.data.limit;
      }

      const recipes = await service.getBrandRecipes(filters);

      response.status(200).json({
        data: recipes,
        meta: {
          count: recipes.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  return {
    listBrandRecipes
  };
}
