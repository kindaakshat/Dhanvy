import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { mockStore } from '../mockStore';
import { TrustService, TrustReason, getTrustTier, TRUST_TIERS } from '../services/trust.service';
import { AuditService } from '../services/audit.service';
import { validateBody } from '../middleware/validate';
import { optionalAuth } from '../middleware/auth';

const router = Router();
router.use(optionalAuth);

/**
 * Normalizes an agent record to guarantee first-class identity attributes
 * conforming to both standard camelCase and protocol-level snake_case:
 * - agent_id
 * - agent_name
 * - owner/user_id
 * - description
 * - status (ACTIVE, SUSPENDED, REVOKED)
 * - created_at
 * - trust_score
 * - permissions
 */
function formatAgentRecord(a: any) {
  const score = Math.round((a.trustScore ?? 85) * 10) / 10;
  const tier = getTrustTier(score);
  const permissions = a.capabilities
    ? a.capabilities
        .filter((c: any) => c.isAllowed !== false)
        .map((c: any) => c.capability || c)
    : [];

  return {
    ...a,
    id: a.id,
    agent_id: a.id,
    name: a.name,
    agent_name: a.name,
    ownerId: a.ownerId || 'usr_demo_01',
    owner_id: a.ownerId || 'usr_demo_01',
    description: a.description || '',
    status: a.status || 'ACTIVE',
    trustScore: score,
    trust_score: score,
    trustTier: tier,
    tierInfo: TRUST_TIERS[tier],
    currentRestrictions: TRUST_TIERS[tier].controlsDescription,
    permissions,
    capabilities: a.capabilities || [],
    createdAt: a.createdAt,
    created_at: a.createdAt,
  };
}

// GET fleet-wide trust overview (MUST be before /:id)
router.get('/trust/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const overview = await TrustService.getFleetOverview();
    res.json({
      success: true,
      data: overview,
    });
  } catch (err) {
    next(err);
  }
});

