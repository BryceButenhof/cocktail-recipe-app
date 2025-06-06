import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import 'dotenv/config';
import { RecipeModel } from '../models/recipeModel.js';
import { UserModel } from '../models/userModel.js';
import { IngredientModel } from '../models/ingredientModel.js';
import { RatingModel } from '../models/ratingModel.js';
import { CommentModel } from '../models/commentModel.js';
import { v4 as uuid } from 'uuid';

const invalidId = uuid();
let adminToken,
    user1Token,
    user2Token;

beforeAll(async () => {
    await mongoose.connect(process.env.ATLAS_TEST_URI);

    //Create users
    await request(app).post("/users").send({
        'email': 'admin@admin.com',
        'username': 'adminUser',
        'password': 'adminPassword',
        "role": "admin",
    });

    await request(app).post("/users").send({
        'email': 'user1@user.com',
        'username': 'user1',
        'password': 'user1Password',
        "role": "user",
    });

    await request(app).post("/users").send({
        'email': 'user2@user.com',
        'username': 'user2',
        'password': 'user2Password',
        "role": "user",
    });

    //Login users
    const adminRes = await request(app).post("/users/login").send({
        'email': 'admin@admin.com',
        "password": 'adminPassword'
    });
    adminToken = adminRes.body.token;

    const user1Res = await request(app).post("/users/login").send({
        'email': 'user1@user.com',
        "password": 'user1Password'
    });
    user1Token = user1Res.body.token;

    const user2Res = await request(app).post("/users/login").send({
        'email': 'user2@user.com',
        "password": 'user2Password'
    });
    user2Token = user2Res.body.token;
});

afterAll(async () => {
    await UserModel.deleteMany({username: {$in: ['adminUser', 'user1', 'user2']}});
    await RatingModel.deleteMany({});
    await CommentModel.deleteMany({});
    await RecipeModel.deleteMany({});
    await IngredientModel.deleteMany({});
    await mongoose.connection.close();
});

