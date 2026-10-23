import crypto from 'crypto';
import type { Response, NextFunction } from 'express';
import { getDb } from '../../db/database';
import type { AuthenticatedRequest, User } from './types';

const tokenSecret =
  process.env.PADEL_TOKEN_SECRET || 'padel-club-secret-key-2026-sdd';

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

interface TokenPayload {
  userId: number;
  email: string;
  exp: number;
}

export const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
};

export const verifyPassword = (password: string, storedHash: string): boolean => {
  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    return false;
  }
  const [salt, keyHex] = parts;
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(keyHex, 'hex');
  if (derivedBuffer.length !== keyBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(derivedBuffer, keyBuffer);
};

export const createAuthToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', tokenSecret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
};

export const verifyAuthToken = (token: string): User | null => {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }
  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', tokenSecret)
    .update(encodedPayload)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    ) as TokenPayload;
    if (!payload.userId || !payload.email || payload.exp < Date.now()) {
      return null;
    }
    const db = getDb();
    const row = db
      .prepare('SELECT id, email FROM users WHERE id = ?')
      .get(payload.userId) as { id: number; email: string } | undefined;
    if (!row) {
      return null;
    }
    return { id: row.id, email: row.email };
  } catch {
    return null;
  }
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const registerUser = (
  rawEmail: unknown,
  rawPassword: unknown
): { status: number; body: Record<string, unknown> } => {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const password = typeof rawPassword === 'string' ? rawPassword : '';

  if (!isValidEmail(email) || password.length < 6) {
    return {
      status: 400,
      body: {
        error:
          'Debes proporcionar un correo electrónico válido y una contraseña de al menos 6 caracteres'
      }
    };
  }

  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email) as { id: number } | undefined;

  if (existing) {
    return {
      status: 409,
      body: { error: 'El correo electrónico ya está registrado' }
    };
  }

  const passwordHash = hashPassword(password);
  const result = db
    .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .run(email, passwordHash);

  const user: User = {
    id: Number(result.lastInsertRowid),
    email
  };
  const token = createAuthToken(user);

  return {
    status: 201,
    body: { token, user }
  };
};

export const loginUser = (
  rawEmail: unknown,
  rawPassword: unknown
): { status: number; body: Record<string, unknown> } => {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const password = typeof rawPassword === 'string' ? rawPassword : '';

  if (!email || !password) {
    return {
      status: 400,
      body: { error: 'Debes ingresar correo electrónico y contraseña' }
    };
  }

  const db = getDb();
  const row = db
    .prepare('SELECT id, email, password_hash, created_at FROM users WHERE email = ?')
    .get(email) as UserRow | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    return {
      status: 401,
      body: { error: 'Correo electrónico o contraseña incorrectos' }
    };
  }

  const user: User = { id: row.id, email: row.email };
  const token = createAuthToken(user);

  return {
    status: 200,
    body: { token, user }
  };
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res
      .status(401)
      .json({ error: 'Debes iniciar sesión para realizar esta acción' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const user = verifyAuthToken(token);
  if (!user) {
    res
      .status(401)
      .json({ error: 'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente' });
    return;
  }

  req.user = user;
  next();
};
