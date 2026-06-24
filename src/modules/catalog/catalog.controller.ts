import type { RequestHandler } from 'express';
import { CatalogService } from './catalog.service.js';
import type {
  ConfiguratorDetail,
  ConfiguratorSummary
} from './catalog.types.js';

const cacheControlValue = 'public, max-age=60, stale-while-revalidate=300';

export interface CatalogReader {
  listConfigurators(signal?: AbortSignal): Promise<ConfiguratorSummary[]>;
  getConfigurator(
    code: string,
    signal?: AbortSignal
  ): Promise<ConfiguratorDetail>;
}

export function createCatalogController(
  service: CatalogReader = new CatalogService()
) {
  const listConfigurators: RequestHandler = async (
    _request,
    response,
    next
  ) => {
    try {
      const configurators = await service.listConfigurators();

      response.setHeader('Cache-Control', cacheControlValue);
      response.status(200).json({
        data: configurators,
        meta: {
          count: configurators.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  const getConfigurator: RequestHandler = async (request, response, next) => {
    try {
      const codeParam = request.params.code;
      const code = Array.isArray(codeParam)
        ? (codeParam[0] ?? '')
        : (codeParam ?? '');
      const configurator = await service.getConfigurator(code);

      response.setHeader('Cache-Control', cacheControlValue);
      response.status(200).json({
        data: configurator
      });
    } catch (error) {
      next(error);
    }
  };

  return {
    listConfigurators,
    getConfigurator
  };
}
