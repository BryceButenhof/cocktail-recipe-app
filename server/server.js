import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';
import { RecipesRouter } from './routes/recipes.js';
import { IngredientsRouter } from './routes/ingredients.js';
import { UsersRouter } from './routes/users.js';

const PORT = process.env.PORT || 5050;
const app = express();

// Parsing Middleware
app.use(express.json());
app.use(cors());

app.use('/recipes', RecipesRouter);
app.use('/ingredients', IngredientsRouter);
app.use('/users', UsersRouter);

if (!process.env.ATLAS_URI) {
    throw new Error('ATLAS_URI is not defined in the environment variables');
}

mongoose.connect(process.env.ATLAS_URI);

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} and has been successfully connected to the database!`);
});