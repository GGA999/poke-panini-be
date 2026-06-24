import { Router } from 'express';
import {
  createRecipesController,
  type RecipesReader
} from './recipes.controller.js';

export function createRecipesRouter(service?: RecipesReader): Router {
  const router = Router();
  const controller = createRecipesController(service);

  router.get('/', controller.listBrandRecipes);

  return router;
}

export const recipesRouter = createRecipesRouter();
