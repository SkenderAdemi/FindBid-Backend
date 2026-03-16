import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

/** GET /providers - List providers */
router.get('/', (req, res) => {
  const filters = {
    serviceType: req.query.serviceType,
    search: req.query.search,
    lat: req.query.lat != null ? parseFloat(req.query.lat) : undefined,
    lng: req.query.lng != null ? parseFloat(req.query.lng) : undefined,
    radiusKm: req.query.radiusKm != null ? parseFloat(req.query.radiusKm) : undefined,
  };
  const list = store.listProviders(filters);
  res.json(list);
});

/** GET /providers/:id */
router.get('/:id', (req, res) => {
  const provider = store.getProvider(req.params.id);
  if (!provider) return res.status(404).json({ error: 'not_found', message: 'Provider not found' });
  res.json(provider);
});

export default router;