// GET all agents (enriched with trust tier and first-class identity attributes)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.user && req.user.role !== 'ADMIN') {
      where.ownerId = req.user.id;
    }

    const agents = await prisma.agent.findMany({
      where,
      include: {
        capabilities: true,
        mandates: true,
        _count: {
          select: {
            transactions: true,
            trustEvents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = agents.map(formatAgentRecord);

    res.json({
      success: true,
      data: enriched,
    });
  } catch (err: any) {
    console.warn('[TrustLayer API] DB query failed in /api/agents, falling back to in-memory store:', err.message);
    const mockAgents = mockStore.getAgents().map(formatAgentRecord);

    res.json({
      success: true,
      data: mockAgents,
    });
  }
});

const registerAgentSchema = z.object({
  name: z.string().min(2, 'Agent name must be at least 2 characters').optional(),
  agent_name: z.string().min(2).optional(),
  description: z.string().optional(),
  ownerId: z.string().optional(),
  owner_id: z.string().optional(),
  userId: z.string().optional(),
  user_id: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED']).optional().default('ACTIVE'),
});

// POST /api/agents - Register a new AI Agent with first-class identity
router.post(
  '/',
  validateBody(registerAgentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const name = req.body.name || req.body.agent_name;
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AGENT_NAME',
            message: 'Agent name is required and must be at least 2 characters long.',
          },
        });
      }

      const trimmedName = name.trim();
      const description = req.body.description?.trim() || 'Autonomous procurement assistant';
      const ownerId = req.user?.id || req.body.ownerId || req.body.owner_id || req.body.userId || req.body.user_id || 'usr_demo_01';
      const status = req.body.status || 'ACTIVE';
      const rawPermissions = req.body.permissions || req.body.capabilities || [
        'PURCHASE_ELECTRONICS',
        'VIEW_PRODUCTS',
        'CREATE_PAYMENT_ORDER',
        'USE_RAZORPAY',
      ];

      // Try persisting in Prisma database first
      let createdAgent: any = null;
      try {
        // Ensure owner exists
        let user = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!user) {
          user = await prisma.user.upsert({
            where: { email: `${ownerId}@trustlayer.local` },
            update: {},
            create: {
              id: ownerId,
              email: `${ownerId}@trustlayer.local`,
              name: 'Enterprise Admin',
              role: 'ADMIN',
            },
          });
        }

        // Check if agent name already exists
        const existing = await prisma.agent.findUnique({ where: { name: trimmedName } });
        if (existing) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'AGENT_ALREADY_EXISTS',
              message: `An agent with the name "${trimmedName}" is already registered.`,
            },
          });
        }

        const agentRecord = await prisma.agent.create({
          data: {
            name: trimmedName,
            description,
            ownerId: user.id,
            status,
            trustScore: 85.0,
            capabilities: {
              create: rawPermissions.map((cap: string) => ({
                capability: cap,
                isAllowed: true,
              })),
            },
          },
          include: {
            capabilities: true,
            mandates: true,
          },
        });

        // Record immutable audit event
        await AuditService.recordEvent({
          eventType: 'AGENT_REGISTERED',
          actor: ownerId,
          actorType: 'USER',
          actorId: ownerId,
          agentId: agentRecord.id,
          userId: ownerId,
          action: 'REGISTER_AGENT',
          reason: `Registered new autonomous agent "${trimmedName}" with baseline trust 85.0`,
          metadata: {
            name: trimmedName,
            permissions: rawPermissions,
            status,
            trustScore: 85.0,
          },
        });

        // Also sync into mock store for unified memory
        mockStore.createAgent({
          name: trimmedName,
          description,
          ownerId,
          permissions: rawPermissions,
          status,
        });

        createdAgent = agentRecord;
      } catch (dbErr: any) {
        if (dbErr.code === 'P2002') {
          return res.status(409).json({
            success: false,
            error: {
              code: 'AGENT_ALREADY_EXISTS',
              message: `An agent with the name "${trimmedName}" is already registered.`,
            },
          });
        }
        console.warn('[TrustLayer API] DB failed during agent registration, using mockStore:', dbErr.message);
        createdAgent = mockStore.createAgent({
          name: trimmedName,
          description,
          ownerId,
          permissions: rawPermissions,
          status,
        });
      }

      res.status(201).json({
        success: true,
        data: formatAgentRecord(createdAgent),
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET agent trust report by ID (transparent scoring breakdown & positive/negative signals)
router.get('/:id/trust', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await TrustService.getTrustReport(req.params.id);
    res.json({
      success: true,
      data: report,
    });
  } catch (err: any) {
    res.status(404).json({
      error: {
        code: 'AGENT_NOT_FOUND',
        message: err.message || `Agent ${req.params.id} not found`,
      },
    });
  }
});

// POST simulate trust event / score delta for testing dynamic model
router.post('/:id/trust/simulate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason, details, transactionId } = req.body;
    const validReasons: TrustReason[] = [
      'SUCCESS',
      'MANDATE_VIOLATION',
      'DUPLICATE_ATTEMPT',
      'INTENT_DRIFT',
      'USER_DISPUTE',
      'CONFIRMED_FRAUD',
      'SUPERVISOR_REJECTION',
      'PAYMENT_REVERSED',
    ];

    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REASON',
          message: `Reason must be one of: ${validReasons.join(', ')}`,
        },
      });
    }

    const result = await TrustService.adjustTrust({
      agentId: req.params.id,
      reason,
      details,
      transactionId,
    });

    const report = await TrustService.getTrustReport(req.params.id);

    res.json({
      success: true,
      data: {
        adjustment: result,
        report,
      },
    });
  } catch (err: any) {
    next(err);
  }
});

