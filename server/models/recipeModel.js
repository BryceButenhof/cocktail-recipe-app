import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
const { Schema } = mongoose;

const recipeTypes = ['cocktail', 'mocktail', 'juice', 'syrup', 'garnish', 'other'];
const recipeMethods = ['shaken', 'stirred', 'other'];

const RecipeSchema = new Schema({
    id: {
        type: String,
        default: uuid,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: recipeTypes,
        default: recipeTypes[0],
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    instructions: {
        type: String,
        required: true,
    },
    method: {
        type: String,
        enum: recipeMethods,
        default: recipeMethods[0],
        required: true
    },
    ingredients: [
        {
            quantity: {
                type: Number,
                required: true,
                min: 0
            },
            unit: {
                type: String,
                required: true,
            },
            recipeId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'recipes',
                default: null,
            },
            ingredientId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ingredients',
                default: null,
            }
        }
    ],
    abv: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        max: 100
    },
    imageUrl: {
        type: String,
        default: null,
        required: false,
    },
    tags: [
        {
            type: String,
            required: false,
            default: [],
        }
    ],
    isSubrecipe: {
        type: Boolean,
        default: false,
        required: true
    },
    isPublic: {
        type: Boolean,
        default: true,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
        required: true
    }
});

export const RecipeModel = mongoose.model('recipes', RecipeSchema);