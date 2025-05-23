import { RecipeModel } from '../models/recipeModel.js';
import { RatingModel } from '../models/ratingModel.js';
import { UserModel } from '../models/userModel.js';
import { CommentModel } from '../models/commentModel.js';
import express from 'express';

const router = express.Router();

// Get ratings by recipe id
router.get('/', async (req, res) => {
    try{
        const { recipeId } = req.query;
        if (!recipeId) {
            return res.status(400).json({ error: 'recipeId parameter is required' });
        }

        const recipe = await RecipeModel.findOne({ id: recipeId, isDeleted: false });
        if (!recipe) {
            return res.status(404).json({ error: `Recipe with id ${recipeId} was not found` });
        }
        
        const response = [];
        const ratings = await RatingModel.find({ recipe: recipe._id }).sort({ createdAt: -1 });
        if (ratings && ratings.length > 0) {
            const comments = await CommentModel.find({ ratingId: { $in: ratings.map(rating => rating.id) } }).sort({ createdAt: -1 });
            for (const rating of ratings) {
                const replies = comments.filter(comment => comment.ratingId === rating.id);
                response.push(rating.toRatingResponse(replies));
            }
        } 
        return res.status(200).json(response);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Create a new rating
router.post('/', async (req, res) => {
    try {
        const user = await UserModel.findOne({ id: req.body.createdBy });
        if (!user || user.isDeleted) {
            return res.status(400).json({ message: `User with id ${req.body.createdBy} was not found` });
        }

        const recipe = await RecipeModel.findOne({ id: req.body.recipe, isDeleted: false });
        if (!recipe) {
            return res.status(400).json({ message: `Recipe with id ${req.body.recipe} was not found` });
        }

        const rating = await new RatingModel({ ...req.body, recipe: recipe._id, createdBy: user._id }).save();
        res.status(201).json(rating.toRatingResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a rating by id
router.patch('/:id', async (req, res) => {
    try {
        const rating = await RatingModel.findOne({ id: req.params.id });
        if (!rating) {
            return res.status(404).json({ message: `Rating with id ${req.params.id} was not found` });
        }

        const updatedRating = await RatingModel.findOneAndUpdate(
            { id: req.params.id },
            { ...req.body, lastUpdated: Date.now() },
            { new: true }
        );

        const replies = await CommentModel.find({ ratingId: updatedRating.id }).sort({ createdAt: -1 })
        res.status(200).json(updatedRating.toRatingResponse(replies));
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a rating by id
router.delete('/:id', async (req, res) => {
    try {
        const rating = await RatingModel.findOne({ id: req.params.id });
        if (!rating) {
            return res.status(404).json({ message: `Rating with id ${req.params.id} was not found` });
        }

        await RatingModel.deleteOne({ id: req.params.id });
        await CommentModel.deleteMany({ ratingId: req.params.id });
        res.status(200).json({ message: `Rating deleted` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export { router as RatingsRouter };