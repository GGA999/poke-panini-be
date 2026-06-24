import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorMiddleware } from '../../src/middleware/error.middleware.js';
import { requestIdMiddleware } from '../../src/middleware/request-id.middleware.js';
import type { RecipesReader } from '../../src/modules/recipes/recipes.controller.js';
import { createRecipesRouter } from '../../src/modules/recipes/recipes.routes.js';
import type {
  BrandRecipe,
  BrandRecipeFilters
} from '../../src/modules/recipes/recipes.service.js';

const sandwichRecipes: BrandRecipe[] = [
  {
    id: 'recipe-panino-classico',
    code: 'panino_classico',
    name: 'Panino Classico',
    description: 'Bun classico, hamburger di manzo, cheddar e ketchup.',
    imageUrl: null,
    isCustomizable: true,
    isFeatured: true,
    type: {
      code: 'sandwich',
      name: 'Panino'
    },
    defaultSize: {
      id: 'size-normale',
      code: 'normale',
      name: 'Normale',
      basePriceCents: 850,
      currency: 'EUR'
    },
    price: {
      totalCents: 930,
      currency: 'EUR'
    },
    ingredients: [
      {
        id: 'ing-bun-classico',
        code: 'bun_classico',
        name: 'Bun classico',
        categoryCode: 'pane',
        quantity: 1,
        priceDeltaCents: 0,
        allergens: ['glutine']
      },
      {
        id: 'ing-cheddar',
        code: 'cheddar',
        name: 'Cheddar',
        categoryCode: 'farcitura',
        quantity: 1,
        priceDeltaCents: 80,
        allergens: ['latte']
      }
    ]
  }
];

function createApp(service: RecipesReader) {
  const app = express();

  app.use(requestIdMiddleware);
  app.use('/api/v1/brand-recipes', createRecipesRouter(service));
  app.use(errorMiddleware);

  return app;
}

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
  };
}

describe('GET /api/v1/brand-recipes', () => {
  it('filtra le ricette consigliate per panino', async () => {
    const service: RecipesReader = {
      getBrandRecipes(filters?: BrandRecipeFilters) {
        expect(filters).toEqual({
          type: 'sandwich',
          featured: true,
          limit: 3
        });

        return Promise.resolve(sandwichRecipes);
      }
    };

    const response = await request(createApp(service)).get(
      '/api/v1/brand-recipes?type=sandwich&featured=true&limit=3'
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: [
        {
          code: 'panino_classico',
          name: 'Panino Classico',
          type: {
            code: 'sandwich'
          },
          price: {
            totalCents: 930,
            currency: 'EUR'
          }
        }
      ],
      meta: {
        count: 1
      }
    });
  });

  it('rifiuta query non valide', async () => {
    const service: RecipesReader = {
      getBrandRecipes() {
        return Promise.resolve([]);
      }
    };

    const response = await request(createApp(service)).get(
      '/api/v1/brand-recipes?type=bad value'
    );

    expect(response.status).toBe(400);
    expect((response.body as ErrorResponseBody).error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Parametri ricette non validi.'
    });
  });
});
