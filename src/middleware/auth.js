/**
 * Optional auth: read Bearer token. If Firebase Admin is configured, verify ID token and set req.userId / req.userName.
 * Otherwise (or if no/invalid token), use default user so API works without auth.
 */
import { getFirebaseAuth } from '../lib/firebaseAdmin.js';

async function optionalAuthHandler(req, res, next) {
  const defaultUserId = 'user1';
  const defaultUserName = 'User';
  const defaultUserEmail = '';

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.userId = defaultUserId;
    req.userName = defaultUserName;
    req.userEmail = defaultUserEmail;
    return next();
  }

  const token = header.slice(7);
  const auth = getFirebaseAuth();
  if (!auth) {
    req.userId = defaultUserId;
    req.userName = defaultUserName;
    req.userEmail = defaultUserEmail;
    return next();
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.userId = decoded.uid;
    req.userName = decoded.name || decoded.email || defaultUserName;
    req.userEmail = decoded.email || defaultUserEmail;
  } catch {
    req.userId = defaultUserId;
    req.userName = defaultUserName;
    req.userEmail = defaultUserEmail;
  }
  next();
}

/** Require valid Bearer token; responds 401 if missing or invalid. When Firebase Admin is not configured (e.g. local dev), allows request with a dev user so you can test. */
async function requiredAuthHandler(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
  }
  const auth = getFirebaseAuth();
  if (!auth) {
    // Firebase Admin not configured (e.g. local dev): allow through with dev user so property/create works for testing
    req.userId = 'dev-user-local';
    req.userName = 'Dev User';
    req.userEmail = 'dev@local.test';
    return next();
  }
  try {
    const token = header.slice(7);
    const decoded = await auth.verifyIdToken(token);
    req.userId = decoded.uid;
    req.userName = decoded.name || decoded.email || 'User';
    req.userEmail = decoded.email || '';
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

function requiredAuth(req, res, next) {
  requiredAuthHandler(req, res, next).catch(next);
}

export function optionalAuth(req, res, next) {
  optionalAuthHandler(req, res, next).catch(next);
}

export { requiredAuth };
