import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
const { Schema } = mongoose;

const rootTypes = [ 'recipes', 'ingredients', 'ratings' ];
const parentTypes = [ ...rootTypes, 'comments' ];

const CommentSchema = new Schema({
    id: {
        type: String,
        default: uuid,
        required: true,
        unique: true,
        immutable: true,
        index: true
    },
    root: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'rootType',
        required: true,
        immutable: true,
        index: true
    },
    rootType: {
        type: String,
        enum: rootTypes,
        required: true,
        immutable: true,
        index: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'parentType',
        required: true,
        immutable: true,
        index: true
    },
    parentType: {
        type: String,
        enum: parentTypes,
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
    comment: {
        type: String,
        required: true,
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

CommentSchema.methods.toCommentResponse = function(showRefs, showReplies) {
    const result = {
        id: this.id,
        comment: this.comment,
        user: this.user,
        isEdited: this.isEdited,
        createdAt: this.createdAt,
        lastUpdated: this.lastUpdated
    };

    if (showRefs) {
        result.root = this.root;
        result.rootType = this.rootType;
        result.parent = this.parent;
        result.parentType = this.parentType;
    }

    if (showReplies) {
        result.replies = this.replies;
    }

    return result;
}

const fieldsToPopulate = [
    {
        'path': 'root',
        'select': [ 'id', 'name', '-_id' ]
    },
    {
        'path': 'parent',
        'select': [ 'id', 'name', '-_id' ]
    },
    {
        'path': 'user',
        'select': [ 'id', 'username', 'isDeleted', '-_id']
    },
    {
        'path': 'replies',
        'select': ['id', 'user', 'comment', '-_id' ]
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