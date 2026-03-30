import { Router } from 'express';
import { store } from '../store.js';
import { listBids, createBid } from './bids.js';

const router = Router();

/** Require ?userId= and match authenticated user (req.userId from optionalAuth). */
function requireQueryUserId(req, res) {
  const userId = req.query.userId || '';
  
  if (!userId) {
    res.status(400).json({ error: 'validation_error', message: 'userId is required (query param)' });
    return null;
  }
  
  return userId;
}

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

/** GET /requests/nearby?userId=&lat=&lng= - List current user's requests within radius (Bearer required; userId query must match token) */
router.get('/nearby', async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.json([]);
    }
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = req.query.radiusKm != null ? parseFloat(req.query.radiusKm) : 20;
    const serviceType = req.query.serviceType;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'bad_request', message: 'lat and lng required' });
    }
    const scopedUserId = requireQueryUserId(req, res);
    if (!scopedUserId) return;
    const list = await store.listRequestsNearby(lat, lng, radiusKm, serviceType, scopedUserId);
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
    const { serviceType, time, location, lat, lng, radius, message, phone, userId, userName, email, status } = req.body || {};
    if (!serviceType || !time) {
      return res.status(400).json({ error: 'bad_request', message: 'serviceType and time required' });
    }
    const created = await store.createRequest({
      serviceType,
      time,
      userId,
      userName,
      email: email ?? '',
      status,
      location: location || '',
      lat,
      lng,
      radius: radius ?? 20,
      message: message || '',
      phone: phone || '',
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/** PATCH /requests/:id?userId= - Update request */
router.patch('/:id', async (req, res, next) => {
  try {
    const ownerUserId = requireQueryUserId(req, res);
    if (!ownerUserId) return;
    const reqEntity = await store.getRequest(req.params.id);
    if (!reqEntity) return res.status(404).json({ error: 'not_found', message: 'Request not found' });
    if (reqEntity.userId !== ownerUserId) return res.status(403).json({ error: 'forbidden', message: 'Not your request' });
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

/** POST /requests/:id/cancel?userId= - Delete request and all related bids (owner only) */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const ownerUserId = requireQueryUserId(req, res);
    console.log(ownerUserId);
    
    if (!ownerUserId) return;
    const result = await store.deleteRequestForUser(req.params.id, ownerUserId);
    if (!result.ok) {
      if (result.reason === 'forbidden') {
        return res.status(403).json({ error: 'forbidden', message: 'Not your request' });
      }
      return res.status(404).json({ error: 'not_found', message: 'Request not found' });
    }
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

/** GET /requests/:requestId/bids */
router.get('/:requestId/bids', listBids);
/** POST /requests/:requestId/bids */
router.post('/:requestId/bids', createBid);

export default router;
