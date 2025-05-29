import express from 'express';
import { UserModel } from '../models/userModel.js';
import { IngredientModel } from '../models/ingredientModel.js';
import { AuthMiddleware } from '../middleware/auth.js';
const router = express.Router();

// Get all ingredients
router.get('/', async (_, res) => {
    try {
        const ingredients = await IngredientModel.find({isDeleted: false})
            .collation({ locale: "en" })
            .sort({ name: 1 });
        
        res.status(200).json(ingredients.map(ingredient => ingredient.toIngredientResponse()));
    } catch (error) {
        console.error(error);
        res.status(404).json({ message: error.message });
    }
});

// Get ingredient by id
router.get('/:id', async (req, res) => {
    try {
        const ingredient = await IngredientModel.findOne({ id: req.params.id, isDeleted: false });

        ingredient ? 
            res.status(200).json(ingredient.toIngredientResponse()) : 
            res.status(404).json({ message: `Ingredient with id ${req.params.id} was not found` });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

// Create a new ingredient
router.post('/', AuthMiddleware, async (req, res) => {
    try {
        const ingredient = await new IngredientModel({ ...req.body, createdBy: req.user._id }).save();
        res.status(201).json(ingredient.toIngredientResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update an ingredient
router.patch('/:id', AuthMiddleware, async (req, res) => {
    try {
        const ingredient = await IngredientModel.findOne({ id: req.params.id, isDeleted: false });

        if (!ingredient) {
            return res.status(404).json({ message: `Ingredient with id ${req.params.id} was not found` });
        }

        if (req.user.role !== 'admin' && ingredient.createdBy.id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have permission to update this ingredient' });
        }

        ingredient.set({ ...req.body, isDeleted: false, lastUpdated: Date.now() });
        await ingredient.save();
        res.status(200).json(ingredient.toIngredientResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete an ingredient
router.delete('/:id', AuthMiddleware, async (req, res) => {
    try {
        const ingredient = await IngredientModel.findOne({ id: req.params.id, isDeleted: false });

        if (!ingredient) {
            return res.status(404).json({ message: `Ingredient with id ${req.params.id} was not found` });
        }

        if (req.user.role !== 'admin' && ingredient.createdBy.id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have permission to delete this ingredient' });
        }

        ingredient.set({ isDeleted: true, lastUpdated: Date.now() });
        await ingredient.save();
        res.status(200).json({ message: 'Ingredient deleted' });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

export { router as IngredientsRouter };