import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { verifyAgentIdentity } from '../middleware/agentAuth';
import { VerificationEngine } from '../services/verification.service';
import { AuthorizationService } from '../services/authorization.service';

const router = Router();

const agentPaymentRequestSchema = z.object({
  transaction_id: z.string().optional(),
  transactionId: z.string().optional(),
  agent_id: z.string().optional(),
  agentId: z.string().optional(),
  mandate_id: z.string().optional(),
  mandateId: z.string().optional(),
  merchant: z.string().min(1, 'Merchant is required'),
  merchant_id: z.string().optional(),
  merchantId: z.string().optional(),
  product: z.string().optional(),
  product_service: z.string().optional(),
  productService: z.string().optional(),
  category: z.string().optional(),
  amount: z.number().int().positive('Amount must be a positive integer in paise'),
  currency: z.string().optional().default('INR'),
  timestamp: z.union([z.string(), z.number()]).optional(),
  agent_instruction: z.string().optional(),
  agentInstruction: z.string().optional(),
  reference: z.string().optional(),
  idempotency_key: z.string().optional(),
  idempotencyKey: z.string().optional(),
  requiredCapability: z.string().optional(),
  attemptedCapabilityModification: z.boolean().optional(),
});

/**
 * POST /api/verify
 * Executes the 11-step Pre-Payment Verification Engine and returns the structured decision.
 * Architectural Flow:
 * AI Agent → Payment Request → Reliability Layer → Validation Engine → Payment Decision
 */
router.post(
  '/',
  verifyAgentIdentity,
  validateBody(agentPaymentRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const decision = await VerificationEngine.verify(req.body);
      res.json({
        success: true,
        data: decision,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/verify/execute (or /api/payments/request)
 * Executes verification + full payment authorization pipeline (including Razorpay Test Mode).
 */
router.post(
  '/execute',
  verifyAgentIdentity,
  validateBody(agentPaymentRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Run Verification Engine
      const verification = await VerificationEngine.verify(req.body);

      // 2. Delegate to AuthorizationService for full execution & Razorpay settlement
      const authResult = await AuthorizationService.evaluate({
        idempotencyKey: req.body.idempotency_key || req.body.idempotencyKey || `idemp_${Date.now()}`,
        agentId: req.body.agent_id || req.body.agentId || '',
        mandateId: req.body.mandate_id || req.body.mandateId,
        merchant: req.body.merchant,
        merchantId: req.body.merchant_id || req.body.merchantId,
        product: req.body.product || req.body.product_service || req.body.productService || 'Product',
        category: req.body.category,
        amount: req.body.amount,
        currency: req.body.currency || 'INR',
        userIntentPrompt: req.body.agent_instruction || req.body.agentInstruction || req.body.reference,
        requiredCapability: req.body.requiredCapability,
        attemptedCapabilityModification: req.body.attemptedCapabilityModification,
      });

      res.json({
        success: true,
        data: {
          decision: verification.decision,
          legacyDecision: authResult.decision,
          status: authResult.status,
          reason: verification.reason,
          reasonCode: verification.reasonCode,
          checks: verification.checks,
          summary: verification.summary,
          details: verification.details,
          razorpayOrder: authResult.razorpayOrder,
          trustImpact: authResult.trustImpact,
          transaction: authResult.transaction,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
