import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
const { Schema } = mongoose;

const CommentSchema = new Schema({
    id: {
        type: String,
        default: uuid,
        required: true,
        unique: true,
        immutable: true,
        index: true
    },
    rating: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ratings',
        required: true,
        immutable: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        immutable: true,
        index: true
    },
    comment: {
        type: String,
        required: true,
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

CommentSchema.methods.toCommentResponse = function() {
    return {
        id: this.id,
        createdBy: this.createdBy,
        comment: this.comment,
        createdAt: this.createdAt,
        lastUpdated: this.lastUpdated
    };
}

const fieldsToPopulate = [
    {
        'path': 'createdBy',
        'select': [ 'id', 'username', 'isDeleted', '-_id']
    }
];

CommentSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function() {
    this.populate(fieldsToPopulate);
});

CommentSchema.post('save', function(document, next) {
    document.populate(fieldsToPopulate).then(() => {
        next();
    });
});

export const CommentModel = mongoose.model('comments', CommentSchema);