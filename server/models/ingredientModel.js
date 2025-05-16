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

const fieldsToPopulate = [
    {
        'path': 'createdBy',
        'select': ['id', 'username', 'isDeleted', '-_id']
    }
];

const fieldsToSelect = [
    '-_id',
    'id',
    'name',
    'description',
    'type',
    'abv',
    'imageUrl',
    'createdBy',
    'isDeleted',
    'createdAt',
    'lastUpdated'
];

IngredientSchema.methods.toIngredientResponse = function() {
    return {
        id: this.id,
        name: this.name,
        description: this.description,
        type: this.type,
        abv: this.abv,
        imageUrl: this.imageUrl,
        createdBy: this.createdBy,
        isDeleted: this.isDeleted,
        createdAt: this.createdAt,
        lastUpdated: this.lastUpdated
    };
}

IngredientSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function() {
    this.populate(fieldsToPopulate);
});

IngredientSchema.post('save', function(document, next) {
    document.populate(fieldsToPopulate).then(() => {
        next();
    });
});

export const IngredientModel = mongoose.model('ingredients', IngredientSchema);