import { prisma } from '../db';
import { mockStore } from '../mockStore';
import { CapabilityService } from './capability.service';
import { MandateService } from './mandate.service';
import { IntentDriftService } from './intentDrift.service';
import { RiskEngine } from './risk.service';
import { TrustService } from './trust.service';
import { AuditService } from './audit.service';
import { RazorpayService } from './razorpay.service';
import { PaymentGatewayFactory } from './payment/paymentGateway.factory';
import { GatewayPaymentResult } from './payment/paymentProvider.interface';
import { IntentService } from './intent.service';
import { VerificationEngine, VerificationCheckItem } from './verification.service';
import { IdempotencyService } from './idempotency.service';
import { ApprovalService } from './approval.service';

export interface AuthorizeRequest {
  idempotencyKey?: string;
  idempotency_key?: string;
  transactionId?: string;
  transaction_id?: string;
  agentId?: string;
  agent_id?: string;
  userIntentPrompt?: string;
  agent_instruction?: string;
  agentInstruction?: string;
  reference?: string;
  intentId?: string;
  mandateId?: string;
  mandate_id?: string;
  merchant: string;
  merchantId?: string;
  merchant_id?: string;
  category?: string;
  product: string;
  product_service?: string;
  productService?: string;
  amount: number; // in paise
  currency?: string;
  timestamp?: string | number | Date;
  requiredCapability?: string;
  attemptedCapabilityModification?: boolean;
}

export interface SecurityCheckItem {
  name: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  details: string;
  id?: string;
  passed?: boolean;
  metric?: string;
}

export interface AuthorizationResult {
  decision: 'APPROVED' | 'BLOCKED' | 'REVIEW';
  structuredDecision?: 'ALLOW' | 'BLOCK' | 'REQUIRES_HUMAN_APPROVAL';
  reason?: string;
  status: 'COMPLETED' | 'PENDING_APPROVAL' | 'REJECTED' | 'SUCCESS' | 'BLOCKED' | 'FAILED' | string;
  riskScore: number;
  riskReasons: string[];
  decisionReasons: string[];
  checks: SecurityCheckItem[];
  verificationChecks?: VerificationCheckItem[];
  summary?: any;
  intentDrift?: any;
  razorpayOrder?: any;
  gatewayOrder?: any;
  paymentResult?: GatewayPaymentResult | null;
  trustImpact?: {
    previousScore: number;
    newScore: number;
    reason: string;
  };
  transaction?: any;
  approvalRequired?: boolean;
  isDuplicate?: boolean;
  idempotencyStatus?: string;
  message?: string;
  attempts?: number;
  duplicateCount?: number;
  duplicatePaymentPrevented?: boolean;
}

