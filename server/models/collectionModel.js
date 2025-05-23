import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
const { Schema } = mongoose;

const CollectionSchema = new Schema({
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
    },
    description: {
        type: String,
        default: null,
        required: false,
    },
    imageUrl: {
        type: String,
        default: null,
        required: false,
    },
    recipes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'recipes',
            required: true
        }
    ],
    sections: [
        {
            name: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                default: null,
                required: false,
            },
            recipes: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'recipes',
                    required: true
                }
            ]
        }
    ],
    isPublic: {
        type: Boolean,
        default: true,
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

CollectionSchema.methods.toCollectionResponse = function() {
    return {
        id: this.id,
        name: this.name,
        description: this.description,
        imageUrl: this.imageUrl,
        recipes: this.recipes.map(recipe => recipe.toPreviewResponse()),
        sections: this.sections.map(section => ({
            name: section.name,
            description: section.description,
            recipes: section.recipes.map(recipe => recipe.toPreviewResponse())
        })),
        isPublic: this.isPublic,
        createdBy: this.createdBy,
        createdAt: this.createdAt,
        lastUpdated: this.lastUpdated
    };
};

const fieldsToPopulate = [
    {
        'path': 'recipes',
    },
    {
        'path': 'sections.recipes'
    }
];

CollectionSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function() {
    this.populate(fieldsToPopulate);
});

CollectionSchema.post('save', function(document, next) {
    document.populate(fieldsToPopulate).then(() => {
        next();
    });
});

export const CollectionModel = mongoose.model('collections', CollectionSchema);