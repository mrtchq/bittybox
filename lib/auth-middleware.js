import { validateApiKey, getUserBySession } from './account-store.js';

/**
 * Middleware to extract and optionally enforce API Key or Session Authentication
 */
export function authMiddleware(options = { required: false }) {
  return (req, res, next) => {
    let authHeader = req.headers['authorization'] || '';
    let apiKey = req.headers['x-api-key'] || req.query.apiKey || '';
    let sessionId = req.headers['x-session-id'] || req.cookies?.bitty_session || '';

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token.startsWith('bb_live_')) {
        apiKey = token;
      } else if (token.startsWith('bb_sess_')) {
        sessionId = token;
      }
    }

    if (apiKey) {
      const validation = validateApiKey(apiKey);
      if (validation.valid) {
        req.user = validation.user;
        req.apiKeyMeta = validation.keyMeta;
        req.authType = 'api_key';
        return next();
      } else if (options.required) {
        return res.status(401).json({
          success: false,
          error: validation.error || 'Invalid API Key'
        });
      }
    }

    if (sessionId) {
      const user = getUserBySession(sessionId);
      if (user) {
        req.user = user;
        req.sessionId = sessionId;
        req.authType = 'session';
        return next();
      }
    }

    if (options.required) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Provide an API key via "Authorization: Bearer <key>" or "X-API-Key" header.'
      });
    }

    next();
  };
}
