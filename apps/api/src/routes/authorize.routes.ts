import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { verifyAgentIdentity } from '../middleware/agentAuth';
import { AuthorizationService } from '../services/authorization.service';
import { IntentService } from '../services/intent.service';

const router = Router();

const authorizeSchema = z.object({
  idempotencyKey: z.string().min(6),
  agentId: z.string().min(1),
  userIntentPrompt: z.string().optional(),
  intentId: z.string().optional(),
  mandateId: z.string().optional(),
  merchant: z.string().min(1),
  category: z.string().optional(),
  product: z.string().min(1),
  amount: z.number().int().positive(), // in paise
  currency: z.string().default('INR'),
  requiredCapability: z.string().optional(),
  attemptedCapabilityModification: z.boolean().optional(),
});

router.post(
  '/',
  verifyAgentIdentity,
  validateBody(authorizeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AuthorizationService.evaluate(req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

const parseIntentSchema = z.object({
  prompt: z.string().min(3),
});

router.post(
  '/intents/parse',
  validateBody(parseIntentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = IntentService.parseRuleBased(req.body.prompt);
      res.json({
        success: true,
        data: parsed,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
