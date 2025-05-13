import express from 'express';
import { UserModel } from '../models/userModel.js';
import { IngredientModel } from '../models/ingredientModel.js';
const router = express.Router();

const toIngredientResponse = async (ingredient) => {
    return {
        id: ingredient.id,
        name: ingredient.name,
        description: ingredient.description,
        type: ingredient.type,
        abv: ingredient.abv,
        imageUrl: ingredient.imageUrl,
        createdBy: {
            id: ingredient.createdBy.id,
            username: ingredient.createdBy.username,
            isDeleted: ingredient.createdBy.isDeleted,
        },
        isDeleted: ingredient.isDeleted,
        createdAt: ingredient.createdAt,    
        lastUpdated: ingredient.lastUpdated,
    }
};

// Get all ingredients
router.get('/', async (_, res) => {
    try {
        const ingredients = await IngredientModel.find({isDeleted: false}).populate('createdBy').collation({ locale: "en" }).sort({ name: 1 })
        res.status(200).json(ingredients.map(toIngredientResponse));
    } catch (error) {
        res.status(404).json(error);
    }
});

// Get ingredient by id
router.get('/:id', async (req, res) => {
    try {
        const ingredient = await IngredientModel.findOne({ id: req.params.id, isDeleted: false }).populate('createdBy');
        ingredient ? 
            res.status(200).json(toIngredientResponse(ingredient)) : 
            res.status(404).json({ message: 'Ingredient not found' });
    } catch (error) {
        res.status(404).json(error);
    }
});

// Create a new ingredient
router.post('/', async (req, res) => {
    try {
        const userId = await UserModel.findOne({id: req.body.createdBy, isDeleted: false}).select('_id');
        if (!userId) {
            return res.status(400).json({ message: 'User not found' });
        }

        const ingredient = await new IngredientModel({ ...req.body, createdBy: userId }).save();
        res.status(201).json(toIngredientResponse(await ingredient.populate('createdBy')));
    } catch (error) {
        res.status(400).json(error);
    }
});

// Update an ingredient
router.patch('/:id', async (req, res) => {
    try {
        const updatedIngredient = await IngredientModel.findOneAndUpdate(
            { id: req.params.id, isDeleted: false }, 
            { ...req.body, lastUpdated: Date.now() }, 
            { new: true }
        );

        if (!updatedIngredient) {
            return res.status(404).json({ message: 'Ingredient not found' });
        }

        res.status(200).json(toIngredientResponse(await updatedIngredient.populate('createdBy')));
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
        );

        if (!deletedIngredient) {
            return res.status(404).json({ message: 'Ingredient not found' });
        }

        res.status(200).json({ message: 'Ingredient deleted' });
    } catch (error) {
        res.status(404).json(error);
    }
});

export { router as IngredientsRouter };