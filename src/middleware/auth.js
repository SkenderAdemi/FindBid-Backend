/**
 * Optional auth: read Bearer token and set req.userId (and req.userName).
 * If no token, use default user so API works without auth for MVP.
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    // In a real app, verify JWT and set req.userId from payload
    req.userId = req.userId || 'user1';
    req.userName = req.userName || 'User';
  } else {
    req.userId = 'user1';
    req.userName = 'User';
  }
  next();
}
