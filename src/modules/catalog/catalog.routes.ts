import { Router } from 'express';
import {
  createCatalogController,
  type CatalogReader
} from './catalog.controller.js';

export function createCatalogRouter(service?: CatalogReader): Router {
  const router = Router();
  const controller = createCatalogController(service);

  router.get('/', controller.listConfigurators);
  router.get('/:code', controller.getConfigurator);

  return router;
}

export const catalogRouter = createCatalogRouter();
