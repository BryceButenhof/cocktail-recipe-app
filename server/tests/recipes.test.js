import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import 'dotenv/config';
import { IngredientModel } from '../models/ingredientModel.js';
import { RecipeModel } from '../models/recipeModel.js';

beforeAll(async () => {
    await mongoose.connect(process.env.ATLAS_TEST_URI);
});

afterAll(async () => {
    await RecipeModel.deleteMany({});
    await IngredientModel.deleteMany({});
    await mongoose.connection.close();
});

describe("Recipe API Tests", () => {
    let recipeId, honeySyrupId, lemonJuiceId, whiskeyId, bittersId;

    beforeAll(async () => {
        const honeySyrup = await new IngredientModel({
            name: "honey syrup",
            type: "syrup",
            createdBy: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();
        honeySyrupId = honeySyrup.id;

        const lemonJuice = await new IngredientModel({
            name: "lemon juice",
            type: "juice",
            createdBy: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();
        lemonJuiceId = lemonJuice.id;

        const whiskey = await new IngredientModel({
            name: "whiskey",
            type: "liquor",     
            abv: 40,
            createdBy: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();
        whiskeyId = whiskey.id;

        const bitters = await new IngredientModel({
            name: "bitters",
            type: "bitters",
            createdBy: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
        }).save();
        bittersId = bitters.id;
    });

    describe("POST /recipes", () => {
        it("Should create a recipe successfully", async () => {
            const res = await request(app).post("/recipes").send({
                name: "Gold Rush",
                description: "A riff on the classic whiskey sour",
                ingredients: [
                    { id: honeySyrupId, quantity: 0.75, unit: "oz" },
                    { id: lemonJuiceId, quantity: 1, unit: "oz" },
                    { id: whiskeyId, quantity: 2, unit: "oz" },
                ],
                instructions: "Shake with ice and strain into a glass.",
                createdBy: "264b106a-7829-4f4a-b286-3a5aee4471e7",
            });
            expect(res.statusCode).toBe(201);
            recipeId = res.body.id;
        });

        it("Should not create a recipe with an invalid user id", async () => {
            const res = await request(app).post("/recipes").send({
                name: "Gold Rush",
                description: "A riff on the classic whiskey sour",
                ingredients: [
                    { id: honeySyrupId, quantity: 0.75, unit: "oz" },
                    { id: lemonJuiceId, quantity: 1, unit: "oz" },
                    { id: whiskeyId, quantity: 2, unit: "oz" },
                ],
                instructions: "Shake with ice and strain into a glass.",
                createdBy: "74e3fccc-8dde-470d-8e81-8600e917566b",
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("User with id 74e3fccc-8dde-470d-8e81-8600e917566b was not found");
        });

        it("Should not create a recipe with an invalid ingredient id", async () => {
            const res = await request(app).post("/recipes").send({
                name: "Gold Rush",
                description: "A riff on the classic whiskey sour",
                ingredients: [
                    { id: honeySyrupId, quantity: 0.75, unit: "oz" },
                    { id: lemonJuiceId, quantity: 1, unit: "oz" },
                    { id: "c1e1fce9-f4f2-4cdf-99ad-959e20837789", quantity: 2, unit: "oz" },
                ],
                instructions: "Shake with ice and strain into a glass.",
                createdBy: "264b106a-7829-4f4a-b286-3a5aee4471e7",
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Ingredient with id c1e1fce9-f4f2-4cdf-99ad-959e20837789 was not found");
        });
    });

    describe("GET /recipes", () => {
        it("Should get all recipes", async () => {
            const res = await request(app).get("/recipes");
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(1);
        });
    });

    describe("GET /recipes/:id", () => {
        it("Should get a recipe by id", async () => {
            const res = await request(app).get(`/recipes/${recipeId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(recipeId);
        });

        it("Should not get a recipe by invalid id", async () => {
            const res = await request(app).get("/recipes/71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6");
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Recipe with id 71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6 was not found");
        });
    });

    describe("PATCH /recipes/:id", () => {
        it("Should update a recipe successfully", async () => {
            const res = await request(app).patch(`/recipes/${recipeId}`).send({
                description: "A classic whiskey sour with a twist",
            });
            expect(res.statusCode).toBe(200);
            expect(res.body.description).toBe("A classic whiskey sour with a twist");
        });

        it("Should update a recipe with an additional ingredient", async () => {
            const res = await request(app).patch(`/recipes/${recipeId}`).send({
                ingredients: [
                    { id: honeySyrupId, quantity: 0.75, unit: "oz" },
                    { id: lemonJuiceId, quantity: 1, unit: "oz" },
                    { id: whiskeyId, quantity: 2, unit: "oz" },
                    { id: bittersId, quantity: 1, unit: "dashes" },
                ]
            });
            expect(res.statusCode).toBe(200);
            expect(res.body.ingredients.length).toBe(4);
        });

        it("Should not update a recipe with an invalid id", async () => {
            const res = await request(app).patch("/recipes/71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6").send({
                description: "A classic whiskey sour with a twist",
            });
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Recipe with id 71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6 was not found");
        });
    });

    describe("DELETE /recipes/:id", () => {
        it("Should delete a recipe successfully", async () => {
            const res = await request(app).delete(`/recipes/${recipeId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Recipe deleted");
        });

        it("Should not delete a recipe that was already deleted", async () => {
            const res = await request(app).delete(`/recipes/${recipeId}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Recipe with id ${recipeId} was not found`);
        });

        it("Should not delete a recipe with an invalid id", async () => {
            const res = await request(app).delete("/recipes/71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6");
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Recipe with id 71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6 was not found");
        });
    });
});