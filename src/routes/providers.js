import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

/** GET /providers - List providers */
router.get('/', async (req, res, next) => {
  try {
    const filters = {
      serviceType: req.query.serviceType,
      search: req.query.search,
      lat: req.query.lat != null ? parseFloat(req.query.lat) : undefined,
      lng: req.query.lng != null ? parseFloat(req.query.lng) : undefined,
      radiusKm: req.query.radiusKm != null ? parseFloat(req.query.radiusKm) : undefined,
    };
    const list = await store.listProviders(filters);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/** GET /providers/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const provider = await store.getProvider(req.params.id);
    if (!provider) return res.status(404).json({ error: 'not_found', message: 'Provider not found' });
    res.json(provider);
  } catch (err) {
    next(err);
  }
});

export default router;
