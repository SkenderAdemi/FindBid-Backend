import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

/** GET /requests/:requestId/bids - List bids for a request (mounted under requests) */
export function listBids(req, res) {
  const requestId = req.params.requestId;
  const reqEntity = store.getRequest(requestId);
  if (!reqEntity) return res.status(404).json({ error: 'not_found', message: 'Request not found' });
  const list = store.listBids(requestId);
  res.json(list);
}

/** POST /requests/:requestId/bids - Create bid (provider) */
export function createBid(req, res) {
  const requestId = req.params.requestId;
  const reqEntity = store.getRequest(requestId);
  if (!reqEntity) return res.status(404).json({ error: 'not_found', message: 'Request not found' });
  const { price, availableTime, message } = req.body || {};
  if (price == null) return res.status(400).json({ error: 'bad_request', message: 'price required' });
  const providerId = req.body.providerId || req.userId || 'p1';
  const bid = store.createBid(requestId, providerId, {
    price: Number(price),
    availableTime: availableTime || '',
    message: message || '',
  });
  if (!bid) return res.status(500).json({ error: 'server_error', message: 'Failed to create bid' });
  res.status(201).json(bid);
}
