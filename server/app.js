import express from 'express';
import { IngredientsRouter } from './routes/ingredients';

const app = express();

app.use(express.json());

app.get('/', (_, res) => {
    res.status(200).json({ alive: "True" });
});

app.use('/ingredients', IngredientsRouter);

export default app;