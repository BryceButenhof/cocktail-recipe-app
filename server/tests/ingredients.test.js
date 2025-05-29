import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { v4 as uuid } from 'uuid';
import 'dotenv/config';
import { IngredientModel } from '../models/ingredientModel.js';
import { UserModel } from '../models/userModel.js';

let ingredient1Id,
    ingredient2Id,
    adminToken,
    user1Token,
    user2Token;

const invalidId = uuid();


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
    await IngredientModel.deleteMany({});
    await mongoose.connection.close();
});

describe("Ingredient API Tests", () => {
    describe("POST /ingredients", () => {
        it("Should create an ingredient successfully", async () => {
            const ingredient1Res = await request(app).post("/ingredients")
                .send({
                    "name": "orgeat",
                    "description": "An almond flavored syrup",
                    "type": "syrup",
                    "abv": 0
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(ingredient1Res.statusCode).toBe(201);
            ingredient1Id = ingredient1Res.body.id;

            const ingredient2Res = await request(app).post("/ingredients")
                .send({
                    "name": "demerera syrup",
                    "description": "A rich syrup made from demerera sugar",
                    "type": "syrup",
                    "abv": 0,
                })
                .set('Authorization', `Bearer ${user2Token}`);
            expect(ingredient2Res.statusCode).toBe(201);
            ingredient2Id = ingredient2Res.body.id;
        });

        it("Should not create an ingredient with a duplicate name", async () => {
            const res = await request(app).post("/ingredients")
                .send({
                    "name": "orgeat",
                    "description": "An almond flavored syrup",
                    "type": "syrup",
                    "abv": 0,
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(400);
        });

        it("Should not create an ingredient without an authorization header", async () => {
            const res = await request(app).post("/ingredients")
                .send({
                    "name": "invalid ingredient",
                    "description": "This ingredient should not be created",
                    "type": "syrup",
                    "abv": 0,
                });
            expect(res.statusCode).toBe(401);
        });
    });

    describe("GET /ingredients", () => {
        it("Should get all ingredients", async () => {
            const res = await request(app).get("/ingredients");
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(2);
        });
    });

    describe("GET /ingredients/:id", () => {
        it("Should get ingredient by id", async () => {
            const res = await request(app).get(`/ingredients/${ingredient1Id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(ingredient1Id);
        });

        it("Should not get ingredient by invalid id", async () => {
            const res = await request(app).get(`/ingredients/${invalidId}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Ingredient with id ${invalidId} was not found`);
        });
    });

    describe("PATCH /ingredients/:id", () => {
        it ("Should not update an ingredient without an authorization header", async () => {
            const res = await request(app).patch(`/ingredients/${ingredient1Id}`)
                .send({
                    "description": "Description updated without auth"
                });
            expect(res.statusCode).toBe(401);
        });

        it("Should not update an ingredient that does not exist", async () => {
            const res = await request(app).patch(`/ingredients/${invalidId}`)
                .send({
                    "description": "Description updated for non-existing ingredient"
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Ingredient with id ${invalidId} was not found`);
        });

        it("Should update an ingredient as an admin user", async () => {
            const res = await request(app).patch(`/ingredients/${ingredient1Id}`)
                .send({
                    "description": "Description updated by admin"
                })
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.description).toBe("Description updated by admin");
        });

        it("Should update an ingredient as a valid user", async () => {
            const res = await request(app).patch(`/ingredients/${ingredient1Id}`)
                .send({
                    "description": "Description updated by user1"
                })
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.description).toBe("Description updated by user1");
        });

        it("Should not update an ingredient as an invalid user", async () => {
            const res = await request(app).patch(`/ingredients/${ingredient1Id}`)
                .send({
                    "description": "Description updated by user2"
                })
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You do not have permission to update this ingredient");
        });
    });

    describe("DELETE /ingredients/:id", () => {
        it ("Should not delete an ingredient with an invalid id", async () => {
            const res = await request(app).delete(`/ingredients/${invalidId}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Ingredient with id ${invalidId} was not found`);
        });

        it ("Should not delete an ingredient without an authorization header", async () => {
            const res = await request(app).delete(`/ingredients/${ingredient1Id}`);
            expect(res.statusCode).toBe(401);
        });

        it("Should not delete an ingredient as an invalid user", async () => {
            const res = await request(app).delete(`/ingredients/${ingredient1Id}`)
                .set('Authorization', `Bearer ${user2Token}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe('You do not have permission to delete this ingredient');
        });

        it("Should delete an ingredient as a valid user", async () => {
            const res = await request(app).delete(`/ingredients/${ingredient1Id}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Ingredient deleted');
        });

        it("Should not delete an ingredient that has already been deleted", async () => {
            const res = await request(app).delete(`/ingredients/${ingredient1Id}`)
                .set('Authorization', `Bearer ${user1Token}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe(`Ingredient with id ${ingredient1Id} was not found`);
        });

        it("Should delete an ingredient as an admin user", async () => {
            const res = await request(app).delete(`/ingredients/${ingredient2Id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe(`Ingredient deleted`);
        });
    });
});