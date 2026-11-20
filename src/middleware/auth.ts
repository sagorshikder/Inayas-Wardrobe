import fs from 'node:fs';
import path from 'node:path';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL?.trim() || '').toLowerCase();

let cachedDevSecret: string | null = null;

function getAuthSecret(): string {
  const envSecret = process.env.AUTH_SECRET?.trim() || '';
  if (envSecret.length >= 32) {
    return envSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET environment variable must be set to at least 32 characters in production.',
    );
  }

  if (cachedDevSecret) return cachedDevSecret;

  // Persist a stable dev-only secret locally so dev restarts don't invalidate sessions
  const devSecretPath = path.resolve(process.cwd(), 'data', '.dev-auth-secret');
  try {
    if (fs.existsSync(devSecretPath)) {
      const existing = fs.readFileSync(devSecretPath, 'utf8').trim();
      if (existing.length >= 32) {
        cachedDevSecret = existing;
        return cachedDevSecret;
      }
    }
    fs.mkdirSync(path.dirname(devSecretPath), { recursive: true });
    cachedDevSecret = randomBytes(32).toString('hex');
    fs.writeFileSync(devSecretPath, cachedDevSecret, { mode: 0o600 });
  } catch {
    cachedDevSecret = randomBytes(32).toString('hex');
  }
  return cachedDevSecret;
}

export function validateSecurityEnvironment(): void {
  const envSecret = process.env.AUTH_SECRET?.trim() || '';
  if (process.env.NODE_ENV === 'production') {
    if (envSecret.length < 32) {
      throw new Error(
        'Startup aborted: AUTH_SECRET must be set (minimum 32 characters) when NODE_ENV=production.',
      );
    }
  } else if (!envSecret) {
    console.warn('[dev] AUTH_SECRET is not set; using local development session secret.');
  }
}

export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
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

export function signSessionToken(
  payload: Omit<SessionUser, 'exp'>,
  ttlSeconds = 60 * 60 * 24 * 7,
): string {
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

export function isAuthorizedAdminUser(user?: Pick<SessionUser, 'email' | 'role'> | null): boolean {
  if (!user || user.role !== 'admin') return false;
  if (ADMIN_EMAIL) {
    return user.email.toLowerCase() === ADMIN_EMAIL;
  }
  return true;
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
    if (!isAuthorizedAdminUser(req.user)) {
      res.status(403).json({ error: 'Forbidden: Store administrator access required' });
      return;
    }
    next();
  });
}
