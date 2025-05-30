import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import 'dotenv/config';
import { RecipeModel } from '../models/recipeModel.js';
import { IngredientModel } from '../models/ingredientModel.js';
import { RatingModel } from '../models/ratingModel.js';
import { CommentModel } from '../models/commentModel.js';

beforeAll(async () => {
    await mongoose.connect(process.env.ATLAS_TEST_URI);
});

afterAll(async () => {
    await RatingModel.deleteMany({});
    await CommentModel.deleteMany({});
    await RecipeModel.deleteMany({});
    await IngredientModel.deleteMany({});
    await mongoose.connection.close();
});

describe("Rating API Tests", () => {
    let recipeId, ratingId;

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
        recipeId = margarita.id;
    });

    describe("POST /ratings", () => {
        it("Should create a rating successfully", async () => {
            const res = await request(app).post("/ratings").send({
                recipe: recipeId,
                rating: 5,
                comment: "Delicious!",
                user: "264b106a-7829-4f4a-b286-3a5aee4471e7",
            });
            expect(res.statusCode).toBe(201);
            ratingId = res.body.id;
        });

        it("Should not create a rating with an invalid recipe id", async () => {
            const res = await request(app).post("/ratings").send({
                recipe: "194f0e0e-46f0-4a46-9c8c-71ccf25df995",
                rating: 5,
                comment: "Delicious!",
                user: "264b106a-7829-4f4a-b286-3a5aee4471e7",
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Recipe with id 194f0e0e-46f0-4a46-9c8c-71ccf25df995 was not found");
        });

        it("Should not create a rating with an invalid user id", async () => {
            const res = await request(app).post("/ratings").send({
                recipe: recipeId,
                rating: 5,
                comment: "Delicious!",
                user: "194f0e0e-46f0-4a46-9c8c-71ccf25df995",
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("User with id 194f0e0e-46f0-4a46-9c8c-71ccf25df995 was not found");
        });
    });

    describe("GET /ratings", () => {
        beforeAll(async () => {
            const rating = await RatingModel.findOne({id: ratingId});
            await new CommentModel({
                rating: rating._id,
                user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
                comment: "I also think this recipe rocks!"
            }).save();

            await new CommentModel({
                rating: rating._id,
                user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
                comment: "Great recipe, will try again!"
            }).save();
        });

        it("Should get all ratings for a recipe successfully", async () => {
            const res = await request(app).get(`/ratings?recipeId=${recipeId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body[0].replies.length).toBe(2);
        });

        it("Should not get ratings for an invalid recipe id", async () => {
            const res = await request(app).get("/ratings?recipeId=194f0e0e-46f0-4a46-9c8c-71ccf25df995");
            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe("Recipe with id 194f0e0e-46f0-4a46-9c8c-71ccf25df995 was not found");
        });

        it("Should not get ratings without recipeId parameter", async () => {
            const res = await request(app).get("/ratings");
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe("recipeId parameter is required");
        });
    });


    describe("PATCH /ratings/:id", () => {
        it("Should update a rating successfully", async () => {
            const res = await request(app).patch(`/ratings/${ratingId}`).send({
                rating: 4,
                comment: "Good, but could be better.",
            });
            expect(res.statusCode).toBe(200);
            expect(res.body.rating).toBe(4);
        });

        it("Should not update a rating with an invalid id", async () => {
            const res = await request(app).patch("/ratings/194f0e0e-46f0-4a46-9c8c-71ccf25df995").send({
                rating: 4,
                comment: "Good, but could be better.",
            });
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Rating with id 194f0e0e-46f0-4a46-9c8c-71ccf25df995 was not found");
        });
    });

    describe("DELETE /ratings/:id", () => {
        it("Should delete a rating successfully", async () => {
            const res = await request(app).delete(`/ratings/${ratingId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Rating deleted");
        });

        it("Should not delete a rating with an invalid id", async () => {
            const res = await request(app).delete("/ratings/194f0e0e-46f0-4a46-9c8c-71ccf25df995");
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Rating with id 194f0e0e-46f0-4a46-9c8c-71ccf25df995 was not found");
        });
    });
});