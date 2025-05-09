import { UserModel } from '../models/userModel.js';
import express from 'express';

const router = express.Router();

const toUserResponse = (user) => {
    return {
        id: user.id,
        username: user.username,
        bio: user.bio,
        imageUrl: user.imageUrl,
        role: user.role,
        createdAt: user.createdAt,
        lastUpdated: user.lastUpdated,
    }
}

// Get user by id
router.get('/:id', async (req, res) => {
    try {
        const user = await UserModel.findOne({ id: req.params.id });
        user && !user.isDeleted ? res.status(200).json(toUserResponse(user)) : res.status(404).json({ message: 'User not found' });
    } catch (error) {
        res.status(404).json(error);
    }
});

// Create a new user
router.post('/', async (req, res) => {
    try {
        const user = new UserModel(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        console.log(error);
        res.status(400).json(error);
    }
});

export { router as UsersRouter };