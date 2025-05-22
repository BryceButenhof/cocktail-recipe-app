import express from 'express';
import { IngredientsRouter } from './routes/ingredients';
import { RecipesRouter } from './routes/recipes';

const app = express();
app.use(express.json());

app.get('/', (_, res) => {
    res.status(200).json({ alive: "True" });
});

app.use('/ingredients', IngredientsRouter);
app.use('/recipes', RecipesRouter);

export default app;