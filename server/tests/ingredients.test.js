import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import 'dotenv/config';
import { IngredientModel } from '../models/ingredientModel.js';

beforeAll(async () => {
    await mongoose.connect(process.env.ATLAS_TEST_URI);
});

afterAll(async () => {
    await IngredientModel.deleteMany({});
    await mongoose.connection.close();
});

describe("Ingredient API Tests", () => {
    let ingredientId;

    describe("POST /ingredients", () => {
        it("Should create an ingredient successfully", async () => {
            const res = await request(app).post("/ingredients").send({
                "name": "orgeat",
                "description": "An almond flavored syrup",
                "type": "syrup",
                "abv": 0,
                "createdBy": "264b106a-7829-4f4a-b286-3a5aee4471e7",
            });
            expect(res.statusCode).toBe(201);
            ingredientId = res.body.id;
        });

        it("Should not create an ingredient with a duplicate name", async () => {
            const res = await request(app).post("/ingredients").send({
                "name": "orgeat",
                "description": "An almond flavored syrup",
                "type": "syrup",
                "abv": 0,
                "createdBy": "264b106a-7829-4f4a-b286-3a5aee4471e7",
            });
            expect(res.statusCode).toBe(400);
        });

        it("Should not create an ingredient with an invalid user id", async () => {
            const res = await request(app).post("/ingredients").send({
                "name": "demerara syrup",
                "description": "A rich syrup made from demerara sugar",
                "type": "syrup",
                "abv": 0,
                "createdBy": "dd59f65e-6944-4ffe-af62-385943b8734e",
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("User with id dd59f65e-6944-4ffe-af62-385943b8734e was not found");
        });
    });

    describe("GET /ingredients", () => {
        it("Should get all ingredients", async () => {
            const res = await request(app).get("/ingredients");
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(1);
        });
    });

    describe("GET /ingredients/:id", () => {
        it("Should get ingredient by id", async () => {
            const res = await request(app).get(`/ingredients/${ingredientId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(ingredientId);
        });

        it("Should not get ingredient by invalid id", async () => {
            const res = await request(app).get("/ingredients/71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6");
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Ingredient with id 71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6 was not found");
        });
    });

    describe("PATCH /ingredients/:id", () => {
        it("Should update an ingredient successfully", async () => {
            const res = await request(app).patch(`/ingredients/${ingredientId}`).send({
                "description": "An almond flavored syrup with a twist",
            });
            expect(res.statusCode).toBe(200);
            expect(res.body.description).toBe("An almond flavored syrup with a twist");
        });

        it("Should not update an ingredient with an invalid id", async () => {
            const res = await request(app).patch("/ingredients/71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6").send({
                "description": "An almond flavored syrup with a twist",
            });
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Ingredient with id 71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6 was not found");
        });
    });

    describe("DELETE /ingredients/:id", () => {
        it("Should delete an ingredient successfully", async () => {
            const res = await request(app).delete(`/ingredients/${ingredientId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe(`Ingredient deleted`);
        });

        it("Should not delete an ingredient that was already deleted", async () => {
            const res = await request(app).delete(`/ingredients/${ingredientId}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Ingredient with id ${ingredientId} was not found`);
        });

        it("Should not delete an ingredient with an invalid id", async () => {
            const res = await request(app).delete("/ingredients/71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6");
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Ingredient with id 71077ba9-ef7a-4ecf-91b2-1e4ccb104ca6 was not found");
        });
    });
});