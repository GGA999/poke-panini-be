import { Router } from 'express';
import { RecipesController } from './recipes.controller.js';

const router = Router();
const recipesController = new RecipesController();

// Questa è la rotta che si attiverà sulla Home Page per caricare le ricette in vetrina
router.get('/brand-recipes', recipesController.getFeatured);

export { router as recipesRoutes };