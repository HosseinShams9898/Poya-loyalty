const buckets = new Map();

function rateLimit({ windowMs = 60_000, max = 10, key = (req) => req.ip, message = 'تعداد درخواست‌ها بیش از حد مجاز است' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const id = `${req.baseUrl}:${req.path}:${key(req)}`;
    const bucket = buckets.get(id);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(id, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
}

module.exports = { rateLimit };
