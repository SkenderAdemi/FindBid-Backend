import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

/** POST /bids/:id/accept - Accept a bid (user) */
router.post('/:id/accept', async (req, res, next) => {
  try {
    const bid = await store.acceptBid(req.params.id);
    if (!bid) return res.status(404).json({ error: 'not_found', message: 'Bid not found' });
    const reqEntity = await store.getRequest(bid.requestId);
    res.json(reqEntity || bid);
  } catch (err) {
    next(err);
  }
});

export default router;
