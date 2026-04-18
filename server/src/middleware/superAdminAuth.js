const crypto = require('crypto');
const { SUPER_ADMIN_KEY } = require('../config/env');

const MIN_KEY_LEN = 32;
const KEY_OK = typeof SUPER_ADMIN_KEY === 'string' && SUPER_ADMIN_KEY.length >= MIN_KEY_LEN;

if (SUPER_ADMIN_KEY && !KEY_OK) {
  console.warn(`[security] SUPER_ADMIN_KEY too short (<${MIN_KEY_LEN} chars). Endpoint disabled.`);
}

const timingSafeEqualStr = (a, b) => {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  const len = Math.max(bufA.length, bufB.length, 1);
  const padA = Buffer.alloc(len, 0);
  const padB = Buffer.alloc(len, 0);
  bufA.copy(padA);
  bufB.copy(padB);
  const eq = crypto.timingSafeEqual(padA, padB);
  return eq && bufA.length === bufB.length;
};

const clientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

const superAdminAuth = (req, res, next) => {
  if (!KEY_OK) {
    return res.status(503).json({ error: 'Super admin disabled' });
  }
  const provided = req.get('X-Super-Admin-Key') || '';
  const ok = provided && timingSafeEqualStr(provided, SUPER_ADMIN_KEY);
  if (!ok) {
    console.warn(`[audit] super-admin denied ip=${clientIp(req)} ua="${(req.get('user-agent') || '').slice(0, 120)}"`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  console.log(`[audit] super-admin granted ip=${clientIp(req)}`);
  next();
};

module.exports = superAdminAuth;
