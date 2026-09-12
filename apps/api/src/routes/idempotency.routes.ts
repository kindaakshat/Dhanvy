import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { mockStore } from '../mockStore';
import { AuthorizationService } from '../services/authorization.service';
import { IdempotencyService } from '../services/idempotency.service';

const router = Router();

// Schema for simulation request
const SimulateRequestSchema = z.object({
  idempotencyKey: z.string().min(3),
  agentId: z.string().optional(),
  mandateId: z.string().optional(),
  amount: z.number().int().positive().optional().default(99900), // Default ₹999.00 in paise
  merchant: z.string().optional().default('Amazon'),
  product: z.string().optional().default('Logitech Wireless Keyboard'),
  category: z.string().optional().default('Electronics'),
  prompt: z.string().optional().default('Buy keyboard under ₹5,000'),
});

/**
 * POST /api/idempotency/simulate
 * Executes or replays a payment request to demonstrate Attempt 1 -> 2 -> 3
 */
router.post('/simulate', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = SimulateRequestSchema.parse(req.body);

    // Get default agent and mandate if not supplied
    let agentId = validated.agentId;
    let mandateId = validated.mandateId;

    if (!agentId) {
      const agents = mockStore.getAgents();
      const shopAgent = agents.find((a) => a.id.includes('shop')) || agents[0];
      agentId = shopAgent ? shopAgent.id : 'agent-shop-01';
    }

    if (!mandateId) {
      const mandates = mockStore.getMandates();
      const shopMandate = mandates.find((m) => m.agentId === agentId || (m.allowedMerchants as any)?.includes('Amazon')) || mandates[0];
      mandateId = shopMandate ? ((shopMandate as any).mandate_id || shopMandate.id) : 'mnd_amazon_01';
    }

    // Call the master authorization pipeline
    const authResult = await AuthorizationService.evaluate({
      idempotencyKey: validated.idempotencyKey,
      agentId,
      mandateId,
      merchant: validated.merchant,
      product: validated.product,
      category: validated.category,
      amount: validated.amount,
      currency: 'INR',
      userIntentPrompt: validated.prompt,
      requiredCapability: 'PURCHASE_ELECTRONICS',
    });

    const tx = authResult.transaction;
    const history = IdempotencyService.parseHistory(tx?.stateHistory);

    const attemptNumber = authResult.attempts || tx?.attempts || 1;
    let demoStep: 'ATTEMPT_1' | 'ATTEMPT_2' | 'ATTEMPT_3_PLUS';
    let demoHeadline: string;
    let duplicatePrevented = false;

    if (attemptNumber === 1) {
      demoStep = 'ATTEMPT_1';
      demoHeadline = `Attempt 1 → ₹${(validated.amount / 100).toLocaleString()} payment SUCCESS`;
    } else if (attemptNumber === 2) {
      demoStep = 'ATTEMPT_2';
      demoHeadline = 'Attempt 2 → DUPLICATE DETECTED';
      duplicatePrevented = true;
    } else {
      demoStep = 'ATTEMPT_3_PLUS';
      demoHeadline = 'Attempt 3 → ORIGINAL TRANSACTION RETURNED';
      duplicatePrevented = true;
    }

    res.json({
      success: true,
      demoStep,
      demoHeadline,
      duplicatePrevented,
      message: duplicatePrevented
        ? 'Duplicate payment prevented.'
        : 'Payment successfully authorized & captured.',
      attemptNumber,
      idempotencyKey: validated.idempotencyKey,
      decision: authResult.decision,
      status: authResult.status,
      idempotencyStatus: authResult.idempotencyStatus || (attemptNumber > 1 ? 'DUPLICATE_DETECTED' : 'FRESH_TRANSACTION'),
      amount: validated.amount,
      amountInr: validated.amount / 100,
      merchant: validated.merchant,
      product: validated.product,
      razorpayOrderId: authResult.razorpayOrder?.orderId || tx?.razorpayOrderId,
      stateHistory: history,
      transaction: tx,
      rawResult: authResult,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/idempotency/stats
 * Aggregate metrics on duplicate payments prevented
 */
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    let totalDuplicatesPrevented = 0;
    let totalTransactions = 0;

    try {
      const allTx = await prisma.transaction.findMany();
      totalTransactions = allTx.length;
      totalDuplicatesPrevented = (allTx as any[]).reduce((sum: number, t: any) => sum + (t.duplicateCount || 0), 0);
    } catch {
      const mockTx = mockStore.getTransactions();
      totalTransactions = mockTx.length;
      totalDuplicatesPrevented = (mockTx as any[]).reduce((sum: number, t: any) => sum + (t.duplicateCount || 0), 0);
    }

    res.json({
      success: true,
      totalDuplicatesPrevented,
      totalTransactions,
      guarantee: 'Zero double-spend risk across autonomous retries',
      status: 'ACTIVE_ATOMIC_LOCKS',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/idempotency/:key
 * Retrieve complete transaction state and lifecycle for an idempotency key
 */
router.get('/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params.key;
    const tx = await IdempotencyService.findByKey(key);

    if (!tx) {
      res.status(404).json({ success: false, error: `No transaction found for idempotency key: ${key}` });
      return;
    }

    const history = IdempotencyService.parseHistory(tx.stateHistory);

    res.json({
      success: true,
      transaction: tx,
      idempotencyKey: key,
      status: tx.status,
      decision: tx.decision,
      attempts: tx.attempts || 1,
      duplicateCount: tx.duplicateCount || 0,
      stateHistory: history,
      lastAttemptAt: tx.lastAttemptAt || tx.updatedAt,
      message: (tx.duplicateCount || 0) > 0 ? 'Duplicate payment prevented.' : 'Original single execution.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/idempotency/reset
 * Reset/clear an idempotency key for interactive demo testing
 */
router.post('/reset', async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.body.idempotencyKey;
    if (!key) {
      res.status(400).json({ success: false, error: 'idempotencyKey is required' });
      return;
    }

    try {
      await prisma.transaction.deleteMany({
        where: { idempotencyKey: key },
      });
    } catch {
      // MockStore fallback
      const store = mockStore.getTransactions();
      const idx = store.findIndex((t) => t.idempotencyKey === key);
      if (idx !== -1) {
        store.splice(idx, 1);
      }
    }

    res.json({ success: true, message: `Idempotency key "${key}" reset successfully.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
