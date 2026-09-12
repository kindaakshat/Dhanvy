import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { authenticateUser, extractToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * Helper to set auth cookie
 */
function setAuthCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie('auth_token', token, {
    httpOnly: false, // Accessible to client-side for hybrid cookie + header transport
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * POST /api/auth/signup
 * Create a new user account and authenticated session
 */
router.post('/signup', validateBody(signupSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.register(req.body);
    setAuthCookie(res, result.token, new Date(result.expiresAt));

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Welcome to TrustLayer!',
      data: result,
    });
  } catch (err: any) {
    if (err.status) {
      return res.status(err.status).json({
        error: {
          code: err.code || 'SIGNUP_FAILED',
          message: err.message,
        },
      });
    }
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticate existing user and establish session
 */
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.login(req.body);
    setAuthCookie(res, result.token, new Date(result.expiresAt));

    res.json({
      success: true,
      message: 'Successfully signed in.',
      data: result,
    });
  } catch (err: any) {
    if (err.status) {
      return res.status(err.status).json({
        error: {
          code: err.code || 'LOGIN_FAILED',
          message: err.message,
        },
      });
    }
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Invalidate current session and clear cookie
 */
router.post('/logout', async (req: Request, res: Response) => {
  const token = extractToken(req);
  if (token) {
    await AuthService.logout(token);
  }

  res.clearCookie('auth_token', { path: '/' });
  res.json({
    success: true,
    message: 'Signed out successfully.',
  });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user profile
 */
router.get('/me', authenticateUser, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * POST /api/auth/forgot-password
 * Triggers password reset email / token flow
 */
router.post('/forgot-password', validateBody(forgotPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.requestPasswordReset(req.body.email);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/reset-password
 * Verifies reset token and updates password
 */
router.post('/reset-password', validateBody(resetPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.resetPassword(req.body.token, req.body.newPassword);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    if (err.status) {
      return res.status(err.status).json({
        error: {
          code: err.code || 'RESET_FAILED',
          message: err.message,
        },
      });
    }
    next(err);
  }
});

export const authRouter = router;
