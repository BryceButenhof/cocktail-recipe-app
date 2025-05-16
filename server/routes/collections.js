import express from 'express';
import { CollectionModel } from '../models/collectionModel.js';
import { UserModel } from '../models/userModel.js';
import { RecipeModel } from '../models/recipeModel.js';
const router = express.Router();

// Get collection by id
router.get('/:id', async (req, res) => {
    try {
        const collection = await CollectionModel.findOne({ id: req.params.id });
        collection ? 
            res.status(200).json(collection.toCollectionResponse()) : 
            res.status(404).json({ message: 'Collection not found' });
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

        const recipeIds = [ ...req.body.recipes, ...req.body.sections.flatMap(section => section.recipes) ];
        const recipeDocuments = await RecipeModel.find({ id: { $in: recipeIds } });

        const recipes = req.body.recipes.map(recipeId => {
            const document = recipeDocuments.find(r => r.id === recipeId);
            if (!document) {
                throw new Error(`Recipe with id ${recipeId} not found`);
            }
            return document._id;
        });

        const sections = req.body.sections.map(section => ({
            ...section,
            recipes: section.recipes.map(recipeId => {
                const document = recipeDocuments.find(r => r.id === recipeId)
                if (!document) {
                    throw new Error(`Recipe with id ${recipeId} not found`);
                }
                return document._id;
            })
        }));

        const collection = await new CollectionModel({ ...req.body, recipes, sections, createdBy: userId }).save();
        res.status(201).json(collection.toCollectionResponse());
    } catch (error) {
        console.error(error);
        res.status(400).json(error);
    }
});

export { router as CollectionsRouter };
