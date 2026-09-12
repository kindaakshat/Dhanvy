import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { TrustService } from '../services/trust.service';
import { AuditService } from '../services/audit.service';
import { mockStore } from '../mockStore';
import { optionalAuth } from '../middleware/auth';

const router = Router();
router.use(optionalAuth);

// GET all disputes
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    try {
      const where: any = {};
      if (req.user && req.user.role !== 'ADMIN') {
        where.userId = req.user.id;
      }

      const disputes = await prisma.dispute.findMany({
        where,
        include: {
          transaction: {
            include: { agent: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const normalized = disputes.map(d => ({
        ...d,
        dispute_id: d.id,
        transaction_id: d.transactionId,
        user_id: d.userId,
        agent_id: d.agentId,
        created_at: d.createdAt,
        reversal_id: d.reversalId || null,
      }));

      return res.json({
        success: true,
        data: normalized,
      });
    } catch (dbErr: any) {
      console.warn('[TrustLayer API] DB query failed in /api/disputes, using mockStore:', dbErr.message);
      return res.json({
        success: true,
        data: mockStore.getDisputes(),
      });
    }
  } catch (err) {
    next(err);
  }
});

// POST open a new dispute
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transactionId, reason, userId } = req.body;

    try {
      const tx = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!tx) {
        throw new Error('TX_NOT_IN_DB');
      }

      // User requirement: When a dispute is created, transaction state becomes: DISPUTED
      const prevState = tx.status;
      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: 'DISPUTED',
          updatedAt: new Date(),
        },
      });

      const dispute = await prisma.dispute.create({
        data: {
          transactionId: tx.id,
          agentId: tx.agentId,
          userId: userId || 'usr_demo_01',
          amount: tx.amount,
          reason: reason || 'Agent exceeded mandate',
          status: 'OPEN',
          reversalId: null,
        },
        include: {
          transaction: true,
        },
      });

      // Update agent trust (-10 for dispute)
      await TrustService.adjustTrust({
        agentId: tx.agentId,
        reason: 'USER_DISPUTE',
        transactionId: tx.id,
      });

      // Audit Event: PAYMENT_DISPUTED (14 attributes)
      await AuditService.recordEvent({
        eventType: 'PAYMENT_DISPUTED',
        actor: 'User/Cardholder',
        actorType: 'USER',
        actorId: userId || 'usr_demo_01',
        agentId: tx.agentId,
        userId: userId || 'usr_demo_01',
        transactionId: tx.id,
        mandateId: tx.mandateId || undefined,
        action: 'DISPUTE_FILED',
        previousState: prevState,
        newState: 'DISPUTED',
        reason: dispute.reason,
        metadata: {
          disputeId: dispute.id,
          reason: dispute.reason,
          amount: dispute.amount,
          merchant: tx.merchant,
        },
      });

      return res.status(201).json({
        success: true,
        data: {
          ...dispute,
          dispute_id: dispute.id,
          transaction_id: dispute.transactionId,
          user_id: dispute.userId,
          agent_id: dispute.agentId,
          created_at: dispute.createdAt,
          reversal_id: dispute.reversalId,
        },
      });
    } catch {
      const dispute = mockStore.createDispute({ transactionId, reason, userId });
      if (!dispute) {
        return res.status(404).json({
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: `Transaction ${transactionId} not found`,
          },
        });
      }
      return res.status(201).json({
        success: true,
        data: dispute,
      });
    }
  } catch (err) {
    next(err);
  }
});

