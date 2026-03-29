import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

/** Matches admin dashboard service-type options. */
const ALLOWED_SERVICE_TYPES = [
  'property',
  'private_clinic',
  'barber',
  'massage',
  'beauty',
  'auto_mechanic',
  'cleaning',
  'repair',
  'handyman',
];

function normalizeServiceType(raw) {
  const s = raw != null ? String(raw).trim() : 'property';
  return ALLOWED_SERVICE_TYPES.includes(s) ? s : 'property';
}

function validateCreateBody(body) {
  const errors = [];
  if (body.title == null || String(body.title).trim() === '') {
    errors.push('title is required');
  }
  if (body.description == null || String(body.description).trim() === '') {
    errors.push('description is required');
  }
  const lat = body.lat != null ? Number(body.lat) : NaN;
  const lng = body.lng != null ? Number(body.lng) : NaN;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push('lat must be a valid latitude (-90 to 90)');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.push('lng must be a valid longitude (-180 to 180)');
  }
  return { errors, lat, lng };
}

/** GET /properties/mine – get user's property. userId from query: ?userId= */
router.get('/mine', async (req, res, next) => {
  try {
    const userId = req.query.userId != null ? String(req.query.userId).trim() : '';
    if (!userId) {
      return res.status(400).json({ error: 'validation_error', message: 'userId is required (query param)' });
    }
    const property = await store.getProviderByUserId(userId);
    if (!property) return res.status(404).json({ error: 'not_found', message: 'No property listing found' });
    res.json(property);
  } catch (err) {
    next(err);
  }
});

/** PATCH /properties/mine – update current user's listing (office location and details). ?userId= */
router.patch('/mine', async (req, res, next) => {
  try {
    const userId = req.query.userId != null ? String(req.query.userId).trim() : '';
    if (!userId) {
      return res.status(400).json({ error: 'validation_error', message: 'userId is required (query param)' });
    }

    const existing = await store.getProviderByUserId(userId);
    if (!existing) {
      return res.status(404).json({ error: 'not_found', message: 'No property listing found' });
    }

    const { errors, lat, lng } = validateCreateBody(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: errors.join('; '),
        fields: errors,
      });
    }

    const userEmail =
      req.body.userEmail != null ? String(req.body.userEmail).trim() : existing.userEmail || '';
    const serviceTypeFinal = normalizeServiceType(req.body.serviceType);

    const property = await store.updatePropertyByUserId(userId, {
      title: String(req.body.title).trim(),
      description: String(req.body.description).trim(),
      serviceType: serviceTypeFinal,
      address: req.body.address != null ? String(req.body.address).trim() || null : undefined,
      lat,
      lng,
      userEmail: userEmail || undefined,
    });
    if (!property) {
      return res.status(404).json({ error: 'not_found', message: 'No property listing found' });
    }
    res.json(property);
  } catch (err) {
    next(err);
  }
});

/** POST /properties – create property. userId and userEmail from request body (payload). */
router.post('/', async (req, res, next) => {
  try {
    const userId = req.body.userId != null ? String(req.body.userId).trim() : '';
    const userEmail = req.body.userEmail != null ? String(req.body.userEmail).trim() : '';
    if (!userId) {
      return res.status(400).json({ error: 'validation_error', message: 'userId is required in body' });
    }
    if (!userEmail) {
      return res.status(400).json({ error: 'validation_error', message: 'userEmail is required in body' });
    }

    const existing = await store.getProviderByUserId(userId);
    if (existing) {
      return res.status(409).json({
        error: 'one_per_user',
        message: 'You already have a property listing. Each user can create only one.',
      });
    }

    const { errors, lat, lng } = validateCreateBody(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: errors.join('; '),
        fields: errors,
      });
    }

    const serviceTypeFinal = normalizeServiceType(req.body.serviceType);

    const property = await store.createProperty({
      userId,
      userEmail: userEmail || undefined,
      title: String(req.body.title).trim(),
      description: String(req.body.description).trim(),
      serviceType: serviceTypeFinal,
      address: req.body.address != null ? String(req.body.address).trim() || null : null,
      lat,
      lng,
    });
    res.status(201).json(property);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'one_per_user',
        message: 'You already have a property listing. Each user can create only one.',
      });
    }
    next(err);
  }
});

/** GET /properties/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const property = await store.getProperty(req.params.id);
    if (!property) return res.status(404).json({ error: 'not_found', message: 'Property not found' });
    res.json(property);
  } catch (err) {
    next(err);
  }
});

export default router;