export class AuthorizationService {
  /**
   * The core 17-step deterministic authorization pipeline.
   */
  static async evaluate(req: AuthorizeRequest): Promise<AuthorizationResult> {
    const normAgentId = req.agentId || req.agent_id || '';
    const normMandateId = req.mandateId || req.mandate_id || '';
    const normIdempotencyKey = req.idempotencyKey || req.idempotency_key || `idemp_${Date.now()}`;
    const normMerchant = req.merchant;
    const normMerchantId = req.merchantId || req.merchant_id;
    const normProduct = req.product || req.product_service || req.productService || 'Product';
    const normCategory = req.category;
    const normPrompt = req.userIntentPrompt || req.agent_instruction || req.agentInstruction || req.reference;
    const currency = (req.currency || 'INR').toUpperCase();
    const checks: SecurityCheckItem[] = [];
    let decisionReasons: string[] = [];
    let isBlocked = false;
    let requiresApproval = false;

    // Execute the deterministic 11-step Verification Engine
    const verification = await VerificationEngine.verify({
      transaction_id: req.transaction_id || req.transactionId,
      agent_id: normAgentId,
      mandate_id: normMandateId,
      merchant: normMerchant,
      merchant_id: normMerchantId,
      product: normProduct,
      category: normCategory,
      amount: req.amount,
      currency,
      timestamp: req.timestamp,
      agent_instruction: normPrompt,
      idempotency_key: normIdempotencyKey,
      requiredCapability: req.requiredCapability,
      attemptedCapabilityModification: req.attemptedCapabilityModification,
    });

    if (verification.decision === 'BLOCK') {
      isBlocked = true;
      if (verification.reasonCode && !decisionReasons.includes(verification.reasonCode)) {
        decisionReasons.push(verification.reasonCode);
      }
    } else if (verification.decision === 'REQUIRES_HUMAN_APPROVAL') {
      requiresApproval = true;
      if (!decisionReasons.includes('HUMAN_APPROVAL_REQUIRED')) {
        decisionReasons.push('HUMAN_APPROVAL_REQUIRED');
      }
    }

    // Step 0: Enforce Mandate Reference (PS #10 Invariant: Every payment request must reference a mandate_id)
    if (!normMandateId || normMandateId.trim() === '') {
      return {
        decision: 'BLOCKED',
        structuredDecision: 'BLOCK',
        reason: 'Every payment request must reference a mandate_id.',
        status: 'REJECTED',
        riskScore: 100,
        riskReasons: ['Every payment request must reference a mandate_id. Missing mandate parameter.'],
        decisionReasons: ['MANDATE_ID_REQUIRED'],
        checks: verification.checks,
        verificationChecks: verification.checks,
        summary: verification.summary,
      };
    }

    let agent: any = null;
    try {
      agent = await prisma.agent.findFirst({
        where: { OR: [{ id: normAgentId }, { name: normAgentId }] },
        include: { capabilities: true },
      });
    } catch {
      // Fallback
    }

    if (!agent) {
      agent = mockStore.getAgentById(normAgentId);
    }

    if (!agent) {
      return {
        decision: 'BLOCKED',
        structuredDecision: 'BLOCK',
        reason: 'Agent record not found in system',
        status: 'REJECTED',
        riskScore: 100,
        riskReasons: ['Agent record not found in system'],
        decisionReasons: ['AGENT_NOT_FOUND'],
        checks: verification.checks,
        verificationChecks: verification.checks,
        summary: verification.summary,
      };
    }

    if (agent.status === 'SUSPENDED') {
      checks.push({
        name: 'Agent identity',
        status: 'FAILED',
        details: `Agent ${agent.name} is currently SUSPENDED.`,
      });
      decisionReasons.push('AGENT_SUSPENDED');
      isBlocked = true;
    } else {
      checks.push({
        name: 'Agent identity',
        status: 'PASSED',
        details: `Agent ${agent.name} is ACTIVE (Trust: ${agent.trustScore}/100)`,
      });
    }

    // Step 3: Validate Capability
    const requiredCap = req.requiredCapability || 'PURCHASE_ELECTRONICS';
    const capResult = await CapabilityService.validateCapability({
      agentId: agent.id,
      requiredCapability: requiredCap,
      attemptedCapabilityModification: req.attemptedCapabilityModification,
    });

    if (!capResult.isValid) {
      checks.push({
        name: 'Agent capability',
        status: 'FAILED',
        details: capResult.message || 'Required capability missing or forbidden',
      });
      decisionReasons.push(capResult.reasonCode || 'CAPABILITY_MISSING');
      isBlocked = true;
    } else {
      checks.push({
        name: 'Agent capability',
        status: 'PASSED',
        details: `Authorized for capability: ${requiredCap}`,
      });
    }

    // Step 4: Load / Parse Intent
    let intentRecord: any = null;
    let structuredIntent: any = null;

    if (req.intentId) {
      try {
        intentRecord = await prisma.intent.findUnique({ where: { id: req.intentId } });
      } catch {
        // Fallback
      }
    } else if (req.userIntentPrompt) {
      structuredIntent = IntentService.parseRuleBased(req.userIntentPrompt);
      try {
        intentRecord = await prisma.intent.create({
          data: {
            agentId: agent.id,
            rawPrompt: req.userIntentPrompt,
            merchant: structuredIntent.merchant,
            category: structuredIntent.category,
            product: structuredIntent.product,
            maxAmount: structuredIntent.maxAmount,
            currency: structuredIntent.currency,
            validityMinutes: structuredIntent.validityMinutes,
            parserType: 'RULE_BASED',
            parserVersion: structuredIntent.parserVersion,
            structuredData: JSON.stringify(structuredIntent),
          },
        });
      } catch {
        intentRecord = {
          id: `intent-${Date.now()}`,
          rawPrompt: req.userIntentPrompt,
          ...structuredIntent,
        };
      }
    }

    // Step 5 & 6: Load & Validate Mandate
    const mandateResult = await MandateService.validateMandate({
      agentId: agent.id,
      mandateId: normMandateId,
      merchant: req.merchant,
      category: req.category,
      product: req.product,
      amount: req.amount,
      currency,
    });

    let approvalTriggerRule: string | null = null;
    let approvalReason: string | null = null;
    let approvalRiskIndicators: any[] = [];

    if (!mandateResult.isValid) {
      checks.push({
        name: 'Mandate bounds',
        status: 'FAILED',
        details: mandateResult.message || 'Mandate policy check failed',
      });
      decisionReasons.push(mandateResult.reasonCode || 'MANDATE_VIOLATION');
      isBlocked = true;
    } else {
      checks.push({
        name: 'Mandate bounds',
        status: 'PASSED',
        details: `Authorized by mandate: ${mandateResult.mandate?.name}`,
      });

      // Evaluate multi-rule mandate human approval requirements
      if (mandateResult.mandate) {
        const approvalEval = ApprovalService.evaluateApprovalRules({
          amount: req.amount,
          merchant: req.merchant,
          category: req.category,
          product: req.product,
          agent: { id: agent.id, name: agent.name, trustScore: agent.trustScore },
          mandate: mandateResult.mandate,
          pastTransactions: (agent as any).transactions || [],
        });

        if (approvalEval.requiresApproval && !isBlocked) {
          requiresApproval = true;
          approvalTriggerRule = approvalEval.primaryRule;
          approvalReason = approvalEval.primaryReason;
          approvalRiskIndicators = approvalEval.riskIndicators;
          decisionReasons.push('HUMAN_APPROVAL_REQUIRED');
          decisionReasons.push(approvalEval.primaryRule);
        }
      } else if (mandateResult.requiresHumanApproval) {
        requiresApproval = true;
        decisionReasons.push('HUMAN_APPROVAL_REQUIRED');
      }
    }

    // Step 7 & 8: Compare Intent vs Action (Intent Drift)
    let intentDriftResult: any = null;
    if (intentRecord) {
      intentDriftResult = IntentDriftService.detectDrift({
        intent: {
          merchant: intentRecord.merchant,
          category: intentRecord.category,
          product: intentRecord.product,
          maxAmount: intentRecord.maxAmount,
          currency: intentRecord.currency,
        },
        action: {
          merchant: req.merchant,
          category: req.category,
          product: req.product,
          amount: req.amount,
          currency,
        },
      });

      if (intentDriftResult.driftDetected) {
        checks.push({
          name: 'Intent alignment',
          status: 'FAILED',
          details: `Intent drift detected (${intentDriftResult.differences.length} discrepancies)`,
        });
        decisionReasons.push('INTENT_DRIFT_DETECTED');
        isBlocked = true;
      } else {
        checks.push({
          name: 'Intent alignment',
          status: 'PASSED',
          details: 'Action perfectly conforms to structured user intent bounds',
        });
      }
    } else {
      checks.push({
        name: 'Intent alignment',
        status: 'WARNING',
        details: 'No explicit user intent prompt bound to transaction',
      });
    }

    // Step 9: Check Idempotency & State Machine (Section 41)
    let existingTx: any = null;
    const idempResult = await IdempotencyService.evaluateIdempotency(normIdempotencyKey);

    if (idempResult.isDuplicate) {
      existingTx = idempResult.existingTransaction;

      // Rule 2 & 5: If Attempt 3+ (or client requesting original result), return original transaction result verbatim!
      if (idempResult.action === 'RETURN_ORIGINAL' && existingTx) {
        const isPending = existingTx.status === 'PENDING_HUMAN_APPROVAL' || existingTx.status === 'PENDING_APPROVAL' || existingTx.decision === 'REVIEW';
        const origDecision = isPending ? 'REVIEW' : (existingTx.decision || 'APPROVED');
        const retStatus = isPending ? 'PENDING_HUMAN_APPROVAL' : (existingTx.status || 'SUCCESS');
        const retMsg = isPending
          ? 'Transaction is pending human supervisor review. Cannot bypass approval state.'
          : 'Duplicate payment prevented. Original transaction returned.';
        return {
          decision: origDecision,
          structuredDecision: origDecision === 'APPROVED' ? 'ALLOW' : origDecision === 'BLOCKED' ? 'BLOCK' : 'REQUIRES_HUMAN_APPROVAL',
          reason: retMsg,
          status: retStatus,
          riskScore: existingTx.riskScore || 0,
          riskReasons: existingTx.riskReasons ? (typeof existingTx.riskReasons === 'string' ? JSON.parse(existingTx.riskReasons) : existingTx.riskReasons) : [],
          decisionReasons: ['DUPLICATE_PAYMENT_PREVENTED', 'ORIGINAL_TRANSACTION_RETURNED'],
          checks: [
            ...verification.checks.filter(c => c.name !== 'Transaction not duplicated').map(c => ({
              id: String(c.id),
              name: c.name,
              status: (c.status === 'FAILED' ? 'FAILED' : 'PASSED') as 'PASSED' | 'FAILED' | 'WARNING',
              details: c.details,
              metric: c.metric,
            })),
            {
              id: 'transaction_not_duplicated',
              name: 'Transaction not duplicated',
              status: 'PASSED' as const,
              details: `Duplicate payment prevented. Key "${normIdempotencyKey}" already settled. Returning canonical record.`,
              metric: 'Original Returned',
            },
          ],
          verificationChecks: verification.checks,
          summary: verification.summary,
          intentDrift: null,
          razorpayOrder: existingTx.razorpayOrderId ? { orderId: existingTx.razorpayOrderId, status: existingTx.razorpayStatus || 'paid' } : null,
          trustImpact: undefined,
          transaction: existingTx,
          approvalRequired: origDecision === 'REVIEW',
          isDuplicate: true,
          idempotencyStatus: 'ORIGINAL_TRANSACTION_RETURNED',
          message: 'Duplicate payment prevented. Original transaction returned.',
          attempts: idempResult.attemptNumber,
          duplicateCount: (existingTx.duplicateCount || 0),
          duplicatePaymentPrevented: true,
        };
      }

      checks.push({
        name: 'Idempotency check',
        status: 'FAILED',
        details: idempResult.message,
      });
      decisionReasons.push('DUPLICATE_TRANSACTION');
      isBlocked = true;
    } else {
      checks.push({
        name: 'Idempotency check',
        status: 'PASSED',
        details: 'Unique idempotency key verified',
      });
    }

    // Step 10: Calculate Risk Score (Section 40)
    const riskResult = RiskEngine.evaluateRisk({
      amount: req.amount,
      mandateLimit: mandateResult.mandate?.maxAmount,
      isMerchantUnknown: !mandateResult.mandate,
      hasIntentDrift: intentDriftResult?.driftDetected,
      driftScore: intentDriftResult?.driftScore,
      isMandateExpired: mandateResult.reasonCode === 'MANDATE_EXPIRED',
      isDuplicateAttempt: !!existingTx,
      agentTrustScore: agent.trustScore,
      hasCapabilityViolation: !capResult.isValid,
      exceedsApprovalThreshold: requiresApproval,
    });

    // Step 11: Determine Final Decision & State
    let decision: 'APPROVED' | 'BLOCKED' | 'REVIEW';
    let status: 'SUCCESS' | 'BLOCKED' | 'PENDING_HUMAN_APPROVAL' | 'FAILED' | 'REVERSED';

    if (isBlocked || riskResult.suggestedDecision === 'BLOCK') {
      decision = 'BLOCKED';
      status = 'BLOCKED';
    } else if (requiresApproval || riskResult.suggestedDecision === 'REVIEW') {
      decision = 'REVIEW';
      status = 'PENDING_HUMAN_APPROVAL';
    } else {
      decision = 'APPROVED';
      status = 'SUCCESS';
      decisionReasons.push('ALL_POLICIES_SATISFIED');
    }

    // Deduplicate decisionReasons
    decisionReasons = Array.from(new Set(decisionReasons));

    // Step 12 & 13: Trust Score Update
    let trustImpact: any = null;
    let trustReason: any = null;

    if (decision === 'APPROVED') {
      trustReason = 'SUCCESS';
    } else if (decisionReasons.includes('DUPLICATE_TRANSACTION')) {
      trustReason = 'DUPLICATE_ATTEMPT';
    } else if (decisionReasons.includes('INTENT_DRIFT_DETECTED')) {
      trustReason = 'INTENT_DRIFT';
    } else if (decisionReasons.includes('AMOUNT_LIMIT_EXCEEDED') || decisionReasons.includes('MANDATE_VIOLATION')) {
      trustReason = 'MANDATE_VIOLATION';
    }

    if (trustReason) {
      const trustRes = await TrustService.adjustTrust({
        agentId: agent.id,
        reason: trustReason,
      });
      trustImpact = {
        previousScore: trustRes.trustEvent.previousScore,
        newScore: trustRes.trustEvent.newScore,
        reason: trustReason,
      };
    }

    // Step 14 & 15: Payment Provider Execution
    // CRITICAL: Reliability Layer communicates exclusively with PaymentProvider interface!
    // NEVER invoke payment provider if transaction is BLOCKED or in REVIEW!
    let paymentResult: GatewayPaymentResult | null = null;
    let razorpayOrder: any = null;
    if (decision === 'APPROVED') {
      const provider = PaymentGatewayFactory.getProvider();
      paymentResult = await provider.processPayment({
        transactionId: `tx_${normIdempotencyKey.slice(0, 12)}`,
        agentId: agent.id,
        mandateId: mandateResult.mandate?.id,
        merchant: req.merchant,
        merchantId: normMerchantId,
        product: req.product,
        amountPaise: req.amount,
        currency,
        idempotencyKey: normIdempotencyKey,
        metadata: {
          scenarioOverride: (req as any).gatewayScenario,
        },
      });

      // Backward-compatible razorpayOrder object for legacy consumers
      razorpayOrder = {
        orderId: paymentResult.orderId || paymentResult.providerTxnId,
        amount: paymentResult.amountPaise,
        currency: paymentResult.currency,
        receipt: paymentResult.receiptNumber,
        status: paymentResult.status === 'SUCCESS' ? 'created' : paymentResult.status.toLowerCase(),
        mode: paymentResult.provider === 'RAZORPAY' ? 'TEST_MODE' : 'SIMULATED_TEST_GATEWAY',
        provider: paymentResult.provider,
        rrn: paymentResult.rrn,
        providerTxnId: paymentResult.providerTxnId,
        vpa: paymentResult.vpa,
      };

      if (paymentResult.status === 'TIMEOUT') {
        status = 'FAILED';
        decisionReasons.push('GATEWAY_TIMEOUT');
      } else if (paymentResult.status === 'FAILED') {
        status = 'FAILED';
        decisionReasons.push(`GATEWAY_ERROR_${paymentResult.errorCode || 'DECLINED'}`);
      }
    }

    // Step 16: Persist Transaction Record
    let savedTransaction: any = null;
    const nowIso = new Date().toISOString();
    const history = [
      { state: 'CREATED', timestamp: new Date(Date.now() - 40).toISOString(), reason: 'Initial payment request registered' },
      { state: 'VALIDATING', timestamp: new Date(Date.now() - 25).toISOString(), reason: '11-step verification checks evaluated' },
    ];
    if (decision === 'APPROVED') {
      history.push({ state: 'AUTHORIZED', timestamp: new Date(Date.now() - 15).toISOString(), reason: 'All policy & mandate bounds satisfied' });
      history.push({ state: 'PROCESSING', timestamp: new Date(Date.now() - 10).toISOString(), reason: `Dispatched to ${paymentResult?.provider || 'SIMULATED'} gateway` });
      if (paymentResult?.status === 'TIMEOUT') {
        history.push({ state: 'FAILED', timestamp: nowIso, reason: 'Gateway network timeout: no response from acquirer' });
      } else if (paymentResult?.status === 'FAILED') {
        history.push({ state: 'FAILED', timestamp: nowIso, reason: `Gateway settlement declined: ${paymentResult.errorMessage || 'Unknown bank error'}` });
      } else if (paymentResult?.status === 'REVERSED') {
        history.push({ state: 'SUCCESS', timestamp: new Date(Date.now() - 5).toISOString(), reason: 'Payment confirmed & settled' });
        history.push({ state: 'REVERSED', timestamp: nowIso, reason: 'Immediate simulated post-settlement reversal' });
        status = 'REVERSED';
      } else {
        history.push({ state: 'SUCCESS', timestamp: nowIso, reason: `Payment confirmed & settled (RRN: ${paymentResult?.rrn || 'N/A'})` });
      }
    } else if (decision === 'REVIEW') {
      history.push({ state: 'PENDING_HUMAN_APPROVAL', timestamp: nowIso, reason: approvalReason || 'Exceeds mandate bounds, awaiting human supervisor approval' });
    } else {
      history.push({ state: 'BLOCKED', timestamp: nowIso, reason: decisionReasons.join(', ') });
    }

    if (!existingTx) {
      try {
        savedTransaction = await prisma.transaction.create({
          data: {
            idempotencyKey: normIdempotencyKey,
            agentId: agent.id,
            mandateId: mandateResult.mandate?.id,
            intentId: intentRecord?.id,
            merchant: req.merchant,
            merchantId: normMerchantId || null,
            category: req.category || mandateResult.mandate?.category || 'General',
            product: req.product,
            instruction: normPrompt || null,
            amount: req.amount,
            currency,
            decision,
            riskScore: riskResult.score,
            riskReasons: JSON.stringify(riskResult.reasons),
            decisionReasons: JSON.stringify(decisionReasons),
            status,
            attempts: 1,
            duplicateCount: 0,
            stateHistory: JSON.stringify(history),
            lastAttemptAt: new Date(),
            razorpayOrderId: razorpayOrder?.orderId || null,
            razorpayStatus: razorpayOrder ? 'created' : null,
          },
        });

        // If pending human approval, create enriched Approval record
        if (decision === 'REVIEW') {
          await prisma.approval.create({
            data: {
              transactionId: savedTransaction.id,
              agentId: agent.id,
              amount: req.amount,
              merchant: req.merchant,
              status: 'PENDING',
              reason: approvalReason || decisionReasons.join(', '),
              triggerRule: approvalTriggerRule || 'AMOUNT_EXCEEDS_THRESHOLD',
              riskScore: riskResult.score,
              riskIndicators: JSON.stringify(approvalRiskIndicators.length ? approvalRiskIndicators : riskResult.reasons),
            },
          });
        }

        // Update mandate spentToday if approved
        if (decision === 'APPROVED' && mandateResult.mandate) {
          await prisma.mandate.update({
            where: { id: mandateResult.mandate.id },
            data: {
              spentToday: { increment: req.amount },
            },
          });
        }
      } catch (dbErr: any) {
        console.warn('[TrustLayer API] DB write failed in AuthorizationService, using mockStore:', dbErr.message);
        savedTransaction = mockStore.createTransaction({
          idempotencyKey: normIdempotencyKey,
          agentId: agent.id,
          mandateId: mandateResult.mandate?.id,
          intentId: intentRecord?.id,
          merchant: req.merchant,
          merchantId: normMerchantId || null,
          category: req.category || mandateResult.mandate?.category || 'General',
          product: req.product,
          instruction: normPrompt || null,
          amount: req.amount,
          currency,
          decision,
          riskScore: riskResult.score,
          riskReasons: riskResult.reasons,
          decisionReasons,
          status,
          attempts: 1,
          duplicateCount: 0,
          stateHistory: JSON.stringify(history),
          lastAttemptAt: new Date(),
          razorpayOrderId: razorpayOrder?.orderId || null,
          razorpayStatus: razorpayOrder ? 'created' : null,
        });

        if (decision === 'REVIEW') {
          mockStore.createApproval({
            transactionId: savedTransaction.id,
            agentId: agent.id,
            amount: req.amount,
            merchant: req.merchant,
            reason: approvalReason || decisionReasons.join(', '),
          });
        }

        if (decision === 'APPROVED' && mandateResult.mandate?.id) {
          const m = mockStore.getMandateById(mandateResult.mandate.id);
          if (m) {
            m.spentToday = (m.spentToday || 0) + req.amount;
          }
        }
      }
    }

    // Step 17: Write Cryptographic Audit Event with 14 Attribution Fields
    const eventType = decision === 'APPROVED'
      ? 'PAYMENT_VALIDATED'
      : decision === 'REVIEW'
      ? 'APPROVAL_REQUESTED'
      : 'PAYMENT_BLOCKED';

    await AuditService.recordEvent({
      eventType,
      actor: 'LEO Deterministic Engine',
      actorType: 'SYSTEM',
      actorId: 'leo_auth_engine',
      agentId: agent.id,
      userId: 'usr_demo_01',
      transactionId: savedTransaction?.id || existingTx?.id,
      mandateId: normMandateId,
      action: eventType,
      previousState: 'VALIDATING',
      newState: status,
      reason: decision === 'APPROVED'
        ? 'All 11 verification bounds satisfied'
        : decisionReasons.join(', ') || 'Policy bounds check',
      metadata: {
        decision,
        amount: req.amount,
        amountInr: req.amount / 100,
        merchant: req.merchant,
        product: normProduct,
        riskScore: riskResult.score,
        reasons: decisionReasons,
        razorpayOrderId: razorpayOrder?.orderId,
      },
      eventData: {
        decision,
        amount: req.amount,
        merchant: req.merchant,
        riskScore: riskResult.score,
        reasons: decisionReasons,
        razorpayOrderId: razorpayOrder?.orderId,
      },
    });

    if (decision === 'APPROVED' && razorpayOrder?.orderId) {
      await AuditService.recordEvent({
        eventType: 'PAYMENT_EXECUTED',
        actor: 'Razorpay Test Mode',
        actorType: 'GATEWAY',
        actorId: 'rzp_test_gateway',
        agentId: agent.id,
        userId: 'usr_demo_01',
        transactionId: savedTransaction?.id || existingTx?.id,
        mandateId: normMandateId,
        action: 'CREATE_ORDER',
        previousState: 'AUTHORIZED',
        newState: 'SUCCESS',
        reason: `Payment order captured on test rail: ${razorpayOrder.orderId}`,
        metadata: {
          razorpayOrderId: razorpayOrder.orderId,
          amount: req.amount,
          status: 'paid',
        },
        eventData: {
          razorpayOrderId: razorpayOrder.orderId,
          amount: req.amount,
        },
      });
    }

    const structuredDecision: 'ALLOW' | 'BLOCK' | 'REQUIRES_HUMAN_APPROVAL' =
      decision === 'APPROVED' ? 'ALLOW' : decision === 'BLOCKED' ? 'BLOCK' : 'REQUIRES_HUMAN_APPROVAL';

    const finalResult = {
      decision,
      structuredDecision,
      reason: decision === 'BLOCKED'
        ? (verification.reason || decisionReasons[0] || 'Payment blocked by policy bounds')
        : decision === 'REVIEW'
        ? (verification.reason || 'Transaction exceeds approval threshold: human authorization required')
        : 'Payment authorized: all 11 verification bounds deterministically satisfied.',
      status,
      riskScore: riskResult.score,
      riskReasons: riskResult.reasons,
      decisionReasons,
      checks: verification.checks,
      verificationChecks: verification.checks,
      summary: verification.summary,
      intentDrift: intentDriftResult,
      razorpayOrder,
      gatewayOrder: razorpayOrder,
      paymentResult,
      trustImpact,
      transaction: savedTransaction || existingTx,
      approvalRequired: decision === 'REVIEW',
      isDuplicate: !!existingTx,
      idempotencyStatus: existingTx ? (idempResult.idempotencyStatus || 'DUPLICATE_DETECTED') : 'FRESH_TRANSACTION',
      message: existingTx ? 'Duplicate payment prevented.' : 'Payment processed successfully.',
      duplicatePaymentPrevented: !!existingTx,
      attempts: existingTx ? idempResult.attemptNumber : 1,
      duplicateCount: existingTx ? (existingTx.duplicateCount || 0) : 0,
    };

    if (savedTransaction && decision === 'APPROVED') {
      IdempotencyService.cacheCanonicalResponse(savedTransaction.id, finalResult);
    }

    return finalResult;
  }
}