// POST simulated payment reversal flow: SUCCESS -> REVERSAL_REQUESTED -> REVERSED
router.post('/:id/reverse', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const disputeId = req.params.id;

    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: { transaction: true },
      });

      if (!dispute) {
        throw new Error('DISPUTE_NOT_IN_DB');
      }

      const tx = dispute.transaction;
      const reversalId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();
      const amountInr = dispute.amount / 100;
      const resolutionMsg = `Reversal completed: ₹${amountInr.toLocaleString('en-IN')} returned to customer`;

      // 1. Audit transition: REVERSAL_REQUESTED
      await AuditService.recordEvent({
        eventType: 'REVERSAL_REQUESTED',
        actor: 'SecOps Gateway / User',
        actorType: 'SYSTEM',
        actorId: 'leo_settlement_reversal',
        agentId: dispute.agentId,
        userId: dispute.userId || 'usr_demo_01',
        transactionId: dispute.transactionId,
        mandateId: tx?.mandateId || undefined,
        action: 'REQUEST_REVERSAL',
        previousState: tx ? tx.status : 'DISPUTED',
        newState: 'REVERSAL_REQUESTED',
        reason: `Initiated payment reversal for disputed transaction: ${dispute.reason}`,
        metadata: {
          disputeId: dispute.id,
          amount: dispute.amount,
          reversalId,
        },
      });

      // 2. Final state: REVERSED
      if (tx) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: {
            status: 'REVERSED',
            updatedAt: now,
          },
        });
      }

      const updatedDispute = await prisma.dispute.update({
        where: { id: dispute.id },
        data: {
          status: 'REVERSED',
          resolution: resolutionMsg,
          reversalId: reversalId,
          resolvedAt: now,
        },
        include: { transaction: true },
      });

      // 3. Audit transition: PAYMENT_REVERSED
      await AuditService.recordEvent({
        eventType: 'PAYMENT_REVERSED',
        actor: 'LEO Settlement Registry',
        actorType: 'SYSTEM',
        actorId: 'leo_settlement_core',
        agentId: dispute.agentId,
        userId: dispute.userId || 'usr_demo_01',
        transactionId: dispute.transactionId,
        mandateId: tx?.mandateId || undefined,
        action: 'EXECUTE_REVERSAL',
        previousState: 'REVERSAL_REQUESTED',
        newState: 'REVERSED',
        reason: `Payment reversed successfully. ${resolutionMsg}`,
        metadata: {
          disputeId: dispute.id,
          reversalId,
          amountPaise: dispute.amount,
          amountInr,
          merchant: tx?.merchant,
          status: 'COMPLETED',
        },
      });

      return res.json({
        success: true,
        data: {
          dispute: {
            ...updatedDispute,
            dispute_id: updatedDispute.id,
            transaction_id: updatedDispute.transactionId,
            user_id: updatedDispute.userId,
            agent_id: updatedDispute.agentId,
            created_at: updatedDispute.createdAt,
            reversal_id: updatedDispute.reversalId,
          },
          reversalId,
          reversal_id: reversalId,
          status: 'COMPLETED',
          amountReturnedPaise: dispute.amount,
          amountReturnedInr: amountInr,
          reason: dispute.reason,
        },
      });
    } catch {
      const result = mockStore.reversePayment(disputeId);
      if (!result) {
        return res.status(404).json({
          error: {
            code: 'DISPUTE_NOT_FOUND',
            message: `Dispute ${disputeId} not found`,
          },
        });
      }
      return res.json({
        success: true,
        data: result,
      });
    }
  } catch (err) {
    next(err);
  }
});

// POST resolve dispute (reject or custom resolution)
router.post('/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resolution, isFraudConfirmed } = req.body;

    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id: req.params.id },
      });

      if (!dispute) {
        throw new Error('DISPUTE_NOT_IN_DB');
      }

      if (resolution === 'REFUND') {
        // Forward to reversal flow
        const reverseRes = await fetch(`http://localhost:${process.env.PORT || 3001}/api/disputes/${dispute.id}/reverse`, {
          method: 'POST',
        }).catch(() => null);
        if (reverseRes && reverseRes.ok) {
          const revJson = await reverseRes.json();
          return res.json(revJson);
        }
      }

      const updated = await prisma.dispute.update({
        where: { id: dispute.id },
        data: {
          status: resolution === 'REFUND' ? 'REVERSED' : 'RESOLVED_REJECTED',
          resolution: resolution || 'Resolved by merchant operator',
          resolvedAt: new Date(),
        },
      });

      if (isFraudConfirmed) {
        await TrustService.adjustTrust({
          agentId: dispute.agentId,
          reason: 'CONFIRMED_FRAUD',
          transactionId: dispute.transactionId,
        });
      }

      await AuditService.recordEvent({
        eventType: 'DISPUTE_RESOLVED',
        actor: 'SecOps Administrator',
        actorType: 'SUPERVISOR',
        actorId: 'admin_secops',
        agentId: dispute.agentId,
        transactionId: dispute.transactionId,
        action: 'RESOLVE_DISPUTE',
        previousState: 'OPEN',
        newState: updated.status,
        reason: `Dispute marked ${updated.status}: ${updated.resolution}`,
        metadata: {
          disputeId: dispute.id,
          resolution: updated.status,
          isFraudConfirmed: !!isFraudConfirmed,
        },
      });

      return res.json({
        success: true,
        data: {
          ...updated,
          dispute_id: updated.id,
          transaction_id: updated.transactionId,
          user_id: updated.userId,
          agent_id: updated.agentId,
          created_at: updated.createdAt,
          reversal_id: updated.reversalId,
        },
      });
    } catch {
      const updated = mockStore.resolveDispute(req.params.id, resolution, isFraudConfirmed);
      if (!updated) {
        return res.status(404).json({
          error: {
            code: 'DISPUTE_NOT_FOUND',
            message: `Dispute ${req.params.id} not found`,
          },
        });
      }
      return res.json({
        success: true,
        data: updated,
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;

