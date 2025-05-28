import { UserModel } from '../models/userModel.js';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

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
        user && !user.isDeleted ? 
            res.status(200).json(toUserResponse(user)) : 
            res.status(404).json({ message: `User with id ${req.params.id} was not found` });
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

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: `User with email ${email} was not found` });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign(
            { _id: user._id, id: user.id, email: user.email },
            secretKey, 
            { expiresIn: '1h' }
        );
        res.status(200).json({ token });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export { router as UsersRouter };