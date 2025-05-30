import express from 'express';
import { CollectionModel } from '../models/collectionModel.js';
import { UserModel } from '../models/userModel.js';
import { RecipeModel } from '../models/recipeModel.js';
import { AuthMiddleware } from '../middleware/auth.js';
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
router.get('/:id', AuthMiddleware, async (req, res) => {
    try {
        const collection = await CollectionModel.findOne({ id: req.params.id });
        if (!collection) {
            return res.status(404).json({ message: `Collection with id ${req.params.id} was not found` });
        }

        if (!collection.isPublic) {
            if (!req.user || (req.user.role !== 'admin' && collection.user.id !== req.user.id)) {
                return res.status(403).json({ message: 'You are not authorized to view this collection' });
            }
        }
        
        return res.status(200).json(collection.toCollectionResponse());
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

//TODO revisit this endpoint
// Get collections by user id
/*
router.get('/', async (req, res) => {
    try {
        if (!req.query.userId) {
            return res.status(400).json({ message: 'Parameter userId is required' });
        }

        const userId = await UserModel.findOne({id: req.query.userId, isDeleted: false}).select('_id');
        if (!userId) {
            return res.status(400).json({ message: `User with id ${req.query.userId} was not found` });
        }
        
        const collections = await CollectionModel.find({ user: userId });
        res.status(200).json(collections.map(collection => collection.toCollectionResponse()));
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});
*/

// Create a new collection
router.post('/', AuthMiddleware, async (req, res) => {
    try {
        const recipeDocuments = await findReferencedRecipes(req);
        const recipes = formatAndValidateRecipes(recipeDocuments, req.body.recipes);
        const sections = formatAndValidateSections(recipeDocuments, req.body.sections);
        const collection = await new CollectionModel({ ...req.body, recipes, sections, user: req.user._id }).save();
        res.status(201).json(collection.toCollectionResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a collection by id
router.patch('/:id', AuthMiddleware, async (req, res) => {
    try {
        const collection = await CollectionModel.findOne({ id: req.params.id });
        if (!collection) {
            return res.status(404).json({ message: `Collection with id ${req.params.id} was not found` });
        }

        if (req.user.role !== 'admin' && collection.user.id !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to update this collection' });
        }

        let fieldsToUpdate = { ...req.body };
        if (req.body.recipes || req.body.sections) {
            const recipeDocuments = await findReferencedRecipes(req);
            if (req.body.recipes) {
                fieldsToUpdate.recipes = formatAndValidateRecipes(recipeDocuments, req.body.recipes);
            }

            if (req.body.sections) {
                fieldsToUpdate.sections = formatAndValidateSections(recipeDocuments, req.body.sections);
            }
        }

        collection.set({
            ...fieldsToUpdate,
            lastUpdated: Date.now()
        });
        await collection.save();
        res.status(200).json(collection.toCollectionResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a collection by id
router.delete('/:id', AuthMiddleware, async (req, res) => {
    try {
        const collection = await CollectionModel.findOne({ id: req.params.id });
        if (!collection) {
            return res.status(404).json({ message: `Collection with id ${req.params.id} was not found` });
        }

        if (req.user.role !== 'admin' && collection.user.id !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to delete this collection' });
        }

        await collection.deleteOne();
        res.status(200).json({ message: 'Collection deleted' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export { router as CollectionsRouter };
