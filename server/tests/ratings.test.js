import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import 'dotenv/config';
import { RecipeModel } from '../models/recipeModel.js';
import { IngredientModel } from '../models/ingredientModel.js';
import { RatingModel } from '../models/ratingModel.js';
import { UserModel } from '../models/userModel.js';
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
    await RecipeModel.deleteMany({});
    await IngredientModel.deleteMany({});
    await mongoose.connection.close();
});

describe("Rating API Tests", () => {
    let margaritaId, 
        rating1Id,
        rating2Id,
        user1Id;

    beforeAll(async () => {
            const user1 = await UserModel.findOne({ username: 'user1' });
            user1Id = user1._id;
    
            const agaveSyrup = await new IngredientModel({
                name: "agave syrup",
                type: "syrup",
                user: user1Id,
            }).save();
    
            const limeJuice = await new IngredientModel({
                name: "lime juice",
                type: "juice",
                user: user1Id,
            }).save();  
    
            const tequila = await new IngredientModel({
                name: "tequila",
                type: "liquor",     
                abv: 40,
                user: user1Id,
            }).save();
    
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
                user: user1Id,
            }).save();
            margaritaId = margarita.id;
        });

    describe("POST /ratings", () => {
        it("Should not create a rating without an authorization header", async () => {
            const res1 = await request(app).post("/ratings")
                .send({
                    parent: margaritaId,
                    rating: 5,
                    comment: "Delicious!",
                });
            expect(res1.statusCode).toBe(401);
        });

        it("Should create a rating successfully", async () => {
            const res1 = await request(app).post("/ratings")
                .send({
                    parent: margaritaId,
                    rating: 5,
                    comment: "Delicious!",
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res1.statusCode).toBe(201);
            expect(res1.body.replies).toBe(undefined);
            rating1Id = res1.body.id;

            const res2 = await request(app).post("/ratings")
                .send({
                    parent: margaritaId,
                    rating: 5,
                    comment: "Delicious!",
                })
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res2.statusCode).toBe(201);
            expect(res2.body.replies).toBe(undefined);
            rating2Id = res2.body.id;
        });

        it("Should not create a rating with an invalid recipe id", async () => {
            const res = await request(app).post("/ratings")
                .send({
                    parent: invalidId,
                    rating: 5,
                    comment: "Delicious!",
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe(`Recipe with id ${invalidId} was not found`);
        });
    });

    describe("GET /ratings/:id", () => {
        it("Should get a rating by id", async () => {
            const res = await request(app).get(`/ratings/${rating1Id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.rating).toBe(5);
            expect(res.body.parent.id).toBe(margaritaId);
            expect(res.body.replies.length).toBe(0);
        });

        it("Should not get a rating that does not exist", async () => {
            const res = await request(app).get(`/ratings/${invalidId}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Rating with id ${invalidId} was not found`);
        });
    });

    describe("PATCH /ratings/:id", () => {
        it("Should not update a rating without an authorization header", async () => {
            const res = await request(app).patch(`/ratings/${rating1Id}`)
                .send({
                    rating: 4,
                    comment: "Good, but could be better.",
                });
            expect(res.statusCode).toBe(401);
        });

        it("Should not update a rating that does not exist", async () => {
            const res = await request(app).patch(`/ratings/${invalidId}`)
                .send({
                    rating: 4,
                    comment: "Good, but could be better.",
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Rating with id ${invalidId} was not found`);
        }); 

        it("Should update a rating as a valid user", async () => {
            const res = await request(app).patch(`/ratings/${rating1Id}`)
                .send({
                    rating: 4,
                    comment: "Good, but could be better.",
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.rating).toBe(4);
            expect(res.body.comment).toBe("Good, but could be better.");
            expect(res.body.replies).toBe(undefined);
        }); 

        it("Should not update a rating with an invalid user", async () => {
            const res = await request(app).patch(`/ratings/${rating1Id}`)
                .send({
                    rating: 4,
                    comment: "Good, but could be better.",
                })
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe('You do not have permission to update this rating');
        }); 
    });

    describe("DELETE /ratings/:id", () => {
        it("Should not delete a rating without an authorization header", async () => {
            const res = await request(app).delete(`/ratings/${rating1Id}`);
            expect(res.statusCode).toBe(401);
        });

        it("Should not delete a rating that does not exist", async () => {
            const res = await request(app).delete(`/ratings/${invalidId}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Rating with id ${invalidId} was not found`);
        });

        it("Should not delete a rating with an invalid user", async () => {
            const res = await request(app).delete(`/ratings/${rating1Id}`)
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You do not have permission to delete this rating");
        });

        it("Should delete a rating with a valid user", async () => {
            const res = await request(app).delete(`/ratings/${rating1Id}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Rating deleted");
        });

        it("Should not delete a rating that has already been deleted", async () => {
            const res = await request(app).delete(`/ratings/${rating1Id}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Rating with id ${rating1Id} was not found`);
        });

        it("Should delete a rating with as an admin user", async () => {
            const res = await request(app).delete(`/ratings/${rating2Id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Rating deleted");
        });
    });
});