import { RecipeModel } from "../models/recipeModel.js";
import { IngredientModel } from "../models/ingredientModel.js";
import { RatingModel } from "../models/ratingModel.js";
import { CommentModel } from "../models/commentModel.js";
import { AuthMiddleware } from '../middleware/auth.js';
import express from 'express';

const router = express.Router();

const getAndValidateIngredients = async (ingredientsRequest) => {
    const ingredientIds = ingredientsRequest.filter(ingredient => !ingredient.isRecipe).map(ingredient => ingredient.id);
    const subrecipeIds = ingredientsRequest.filter(ingredient => ingredient.isRecipe).map(ingredient => ingredient.id);
    let ingredients = [], subRecipes = [];

    if (ingredientIds.length > 0) {
        ingredients = await IngredientModel.find({ id: { $in: ingredientIds } });
    }

    if (subrecipeIds.length > 0) {
        subRecipes = await RecipeModel.find({ id: { $in: subrecipeIds } });
    }

    return [ ...ingredients, ...subRecipes ];
};

const formatIngredients = (ingredientDocuments, ingredientsRequest) => {
    return ingredientsRequest.map(ingredient => {
        const ingredientData = ingredientDocuments.find(i => i.id === ingredient.id);

        if (!ingredientData) {
            throw new Error(`${ingredient.isRecipe ? 'Subrecipe': 'Ingredient'} with id ${ingredient.id} was not found`);
        }

        return {
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            id: ingredientData._id,
            isRecipe: ingredient.isRecipe || false
        };
    });
};

const calculateABV = (ingredientDocuments, ingredientsRequest, method) => {
    let totalVolume = 0, totalAlcohol = 0;

    for (const ingredient of ingredientsRequest) {
        // TODO: Handle other units
        if (ingredient.unit === 'oz') {
            const ingredientData = ingredientDocuments.find(i => i.id === ingredient.id);
            totalVolume += ingredient.quantity;
            totalAlcohol += ingredientData.abv * ingredient.quantity / 100;
        }
    }

    if (method === 'shaken') {
        totalVolume = totalVolume * 1.25;
    } else if (method === 'stirred') {
        totalVolume = totalVolume * 1.15;
    }

    return totalAlcohol / totalVolume * 100
};

const deleteRatingsAndComments = async (recipe) => {
    // Delete all associated comments
    const ratings = await RatingModel.find({ parent: recipe._id });
    const rootIds = [ recipe._id, ...ratings.map(rating => rating._id) ];
    await CommentModel.deleteMany({ root: { $in: rootIds } });

    // Delete all associated ratings
    await RatingModel.deleteMany({ parent: recipe._id });
};

// Get all recipes
router.get('/', async (_, res) => {
    try {
        const recipes = await RecipeModel.find({ isDeleted: false, isPublic: true })
            .collation({ locale: "en" })
            .sort({ name: 1 });

        res.status(200).json(recipes.map(recipe => recipe.toRecipeResponse()));
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

// Get all recipe previews
router.get('/preview', async (_, res) => {
    try {
        const recipes = await RecipeModel.find({ isDeleted: false, isPublic: true })
            .collation({ locale: "en" })
            .sort({ name: 1 });

        res.status(200).json(recipes.map(recipe => recipe.toPreviewResponse()));
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

// Get recipe by id
router.get('/:id', AuthMiddleware, async (req, res) => {
    try {
        const recipe = await RecipeModel.findOne({ id: req.params.id, isDeleted: false });

        if (!recipe) {
            return res.status(404).json({ message: `Recipe with id ${req.params.id} was not found` });
        }

        if (!recipe.isPublic) {
            if (!req.user || (req.user.role !== 'admin' && recipe.user.id !== req.user.id)) {
                return res.status(403).json({ message: 'You are not authorized to view this recipe' });
            }
        }

        return res.status(200).json(recipe.toRecipeResponse());
    } catch (error) {
        return res.status(404).json({ message: error.message });
    }
});

// Create a new recipe
router.post('/', AuthMiddleware, async (req, res) => {
    try {
        const ingredientDocuments = await getAndValidateIngredients(req.body.ingredients);
        const formattedIngredients = formatIngredients(ingredientDocuments, req.body.ingredients);
        const abv = calculateABV(ingredientDocuments, req.body.ingredients, req.body.method);
        const recipe = await new RecipeModel({ ...req.body, user: req.user._id, ingredients: formattedIngredients, abv}).save();
        res.status(201).json(recipe.toRecipeResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a recipe by id
router.patch('/:id', AuthMiddleware, async (req, res) => {
    try {
        const recipe = await RecipeModel.findOne({ id: req.params.id, isDeleted: false });
        if (!recipe) {
            return res.status(404).json({ message: `Recipe with id ${req.params.id} was not found` });
        }

        if (req.user.role !== 'admin' && recipe.user.id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have permission to update this recipe' });
        }

        let fieldsToUpdate = {};
        if (req.body.ingredients) {
            const ingredientDocuments = await getAndValidateIngredients(req.body.ingredients);
            fieldsToUpdate.ingredients = formatIngredients(ingredientDocuments, req.body.ingredients);
            fieldsToUpdate.abv = calculateABV(ingredientDocuments, req.body.ingredients, req.body.method);
        }

        recipe.set({
            ...req.body,
            ...fieldsToUpdate,
            isDeleted: false,
            lastUpdated: Date.now()
        });
        await recipe.save();
        res.status(200).json(recipe.toRecipeResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a recipe
router.delete('/:id', AuthMiddleware, async (req, res) => {
    try {
        const recipe = await RecipeModel.findOne({ id: req.params.id, isDeleted: false });
        if (!recipe) {
            return res.status(404).json({ message: `Recipe with id ${req.params.id} was not found` });
        }

        if (req.user.role !== 'admin' && recipe.user.id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have permission to delete this recipe' });
        }

        recipe.set({
            isDeleted: true,
            lastUpdated: Date.now()
        });
        await recipe.save();
        await deleteRatingsAndComments(recipe);
        res.status(200).json({ message: 'Recipe deleted' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export { router as RecipesRouter };