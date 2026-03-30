import { Router } from 'express';
import { store } from '../store.js';
import prisma from '../db.js';
import { emitToUser } from '../realtime.js';

const router = Router();

/** GET /bids/accepted-for-my-provider?userId= - Accepted bids where provider belongs to this userId */
router.get('/accepted-for-my-provider', async (req, res, next) => {
  try {
    const userId = req.query.userId != null ? String(req.query.userId).trim() : '';
    if (!userId) {
      return res.status(400).json({ error: 'validation_error', message: 'userId query param required' });
    }
    const list = await store.listAcceptedBidsForUserId(userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/** POST /bids/:id/accept - Accept a bid (user) */
router.post('/:id/accept', async (req, res, next) => {
  try {
    const bid = await store.acceptBid(req.params.id);
    if (!bid) return res.status(404).json({ error: 'not_found', message: 'Bid not found' });
    const reqEntity = await store.getRequest(bid.requestId);
    if (reqEntity) {
      emitToUser(reqEntity.userId, { type: 'request_updated', request: reqEntity });
    }
    const provider = await prisma.provider.findUnique({
      where: { id: bid.providerId },
      select: { userId: true },
    });
    if (provider?.userId) {
      emitToUser(provider.userId, { type: 'provider_booking_changed' });
    }
    res.json(reqEntity || bid);
  } catch (err) {
    next(err);
  }
});

export default router;
