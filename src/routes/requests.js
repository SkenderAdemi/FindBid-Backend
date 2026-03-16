import { Router } from 'express';
import { store } from '../store.js';
import { listBids, createBid } from './bids.js';

const router = Router();

/** GET /requests - List current user's requests */
router.get('/', (req, res) => {
  const status = req.query.status; // active | completed | cancelled
  const list = store.listRequests(req.userId, status);
  res.json(list);
});

/** GET /requests/nearby - List requests for map */
router.get('/nearby', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = req.query.radiusKm != null ? parseFloat(req.query.radiusKm) : 10;
  const serviceType = req.query.serviceType;
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'bad_request', message: 'lat and lng required' });
  }
  const list = store.listRequestsNearby(lat, lng, radiusKm, serviceType);
  res.json(list);
});

/** GET /requests/:id - Get one request with bids */
router.get('/:id', (req, res) => {
  const reqEntity = store.getRequest(req.params.id);
  if (!reqEntity) return res.status(404).json({ error: 'not_found', message: 'Request not found' });
  res.json(reqEntity);
});

/** POST /requests - Create request */
router.post('/', (req, res) => {
  const { serviceType, time, location, radius, message } = req.body || {};
  if (!serviceType || !time) {
    return res.status(400).json({ error: 'bad_request', message: 'serviceType and time required' });
  }
  const created = store.createRequest(req.userId, req.userName, {
    serviceType,
    time,
    location: location || '',
    radius: radius ?? 5,
    message: message || '',
  });
  res.status(201).json(created);
});

/** PATCH /requests/:id - Update request */
router.patch('/:id', (req, res) => {
  const reqEntity = store.getRequest(req.params.id);
  if (!reqEntity) return res.status(404).json({ error: 'not_found', message: 'Request not found' });
  if (reqEntity.userId !== req.userId) return res.status(403).json({ error: 'forbidden', message: 'Not your request' });
  if (reqEntity.status !== 'pending' && reqEntity.status !== 'bidding') {
    return res.status(422).json({ error: 'unprocessable', message: 'Request cannot be edited' });
  }
  const patch = {};
  if (req.body.message !== undefined) patch.message = req.body.message;
  if (req.body.requestedTime !== undefined) patch.requestedTime = req.body.requestedTime;
  const updated = store.updateRequest(req.params.id, patch);
  res.json(updated);
});

/** POST /requests/:id/cancel - Cancel request */
router.post('/:id/cancel', (req, res) => {
  const reqEntity = store.getRequest(req.params.id);
  if (!reqEntity) return res.status(404).json({ error: 'not_found', message: 'Request not found' });
  if (reqEntity.userId !== req.userId) return res.status(403).json({ error: 'forbidden', message: 'Not your request' });
  const updated = store.cancelRequest(req.params.id);
  res.json(updated);
});

/** GET /requests/:requestId/bids */
router.get('/:requestId/bids', listBids);
/** POST /requests/:requestId/bids */
router.post('/:requestId/bids', createBid);

export default router;
