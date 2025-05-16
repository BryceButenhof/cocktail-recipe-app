import express from 'express';
import { UserModel } from '../models/userModel.js';
import { IngredientModel } from '../models/ingredientModel.js';
const router = express.Router();

// Get all ingredients
router.get('/', async (_, res) => {
    try {
        const ingredients = await IngredientModel.find({isDeleted: false})
            .collation({ locale: "en" })
            .sort({ name: 1 })
            .lean();
        
        res.status(200).json(ingredients);
    } catch (error) {
        console.error(error);
        res.status(404).json({ message: error.message });
    }
});

// Get ingredient by id
router.get('/:id', async (req, res) => {
    try {
        const ingredient = await IngredientModel.findOne({ id: req.params.id, isDeleted: false }).lean();

        ingredient ? 
            res.status(200).json(ingredient) : 
            res.status(404).json({ message: `Ingredient with id ${req.params.id} was not found` });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

// Create a new ingredient
router.post('/', async (req, res) => {
    try {
        const userId = await UserModel.findOne({id: req.body.createdBy, isDeleted: false}).select('_id');
        if (!userId) {
            return res.status(400).json({ message: `User with id ${req.body.createdBy} was not found` });
        }

        const ingredient = await new IngredientModel({ ...req.body, createdBy: userId }).save();
        res.status(201).json(ingredient.toIngredientResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update an ingredient
router.patch('/:id', async (req, res) => {
    try {
        const updatedIngredient = await IngredientModel.findOneAndUpdate(
            { id: req.params.id, isDeleted: false }, 
            { ...req.body, lastUpdated: Date.now() }, 
            { new: true }
        ).lean();

        if (!updatedIngredient) {
            return res.status(404).json({ message: `Ingredient with id ${req.params.id} was not found` });
        }

        res.status(200).json(updatedIngredient);
    } catch (error) {
        res.status(400).json(error);
    }
});

// Delete an ingredient
router.delete('/:id', async (req, res) => {
    try {
        const deletedIngredient = await IngredientModel.findOneAndUpdate(
            { id: req.params.id, isDeleted: false }, 
            { isDeleted: true, lastUpdated: Date.now() }, 
            { new: true }
        ).lean();

        if (!deletedIngredient) {
            return res.status(404).json({ message: `Ingredient with id ${req.params.id} was not found` });
        }

        res.status(200).json({ message: 'Ingredient deleted' });
    } catch (error) {
        res.status(404).json(error);
    }
});

export { router as IngredientsRouter };