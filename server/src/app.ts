import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Register route modules here, e.g.:
// import exampleRouter from './routes/example';
// app.use('/api/example', exampleRouter);

export default app;
