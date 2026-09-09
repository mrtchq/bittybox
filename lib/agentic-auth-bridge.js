/**
 * Thin re-export so the agentic-boxes router can import auth helpers from one place.
 * Avoids duplicating the auth logic and keeps the subsystem cohesive.
 *
 * authMiddleware: optional/required session+apikey extraction (see auth-middleware.js).
 * requireUser: tiny guard that ensures req.user exists (use after authMiddleware).
 */

export { authMiddleware } from './auth-middleware.js';

export function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  next();
}