describe("Comment API Tests", () => {
    let ratingId, margaritaId, tequilaId, commentOnRecipe, commentOnRating, commentOnIngredient, commentOnComment;

    beforeAll(async () => {
        const agaveSyrup = await new IngredientModel({
            name: "agave syrup",
            type: "syrup",
            user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();

        const limeJuice = await new IngredientModel({
            name: "lime juice",
            type: "juice",
            user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();  

        const tequila = await new IngredientModel({
            name: "tequila",
            type: "liquor",     
            abv: 40,
            user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();
        tequilaId = tequila.id;

        const margarita = await new RecipeModel({
            name: "Margarita",
            description: "A classic cocktail made with tequila and lime juice",
            ingredients: [
                { id: agaveSyrup._id, quantity: 0.5, unit: "oz" },
                { id: limeJuice._id, quantity: 1, unit: "oz" },
                { id: tequila._id, quantity: 2, unit: "oz" },
            ],
            instructions: "Shake with ice and strain into a glass.",
            method: "shaken",
            user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();
        margaritaId = margarita.id;

        const rating = await new RatingModel({
            parent: margarita._id,
            user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
            rating: 5,
            comment: "This recipe rocks!",
        }).save();
        ratingId = rating.id;
    });

    describe("POST /comments", () => {
        it('Should not create a comment without an authorization header', async () => {
            const res = await request(app).post('/comments').send({
                parent: ratingId,
                parentType: 'ratings',
                comment: 'I agree with your rating!'
            });
            expect(res.statusCode).toBe(401);
        });

        it('Should not create a comment with an invalid parent recipe id', async () => {
            const res = await request(app).post('/comments')
                .send({
                    parent: invalidId,
                    parentType: 'recipes',
                    comment: 'This is one of my favorites!'
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe(`Recipe with id ${invalidId} was not found`);
        });

        it('Should not create a comment with an invalid parent rating id', async () => {
            const res = await request(app).post('/comments')
                .send({
                    parent: invalidId,
                    parentType: 'ratings',
                    comment: 'I agree with your rating!'
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe(`Rating with id ${invalidId} was not found`);
        });

        it('Should not create a comment with an invalid parent ingredient id', async () => {
            const res = await request(app).post('/comments')
                .send({
                    parent: invalidId,
                    parentType: 'ingredients',
                    comment: 'This is one of my favorites!'
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe(`Ingredient with id ${invalidId} was not found`);
        });

        it('Should not create a comment with an invalid parent comment id', async () => {
            const res = await request(app).post('/comments')
                .send({
                    parent: invalidId,
                    parentType: 'comments',
                    comment: 'This is one of my favorites!'
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe(`Comment with id ${invalidId} was not found`);
        });

        it('Should create a comment on a recipe successfully', async () => {
            const res = await request(app).post('/comments')
                .send({
                    parent: margaritaId,
                    parentType: 'recipes',
                    comment: 'This is one of my favorites!'
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(201);
            expect(res.body.root.id).toBe(margaritaId);
            expect(res.body.rootType).toBe('recipes');
            expect(res.body.parent.id).toBe(margaritaId);
            expect(res.body.parentType).toBe('recipes');
            expect(res.body.comment).toBe('This is one of my favorites!');
            expect(res.body.isEdited).toBe(false);
            commentOnRecipe = res.body;
        });

        it('Should create a comment on a rating successfully', async () => {
            const res = await request(app).post('/comments')
                .send({
                    parent: ratingId,
                    parentType: 'ratings',
                    comment: 'I agree with your rating!'
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(201);
            expect(res.body.root.id).toBe(ratingId);
            expect(res.body.rootType).toBe('ratings');
            expect(res.body.parent.id).toBe(ratingId);
            expect(res.body.parentType).toBe('ratings');
            expect(res.body.comment).toBe('I agree with your rating!');
            expect(res.body.isEdited).toBe(false);
            commentOnRating = res.body;

            // Verify that the comment's _id was added to the parent's replies array
            const rating = await RatingModel.findOne({id: ratingId}).lean();
            const comment = await CommentModel.findOne({id: commentOnRating.id}).lean();
            expect(rating.replies.length).toBe(1);
            expect(rating.replies[0]).toStrictEqual(comment._id);
        });

        it('Should create a comment on an ingredient successfully', async () => {
            const res = await request(app).post('/comments')
                .send({
                    parent: tequilaId,
                    parentType: 'ingredients',
                    comment: 'This is one of my favorites!'
                })
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(201);
            expect(res.body.root.id).toBe(tequilaId);
            expect(res.body.rootType).toBe('ingredients');
            expect(res.body.parent.id).toBe(tequilaId);
            expect(res.body.parentType).toBe('ingredients');
            expect(res.body.comment).toBe('This is one of my favorites!');
            expect(res.body.isEdited).toBe(false);
            commentOnIngredient = res.body;
        });

        it('Should create a comment on a comment successfully', async () => {
            const res = await request(app).post('/comments')
                .send({
                    parent: commentOnRecipe.id,
                    parentType: 'comments',
                    comment: 'Mine too!'
                })
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(201);
            expect(res.body.root.id).toBe(margaritaId);
            expect(res.body.rootType).toBe('recipes');
            expect(res.body.parent.id).toBe(commentOnRecipe.id);
            expect(res.body.parentType).toBe('comments');
            expect(res.body.comment).toBe('Mine too!');
            expect(res.body.isEdited).toBe(false);
            commentOnComment = res.body;
        });
    });

    describe("GET /comments/:id", () => {
        it("Should get a comment by id successfully", async () => {
            const res = await request(app).get(`/comments/${commentOnComment.id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(commentOnComment.id);
            expect(res.body.root.id).toBe(margaritaId)
            expect(res.body.rootType).toBe('recipes');
            expect(res.body.parent.id).toBe(commentOnRecipe.id);
            expect(res.body.parentType).toBe('comments');
            expect(res.body.replies).toBeDefined();
        });

        it("Should get a comment with an invalid id", async () => {
            const res = await request(app).get(`/comments/${invalidId}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Comment with id ${invalidId} was not found`);
        });
    });

    describe("PATCH /comments/:id", () => {
        it('Should not update a comment without an authorization header', async () => {
            const res = await request(app).patch(`/comments/${commentOnRecipe.id}`)
                .send({
                    'comment': 'This comment has been edited'
                });
            expect(res.statusCode).toBe(401);
        });

        it('Should not update a comment that does not exist', async () => {
            const res = await request(app).patch(`/comments/${invalidId}`)
                .send({
                    'comment': 'This comment has been edited'
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Comment with id ${invalidId} was not found`);
        });

        it('Should not update a comment with an invalid user', async () => {
            const res = await request(app).patch(`/comments/${commentOnRecipe.id}`)
                .send({
                    'comment': 'This comment has been edited'
                })
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe(`You do not have permission to update this comment`);
        });

        it('Should not update a comment as an admin', async () => {
            const res = await request(app).patch(`/comments/${commentOnRecipe.id}`)
                .send({
                    'comment': 'This comment has been edited'
                })
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe(`You do not have permission to update this comment`);
        });

        it('Should update a comment with a valid user', async () => {
            const res = await request(app).patch(`/comments/${commentOnRecipe.id}`)
                .send({
                    'comment': 'This comment has been edited'
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.comment).toBe('This comment has been edited');
            expect(res.body.isEdited).toBe(true);
        });
    });

    describe("DELETE /comments/:id", () => {
        it('Should not delete a comment without an authorization header', async () => {
            const res = await request(app).delete(`/comments/${commentOnRecipe.id}`);
            expect(res.statusCode).toBe(401);
        });

        it('Should not delete a comment that does not exist', async () => {
            const res = await request(app).delete(`/comments/${invalidId}`)
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Comment with id ${invalidId} was not found`);
        });

        it('Should not delete a comment with an invalid user', async () => {
            const res = await request(app).delete(`/comments/${commentOnRecipe.id}`)
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe('You do not have permission to delete this comment');
        });

        it('Should delete a comment successfully with a valid user', async () => {
            const res = await request(app).delete(`/comments/${commentOnRecipe.id}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Comment deleted');
        });

        it('Should delete a comment successfully as an admin user', async () => {
            const res = await request(app).delete(`/comments/${commentOnComment.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Comment deleted');
        });
    });
});