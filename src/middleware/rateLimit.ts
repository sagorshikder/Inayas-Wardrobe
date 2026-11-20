import type { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
}) {
  const hits = new Map<string, Bucket>();

  // Periodic cleanup of expired rate-limit buckets
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of hits.entries()) {
      if (bucket.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, Math.max(60_000, options.windowMs));
  timer.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : '') ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    const key = `${req.path}:${clientIp}`;
    const now = Date.now();
    let bucket = hits.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      hits.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, options.max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > options.max) {
      const retrySeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retrySeconds));
      res.status(429).json({ error: options.message });
      return;
    }

    next();
  };
}
