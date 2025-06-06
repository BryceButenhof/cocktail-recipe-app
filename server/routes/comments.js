import { CommentModel } from '../models/commentModel.js';
import { RatingModel } from '../models/ratingModel.js';
import { RecipeModel } from '../models/recipeModel.js'
import { IngredientModel } from '../models/ingredientModel.js';
import { AuthMiddleware } from '../middleware/auth.js'
import express from 'express';

const router = express.Router();

const getAndValidateRef = async (id, type) => {
    switch (type) {
        case 'recipes': 
            const recipe = await RecipeModel.findOne({id});
            if (!recipe) {
                throw new Error(`Recipe with id ${id} was not found`);
            }
            return recipe;
        case 'ingredients':
            const ingredient = await IngredientModel.findOne({id});
            if (!ingredient) {
                throw new Error(`Ingredient with id ${id} was not found`);
            }
            return ingredient;
        case 'ratings':
            const rating = await RatingModel.findOne({id});
            if (!rating) {
                throw new Error(`Rating with id ${id} was not found`);
            }
            return rating;
        case 'comments':
            const comment = await CommentModel.findOne({id});
            if (!comment) {
                throw new Error(`Comment with id ${id} was not found`);
            }
            return comment;
    }
};

const pullFromParentReplies = async (commentId, parentId, parentType) => {
    // Remove the comment's _id from the parent's replies array
    if (['ratings', 'comments'].includes(parentType)) {
        const model = parentType === 'ratings' ? RatingModel : CommentModel;
        await model.updateOne(
            { id: parentId },
            { $pull: { replies: commentId } }
        );
    }
};

router.get('/:id', async (req, res) => {
    try {
        const comment = await CommentModel.findOne({ id: req.params.id });
        if (!comment) {
            return res.status(404).json({ message: `Comment with id ${req.params.id} was not found` });
        }

        res.status(200).json(comment.toCommentResponse(true, true));
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Create a new comment
router.post('/', AuthMiddleware, async (req, res) => {
    try {
        const parent = await getAndValidateRef(req.body.parent, req.body.parentType);
        let root, rootType;
        if (req.body.parentType === 'comments') {
            const parentRoot = await getAndValidateRef(parent.root.id, parent.rootType);
            root = parentRoot._id;
            rootType = parent.rootType;
        } else {
            root = parent._id;
            rootType = req.body.parentType;
        }

        const comment = await new CommentModel({ 
            ...req.body,
            root,
            rootType,
            parent: parent._id,
            user: req.user._id,
            isEdited: false
        }).save();

        if (['ratings', 'comments'].includes(req.body.parentType)) {
            // Push the new comment's _id to the parent document's replies array
            parent.replies.push(comment._id);
            await parent.save();
        }

        res.status(201).json(comment.toCommentResponse(true, false));
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a comment by id
router.patch('/:id', AuthMiddleware,  async (req, res) => {
    try {
        const comment = await CommentModel.findOne({ id: req.params.id });
        if (!comment) {
            return res.status(404).json({ message: `Comment with id ${req.params.id} was not found` });
        }

        if (comment.user.id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have permission to update this comment' });
        }

        comment.set({
            ...req.body,
            isEdited: true,
            lastUpdated: Date.now()
        });
        await comment.save();
        res.status(200).json(comment.toCommentResponse(true, false));
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a comment by id
router.delete('/:id', AuthMiddleware, async (req, res) => {
    try {
        const comment = await CommentModel.findOne({ id: req.params.id });
        if (!comment) {
            return res.status(404).json({ message: `Comment with id ${req.params.id} was not found` });
        }

        if (req.user.role !== 'admin' && comment.user.id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have permission to delete this comment' });
        }

        if (comment.parent) {
            // Remove the comment's _id from the parent's replies array
            await pullFromParentReplies(comment._id, comment.parent.id, comment.parentType);
        }

        // TODO: delete all replies recursively
        // At this point they will become orphans and never be rendered
        // However, they will be cleaned up properly if the root is deleted
        await comment.deleteOne();
        res.status(200).json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export { router as CommentsRouter };