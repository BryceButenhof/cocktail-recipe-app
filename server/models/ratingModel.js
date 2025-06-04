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

RatingSchema.methods.toRatingResponse = function() {
    return {
        id: this.id,
        user: this.user,
        rating: this.rating,
        comment: this.comment,
        replies: this.replies,
        isEdited: this.isEdited,
        createdAt: this.createdAt,
        lastUpdated: this.lastUpdated
    };
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