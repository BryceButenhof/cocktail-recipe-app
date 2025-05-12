import { RecipeModel } from "../models/recipeModel.js";
import { UserModel } from "../models/userModel.js";
import { IngredientModel } from "../models/ingredientModel.js";
import express from 'express';

const router = express.Router();

const toRecipeResponse = (recipe) => {
    return {
        id: recipe.id,
        type: recipe.type,
        name: recipe.name,
        description: recipe.description,
        instructions: recipe.instructions,
        method: recipe.method,
        ingredients: recipe.ingredients.map(ingredient => ({
            id: ingredient.id.id,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            name: ingredient.id.name,
            type: ingredient.id.type,
            isRecipe: ingredient.isRecipe,
            isDeleted: ingredient.id.isDeleted
        })),
        abv: recipe.abv,
        imageUrl: recipe.imageUrl,
        tags: recipe.tags,
        isSubRecipe: recipe.isSubRecipe,
        isPublic: recipe.isPublic,
        isDeleted: recipe.isDeleted,
        createdBy: {
            id: recipe.createdBy.id,
            username: recipe.createdBy.username,
            isDeleted: recipe.createdBy.isDeleted,
        },
        createdAt: recipe.createdAt,
        lastUpdated: recipe.lastUpdated
    };
};

// Get all recipes
router.get('/', async (_, res) => {
    try {
        const recipes = await RecipeModel.find({}).populate('createdBy').populate('ingredients.id').collation({ locale: "en" }).sort({ name: 1 });
        res.status(200).json(recipes.map(toRecipeResponse));
    } catch (error) {
        res.status(404).json(error);
    }
});

// Get recipe by id
router.get('/:id', async (req, res) => {
    try {
        const recipe = await RecipeModel.findOne({ id: req.params.id }).populate('createdBy').populate('ingredients.id');
        recipe ? res.status(200).json(toRecipeResponse(recipe)) : res.status(404).json();
    } catch (error) {
        res.status(404).json(error);
    }
});

// Create a new recipe
router.post('/', async (req, res) => {
    try {
        // Validate user exists and is not deleted
        const user = await UserModel.findOne({id: req.body.createdBy});
        if (!user || user.isDeleted) {
            return res.status(400).json({ message: 'User not found' });
        }
        
        // Validate ingredients exist and are not deleted
        const ingredientIds = req.body.ingredients.filter(ingredient => !ingredient.isRecipe).map(ingredient => ingredient.id);
        const subrecipeIds = req.body.ingredients.filter(ingredient => ingredient.isRecipe).map(ingredient => ingredient.id);
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
                return res.status(400).json({ message: 'Some subrecipes not found' });
            }
        }

        let totalVolume = 0, totalAlcohol = 0, formattedIngredients = [];

        // Replace ingredient IDs with MongoDB ObjectIDs
        for (const ingredient of req.body.ingredients) {
            if (!ingredient.isRecipe) {
                const ingredientData = ingredients.find(i => i.id === ingredient.id);
                totalVolume += ingredient.quantity;
                totalAlcohol += ingredientData.abv * ingredient.quantity / 100;
                formattedIngredients.push({
                    quantity: ingredient.quantity,
                    unit: ingredient.unit,
                    id: ingredientData ? ingredientData._id : null,
                    isRecipe: false
                });
            }

            if (ingredient.isRecipe) {
                const subRecipeData = subRecipes.find(r => r.id === ingredient.id);
                totalVolume += ingredient.quantity;
                totalAlcohol += subRecipeData.abv * ingredient.quantity / 100;
                formattedIngredients.push({
                    quantity: ingredient.quantity,
                    unit: ingredient.unit,
                    id: subRecipeData ? subRecipeData._id : null,
                    isRecipe: true
                });
            }
        }

        // Calculate total volume and alcohol content based on method
        if (req.body.method === 'shaken') {
            totalVolume = totalVolume * 1.25;
        } else if (req.body.method === 'stirred') {
            totalVolume = totalVolume * 1.15;
        }
        const abv = totalAlcohol / totalVolume * 100

        const recipe = new RecipeModel({ ...req.body, createdBy: user._id, ingredients: formattedIngredients, abv});
        res.status(201).json(await recipe.save());
    } catch (error) {
        res.status(400).json(error);
    }
});

export { router as RecipesRouter };