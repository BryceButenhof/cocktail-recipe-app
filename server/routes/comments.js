import { CommentModel } from '../models/commentModel.js';
import { RatingModel } from '../models/ratingModel.js';
import { UserModel } from '../models/userModel.js';
import express from 'express';

const router = express.Router();

// Create a new comment
router.post('/', async (req, res) => {
    try {
        const user = await UserModel.findOne({ id: req.body.createdBy });
        if (!user || user.isDeleted) {
            return res.status(400).json({ message: `User with id ${req.body.createdBy} was not found` });
        }

        const rating = await RatingModel.findOne({ id: req.body.rating });
        if (!rating) {
            return res.status(400).json({ message: `Rating with id ${req.body.rating} was not found` });
        }

        const comment = await new CommentModel({ ...req.body, createdBy: user._id, rating: rating._id }).save();
        res.status(201).json(comment.toCommentResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a comment by id
router.patch('/:id', async (req, res) => {
    try {
        const comment = await CommentModel.findOne({ id: req.params.id });
        if (!comment) {
            return res.status(404).json({ message: `Comment with id ${req.params.id} was not found` });
        }

        const updatedComment = await CommentModel.findOneAndUpdate(
            { id: req.params.id },
            { ...req.body, lastUpdated: Date.now() },
            { new: true }
        );
        res.status(200).json(updatedComment.toCommentResponse());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a comment by id
router.delete('/:id', async (req, res) => {
    try {
        const result = await CommentModel.deleteOne({ id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: `Comment with id ${req.params.id} was not found` });
        }
        res.status(200).json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export { router as CommentsRouter };