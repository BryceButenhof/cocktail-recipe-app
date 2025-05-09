import express from 'express';
import { UserModel } from '../models/userModel.js';
import { IngredientModel } from '../models/ingredientModel.js';
const router = express.Router();

const toIngredientResponse = (ingredient) => {
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
        const ingredients = await IngredientModel.find({}).populate('createdBy').collation({ locale: "en" }).sort({ name: 1 })
        res.status(200).json(ingredients.map(toIngredientResponse));
    } catch (error) {
        res.status(404).json(error);
    }
});

// Get ingredient by id
router.get('/:id', async (req, res) => {
    try {
        const ingredient = await IngredientModel.findOne({ id: req.params.id }).populate('createdBy');
        ingredient && !ingredient.isDeleted ? res.status(200).json(toIngredientResponse(ingredient)) : res.status(404).json({ message: 'Ingredient not found' });
    } catch (error) {
        res.status(404).json(error);
    }
});

// Create a new ingredient
router.post('/', async (req, res) => {
    try {
        const user = await UserModel.findOne({id: req.body.createdBy});

        if (!user || user.isDeleted) {
            return res.status(400).json({ message: 'User not found' });
        }

        const ingredient = new IngredientModel({ ...req.body, createdBy: user._id });
        res.status(201).json(await ingredient.save());
    } catch (error) {
        console.log(error);
        res.status(400).json(error);
    }
});

export { router as IngredientsRouter };