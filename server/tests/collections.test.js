import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import 'dotenv/config';
import { IngredientModel } from '../models/ingredientModel.js';
import { RecipeModel } from '../models/recipeModel.js';
import { CollectionModel } from '../models/collectionModel.js';
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
    await CollectionModel.deleteMany({});
    await RecipeModel.deleteMany({});
    await IngredientModel.deleteMany({});
    await mongoose.connection.close();
});

describe("Collection API Tests", () => {
    let collection1Id,
        collection2Id, 
        goldRushId, 
        margaritaId, 
        user1Id;

    beforeAll(async () => {
        const user1 = await UserModel.findOne({ username: 'user1' });
        user1Id = user1._id;

        const honeySyrup = await new IngredientModel({
            name: "honey syrup",
            type: "syrup",
            user: user1Id,
        }).save();

        const lemonJuice = await new IngredientModel({
            name: "lemon juice",
            type: "juice",
            user: user1Id,
        }).save();

        const whiskey = await new IngredientModel({
            name: "whiskey",
            type: "liquor",     
            abv: 40,
            user: user1Id,
        }).save();

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

        const goldRush = await new RecipeModel({
            name: "Gold Rush",
            description: "A riff on the classic whiskey sour",
            ingredients: [
                { id: honeySyrup._id, quantity: 0.75, unit: "oz" },
                { id: lemonJuice._id, quantity: 1, unit: "oz" },
                { id: whiskey._id, quantity: 2, unit: "oz" },
            ],
            instructions: "Shake with ice and strain into a glass.",
            method: "shaken",
            user: user1Id,
        }).save();
        goldRushId = goldRush.id;

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

    describe("POST /collections", () => {
        it ("Should not create a collection without an authentication header", async () => {
            const res = await request(app).post("/collections").send({
                name: "Cocktail Collection",
                description: "A collection of my favorite cocktails",
                recipes: [goldRushId, margaritaId],
                sections: [
                    {
                        name: "Section 1",
                        description: "A collection of my favorite cocktails",
                        recipes: [margaritaId, goldRushId],
                    },
                ],
            });
            expect(res.statusCode).toBe(401);
        });

        it("Should create a collection with recipes and sections", async () => {
            const res = await request(app).post("/collections")
                .send({
                    name: "Cocktail Collection",
                    description: "A collection of my favorite cocktails",
                    recipes: [goldRushId, margaritaId],
                    sections: [
                        {
                            name: "Section 1",
                            description: "A collection of my favorite cocktails",
                            recipes: [margaritaId, goldRushId],
                        },
                    ],
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(201);
            expect(res.body.recipes.length).toBe(2);
            expect(res.body.sections.length).toBe(1);
            expect(res.body.sections[0].recipes.length).toBe(2);
            collection1Id = res.body.id;
        });

        it("Should create a collection with recipes only", async () => {
            const res = await request(app).post("/collections")
                .send({
                    name: "Cocktail Collection",
                    description: "A collection of my favorite cocktails",
                    recipes: [goldRushId, margaritaId],
                })
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(201);
            expect(res.body.recipes.length).toBe(2);
            expect(res.body.sections.length).toBe(0);
            collection2Id = res.body.id;
        });

        it("Should create a collection with sections only", async () => {
            const res = await request(app).post("/collections")
                .send({
                    name: "Cocktail Collection",
                    description: "A collection of my favorite cocktails",
                    sections: [
                        {
                            name: "Section 1",
                            description: "A collection of my favorite cocktails",
                            recipes: [margaritaId, goldRushId],
                        },
                        {
                            name: "Section 2",
                            recipes: [goldRushId],
                        }
                    ],
                })
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(201);
            expect(res.body.recipes.length).toBe(0);
            expect(res.body.sections.length).toBe(2);
            expect(res.body.sections[0].recipes.length).toBe(2);
            expect(res.body.sections[1].recipes.length).toBe(1);
        });

        it("Should not create a collection with an invalid recipe id", async () => {
            const res = await request(app).post("/collections")
                .send({
                    name: "Cocktail Collection",
                    description: "A collection of my favorite cocktails",
                    recipes: [goldRushId, invalidId],
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe(`Recipe with id ${invalidId} was not found`);
        });
    });

    /*
    describe("GET /collections", () => {
        it("Should get collections by user id", async () => {
            const res = await request(app).get("/collections?userId=264b106a-7829-4f4a-b286-3a5aee4471e7");
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(3);
        });

        it("Should not get collections with an invalid user id", async () => {
            const res = await request(app).get("/collections?userId=8325963d-1611-4f39-8662-a7f0e4661aaf");
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("User with id 8325963d-1611-4f39-8662-a7f0e4661aaf was not found");
        });
    });
    */

    describe("GET /collections/:id", () => {
        it("Should get a public collection by id without an authorization header", async () => {
            const res = await request(app).get(`/collections/${collection1Id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(collection1Id);
        });

        it("Should not get a private collection by id with an invalid user", async () => {
            // Make collection2 private
            await CollectionModel.findOneAndUpdate(
                { id: collection2Id },
                { isPublic: false }
            );
            const res = await request(app).get(`/collections/${collection2Id}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You are not authorized to view this collection");
        });

        it("Should get a private collection by id with a valid user", async () => {
            const res = await request(app).get(`/collections/${collection2Id}`)
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(collection2Id);
        });

        it("Should get a private collection by id as an admin user", async () => {
            const res = await request(app).get(`/collections/${collection2Id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(collection2Id);

            // Make collection2 public again
            await CollectionModel.findOneAndUpdate(
                { id: collection2Id },
                { isPublic: true }
            );
        });

        it("Should not get a collection with an invalid id", async () => {
            const res = await request(app).get(`/collections/${invalidId}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Collection with id ${invalidId} was not found`);
        });
    });

    describe("PATCH /collections/:id", () => {
        it("Should not update a collection without an authorization header", async () => {
            const res = await request(app).patch(`/collections/${collection1Id}`).send({
                name: "Updated Cocktail Collection",
                description: "An updated collection of my favorite cocktails",
                recipes: [goldRushId],
            });
            expect(res.statusCode).toBe(401);
        });

        it("Should not update a collection that doesn't exist", async () => {
            const res = await request(app).patch(`/collections/${invalidId}`)
                .send({
                    name: "Updated Cocktail Collection",
                    description: "An updated collection of my favorite cocktails",
                    recipes: [goldRushId],
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Collection with id ${invalidId} was not found`);
        });

        it("Should update a collection as an admin user", async () => {
            const res = await request(app).patch(`/collections/${collection1Id}`)
                .send({
                    name: "Updated Cocktail Collection",
                    description: "Collection updated by admin",
                    recipes: [goldRushId],
                })
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.name).toBe("Updated Cocktail Collection");
            expect(res.body.recipes.length).toBe(1);
            expect(res.body.sections.length).toBe(1);
            expect(res.body.sections[0].recipes.length).toBe(2);
        });

        it("Should update a collection as a valid user", async () => {
            const res = await request(app).patch(`/collections/${collection1Id}`)
                .send({
                    name: "Updated Cocktail Collection by User 1",
                    description: "Collection updated by User 1",
                    recipes: [margaritaId],
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.name).toBe("Updated Cocktail Collection by User 1");
            expect(res.body.recipes.length).toBe(1);
            expect(res.body.sections.length).toBe(1);
            expect(res.body.sections[0].recipes.length).toBe(2);
        });

        it('Should not update a collection as an invalid user', async () => {
            const res = await request(app).patch(`/collections/${collection1Id}`)
                .send({
                    name: "Invalid Update",
                    description: "This update should not be allowed",
                })
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You are not authorized to update this collection");
        });

        it("Should not update a collection with an invalid recipe id", async () => {
            const res = await request(app).patch(`/collections/${collection1Id}`)
                .send({
                    name: "Updated Cocktail Collection",
                    description: "An updated collection of my favorite cocktails",
                    recipes: [goldRushId, invalidId],
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe(`Recipe with id ${invalidId} was not found`);
        });
    });

    describe("DELETE /collections/:id", () => {
        it("Should not delete a collection without an authorization header", async () => {
            const res = await request(app).delete(`/collections/${collection1Id}`);
            expect(res.statusCode).toBe(401);
        });

        it("Should not delete a collection that doesn't exist", async () => {
            const res = await request(app).delete(`/collections/${invalidId}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Collection with id ${invalidId} was not found`);
        });

        it("Should not delete a collection as an invalid user", async () => {
            const res = await request(app).delete(`/collections/${collection1Id}`)
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You are not authorized to delete this collection");
        });

        it("Should delete a collection as a valid user", async () => {
            const res = await request(app).delete(`/collections/${collection1Id}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Collection deleted');
        });

        it("Should not delete a collection that has already been deleted", async () => {
            const res = await request(app).delete(`/collections/${collection1Id}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Collection with id ${collection1Id} was not found`);
        });

        it("Should delete a collection as an admin user", async () => {
            const res = await request(app).delete(`/collections/${collection2Id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Collection deleted');
        });
    });
});