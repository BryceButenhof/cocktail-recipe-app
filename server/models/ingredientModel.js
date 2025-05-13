import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
const { Schema } = mongoose;

const ingredientTypes = ['syrup', 'juice', 'liquor', 'liqueur', 'bitters', 'soda', 'other'];

const IngredientSchema = new Schema({
    id: {
        type: String,
        default: uuid,
        required: true,
        unique: true,
        immutable: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: null,
        required: false
    },
    type: {
        type: String,
        enum: ingredientTypes,
        required: true
    },
    abv: {
        type: Number,
        default: 0,
        required: true
    },
    imageUrl: {
        type: String,
        default: null,
        required: false
    },
    isDeleted: {
        type: Boolean,
        default: false,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        immutable: true
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

export const IngredientModel = mongoose.model('ingredients', IngredientSchema);