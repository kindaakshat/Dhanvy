import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { MandateService } from '../services/mandate.service';
import { AuditService } from '../services/audit.service';
import { optionalAuth } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();
router.use(optionalAuth);

const createMandateSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  userId: z.string().optional().default('usr_demo_01'),
  name: z.string().min(2, 'Mandate title must be at least 2 characters'),
  merchant: z.string().optional(),
  allowedMerchants: z.union([z.array(z.string()), z.string()]).optional(),
  category: z.string().optional(),
  allowedCategories: z.union([z.array(z.string()), z.string()]).optional(),
  productPattern: z.string().optional(),
  maxAmount: z.number().int().positive('Maximum amount must be a positive integer in paise'),
  dailyLimit: z.number().int().positive('Daily limit must be a positive integer in paise'),
  currency: z.string().default('INR'),
  validUntilDays: z.number().int().positive().optional().default(30),
  validUntil: z.string().optional(),
  approvalThreshold: z.number().int().positive().optional(),
});

const validatePaymentSchema = z.object({
  mandateId: z.string().min(1, 'mandateId is required'),
  agentId: z.string().optional().default(''),
  amount: z.number().int().positive('Amount must be positive in paise'),
  merchant: z.string().min(1, 'Merchant is required'),
  category: z.string().optional(),
  product: z.string().optional(),
  currency: z.string().optional().default('INR'),
});

const validateSingleMandatePaymentSchema = z.object({
  amount: z.number().int().positive('Amount must be positive in paise'),
  merchant: z.string().min(1, 'Merchant is required'),
  category: z.string().optional(),
  product: z.string().optional(),
  currency: z.string().optional().default('INR'),
});

// GET all mandates with filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId, status, userId } = req.query;
    const targetUserId = req.user && req.user.role !== 'ADMIN' ? req.user.id : (userId as string);
    const mandates = await MandateService.listMandates({
      agentId: agentId as string,
      status: status as string,
      userId: targetUserId,
    });

    res.json({
      success: true,
      count: mandates.length,
      data: mandates,
    });
  } catch (err) {
    next(err);
  }
});

// GET single machine-readable mandate by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mandate = await MandateService.getMandateById(req.params.id);

    if (!mandate) {
      return res.status(404).json({
        error: {
          code: 'MANDATE_NOT_FOUND',
          message: `Mandate "${req.params.id}" was not found in the registry.`,
        },
      });
    }

    if (req.user && req.user.role !== 'ADMIN') {
      const isOwner = mandate.user_id === req.user.id;
      const agent = await prisma.agent.findUnique({ where: { id: mandate.agent_id } });
      const isAgentOwner = agent?.ownerId === req.user.id;
      if (!isOwner && !isAgentOwner) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You do not have permission to view this mandate.',
          },
        });
      }
    }

    res.json({
      success: true,
      data: mandate,
    });
  } catch (err) {
    next(err);
  }
});

