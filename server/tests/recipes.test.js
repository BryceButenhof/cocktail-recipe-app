import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import 'dotenv/config';
import { IngredientModel } from '../models/ingredientModel.js';
import { RecipeModel } from '../models/recipeModel.js';
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
    await RecipeModel.deleteMany({});
    await IngredientModel.deleteMany({});
    await mongoose.connection.close();
});

describe("Recipe API Tests", () => {
    let recipe1Id, 
        recipe2Id, 
        honeySyrupId, 
        lemonJuiceId, 
        whiskeyId, 
        bittersId, 
        user1Id;

    beforeAll(async () => {
        const user1 = await UserModel.findOne({ username: 'user1' });
        user1Id = user1._id;

        const honeySyrup = await new IngredientModel({
            name: "honey syrup",
            type: "syrup",
            user: user1Id,
        }).save();
        honeySyrupId = honeySyrup.id;

        const lemonJuice = await new IngredientModel({
            name: "lemon juice",
            type: "juice",
            user: user1Id,
        }).save();
        lemonJuiceId = lemonJuice.id;

        const whiskey = await new IngredientModel({
            name: "whiskey",
            type: "liquor",     
            abv: 40,
            user: user1Id,
        }).save();
        whiskeyId = whiskey.id;

        const bitters = await new IngredientModel({
            name: "bitters",
            type: "bitters",
            user: user1Id,
        }).save();
        bittersId = bitters.id;
    });

    describe("POST /recipes", () => {
        it("Should not create a recipe without an authorization header", async () => {
            const res = await request(app).post("/recipes").send({
                name: "Gold Rush",
                description: "A riff on the classic whiskey sour",
                ingredients: [
                    { id: honeySyrupId, quantity: 0.75, unit: "oz" },
                    { id: lemonJuiceId, quantity: 1, unit: "oz" },
                    { id: whiskeyId, quantity: 2, unit: "oz" },
                ],
                instructions: "Shake with ice and strain into a glass.",
                method: "shaken",
            });
            expect(res.statusCode).toBe(401);
        });

        it("Should create a recipe successfully", async () => {
            const res1 = await request(app).post("/recipes")
                .send({
                    name: "Gold Rush",
                    description: "A riff on the classic whiskey sour",
                    ingredients: [
                        { id: honeySyrupId, quantity: 0.75, unit: "oz" },
                        { id: lemonJuiceId, quantity: 1, unit: "oz" },
                        { id: whiskeyId, quantity: 2, unit: "oz" },
                    ],
                    instructions: "Shake with ice and strain into a glass.",
                    method: "shaken",
                })
                .set({ Authorization: `Bearer ${user1Token}` });
            expect(res1.statusCode).toBe(201);
            expect(res1.body.name).toBe("Gold Rush");
            expect(res1.body.ingredients.length).toBe(3);
            expect(res1.body.ingredients[0].id).toBe(honeySyrupId);
            expect(res1.body.ingredients[1].id).toBe(lemonJuiceId);
            expect(res1.body.ingredients[2].id).toBe(whiskeyId);
            recipe1Id = res1.body.id;

            const res2 = await request(app).post("/recipes")
                .send({
                    name: "Gold Rush",
                    description: "A riff on the classic whiskey sour",
                    ingredients: [
                        { id: honeySyrupId, quantity: 0.75, unit: "oz" },
                        { id: lemonJuiceId, quantity: 1, unit: "oz" },
                        { id: whiskeyId, quantity: 2, unit: "oz" },
                    ],
                    instructions: "Shake with ice and strain into a glass.",
                    method: "shaken",
                })
                .set({ Authorization: `Bearer ${user2Token}` });
            expect(res2.statusCode).toBe(201);
            recipe2Id = res2.body.id;
        });

        it("Should not create a recipe with an invalid ingredient id", async () => {
            const res = await request(app).post("/recipes")
                .send({
                    name: "Gold Rush",
                    description: "A riff on the classic whiskey sour",
                    ingredients: [
                        { id: honeySyrupId, quantity: 0.75, unit: "oz" },
                        { id: lemonJuiceId, quantity: 1, unit: "oz" },
                        { id: invalidId, quantity: 2, unit: "oz" },
                    ],
                    instructions: "Shake with ice and strain into a glass.",
                    method: "shaken",
                })
                .set({ Authorization: `Bearer ${user1Token}` });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe(`Ingredient with id ${invalidId} was not found`);
        });
    });

    describe("GET /recipes", () => {
        it("Should get all recipes", async () => {
            const res = await request(app).get("/recipes");
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(2);
        });
    });

    describe("GET /recipes/:id", () => {
        it("Should get a public recipe by id without an authorization header", async () => {
            const res = await request(app).get(`/recipes/${recipe1Id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(recipe1Id);
        });

        it("Should get a public recipe by id with an authorization header", async () => {
            const res = await request(app).get(`/recipes/${recipe1Id}`)
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(recipe1Id);
        });

        it("Should not get a private recipe by id with an invalid user", async () => {
            // Make recipe2 private
            await RecipeModel.findOneAndUpdate({ id: recipe2Id }, { isPublic: false });
            const res = await request(app).get(`/recipes/${recipe2Id}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You are not authorized to view this recipe");
        });

        it("Should get a private recipe by id with a valid user", async () => {
            const res = await request(app).get(`/recipes/${recipe2Id}`)
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(recipe2Id);
        });

        it("Should get a private recipe by id as an admin user", async () => {
            const res = await request(app).get(`/recipes/${recipe2Id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(recipe2Id);
            // Make recipe2 public
            await RecipeModel.findOneAndUpdate({ id: recipe2Id }, { isPublic: true });
        });

        it("Should not get a recipe by id that does not exist", async () => {
            const res = await request(app).get(`/recipes/${invalidId}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Recipe with id ${invalidId} was not found`);
        });
    });

    describe("PATCH /recipes/:id", () => {
        it ("Should not update a recipe without an authorization header", async () => {
            const res = await request(app).patch(`/recipes/${recipe1Id}`).send({
                description: "Description updated without auth",
            });
            expect(res.statusCode).toBe(401);
        });

        it("Should not update a recipe that does not exist", async () => {
            const res = await request(app).patch(`/recipes/${invalidId}`).send({
                description: "Description updated by user1",
            }).set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Recipe with id ${invalidId} was not found`);
        });

        it("Should update a recipe as an admin user", async () => {
            const res = await request(app).patch(`/recipes/${recipe1Id}`)
                .send({
                    description: "Description updated by admin",
                })
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.description).toBe("Description updated by admin");
        });

        it("Should update a recipe as a valid user", async () => {
            const res = await request(app).patch(`/recipes/${recipe1Id}`)
                .send({
                    description: "Description updated by user1",
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.description).toBe("Description updated by user1");
        });

        it("Should not update a recipe as an invalid user", async () => {
            const res = await request(app).patch(`/recipes/${recipe1Id}`)
                .send({
                    description: "Description updated by user2",
                })
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You do not have permission to update this recipe");
        });

        it("Should update a recipe with an additional ingredient", async () => {
            const res = await request(app).patch(`/recipes/${recipe1Id}`)
                .send({
                    ingredients: [
                        { id: honeySyrupId, quantity: 0.75, unit: "oz" },
                        { id: lemonJuiceId, quantity: 1, unit: "oz" },
                        { id: whiskeyId, quantity: 2, unit: "oz" },
                        { id: bittersId, quantity: 1, unit: "dashes" },
                    ]
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.ingredients.length).toBe(4);
        });
    });

    describe("DELETE /recipes/:id", () => {
        it("Should not delete a recipe without an authorization header", async () => {
            const res = await request(app).delete(`/recipes/${recipe1Id}`);
            expect(res.statusCode).toBe(401);
        });

        it("Should not delete a recipe that does not exist", async () => {
            const res = await request(app).delete(`/recipes/${invalidId}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Recipe with id ${invalidId} was not found`);
        });

        it("Should not delete a recipe as an invalid user", async () => {
            const res = await request(app).delete(`/recipes/${recipe1Id}`)
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You do not have permission to delete this recipe");
        });

        it("Should delete a recipe as a valid user", async () => {
            const res = await request(app).delete(`/recipes/${recipe1Id}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Recipe deleted");
        });

        it("Should not delete a recipe that has already been deleted", async () => {
            const res = await request(app).delete(`/recipes/${recipe1Id}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Recipe with id ${recipe1Id} was not found`);
        });

        it("Should delete a recipe as an admin user", async () => {
            const res = await request(app).delete(`/recipes/${recipe2Id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Recipe deleted");
        });
    });
});