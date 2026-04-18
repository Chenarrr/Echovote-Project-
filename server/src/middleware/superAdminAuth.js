const crypto = require('crypto');
const { SUPER_ADMIN_KEY } = require('../config/env');

const timingSafeEqualStr = (a, b) => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    const filler = Buffer.alloc(bufA.length, 0);
    crypto.timingSafeEqual(bufA, filler);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

const superAdminAuth = (req, res, next) => {
  if (!SUPER_ADMIN_KEY) {
    return res.status(503).json({ error: 'Super admin disabled' });
  }
  const provided = req.get('X-Super-Admin-Key') || req.body?.key || '';
  if (!provided || !timingSafeEqualStr(String(provided), SUPER_ADMIN_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

module.exports = superAdminAuth;
