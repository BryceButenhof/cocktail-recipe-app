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

describe("Comment API Tests", () => {
    let ratingId, commentId;

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

        const rating = await new RatingModel({
            recipe: margarita._id,
            user: new mongoose.Types.ObjectId('681e4c7c17842c19255e7a2a'),
            rating: 5,
            comment: "This recipe rocks!",
        }).save();
        ratingId = rating.id;
    });

    describe("POST /comments", () => {
        it("Should create a comment successfully", async () => {
            const res = await request(app).post("/comments").send({
                rating: ratingId,
                user: "264b106a-7829-4f4a-b286-3a5aee4471e7",
                comment: "I also think this recipe rocks!",
            });
            expect(res.statusCode).toBe(201);
            commentId = res.body.id;
        });

        it("Should not create a comment with an invalid rating ID", async () => {
            const res = await request(app).post("/comments").send({
                rating: "137b9076-d670-46c1-b975-33cc21df2407",
                user: "264b106a-7829-4f4a-b286-3a5aee4471e7",
                content: "This is a test comment",
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Rating with id 137b9076-d670-46c1-b975-33cc21df2407 was not found");
        });

        it("Should not create a comment with an invalid user ID", async () => {
            const res = await request(app).post("/comments").send({
                rating: ratingId,
                user: "137b9076-d670-46c1-b975-33cc21df2407",
                content: "This is a test comment",
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("User with id 137b9076-d670-46c1-b975-33cc21df2407 was not found");
        });
    });

    describe("PATCH /comments/:id", () => {
        it("Should update a comment successfully", async () => {
            const res = await request(app).patch(`/comments/${commentId}`).send({
                comment: "Updated comment",
            });
            expect(res.statusCode).toBe(200);
            expect(res.body.comment).toBe("Updated comment");
        });

        it("Should not update a comment with an invalid ID", async () => {
            const res = await request(app).patch("/comments/d1b04121-8616-45ee-b605-8afd5846abf7").send({
                content: "This is a test comment",
            });
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Comment with id d1b04121-8616-45ee-b605-8afd5846abf7 was not found");
        });
    });

    describe("DELETE /comments/:id", () => {
        it("Should delete a comment successfully", async () => {
            const res = await request(app).delete(`/comments/${commentId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Comment deleted");
        });

        it("Should not delete a comment with an invalid ID", async () => {
            const res = await request(app).delete("/comments/d1b04121-8616-45ee-b605-8afd5846abf7");
            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Comment with id d1b04121-8616-45ee-b605-8afd5846abf7 was not found");
        });
    });
});