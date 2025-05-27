import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
const { Schema } = mongoose;

const UserSchema = new Schema({
    id: {
        type: String,
        default: uuid,
        required: true,
        unique: true,
        immutable: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    password: {
        type: String,
        required: true,
    },
    bio: {
        type: String,
        default: null,
        required: false,
    },
    imageUrl: {
        type: String,
        default: null,
        required: false,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false,
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true,
        immutable: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
        required: true
    }
});

export const UserModel = mongoose.model('users', UserSchema);