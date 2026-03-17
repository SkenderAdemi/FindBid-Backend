/**
 * Optional auth: read Bearer token. If Firebase Admin is configured, verify ID token and set req.userId / req.userName.
 * Otherwise (or if no/invalid token), use default user so API works without auth.
 */
import { getFirebaseAuth } from '../lib/firebaseAdmin.js';

async function optionalAuthHandler(req, res, next) {
  const defaultUserId = 'user1';
  const defaultUserName = 'User';

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.userId = defaultUserId;
    req.userName = defaultUserName;
    return next();
  }

  const token = header.slice(7);
  const auth = getFirebaseAuth();
  if (!auth) {
    req.userId = defaultUserId;
    req.userName = defaultUserName;
    return next();
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.userId = decoded.uid;
    req.userName = decoded.name || decoded.email || defaultUserName;
  } catch {
    req.userId = defaultUserId;
    req.userName = defaultUserName;
  }
  next();
}

export function optionalAuth(req, res, next) {
  optionalAuthHandler(req, res, next).catch(next);
}