// GET agent payment history
router.get('/:id/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = req.params.id;

    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          OR: [{ agentId }, { agent: { name: agentId } }],
        },
        include: {
          mandate: true,
          approval: true,
          dispute: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        data: transactions,
      });
    } catch {
      const txs = mockStore.getAgentPayments(agentId);
      return res.json({
        success: true,
        data: txs,
      });
    }
  } catch (err) {
    next(err);
  }
});

// GET agent mandate assignments
router.get('/:id/mandates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = req.params.id;

    try {
      const mandates = await prisma.mandate.findMany({
        where: {
          OR: [{ agentId }, { agent: { name: agentId } }],
        },
        include: {
          agent: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        data: mandates,
      });
    } catch {
      const mandates = mockStore.getAgentMandates(agentId);
      return res.json({
        success: true,
        data: mandates,
      });
    }
  } catch (err) {
    next(err);
  }
});

// GET agent by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: {
        OR: [{ id: req.params.id }, { name: req.params.id }],
      },
      include: {
        capabilities: true,
        mandates: true,
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        trustEvents: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agent) {
      // Check mock store
      const mockAgent = mockStore.getAgentById(req.params.id);
      if (mockAgent) {
        return res.json({
          success: true,
          data: formatAgentRecord(mockAgent),
        });
      }

      return res.status(404).json({
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent ${req.params.id} not found`,
        },
      });
    }

    if (req.user && req.user.role !== 'ADMIN' && agent.ownerId && agent.ownerId !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. You do not have permission to view this agent.',
        },
      });
    }

    res.json({
      success: true,
      data: formatAgentRecord(agent),
    });
  } catch (err: any) {
    console.warn('[TrustLayer API] DB query failed in /api/agents/:id, falling back to in-memory store:', err.message);
    const mockAgent = mockStore.getAgentById(req.params.id);
    if (mockAgent) {
      return res.json({
        success: true,
        data: formatAgentRecord(mockAgent),
      });
    }
    return res.status(404).json({
      error: {
        code: 'AGENT_NOT_FOUND',
        message: `Agent ${req.params.id} not found`,
      },
    });
  }
});

// PATCH agent status (Activate / Suspend / Revoke)
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reason } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'REVOKED', 'REVIEW_REQUIRED'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be ACTIVE, SUSPENDED, or REVOKED',
        },
      });
    }

    let updated: any = null;
    try {
      const existing = await prisma.agent.findFirst({
        where: { OR: [{ id: req.params.id }, { name: req.params.id }] },
      });

      if (existing) {
        if (req.user && req.user.role !== 'ADMIN' && existing.ownerId && existing.ownerId !== req.user.id) {
          return res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied. You do not have permission to modify this agent.',
            },
          });
        }

        updated = await prisma.agent.update({
          where: { id: existing.id },
          data: { status },
          include: { capabilities: true, mandates: true },
        });

        // Record audit event for status change / revocation
        const eventType =
          status === 'REVOKED'
            ? 'AGENT_REVOKED'
            : status === 'SUSPENDED'
            ? 'AGENT_SUSPENDED'
            : 'AGENT_ACTIVATED';

        await AuditService.recordEvent({
          eventType,
          actor: 'usr_demo_01',
          actorType: 'USER',
          actorId: 'usr_demo_01',
          agentId: existing.id,
          userId: 'usr_demo_01',
          action: `SET_STATUS_${status}`,
          previousState: existing.status,
          newState: status,
          reason: reason || `Agent ${existing.name} status updated to ${status}`,
          metadata: {
            agentId: existing.id,
            agentName: existing.name,
            previousStatus: existing.status,
            newStatus: status,
          },
        });
      }
    } catch {
      // Prisma failed or record not in DB
    }

    if (!updated) {
      updated = mockStore.updateAgentStatus(req.params.id, status, reason);
    } else {
      mockStore.updateAgentStatus(req.params.id, status, reason);
    }

    if (!updated) {
      return res.status(404).json({
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent ${req.params.id} not found`,
        },
      });
    }

    return res.json({
      success: true,
      data: formatAgentRecord(updated),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
