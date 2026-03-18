import express from 'express';
import cors from 'cors';
import { optionalAuth } from './middleware/auth.js';
import requestsRouter from './routes/requests.js';
import bidsStandaloneRouter from './routes/bidsStandalone.js';
import providersRouter from './routes/providers.js';
import aiRouter from './routes/ai.js';

const app = express();

const corsOrigins = [
  'https://findbid.live',
  'https://find-bid.vercel.app',
  ...(process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
];
app.use(cors({
  origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0] || true,
  credentials: true,
}));

app.use(express.json());
app.use(optionalAuth);

const v1 = express.Router();
v1.use('/requests', requestsRouter);
v1.use('/bids', bidsStandaloneRouter);
v1.use('/providers', providersRouter);
v1.use('/ai', aiRouter);

app.use('/v1', v1);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error', message: err.message || 'Internal server error' });
});

export default app;
