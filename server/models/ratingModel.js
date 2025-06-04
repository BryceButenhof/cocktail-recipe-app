import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
const { Schema } = mongoose;

const RatingSchema = new Schema({
    id: {
        type: String,
        default: uuid,
        required: true,
        unique: true,
        immutable: true,
        index: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'recipes',
        required: true,
        immutable: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        immutable: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 0,
        max: 5,
        index: true
    },
    comment: {
        type: String,
        required: false,
    },
    imageUrl: {
        type: String,
        default: null,
        required: false
    },
    replies: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'comments',
            required: false,
            index: true
        }
    ],
    isEdited: {
        type: Boolean,
        required: true,
        default: false
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

RatingSchema.methods.toRatingResponse = function(showRefs) {
    const result = {
        id: this.id,
        user: this.user,
        rating: this.rating,
        comment: this.comment,
        imageUrl: this.imageUrl,
        isEdited: this.isEdited,
        createdAt: this.createdAt,
        lastUpdated: this.lastUpdated
    };

    if (showRefs) {
        result.parent = this.parent
        result.replies = this.replies;
    }

    return result;
}

const fieldsToPopulate = [
    {
        'path': 'user',
        'select': [ 'id', 'username', 'isDeleted', '-_id']
    }
];

RatingSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function() {
    this.populate(fieldsToPopulate);
});

RatingSchema.post('save', function(document, next) {
    document.populate(fieldsToPopulate).then(() => {
        next();
    });
});

export const RatingModel = mongoose.model('ratings', RatingSchema);