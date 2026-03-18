import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

/** GET /requests/:requestId/bids - List bids for a request (mounted under requests) */
export async function listBids(req, res, next) {
  try {
    const requestId = req.params.requestId;
    const reqEntity = await store.getRequest(requestId);
    if (!reqEntity) return res.status(404).json({ error: 'not_found', message: 'Request not found' });
    const list = await store.listBids(requestId);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

/** POST /requests/:requestId/bids - Create bid (provider) */
export async function createBid(req, res, next) {
  try {
    const requestId = req.params.requestId;
    const reqEntity = await store.getRequest(requestId);
    if (!reqEntity) return res.status(404).json({ error: 'not_found', message: 'Request not found' });
    const { price, availableTime, message, status, distance } = req.body || {};
    console.log(status);
    
    if (price == null) return res.status(400).json({ error: 'bad_request', message: 'price required' });
    const providerId = req.body.providerId || req.userId || 'p1';
    const bid = await store.createBid(requestId, providerId, {
      price: Number(price),
      availableTime: availableTime || '',
      message: message || '',
      status: status || 'pending',
      distance: distance != null ? Number(distance) : undefined,
    });
    if (!bid) return res.status(500).json({ error: 'server_error', message: 'Failed to create bid' });
    res.status(201).json(bid);
  } catch (err) {
    next(err);
  }
}
