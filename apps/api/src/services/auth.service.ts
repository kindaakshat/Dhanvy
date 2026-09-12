import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { mockStore } from '../mockStore';
import { ensureDatabaseSchema } from './schemaHealer';

export interface SanitizedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.RAZORPAY_KEY_SECRET || 'trustlayer_hmac_secret_2026_agentic_payments';
const revokedTokens = new Set<string>();

function signTokenPayload(payload: object): string {
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');
  const randomPrefix = crypto.randomBytes(16).toString('hex');
  return `${randomPrefix}.${payloadStr}.${signature}`;
}

function verifyTokenPayload(token: string): any | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [randomPrefix, payloadStr, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function sanitizeUser(user: any): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'USER',
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
  };
}

export class AuthService {
  /**
   * Registers a new user, hashes their password, provisions their starter workspace,
   * and creates an authenticated session.
   */
  static async register(params: {
    name: string;
    email: string;
    password: string;
  }) {
    const name = params.name?.trim();
    const email = params.email?.trim().toLowerCase();
    const password = params.password;

    if (!name || name.length < 2) {
      throw { status: 400, code: 'INVALID_NAME', message: 'Full name must be at least 2 characters.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw { status: 400, code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' };
    }

    if (!password || password.length < 8) {
      throw { status: 400, code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' };
    }

    // Check existing user in Prisma with auto-healing
    let existing;
    try {
      existing = await prisma.user.findUnique({
        where: { email },
      });
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('User') || err?.message?.includes('passwordHash')) {
        console.log('[AuthService] Missing schema detected during register. Running ensureDatabaseSchema...');
        await ensureDatabaseSchema(prisma);
        existing = await prisma.user.findUnique({
          where: { email },
        });
      } else {
        throw err;
      }
    }

    if (existing) {
      throw { status: 409, code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email address already exists.' };
    }

    // Hash password with bcryptjs (10 rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in database with auto-healing
    let user;
    try {
      user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'USER',
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('User')) {
        await ensureDatabaseSchema(prisma);
        user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: 'USER',
          },
        });
      } else {
        throw err;
      }
    }

    // Provision starter workspace for user isolation
    await this.provisionStarterWorkspace(user.id, user.name);

    // Create authenticated session
    const session = await this.createSession(user.id, false);

    return {
      user: sanitizeUser(user),
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  /**
   * Authenticates a user by email and password, creating a persistent session.
   */
  static async login(params: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) {
    const email = params.email?.trim().toLowerCase();
    const password = params.password;

    if (!email || !password) {
      throw { status: 400, code: 'CREDENTIALS_REQUIRED', message: 'Email and password are required.' };
    }

    let user: any;
    try {
      user = await prisma.user.findUnique({
        where: { email },
      });
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('User') || err?.message?.includes('passwordHash')) {
        console.log('[AuthService] Missing schema detected during login. Running ensureDatabaseSchema...');
        await ensureDatabaseSchema(prisma);
        user = await prisma.user.findUnique({
          where: { email },
        });
      } else {
        throw err;
      }
    }

    if (!user || !user.passwordHash) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const session = await this.createSession(user.id, Boolean(params.rememberMe));

    return {
      user: sanitizeUser(user),
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  /**
   * Creates a session token for a user.
   */
  static async createSession(userId: string, rememberMe = false, userDetails?: any) {
    const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + duration);

    let email = userDetails?.email;
    let name = userDetails?.name;
    let role = userDetails?.role || 'USER';

    if (!email || !name) {
      try {
        const u = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
        if (u) {
          email = u.email;
          name = u.name;
          role = u.role;
        }
      } catch {}
    }

    const token = signTokenPayload({
      uid: userId,
      email: email || '',
      name: name || 'User',
      role,
      exp: expiresAt.getTime(),
      iat: Date.now(),
    });

    try {
      await prisma.session.create({
        data: {
          token,
          userId,
          expiresAt,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('Session')) {
        await ensureDatabaseSchema(prisma);
        await prisma.session.create({
          data: {
            token,
            userId,
            expiresAt,
          },
        }).catch(() => {});
      }
    }

    return { token, userId, expiresAt };
  }

  /**
   * Validates a session token and returns the sanitized user.
   */
  static async validateSession(token: string) {
    if (!token || typeof token !== 'string') return null;
    if (revokedTokens.has(token)) return null;

    // 1. Try DB lookup first
    try {
      let session;
      try {
        session = await prisma.session.findUnique({
          where: { token },
          include: { user: true },
        });
      } catch (err: any) {
        if (err?.code === 'P2021' || err?.message?.includes('Session')) {
          await ensureDatabaseSchema(prisma);
          session = await prisma.session.findUnique({
            where: { token },
            include: { user: true },
          });
        }
      }

      if (session) {
        if (new Date() > new Date(session.expiresAt)) {
          await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
          return null;
        }
        return sanitizeUser(session.user);
      }
    } catch {}

    // 2. Cryptographic signature verification fallback (essential for serverless multi-instance)
    const verified = verifyTokenPayload(token);
    if (!verified) return null;

    try {
      const user = await prisma.user.findUnique({ where: { id: verified.uid } }).catch(() => null);
      if (user) {
        return sanitizeUser(user);
      }
    } catch {}

    return {
      id: verified.uid,
      email: verified.email,
      name: verified.name,
      role: verified.role || 'USER',
      createdAt: new Date(verified.iat || Date.now()).toISOString(),
    };
  }

  /**
   * Invalidates a session token (logout).
   */
  static async logout(token: string) {
    if (!token) return false;
    revokedTokens.add(token);
    try {
      await prisma.session.deleteMany({
        where: { token },
      }).catch(() => {});
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Generates a secure password reset token and stores it.
   */
  static async requestPasswordReset(emailInput: string) {
    const email = emailInput?.trim().toLowerCase();
    const genericResponse = {
      success: true,
      message: 'If an account with that email exists in our system, a password reset link has been generated.',
    };

    if (!email) return genericResponse;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return genericResponse;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    console.log(`\n===============================================================`);
    console.log(`[PASSWORD RESET LINK] User: ${user.email}`);
    console.log(`URL: ${resetUrl}`);
    console.log(`Token: ${resetToken}`);
    console.log(`===============================================================\n`);

    return {
      ...genericResponse,
      devResetToken: resetToken,
      devResetUrl: resetUrl,
    };
  }

  /**
   * Resets a user password given a valid, unexpired reset token.
   */
  static async resetPassword(token: string, newPassword: string) {
    if (!token || typeof token !== 'string') {
      throw { status: 400, code: 'TOKEN_REQUIRED', message: 'Password reset token is required.' };
    }

    if (!newPassword || newPassword.length < 8) {
      throw { status: 400, code: 'WEAK_PASSWORD', message: 'New password must be at least 8 characters.' };
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw {
        status: 400,
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'This password reset link is invalid or has expired. Please request a new one.',
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Invalidate reset token and reset password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Invalidate all existing sessions for security
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return {
      success: true,
      message: 'Password successfully updated. You may now sign in with your new password.',
    };
  }

  /**
   * Provisions a starter autonomous agent & spending mandate for a newly registered user
   * so their isolated workspace has functional infrastructure immediately.
   */
  static async provisionStarterWorkspace(userId: string, userName: string) {
    try {
      const slug = userId.slice(0, 6);
      const agentName = `ProcureAgent-${slug}`;
      const mandateId = `mnd_${slug}_starter`;

      const agent = await prisma.agent.create({
        data: {
          id: `agent_${slug}`,
          name: agentName,
          description: `Autonomous procurement agent for ${userName}'s workspace`,
          ownerId: userId,
          status: 'ACTIVE',
          trustScore: 90.0,
        },
      });

      const starterCaps = [
        { capability: 'CREATE_PAYMENT_ORDER', isAllowed: true },
        { capability: 'PURCHASE_OFFICE_SUPPLIES', isAllowed: true },
        { capability: 'PURCHASE_ELECTRONICS', isAllowed: true },
        { capability: 'USE_RAZORPAY', isAllowed: true },
        { capability: 'TRANSFER_TO_PERSON', isAllowed: false },
        { capability: 'MODIFY_MANDATE', isAllowed: false },
      ];

      for (const cap of starterCaps) {
        await prisma.agentCapability.create({
          data: {
            agentId: agent.id,
            capability: cap.capability,
            isAllowed: cap.isAllowed,
          },
        }).catch(() => {});
      }

      const now = new Date();
      const future30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.mandate.create({
        data: {
          id: mandateId,
          userId,
          agentId: agent.id,
          name: `${userName}'s Office & Hardware Mandate`,
          merchant: 'Amazon, Flipkart',
          allowedMerchants: JSON.stringify(['Amazon', 'Flipkart', 'Croma']),
          category: 'Office Supplies, Electronics',
          allowedCategories: JSON.stringify(['Office Supplies', 'Electronics', 'Peripherals']),
          productPattern: 'Keyboard|Mouse|Monitor|Cables|Supplies|Desk',
          maxAmount: 500000, // ₹5,000
          dailyLimit: 2000000, // ₹20,000
          spentToday: 0,
          currency: 'INR',
          validFrom: now,
          validUntil: future30Days,
          approvalThreshold: 400000, // ₹4,000
          status: 'ACTIVE',
        },
      });
    } catch (err) {
      console.warn('[TrustLayer Workspace Provisioning] Non-fatal error creating starter workspace:', err);
    }
  }
}
