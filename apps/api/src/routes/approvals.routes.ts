import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { ApprovalService } from '../services/approval.service';
import { mockStore } from '../mockStore';
import { optionalAuth } from '../middleware/auth';

const router = Router();
router.use(optionalAuth);

// GET all pending approvals (enriched with agent history, mandate context, risk indicators)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let approvals = await ApprovalService.getEnrichedApprovals();
    if (req.user && req.user.role !== 'ADMIN') {
      approvals = approvals.filter(
        (a) => a.agent?.ownerId === req.user!.id || a.transaction?.agent?.ownerId === req.user!.id
      );
    }
    return res.json({
      success: true,
      data: approvals,
    });
  } catch (err) {
    next(err);
  }
});

// GET historical decided approvals (APPROVED or REJECTED)
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    try {
      const history = await prisma.approval.findMany({
        where: { status: { in: ['APPROVED', 'REJECTED'] } },
        include: {
          transaction: {
            include: { agent: true, mandate: true },
          },
        },
        orderBy: { reviewedAt: 'desc' },
        take: 20,
      });

      return res.json({
        success: true,
        data: history.map((appr) => ApprovalService.formatEnrichedApproval(appr)),
      });
    } catch {
      return res.json({
        success: true,
        data: [],
      });
    }
  } catch (err) {
    next(err);
  }
});

// POST simulate scenario for live hackathon demo
router.post('/simulate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scenarioKey } = req.body;
    const result = await ApprovalService.simulateScenario(scenarioKey || 'HIGH_VALUE');
    return res.json({
      success: true,
      message: `Scenario "${scenarioKey || 'HIGH_VALUE'}" generated. New transaction paused in PENDING_HUMAN_APPROVAL.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// GET single approval by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    try {
      const approval = await prisma.approval.findUnique({
        where: { id: req.params.id },
        include: {
          transaction: {
            include: {
              agent: {
                include: {
                  transactions: { take: 5, orderBy: { createdAt: 'desc' } },
                },
              },
              mandate: true,
              intent: true,
            },
          },
        },
      });

      if (!approval) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Approval request not found' },
        });
      }

      return res.json({
        success: true,
        data: ApprovalService.formatEnrichedApproval(approval),
      });
    } catch {
      const mock = mockStore.getApprovalById(req.params.id);
      if (!mock) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Approval request not found' },
        });
      }
      return res.json({
        success: true,
        data: ApprovalService.formatEnrichedApproval(mock),
      });
    }
  } catch (err) {
    next(err);
  }
});

// POST decide approval (APPROVE or REJECT)
router.post('/:id/decide', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, reviewedBy, reason } = req.body; // action: 'APPROVE' | 'REJECT'
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ACTION',
          message: 'Action must be APPROVE or REJECT',
        },
      });
    }

    const result = await ApprovalService.decideApproval({
      approvalId: req.params.id,
      action: action as 'APPROVE' | 'REJECT',
      reviewedBy,
      reason,
    });

    return res.json(result);
  } catch (err: any) {
    if (err.message === 'APPROVAL_NOT_FOUND' || err.message === 'NOT_IN_DB') {
      return res.status(404).json({
        error: { code: 'APPROVAL_NOT_FOUND', message: `Approval request ${req.params.id} not found` },
      });
    }
    if (err.message && err.message.startsWith('ALREADY_DECIDED')) {
      return res.status(400).json({
        error: { code: 'ALREADY_DECIDED', message: `Approval request has already been decided` },
      });
    }
    next(err);
  }
});

export default router;
