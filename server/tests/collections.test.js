import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import 'dotenv/config';
import { IngredientModel } from '../models/ingredientModel.js';
import { RecipeModel } from '../models/recipeModel.js';
import { CollectionModel } from '../models/collectionModel.js';

beforeAll(async () => {
    await mongoose.connect(process.env.ATLAS_TEST_URI);
});

afterAll(async () => {
    await CollectionModel.deleteMany({});
    await RecipeModel.deleteMany({});
    await IngredientModel.deleteMany({});
    await mongoose.connection.close();
});

describe("Collection API Tests", () => {
    let collectionId, goldRushId, margaritaId;

    beforeAll(async () => {
        const honeySyrup = await new IngredientModel({
            name: "honey syrup",
            type: "syrup",
            user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();

        const lemonJuice = await new IngredientModel({
            name: "lemon juice",
            type: "juice",
            user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();

        const whiskey = await new IngredientModel({
            name: "whiskey",
            type: "liquor",     
            abv: 40,
            user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();

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
            user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
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
            user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();
        margaritaId = margarita.id;
    });

    describe("POST /collections", () => {
        it("Should create a collection successfully", async () => {
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
                user: "264b106a-7829-4f4a-b286-3a5aee4471e7",
            });
            expect(res.statusCode).toBe(201);
            expect(res.body.recipes.length).toBe(2);
            expect(res.body.sections.length).toBe(1);
            expect(res.body.sections[0].recipes.length).toBe(2);
            collectionId = res.body.id;
        });

        it("Should create a collection with recipes only", async () => {
            const res = await request(app).post("/collections").send({
                name: "Cocktail Collection",
                description: "A collection of my favorite cocktails",
                recipes: [goldRushId, margaritaId],
                user: "264b106a-7829-4f4a-b286-3a5aee4471e7",
            });
            expect(res.statusCode).toBe(201);
            expect(res.body.recipes.length).toBe(2);
            expect(res.body.sections.length).toBe(0);
            collectionId = res.body.id;
        });

        it("Should create a collection with sections only", async () => {
            const res = await request(app).post("/collections").send({
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
                user: "264b106a-7829-4f4a-b286-3a5aee4471e7",
            });
            expect(res.statusCode).toBe(201);
            expect(res.body.recipes.length).toBe(0);
            expect(res.body.sections.length).toBe(2);
            expect(res.body.sections[0].recipes.length).toBe(2);
            expect(res.body.sections[1].recipes.length).toBe(1);
            collectionId = res.body.id;
        });

        it("Should not create a collection with an invalid recipe id", async () => {
            const res = await request(app).post("/collections").send({
                name: "Cocktail Collection",
                description: "A collection of my favorite cocktails",
                recipes: [goldRushId, "76dbe06b-3beb-4336-a6ba-152b301af49e"],
                user: "264b106a-7829-4f4a-b286-3a5aee4471e7",
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Recipe with id 76dbe06b-3beb-4336-a6ba-152b301af49e was not found");
        });

        it("Should not create a collection with an invalid user id", async () => {
            const res = await request(app).post("/collections").send({
                name: "Cocktail Collection",
                description: "A collection of my favorite cocktails",
                recipes: [goldRushId, margaritaId],
                user: "dd59f65e-6944-4ffe-af62-385943b8734e",
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("User with id dd59f65e-6944-4ffe-af62-385943b8734e was not found");
        });
    });

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

    describe("GET /collections/:id", () => {
        it("Should get a collection by id", async () => {
            const res = await request(app).get(`/collections/${collectionId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.name).toBe("Cocktail Collection");
        });

        it("Should not get a collection with an invalid id", async () => {
            const res = await request(app).get("/collections/8325963d-1611-4f39-8662-a7f0e4661aaf");
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Collection with id 8325963d-1611-4f39-8662-a7f0e4661aaf was not found");
        });
    });

    describe("PUT /collections/:id", () => {
        it("Should update a collection by id", async () => {
            const res = await request(app).put(`/collections/${collectionId}`).send({
                name: "Updated Cocktail Collection",
                description: "An updated collection of my favorite cocktails",
                recipes: [goldRushId],
            });
            expect(res.statusCode).toBe(200);
            expect(res.body.name).toBe("Updated Cocktail Collection");
        });

        it("Should not update a collection with an invalid id", async () => {
            const res = await request(app).put("/collections/8325963d-1611-4f39-8662-a7f0e4661aaf").send({
                name: "Updated Cocktail Collection",
                description: "An updated collection of my favorite cocktails",
                recipes: [goldRushId],
            });
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Collection with id 8325963d-1611-4f39-8662-a7f0e4661aaf was not found");
        });
    });

    describe("DELETE /collections/:id", () => {
        it("Should delete a collection by id", async () => {
            const res = await request(app).delete(`/collections/${collectionId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Collection deleted");
        });

        it("Should not delete a collection that does not exist", async () => {
            const res = await request(app).delete(`/collections/${collectionId}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Collection with id ${collectionId} was not found`);
        });

        it("Should not delete a collection with an invalid id", async () => {
            const res = await request(app).delete("/collections/8325963d-1611-4f39-8662-a7f0e4661aaf");
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Collection with id 8325963d-1611-4f39-8662-a7f0e4661aaf was not found");
        });
    });
});