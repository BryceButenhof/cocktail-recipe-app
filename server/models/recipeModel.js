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
        unique: true,
        immutable: true,
        index: true
    },
    type: {
        type: String,
        enum: recipeTypes,
        default: recipeTypes[0],
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        index: true
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
            id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: function() { return this.isRecipe ? 'recipes' : 'ingredients'; },
                required: true
            },
            isRecipe: {
                type: Boolean,
                default: false,
                required: true
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
            index: true
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
        required: true,
        index: true
    },
    isDeleted: {
        type: Boolean,
        default: false,
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        immutable: true,
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

RecipeSchema.methods.toRecipeResponse = function() {
    return {
        id: this.id,
        type: this.type,
        name: this.name,
        description: this.description,
        instructions: this.instructions,
        method: this.method,
        ingredients: this.ingredients.map(ingredient => ({
            id: ingredient.id.id,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            name: ingredient.id.name,
            type: ingredient.id.type,
            isRecipe: ingredient.isRecipe,
            isDeleted: ingredient.id.isDeleted
        })),
        abv: this.abv,
        imageUrl: this.imageUrl,
        tags: this.tags,
        isSubRecipe: this.isSubRecipe,
        isPublic: this.isPublic,
        isDeleted: this.isDeleted,
        user: this.user,
        createdAt: this.createdAt,
        lastUpdated: this.lastUpdated
    };
};

RecipeSchema.methods.toPreviewResponse = function() {
    return {
        id: this.id,
        name: this.name,
        description: this.description,
        ingredients: this.ingredients.map(ingredient => ingredient.id.name),
        abv: this.abv,
        imageUrl: this.imageUrl,
        tags: this.tags,
        isPublic: this.isPublic,
        isDeleted: this.isDeleted,
        user: this.user
    };
};

const fieldsToPopulate = [
    {
        'path': 'user',
        'select': [ 'id', 'username', 'isDeleted', '-_id']
    },
    {
        'path': 'ingredients.id',
        'select': [ 'id', 'name', 'type', 'abv', 'isDeleted', '-_id' ]
    }
];

RecipeSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function() {
    this.populate(fieldsToPopulate);
});

RecipeSchema.post('save', function(document, next) {
    document.populate(fieldsToPopulate).then(() => {
        next();
    });
});

export const RecipeModel = mongoose.model('recipes', RecipeSchema);