import { RecipeModel } from "../models/recipeModel.js";
import { UserModel } from "../models/userModel.js";
import { IngredientModel } from "../models/ingredientModel.js";
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

// Get all recipes
router.get('/', async (_, res) => {
    try {
        const recipes = await RecipeModel.find({ isDeleted: false })
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
        const recipes = await RecipeModel.find({ isDeleted: false })
            .collation({ locale: "en" })
            .sort({ name: 1 });

        res.status(200).json(await Promise.all(recipes.map(recipe => recipe.toPreviewResponse())));
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

// Get recipe by id
router.get('/:id', async (req, res) => {
    try {
        const recipe = await RecipeModel.findOne({ id: req.params.id, isDeleted: false });
        recipe ? 
            res.status(200).json(recipe.toRecipeResponse()) : 
            res.status(404).json({ message: `Recipe with id ${req.params.id} was not found` });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

// Create a new recipe
router.post('/', async (req, res) => {
    try {
        // Validate user exists and is not deleted
        const user = await UserModel.findOne({id: req.body.createdBy});
        if (!user || user.isDeleted) {
            return res.status(400).json({ message: `User with id ${req.body.createdBy} was not found` });
        }
        
        const ingredientDocuments = await getAndValidateIngredients(req.body.ingredients);
        const formattedIngredients = formatIngredients(ingredientDocuments, req.body.ingredients);
        const abv = calculateABV(ingredientDocuments, req.body.ingredients, req.body.method);
        const recipe = await new RecipeModel({ ...req.body, createdBy: user._id, ingredients: formattedIngredients, abv}).save();

        res.status(201).json(recipe.toRecipeResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a recipe by id
router.patch('/:id', async (req, res) => {
    try {
        const recipe = await RecipeModel.findOne({ id: req.params.id, isDeleted: false });
        if (!recipe) {
            return res.status(404).json({ message: `Recipe with id ${req.params.id} was not found` });
        }

        let fieldsToUpdate = {};

        if (req.body.ingredients) {
            const ingredientDocuments = await getAndValidateIngredients(req.body.ingredients);
            fieldsToUpdate.ingredients = formatIngredients(ingredientDocuments, req.body.ingredients);
            fieldsToUpdate.abv = calculateABV(ingredientDocuments, req.body.ingredients, req.body.method);
        }

        const updatedRecipe = await RecipeModel.findOneAndUpdate({ id: req.params.id }, { ...req.body, ...fieldsToUpdate, lastUpdated: Date.now() }, { new: true });
        res.status(200).json(updatedRecipe.toRecipeResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a recipe
router.delete('/:id', async (req, res) => {
    try {
        const deletedRecipe = await RecipeModel.findOneAndUpdate(
            { id: req.params.id, isDeleted: false }, 
            { isDeleted: true }, 
            { new: true }
        );

        if (!deletedRecipe) {
            return res.status(404).json({ message: `Recipe with id ${req.params.id} was not found` });
        }

        res.status(200).json({ message: 'Recipe deleted' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export { router as RecipesRouter };