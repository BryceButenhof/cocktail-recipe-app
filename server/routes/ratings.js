import { RecipeModel } from '../models/recipeModel.js';
import { RatingModel } from '../models/ratingModel.js';
import { AuthMiddleware } from '../middleware/auth.js';
import express from 'express';

const router = express.Router();

// Get a rating by id
router.get('/:id', async (req, res) => {
    try {
        const rating = await RatingModel.findOne({ id: req.params.id });
        if (!rating) {
            return res.status(404).json({ message: `Rating with id ${req.params.id} was not found`});
        }

        await rating.populate([
            {
                'path': 'parent',
                'select': [ 'id', 'name', '-_id' ]
            },
            {
                'path': 'replies',
                'select': ['id', 'user', 'comment', '-_id' ]
            }
        ]);

        res.status(200).json(rating.toRatingResponse(true));
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Create a new rating
router.post('/', AuthMiddleware, async (req, res) => {
    try {
        const recipe = await RecipeModel.findOne({ id: req.body.parent, isDeleted: false });
        if (!recipe) {
            return res.status(400).json({ message: `Recipe with id ${req.body.parent} was not found` });
        }

        const rating = await new RatingModel({ ...req.body, parent: recipe._id, user: req.user._id, isEdited: false }).save();
        res.status(201).json(rating.toRatingResponse(false));
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a rating by id
router.patch('/:id', AuthMiddleware, async (req, res) => {
    try {
        const rating = await RatingModel.findOne({ id: req.params.id });
        if (!rating) {
            return res.status(404).json({ message: `Rating with id ${req.params.id} was not found` });
        }

        if (rating.user.id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have permission to update this rating' });
        }

        rating.set({
            ...req.body,
            isEdited: true,
            lastUpdated: Date.now()
        });
        await rating.save();
        res.status(200).json(rating.toRatingResponse(false));
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a rating by id
router.delete('/:id', AuthMiddleware, async (req, res) => {
    try {
        const rating = await RatingModel.findOne({ id: req.params.id });
        if (!rating) {
            return res.status(404).json({ message: `Rating with id ${req.params.id} was not found` });
        }

        if (req.user.role !== 'admin' && rating.user.id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have permission to delete this rating' });
        }

        //TODO delete associated comments
        await rating.deleteOne();
        res.status(200).json({ message: `Rating deleted` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export { router as RatingsRouter };