import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { simulatedGateway, GatewayDemoScenario } from '../services/payment/simulatedGateway.service';
import { PaymentGatewayFactory } from '../services/payment/paymentGateway.factory';
import { PaymentGatewayType } from '../services/payment/paymentProvider.interface';

const router = Router();

const DEMO_SCENARIO_METADATA: Record<GatewayDemoScenario, {
  name: string;
  description: string;
  expectedStatus: string;
  badgeColor: string;
}> = {
  SUCCESS: {
    name: '1. Successful Payment',
    description: 'Clean payment authorization and settlement with authentic 12-digit NPCI/UPI RRN and timestamp.',
    expectedStatus: 'SUCCESS',
    badgeColor: 'emerald',
  },
  TIMEOUT: {
    name: '2. Gateway Timeout',
    description: 'Upstream banking gateway latency timeout without settlement confirmation; tests fail-closed safety.',
    expectedStatus: 'TIMEOUT',
    badgeColor: 'amber',
  },
  FAILURE: {
    name: '3. Payment Failure',
    description: 'Acquiring bank / issuer decline (e.g. ISSUER_DECLINED, BANK_SERVER_ERROR) with explainable error codes.',
    expectedStatus: 'FAILED',
    badgeColor: 'rose',
  },
  DUPLICATE: {
    name: '4. Duplicate Request',
    description: 'Gateway-level idempotency protection returning original transaction without re-charging rails.',
    expectedStatus: 'DUPLICATE',
    badgeColor: 'blue',
  },
  REVERSAL: {
    name: '5. Success Followed by Reversal',
    description: 'Successful settlement followed by immediate automated payment clawback/reversal with unique reversal ID.',
    expectedStatus: 'REVERSED',
    badgeColor: 'purple',
  },
};

/**
 * GET /api/gateway/config
 * Returns active gateway scenario, latency, provider abstraction info, and scenario directory.
 */
router.get('/config', (req: Request, res: Response) => {
  const currentConfig = simulatedGateway.getScenario();
  const providerType = PaymentGatewayFactory.getDefaultProviderType();

  res.json({
    success: true,
    data: {
      providerType,
      activeScenario: currentConfig.scenario,
      latencyMs: currentConfig.latencyMs,
      failureCode: currentConfig.failureCode || 'ISSUER_DECLINED',
      scenarios: DEMO_SCENARIO_METADATA,
      supportedProviders: ['SIMULATED', 'RAZORPAY', 'UPI'],
      isRealMoney: false,
      tagline: 'Payment Provider Interface — Decoupled from LEO Authorization Engine',
    },
  });
});

const configSchema = z.object({
  scenario: z.enum(['SUCCESS', 'TIMEOUT', 'FAILURE', 'DUPLICATE', 'REVERSAL']).optional(),
  providerType: z.enum(['SIMULATED', 'RAZORPAY', 'UPI']).optional(),
  latencyMs: z.number().int().min(0).max(5000).optional(),
  failureCode: z.string().optional(),
  failureMessage: z.string().optional(),
});

/**
 * POST /api/gateway/config
 * Configures the active gateway scenario and latency for runtime payment execution.
 */
router.post('/config', validateBody(configSchema), (req: Request, res: Response) => {
  const { scenario, providerType, latencyMs, failureCode, failureMessage } = req.body;

  if (providerType) {
    PaymentGatewayFactory.setDefaultProvider(providerType as PaymentGatewayType);
  }

  if (scenario) {
    simulatedGateway.setScenario(scenario as GatewayDemoScenario, {
      latencyMs,
      failureCode,
      failureMessage,
    });
  }

  const updatedConfig = simulatedGateway.getScenario();
  res.json({
    success: true,
    data: {
      providerType: PaymentGatewayFactory.getDefaultProviderType(),
      activeScenario: updatedConfig.scenario,
      latencyMs: updatedConfig.latencyMs,
      message: `Simulated gateway reconfigured to scenario: ${updatedConfig.scenario} (${updatedConfig.latencyMs}ms latency)`,
    },
  });
});

const simulateSchema = z.object({
  scenario: z.enum(['SUCCESS', 'TIMEOUT', 'FAILURE', 'DUPLICATE', 'REVERSAL']).optional().default('SUCCESS'),
  merchant: z.string().optional().default('Amazon India'),
  product: z.string().optional().default('Office Keychron Mechanical Keyboard'),
  amount: z.number().int().positive().optional().default(399900), // in paise (₹3,999)
  currency: z.string().optional().default('INR'),
  idempotencyKey: z.string().optional(),
  latencyMs: z.number().int().optional(),
});

/**
 * POST /api/gateway/simulate
 * Standalone 1-click test simulation for any of the 5 hackathon demo scenarios.
 * Returns authentic 12-digit RRN, realistic transaction IDs, and structured settlement status.
 */
router.post('/simulate', validateBody(simulateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scenario, merchant, product, amount, currency, latencyMs } = req.body;
    const idempotencyKey = req.body.idempotencyKey || `idemp_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const transactionId = `tx_sim_${Date.now()}`;

    // Execute via clean PaymentProvider interface
    const provider = PaymentGatewayFactory.getProvider();
    const result = await provider.processPayment({
      transactionId,
      agentId: 'agent_shop_01',
      mandateId: 'mnd_amazon_01',
      merchant,
      product,
      amountPaise: amount,
      currency,
      idempotencyKey,
      metadata: {
        scenarioOverride: scenario,
        latencyOverride: latencyMs,
      },
    });

    let reversalResult = null;
    if (scenario === 'REVERSAL') {
      reversalResult = await provider.reversePayment({
        transactionId,
        providerTxnId: result.providerTxnId,
        amountPaise: amount,
        reason: 'Automated demo reversal clawback',
      });
    }

    res.json({
      success: true,
      scenario,
      metadata: DEMO_SCENARIO_METADATA[scenario as GatewayDemoScenario],
      data: {
        transactionId,
        idempotencyKey,
        merchant,
        product,
        amountPaise: amount,
        amountInr: (amount / 100).toFixed(2),
        currency,
        gatewayResult: result,
        reversalResult,
        flow: [
          { stage: '1. AI Agent', action: 'Submits payment request', timestamp: new Date(Date.now() - 30).toISOString() },
          { stage: '2. Reliability Layer', action: 'Validates mandate, capability & intent', timestamp: new Date(Date.now() - 20).toISOString() },
          { stage: '3. Payment Provider Interface', action: `Dispatched to ${result.provider} rail`, timestamp: new Date(Date.now() - 10).toISOString() },
          { stage: '4. Gateway Settlement Result', action: `Status: ${result.status} (RRN: ${result.rrn})`, timestamp: result.timestamp },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/gateway/reset
 * Resets the simulated gateway ledger and restores default SUCCESS scenario.
 */
router.post('/reset', (req: Request, res: Response) => {
  simulatedGateway.reset();
  PaymentGatewayFactory.setDefaultProvider('SIMULATED');

  res.json({
    success: true,
    message: 'Simulated payment gateway reset to default SUCCESS scenario (150ms latency).',
  });
});

export default router;
