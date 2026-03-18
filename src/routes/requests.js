import { Router } from 'express';
import { store } from '../store.js';
import { listBids, createBid } from './bids.js';

const router = Router();

/** GET /requests - List current user's requests */
router.get('/myRequests/:userId', async (req, res, next) => {
  try {
    const status = req.query.status;
    const list = await store.listRequests(req.params.userId, status);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/** GET /requests/nearby - List requests for map */
router.get('/nearby', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = req.query.radiusKm != null ? parseFloat(req.query.radiusKm) : 10;
    const serviceType = req.query.serviceType;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'bad_request', message: 'lat and lng required' });
    }
    const list = await store.listRequestsNearby(lat, lng, radiusKm, serviceType);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/** GET /requests/:id - Get one request with bids */
router.get('/:id', async (req, res, next) => {
  try {
    const reqEntity = await store.getRequest(req.params.id);
    if (!reqEntity) return res.status(404).json({ error: 'not_found', message: 'Request not found' });
    res.json(reqEntity);
  } catch (err) {
    next(err);
  }
});

/** POST /requests - Create request */
router.post('/', async (req, res, next) => {
  try {
    const { serviceType, time, location, lat, lng, radius, message, phone, userId, userName, status } = req.body || {};
    if (!serviceType || !time) {
      return res.status(400).json({ error: 'bad_request', message: 'serviceType and time required' });
    }
    const created = await store.createRequest({
      serviceType,
      time,
      userId,
      userName,
      status,
      location: location || '',
      lat,
      lng,
      radius: radius ?? 5,
      message: message || '',
      phone: phone || '',
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/** PATCH /requests/:id - Update request */
router.patch('/:id', async (req, res, next) => {
  try {
    const reqEntity = await store.getRequest(req.params.id);
    if (!reqEntity) return res.status(404).json({ error: 'not_found', message: 'Request not found' });
    if (reqEntity.userId !== req.userId) return res.status(403).json({ error: 'forbidden', message: 'Not your request' });
    if (reqEntity.status !== 'pending' && reqEntity.status !== 'bidding') {
      return res.status(422).json({ error: 'unprocessable', message: 'Request cannot be edited' });
    }
    const patch = {};
    if (req.body.message !== undefined) patch.message = req.body.message;
    if (req.body.requestedTime !== undefined) patch.requestedTime = req.body.requestedTime;
    const updated = await store.updateRequest(req.params.id, patch);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** POST /requests/:id/cancel - Cancel request */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const reqEntity = await store.getRequest(req.params.id);
    if (!reqEntity) return res.status(404).json({ error: 'not_found', message: 'Request not found' });
    if (reqEntity.userId !== req.userId) return res.status(403).json({ error: 'forbidden', message: 'Not your request' });
    const updated = await store.cancelRequest(req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** GET /requests/:requestId/bids */
router.get('/:requestId/bids', listBids);
/** POST /requests/:requestId/bids */
router.post('/:requestId/bids', createBid);

export default router;
