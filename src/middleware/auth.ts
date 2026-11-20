import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL?.trim() || 'sagorshikder707@gmail.com'
).toLowerCase();

const EPHEMERAL_FALLBACK_SECRET = randomBytes(32).toString('hex');

function getAuthSecret(): string {
  return process.env.AUTH_SECRET?.trim() || process.env.DB_PASSWORD?.trim() || EPHEMERAL_FALLBACK_SECRET;
}

export interface SessionUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'customer';
  exp: number;
}

export interface AuthRequest extends Request {
  user?: SessionUser;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const actualBuf = scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}

export function signSessionToken(payload: Omit<SessionUser, 'exp'>, ttlSeconds = 60 * 60 * 24 * 7): string {
  const fullPayload: SessionUser = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = createHmac('sha256', getAuthSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = createHmac('sha256', getAuthSecret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionUser;
    if (!parsed.uid || !parsed.email || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const decoded = verifySessionToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing bearer token' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const decoded = verifySessionToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }
  req.user = decoded;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const isOwner =
      req.user?.role === 'admin' && req.user.email.toLowerCase() === ADMIN_EMAIL;
    if (!isOwner) {
      res.status(403).json({ error: 'Forbidden: Store administrator access required' });
      return;
    }
    next();
  });
}
