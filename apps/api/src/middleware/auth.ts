import { Request, Response, NextFunction } from 'express';
import { AuthService, SanitizedUser } from '../services/auth.service';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: SanitizedUser | null;
      authToken?: string | null;
    }
  }
}

/**
 * Extracts session token from headers or cookies.
 */
export function extractToken(req: Request): string | null {
  // 1. Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Custom header
  const customHeader = req.headers['x-auth-token'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }

  // 3. Cookie header: "auth_token=<token>"
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const authCookie = cookies.find((c) => c.startsWith('auth_token='));
    if (authCookie) {
      return decodeURIComponent(authCookie.substring('auth_token='.length));
    }
  }

  return null;
}

/**
 * Middleware: Strictly requires an authenticated user session.
 * Rejects unauthenticated requests with 401 UNAUTHORIZED.
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in to continue.',
      },
    });
  }

  const user = await AuthService.validateSession(token);
  if (!user) {
    return res.status(401).json({
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Your session has expired or is invalid. Please sign in again.',
      },
    });
  }

  req.user = user;
  req.authToken = token;
  next();
}

/**
 * Middleware: Attaches req.user if a valid token is provided,
 * but does not reject the request if absent (allows backward-compatible demo access).
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (token) {
    const user = await AuthService.validateSession(token);
    if (user) {
      req.user = user;
      req.authToken = token;
    }
  }

  next();
}

/**
 * Middleware: Enforces specific role (e.g. 'ADMIN').
 */
export function requireRole(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    if (req.user.role !== requiredRole && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires ${requiredRole} role.`,
        },
      });
    }

    next();
  };
}
