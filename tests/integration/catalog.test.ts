import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorMiddleware } from '../../src/middleware/error.middleware.js';
import { requestIdMiddleware } from '../../src/middleware/request-id.middleware.js';
import { createCatalogRouter } from '../../src/modules/catalog/catalog.routes.js';
import { CatalogService } from '../../src/modules/catalog/catalog.service.js';
import type { CatalogRepository } from '../../src/modules/catalog/catalog.repository.js';
import type {
  ConfiguratorDetail,
  ConfiguratorSummary
} from '../../src/modules/catalog/catalog.types.js';

const summaries: ConfiguratorSummary[] = [
  {
    id: 'type-poke',
    code: 'poke',
    name: 'Poke',
    description: 'Bowl componibile.',
    isActive: true,
    displayOrder: 1
  },
  {
    id: 'type-sandwich',
    code: 'sandwich',
    name: 'Panino',
    description: 'Panino componibile.',
    isActive: true,
    displayOrder: 2
  }
];

const pokeDetail: ConfiguratorDetail = {
  ...summaries[0]!,
  currency: 'EUR',
  sizes: [
    {
      id: 'size-small',
      code: 'small',
      name: 'Small',
      basePriceCents: 950,
      currency: 'EUR',
      isActive: true,
      isAvailable: true,
      displayOrder: 1
    },
    {
      id: 'size-regular',
      code: 'regular',
      name: 'Regular',
      basePriceCents: 1150,
      currency: 'EUR',
      isActive: true,
      isAvailable: true,
      displayOrder: 2
    }
  ],
  categories: [
    {
      id: 'cat-base',
      code: 'base',
      name: 'Base',
      stepNumber: 1,
      minSelect: 1,
      maxSelect: 1,
      selectionMode: 'single',
      isActive: true,
      displayOrder: 1,
      ingredients: [
        {
          id: 'ing-riso-bianco',
          code: 'riso_bianco',
          name: 'Riso bianco',
          description: null,
          priceDeltaCents: 0,
          currency: 'EUR',
          allergens: [],
          dietaryTags: ['vegan'],
          isActive: true,
          isAvailable: true,
          displayOrder: 1,
          sizeRules: []
        }
      ]
    },
    {
      id: 'cat-proteine',
      code: 'proteine',
      name: 'Proteine',
      stepNumber: 2,
      minSelect: 1,
      maxSelect: 2,
      selectionMode: 'multiple',
      isActive: true,
      displayOrder: 2,
      ingredients: [
        {
          id: 'ing-salmone',
          code: 'salmone',
          name: 'Salmone',
          description: null,
          priceDeltaCents: 150,
          currency: 'EUR',
          allergens: ['pesce'],
          dietaryTags: [],
          isActive: true,
          isAvailable: false,
          displayOrder: 1,
          sizeRules: [
            {
              sizeId: 'size-small',
              sizeCode: 'small',
              priceDeltaCents: 150,
              maxQuantity: 1,
              isAvailable: true
            }
          ]
        }
      ]
    }
  ],
  incompatibilities: []
};

function createApp(repository: CatalogRepository) {
  const app = express();
  const service = new CatalogService(repository);

  app.use(requestIdMiddleware);
  app.use('/api/v1/configurators', createCatalogRouter(service));
  app.use(errorMiddleware);

  return app;
}

const repository: CatalogRepository = {
  findActiveConfiguratorSummaries() {
    return Promise.resolve(summaries);
  },
  findActiveConfiguratorDetailByCode(code) {
    return Promise.resolve(code === 'poke' ? pokeDetail : null);
  }
};

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
  };
}

describe('GET /api/v1/configurators', () => {
  it('restituisce tipologie attive ordinate con metadati', async () => {
    const response = await request(createApp(repository)).get(
      '/api/v1/configurators'
    );

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('max-age=60');
    expect(response.body).toMatchObject({
      data: [
        {
          code: 'poke',
          name: 'Poke',
          displayOrder: 1,
          isActive: true
        },
        {
          code: 'sandwich',
          name: 'Panino',
          displayOrder: 2,
          isActive: true
        }
      ],
      meta: {
        count: 2
      }
    });
  });

  it('restituisce dettaglio configuratore con sizes, categorie, ingredienti e regole', async () => {
    const response = await request(createApp(repository)).get(
      '/api/v1/configurators/poke'
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: {
        code: 'poke',
        currency: 'EUR',
        sizes: [
          {
            code: 'small',
            basePriceCents: 950,
            currency: 'EUR'
          },
          {
            code: 'regular',
            basePriceCents: 1150,
            currency: 'EUR'
          }
        ],
        categories: [
          {
            code: 'base',
            stepNumber: 1,
            minSelect: 1,
            maxSelect: 1,
            selectionMode: 'single',
            ingredients: [
              {
                code: 'riso_bianco',
                priceDeltaCents: 0,
                isAvailable: true
              }
            ]
          },
          {
            code: 'proteine',
            stepNumber: 2,
            minSelect: 1,
            maxSelect: 2,
            selectionMode: 'multiple',
            ingredients: [
              {
                code: 'salmone',
                priceDeltaCents: 150,
                isActive: true,
                isAvailable: false,
                sizeRules: [
                  {
                    sizeCode: 'small',
                    priceDeltaCents: 150,
                    maxQuantity: 1
                  }
                ]
              }
            ]
          }
        ]
      }
    });
  });

  it('mappa code non valido o non attivo in 404', async () => {
    const invalidCodeResponse = await request(createApp(repository)).get(
      '/api/v1/configurators/Bad Code'
    );
    const missingCodeResponse = await request(createApp(repository)).get(
      '/api/v1/configurators/inactive'
    );

    expect(invalidCodeResponse.status).toBe(404);
    expect(missingCodeResponse.status).toBe(404);
    expect((missingCodeResponse.body as ErrorResponseBody).error).toMatchObject(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Configuratore non trovato.'
      }
    );
  });
});