// POST create machine-readable mandate
router.post(
  '/',
  validateBody(createMandateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allowedMerchants = Array.isArray(req.body.allowedMerchants)
        ? req.body.allowedMerchants
        : req.body.allowedMerchants
        ? String(req.body.allowedMerchants).split(',').map((s: string) => s.trim()).filter(Boolean)
        : req.body.merchant
        ? [req.body.merchant]
        : ['Amazon'];

      const allowedCategories = Array.isArray(req.body.allowedCategories)
        ? req.body.allowedCategories
        : req.body.allowedCategories
        ? String(req.body.allowedCategories).split(',').map((s: string) => s.trim()).filter(Boolean)
        : req.body.category
        ? [req.body.category]
        : ['General'];

      const mandate = await MandateService.createMandate({
        agentId: req.body.agentId,
        userId: req.user?.id || req.body.userId || 'usr_demo_01',
        name: req.body.name,
        merchant: req.body.merchant || allowedMerchants[0],
        allowedMerchants,
        category: req.body.category || allowedCategories[0],
        allowedCategories,
        productPattern: req.body.productPattern,
        maxAmount: req.body.maxAmount,
        dailyLimit: req.body.dailyLimit,
        currency: req.body.currency || 'INR',
        validUntilDays: req.body.validUntilDays,
        validUntil: req.body.validUntil,
        approvalThreshold: req.body.approvalThreshold,
      });

      const actorId = req.user?.id || req.body.userId || 'usr_demo_01';
      await AuditService.recordEvent({
        eventType: 'MANDATE_CREATED',
        actor: actorId,
        actorType: 'USER',
        actorId: actorId,
        agentId: req.body.agentId,
        userId: actorId,
        mandateId: mandate.mandate_id,
        action: 'CREATE_MANDATE',
        newState: 'ACTIVE',
        reason: `Created mandate "${mandate.name}" with ₹${(mandate.maximum_transaction_amount / 100).toLocaleString()} limit`,
        metadata: {
          mandateId: mandate.mandate_id,
          maxAmount: mandate.maximum_transaction_amount,
          dailyLimit: mandate.daily_spending_limit,
          allowedMerchants,
          allowedCategories,
        },
      });

      res.status(201).json({
        success: true,
        data: mandate,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH revoke mandate
router.patch('/:id/revoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingMandate = await MandateService.getMandateById(req.params.id);
    if (!existingMandate) {
      return res.status(404).json({
        error: {
          code: 'MANDATE_NOT_FOUND',
          message: `Mandate "${req.params.id}" not found.`,
        },
      });
    }

    if (req.user && req.user.role !== 'ADMIN') {
      const isOwner = existingMandate.user_id === req.user.id;
      const agent = await prisma.agent.findUnique({ where: { id: existingMandate.agent_id } });
      const isAgentOwner = agent?.ownerId === req.user.id;
      if (!isOwner && !isAgentOwner) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You do not have permission to revoke this mandate.',
          },
        });
      }
    }

    const mandate = await MandateService.revokeMandate(req.params.id);

    const actorId = req.user?.id || 'usr_demo_01';
    await AuditService.recordEvent({
      eventType: 'MANDATE_UPDATED',
      actor: actorId,
      actorType: 'USER',
      actorId: actorId,
      agentId: mandate!.agent_id,
      userId: mandate!.user_id || actorId,
      mandateId: mandate!.mandate_id,
      action: 'REVOKE_MANDATE',
      previousState: 'ACTIVE',
      newState: 'REVOKED',
      reason: `Administratively revoked mandate "${mandate!.name}"`,
      metadata: { mandateId: mandate!.mandate_id, status: 'REVOKED' },
    });

    res.json({
      success: true,
      message: `Mandate "${mandate!.name}" has been revoked. All autonomous transactions under this mandate will be blocked.`,
      data: mandate,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH extend mandate validity
router.patch('/:id/extend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = req.body.days ? parseInt(req.body.days, 10) : 30;
    const mandate = await MandateService.extendMandate(req.params.id, days);

    if (!mandate) {
      return res.status(404).json({
        error: {
          code: 'MANDATE_NOT_FOUND',
          message: `Mandate "${req.params.id}" not found.`,
        },
      });
    }

    await AuditService.recordEvent({
      eventType: 'MANDATE_UPDATED',
      actor: 'usr_demo_01',
      actorType: 'USER',
      actorId: 'usr_demo_01',
      agentId: mandate.agent_id,
      userId: mandate.user_id || 'usr_demo_01',
      mandateId: mandate.mandate_id,
      action: 'EXTEND_VALIDITY',
      previousState: 'ACTIVE',
      newState: 'ACTIVE',
      reason: `Extended mandate validity by ${days} days`,
      metadata: { mandateId: mandate.mandate_id, extendedDays: days },
    });

    res.json({
      success: true,
      message: `Mandate "${mandate.name}" validity extended by ${days} days. New expiry: ${mandate.expiry_time}`,
      data: mandate,
    });
  } catch (err) {
    next(err);
  }
});

// POST standalone validation endpoint for specific mandate
router.post(
  '/:id/validate',
  validateBody(validateSingleMandatePaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evaluation = await MandateService.validateMandateById(req.params.id, req.body);
      res.json({
        success: true,
        data: evaluation,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST generic standalone validation endpoint
router.post(
  '/validate',
  validateBody(validatePaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evaluation = await MandateService.validateMandate({
        agentId: req.body.agentId,
        mandateId: req.body.mandateId,
        amount: req.body.amount,
        merchant: req.body.merchant,
        category: req.body.category,
        product: req.body.product,
        currency: req.body.currency,
      });

      res.json({
        success: true,
        data: evaluation,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
