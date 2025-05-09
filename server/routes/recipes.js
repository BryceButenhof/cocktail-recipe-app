import { RecipeModel } from "../models/recipeModel.js";
import { UserModel } from "../models/userModel.js";
import { IngredientModel } from "../models/ingredientModel.js";
import express from 'express';

const router = express.Router();

// Get all recipes
router.get('/', async (_, res) => {
    try {
        res.status(200).json(await RecipeModel.find({}).populate('createdBy').populate('ingredients.ingredientId').collation({ locale: "en" }).sort({ name: 1 }));
    } catch (error) {
        res.status(404).json(error);
    }
});

// Get recipe by id
router.get('/:id', async (req, res) => {
    try {
        const recipe = await RecipeModel.findOne({ id: req.params.id }).populate('createdBy').populate('ingredients.ingredientId');
        recipe ? res.status(200).json(recipe) : res.status(404).json();
    } catch (error) {
        res.status(404).json(error);
    }
});

// Create a new recipe
router.post('/', async (req, res) => {
    try {
        const user = await UserModel.findOne({id: req.body.createdBy});
        
        if (!user || user.isDeleted) {
            return res.status(400).json({ message: 'User not found' });
        }
        
        const hasInvalidIngredients = req.body.ingredients.some(ingredient =>
            (!ingredient.ingredientId && !ingredient.recipeId) || 
            (ingredient.ingredientId && ingredient.recipeId)
        );

        if (hasInvalidIngredients) {
            return res.status(400).json({ message: 'Some ingredients are invalid' });
        }
        
        const ingredientIds = req.body.ingredients.map(ingredient => ingredient.ingredientId).filter(id => !!id);
        const subrecipeIds = req.body.ingredients.map(ingredient => ingredient.recipeId).filter(id => !!id);
        let ingredients = [], subRecipes = [];

        if (ingredientIds.length > 0) {
            ingredients = await IngredientModel.find({ id: { $in: ingredientIds } });
            if (ingredients.length !== ingredientIds.length) {
                return res.status(400).json({ message: 'Some ingredients not found' });
            }
        }

        if (subrecipeIds.length > 0) {
            subRecipes = await RecipeModel.find({ id: { $in: subrecipeIds } });
            if (subRecipes.length !== subrecipeIds.length) {
                return res.status(400).json({ message: 'Some recipes not found' });
            }
        }

        const formattedIngredients = req.body.ingredients.map(ingredient => {
            const ingredientData = ingredients.find(i => i.id === ingredient.ingredientId);
            const subRecipeData = subRecipes.find(r => r.id === ingredient.recipeId);
            return {
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                recipeId: subRecipeData ? subRecipeData._id : null,
                ingredientId: ingredientData ? ingredientData._id : null
            };
        });

        const recipe = new RecipeModel({ ...req.body, createdBy: user._id, ingredients: formattedIngredients});
        res.status(201).json(await recipe.save());
    } catch (error) {
        console.log(error);
        res.status(400).json(error);
    }
});

export { router as RecipesRouter };