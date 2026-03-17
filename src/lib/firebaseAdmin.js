/**
 * Firebase Admin SDK for verifying ID tokens. Optional: if not configured, auth middleware uses default user.
 * Set one of: GOOGLE_APPLICATION_CREDENTIALS (path to JSON), or FIREBASE_SERVICE_ACCOUNT_JSON (stringified JSON).
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let auth = null;

function init() {
  if (getApps().length > 0) {
    auth = getAuth();
    return auth;
  }
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let credential = null;
  if (credPath) {
    try {
      const resolved = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
      const serviceAccount = JSON.parse(readFileSync(resolved, 'utf8'));
      credential = cert(serviceAccount);
    } catch (err) {
      console.warn('Firebase Admin: could not load GOOGLE_APPLICATION_CREDENTIALS', err.message);
    }
  } else if (jsonStr) {
    try {
      const serviceAccount = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      credential = cert(serviceAccount);
    } catch (err) {
      console.warn('Firebase Admin: invalid FIREBASE_SERVICE_ACCOUNT_JSON', err.message);
    }
  }
  if (credential) {
    initializeApp({ credential });
    auth = getAuth();
  }
  return auth;
}

export function getFirebaseAuth() {
  return auth ?? init();
}

export function isFirebaseAdminConfigured() {
  return !!getFirebaseAuth();
}
