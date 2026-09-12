import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { mockStore } from '../mockStore';
import { optionalAuth } from '../middleware/auth';

const router = Router();
router.use(optionalAuth);

// GET transactions with optional status filter
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decision, agentId, limit } = req.query;

    const where: any = {};
    if (decision && decision !== 'ALL') {
      where.decision = decision as string;
    }
    if (agentId) {
      where.agentId = agentId as string;
    }
    if (req.user && req.user.role !== 'ADMIN') {
      where.agent = { ownerId: req.user.id };
    }

    try {
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true, trustScore: true } },
          mandate: { select: { id: true, name: true, maxAmount: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit as string, 10) : 50,
      });

      return res.json({
        success: true,
        data: transactions,
      });
    } catch (dbErr: any) {
      console.warn('[TrustLayer API] DB query failed in /api/transactions, using mockStore:', dbErr.message);
      const data = mockStore.getTransactions({
        decision: decision as string,
        agentId: agentId as string,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      return res.json({
        success: true,
        data,
      });
    }
  } catch (err) {
    next(err);
  }
});

// GET single transaction detail
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: req.params.id },
        include: {
          agent: {
            include: { capabilities: true },
          },
          mandate: true,
          intent: true,
          auditEvents: {
            orderBy: { sequenceNumber: 'asc' },
          },
          approval: true,
          dispute: true,
        },
      });

      if (transaction) {
        if (req.user && req.user.role !== 'ADMIN') {
          const isAgentOwner = transaction.agent?.ownerId === req.user.id;
          const isMandateOwner = (transaction.mandate as any)?.userId === req.user.id;
          if (!isAgentOwner && !isMandateOwner) {
            return res.status(403).json({
              error: {
                code: 'FORBIDDEN',
                message: 'Access denied. You do not have permission to view this transaction.',
              },
            });
          }
        }

        return res.json({
          success: true,
          data: transaction,
        });
      }
    } catch (dbErr) {
      // Fallback
    }

    const mockTx = mockStore.getTransactionById(req.params.id);
    if (!mockTx) {
      return res.status(404).json({
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: `Transaction ${req.params.id} not found`,
        },
      });
    }

    res.json({
      success: true,
      data: mockTx,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
