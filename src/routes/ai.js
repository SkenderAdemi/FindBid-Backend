import { Router } from 'express';
import { refineInput } from '../services/openai.js';

const router = Router();

/** POST /ai/refine - Refine natural-language input using OpenAI gpt-4o-mini */
router.post('/refine', async (req, res, next) => {
  try {
    const { input } = req.body || {};
    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Body must include "input" (non-empty string)',
      });
    }
    const result = await refineInput(input);
    res.json(result);
  } catch (err) {
    if (err.message === 'OPENAI_API_KEY is not set') {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'AI refine is not configured. Set OPENAI_API_KEY.',
      });
    }
    if (err.message?.startsWith('OpenAI API error:') || err.message?.startsWith('Invalid response')) {
      return res.status(502).json({
        error: 'upstream_error',
        message: err.message,
      });
    }
    next(err);
  }
});

export default router;
