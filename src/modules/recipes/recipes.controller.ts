import { Request, Response, NextFunction } from 'express';
import { RecipesService } from './recipes.service.js';

const recipesService = new RecipesService();

export class RecipesController {
  async getFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recipesService.getFeaturedRecipes();
      return res.status(200).json(data);
    } catch (error) {
      next(error); // Spinge l'errore al gestore globale (error.middleware.ts)
    }
  }
}