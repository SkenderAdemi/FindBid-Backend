/**
 * WebSocket hub: one connection per signed-in user (see /v1/ws).
 * Emits JSON messages: bid_created, request_updated, provider_booking_changed.
 */
import { WebSocketServer, WebSocket } from 'ws';
import { getFirebaseAuth } from './lib/firebaseAdmin.js';

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const socketsByUserId = new Map();

function addSocket(userId, ws) {
  if (!socketsByUserId.has(userId)) socketsByUserId.set(userId, new Set());
  socketsByUserId.get(userId).add(ws);
  ws.on('close', () => {
    const set = socketsByUserId.get(userId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) socketsByUserId.delete(userId);
  });
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<{ ok: true, userId: string } | { ok: false, reason: string }>}
 */
async function authenticateWs(req) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `http://${host}`);
  const userId = (url.searchParams.get('userId') || '').trim();
  if (!userId) return { ok: false, reason: 'userId required' };

  const auth = getFirebaseAuth();
  if (auth) {
    const token = (url.searchParams.get('token') || '').trim();
    if (!token) return { ok: false, reason: 'token required' };
    try {
      const decoded = await auth.verifyIdToken(token);
      if (decoded.uid !== userId) return { ok: false, reason: 'userId mismatch' };
      return { ok: true, userId };
    } catch {
      return { ok: false, reason: 'invalid token' };
    }
  }

  // Local / no Firebase Admin: match REST optional-auth behavior for development
  return { ok: true, userId };
}

/**
 * @param {import('http').Server} server
 */
export function initRealtime(server) {
  const wss = new WebSocketServer({ server, path: '/v1/ws' });

  wss.on('connection', async (ws, req) => {
    const auth = await authenticateWs(req);
    if (!auth.ok) {
      ws.close(1008, auth.reason);
      return;
    }
    addSocket(auth.userId, ws);
  });

  return wss;
}

/**
 * Push a JSON payload to all connections for a Firebase user id.
 * @param {string} userId
 * @param {Record<string, unknown>} payload
 */
export function emitToUser(userId, payload) {
  if (!userId || typeof userId !== 'string') return;
  const set = socketsByUserId.get(userId);
  if (!set || set.size === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[realtime] no WS subscribers for userId=%s type=%s', userId, payload.type);
    }
    return;
  }
  const raw = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(raw);
  }
}
