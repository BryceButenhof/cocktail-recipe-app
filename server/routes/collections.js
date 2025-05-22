import express from 'express';
import { CollectionModel } from '../models/collectionModel.js';
import { UserModel } from '../models/userModel.js';
import { RecipeModel } from '../models/recipeModel.js';
const router = express.Router();

const findReferencedRecipes = async (req) => {
    let recipeIds = req.body.recipes || [];

    if (req.body.sections && req.body.sections.length > 0) {
        recipeIds = [ ...recipeIds, ...req.body.sections.flatMap(section => section.recipes) ];
    }

    const recipeDocuments = await RecipeModel.find({ id: { $in: recipeIds } }).lean();
    return recipeDocuments.map(recipe => ({
        id: recipe.id,
        _id: recipe._id
    }));
}

const formatAndValidateRecipes = (recipeDocuments, recipes) => {
    if (!recipes || recipes.length === 0) {
        return [];
    }

    return recipes.map(recipeId => {
        const document = recipeDocuments.find(r => r.id === recipeId);
        if (!document) {
            throw new Error(`Recipe with id ${recipeId} was not found`);
        }
        return document._id;
    });
}

const formatAndValidateSections = (recipeDocuments, sections) => {
    if (!sections || sections.length === 0) {
        return [];
    }

    return sections.map(section => ({
        ...section,
        recipes: section.recipes.map(recipeId => {
            const document = recipeDocuments.find(r => r.id === recipeId)
            if (!document) {
                throw new Error(`Recipe with id ${recipeId} was not found`);
            }
            return document._id;
        })
    }));
}

// Get collection by id
router.get('/:id', async (req, res) => {
    try {
        const collection = await CollectionModel.findOne({ id: req.params.id });
        collection ? 
            res.status(200).json(collection.toCollectionResponse()) : 
            res.status(404).json({ message: `Collection with id ${req.params.id} was not found` });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

// Get collections by user id
router.get('/', async (req, res) => {
    try {
        if (!req.query.userId) {
            return res.status(400).json({ message: 'Parameter userId is required' });
        }

        const userId = await UserModel.findOne({id: req.query.userId, isDeleted: false}).select('_id');
        if (!userId) {
            return res.status(400).json({ message: `User with id ${req.query.userId} was not found` });
        }
        
        const collections = await CollectionModel.find({ createdBy: userId });
        res.status(200).json(collections.map(collection => collection.toCollectionResponse()));
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

// Create a new collection
router.post('/', async (req, res) => {
    try {
        const userId = await UserModel.findOne({id: req.body.createdBy, isDeleted: false}).select('_id');
        if (!userId) {
            return res.status(400).json({ message: `User with id ${req.body.createdBy} was not found` });
        }

        const recipeDocuments = await findReferencedRecipes(req);
        const recipes = formatAndValidateRecipes(recipeDocuments, req.body.recipes);
        const sections = formatAndValidateSections(recipeDocuments, req.body.sections);
        const collection = await new CollectionModel({ ...req.body, recipes, sections, createdBy: userId }).save();
        res.status(201).json(collection.toCollectionResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Replace a collection by id
router.put('/:id', async (req, res) => {
    try {
        const collection = await CollectionModel.findOne({ id: req.params.id });
        if (!collection) {
            return res.status(404).json({ message: `Collection with id ${req.params.id} was not found` });
        }

        const recipeDocuments = await findReferencedRecipes(req);
        const recipes = formatAndValidateRecipes(recipeDocuments, req.body.recipes);
        const sections = formatAndValidateSections(recipeDocuments, req.body.sections);
        const updatedCollection = await CollectionModel.findOneAndUpdate(
            { id: req.params.id },
            { ...req.body, recipes, sections, lastUpdated: Date.now() },
            { new: true }
        );
        res.status(200).json(updatedCollection.toCollectionResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a collection by id
router.delete('/:id', async (req, res) => {
    try {
        const result = await CollectionModel.deleteOne({ id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: `Collection with id ${req.params.id} was not found` });
        }
        res.status(200).json({ message: 'Collection deleted' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export { router as CollectionsRouter };
