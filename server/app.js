import express from 'express';
import { IngredientsRouter } from './routes/ingredients';
import { RecipesRouter } from './routes/recipes';
import { CollectionsRouter } from './routes/collections';
import { CommentsRouter } from './routes/comments';
import { RatingsRouter } from './routes/ratings';
import { UsersRouter } from './routes/users';

const app = express();
app.use(express.json());

app.get('/', (_, res) => {
    res.status(200).json({ alive: "True" });
});

app.use('/users', UsersRouter)
app.use('/ingredients', IngredientsRouter);
app.use('/recipes', RecipesRouter);
app.use('/collections', CollectionsRouter);
app.use('/comments', CommentsRouter);
app.use('/ratings', RatingsRouter);

export default app;