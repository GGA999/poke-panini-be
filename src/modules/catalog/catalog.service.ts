import { AppError } from '../../shared/errors/app-error.js';
import type { CatalogRepository } from './catalog.repository.js';
import { SupabaseCatalogRepository } from './catalog.repository.js';
import type {
  ConfiguratorDetail,
  ConfiguratorSummary
} from './catalog.types.js';

const configuratorCodePattern = /^[a-z0-9][a-z0-9_-]*$/;

export class CatalogService {
  constructor(
    private readonly repository: CatalogRepository = new SupabaseCatalogRepository()
  ) {}

  listConfigurators(signal?: AbortSignal): Promise<ConfiguratorSummary[]> {
    return this.repository.findActiveConfiguratorSummaries(signal);
  }

  async getConfigurator(
    code: string,
    signal?: AbortSignal
  ): Promise<ConfiguratorDetail> {
    if (!configuratorCodePattern.test(code)) {
      throw new AppError(
        'RESOURCE_NOT_FOUND',
        404,
        'Configuratore non trovato.'
      );
    }

    const configurator =
      await this.repository.findActiveConfiguratorDetailByCode(code, signal);

    if (!configurator) {
      throw new AppError(
        'RESOURCE_NOT_FOUND',
        404,
        'Configuratore non trovato.'
      );
    }

    return configurator;
  }
}
