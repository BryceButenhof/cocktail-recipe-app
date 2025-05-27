import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
const { Schema } = mongoose;

const RatingSchema = new Schema({
    id: {
        type: String,
        default: uuid,
        required: true,
        unique: true,
        immutable: true
    },
    recipe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'recipes',
        required: true,
        immutable: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        immutable: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        default: null,
        required: false
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

RatingSchema.methods.toRatingResponse = function(replies) {
    return {
        id: this.id,
        createdBy: this.createdBy,
        rating: this.rating,
        comment: this.comment,
        replies: replies || [],
        createdAt: this.createdAt,
        lastUpdated: this.lastUpdated
    };
};

const fieldsToPopulate = [
    {
        'path': 'createdBy',
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