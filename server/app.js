import express from 'express';
import { IngredientsRouter } from './routes/ingredients';
import { RecipesRouter } from './routes/recipes';
import { CollectionsRouter } from './routes/collections';

const app = express();
app.use(express.json());

app.get('/', (_, res) => {
    res.status(200).json({ alive: "True" });
});

app.use('/ingredients', IngredientsRouter);
app.use('/recipes', RecipesRouter);
app.use('/collections', CollectionsRouter);

export default app;