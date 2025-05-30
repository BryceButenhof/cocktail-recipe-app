import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
const { Schema } = mongoose;

const CollectionSchema = new Schema({
    id: {
        type: String,
        default: uuid,
        required: true,
        unique: true,
        immutable: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        index: true
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
            required: true,
            index: true
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
                    required: true,
                    index: true
                }
            ]
        }
    ],
    isPublic: {
        type: Boolean,
        default: true,
        required: true,
        index: true
    },
    isMenu: {
        type: Boolean,
        default: false,
        required: true
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
        isMenu: this.isMenu,
        user: this.user,
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
    },
    {
        'path': 'user',
        'select': [ 'id', 'username', 'isDeleted', '-_id']
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