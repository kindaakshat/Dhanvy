import { prisma } from '../db';
import { mockStore } from '../mockStore';
import { MandateService } from './mandate.service';
import { CapabilityService } from './capability.service';
import { TrustService } from './trust.service';

export interface AgentPaymentRequest {
  transaction_id?: string;
  transactionId?: string;
  agent_id?: string;
  agentId?: string;
  mandate_id?: string;
  mandateId?: string;
  merchant: string;
  merchant_id?: string;
  merchantId?: string;
  product?: string;
  product_service?: string;
  productService?: string;
  category?: string;
  amount: number; // in paise
  currency?: string;
  timestamp?: string | number | Date;
  agent_instruction?: string;
  agentInstruction?: string;
  reference?: string;
  idempotency_key?: string;
  idempotencyKey?: string;
  requiredCapability?: string;
  attemptedCapabilityModification?: boolean;
}

export interface VerificationCheckItem {
  id: string;
  name: string;
  passed: boolean;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  details: string;
  metric?: string;
}

export interface StructuredPaymentDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REQUIRES_HUMAN_APPROVAL';
  legacyDecision: 'APPROVED' | 'BLOCKED' | 'REVIEW';
  status: 'COMPLETED' | 'PENDING_APPROVAL' | 'REJECTED';
  reason: string;
  reasonCode: string;
  checks: VerificationCheckItem[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    requiresHumanApproval: boolean;
  };
  details: {
    transaction_id: string;
    agent_id: string;
    mandate_id: string;
    merchant: string;
    merchant_id?: string;
    product: string;
    category: string;
    amount: number;
    amount_inr: number;
    currency: string;
    timestamp: string;
    idempotency_key: string;
    agent_instruction?: string;
    daily_limit_remaining_paise: number;
    daily_limit_remaining_inr: number;
    max_amount_paise: number;
    max_amount_inr: number;
    approval_threshold_paise?: number | null;
    approval_threshold_inr?: number | null;
  };
  agent?: {
    id: string;
    name: string;
    trustScore: number;
    status: string;
  };
  mandate?: any;
  razorpayOrder?: any;
}

export class VerificationEngine {
  /**
   * Deterministic 11-step verification engine for Agent Payment Requests.
   * Architecture flow:
   * AI Agent → Payment Request → Reliability Layer → Validation Engine → Payment Decision
   */
  static async verify(req: AgentPaymentRequest): Promise<StructuredPaymentDecision> {
    // 1. Normalize parameters from camelCase or snake_case
    const transactionId =
      req.transaction_id || req.transactionId || `tx_req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const agentId = req.agent_id || req.agentId || '';
    const mandateId = req.mandate_id || req.mandateId || '';
    const merchant = req.merchant ? req.merchant.trim() : '';
    const merchantId = req.merchant_id || req.merchantId;
    const product = req.product || req.product_service || req.productService || 'General Merchandise';
    const category = req.category || 'General';
    const amount = typeof req.amount === 'number' ? Math.round(req.amount) : parseInt(String(req.amount), 10) || 0;
    const currency = (req.currency || 'INR').toUpperCase();
    const timestamp = req.timestamp
      ? new Date(req.timestamp).toISOString()
      : new Date().toISOString();
    const agentInstruction =
      req.agent_instruction || req.agentInstruction || req.reference || 'Autonomous procurement request';
    const idempotencyKey =
      req.idempotency_key || req.idempotencyKey || `idemp_ver_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const checks: VerificationCheckItem[] = [];
    let decision: 'ALLOW' | 'BLOCK' | 'REQUIRES_HUMAN_APPROVAL' = 'ALLOW';
    let primaryReason = 'All 11 verification bounds deterministically satisfied.';
    let primaryReasonCode = 'ALL_POLICIES_SATISFIED';
    let isBlocked = false;
    let requiresApproval = false;

    // -------------------------------------------------------------
    // CHECK 1: Agent is registered and active
    // -------------------------------------------------------------
    let agent: any = null;
    if (agentId) {
      try {
        agent = await prisma.agent.findFirst({
          where: { OR: [{ id: agentId }, { name: agentId }] },
          include: { capabilities: true },
        });
      } catch {
        // Fallback to in-memory store
      }
      if (!agent) {
        agent = mockStore.getAgentById(agentId);
      }
    }

    if (!agent) {
      checks.push({
        id: 'agent_registered_active',
        name: 'Agent authenticated & active',
        passed: false,
        status: 'FAILED',
        details: `Agent "${agentId}" is not registered in the TrustLayer registry.`,
      });
      isBlocked = true;
      primaryReason = `Agent "${agentId}" is not registered.`;
      primaryReasonCode = 'AGENT_NOT_FOUND';
    } else if (agent.status !== 'ACTIVE') {
      const isRevoked = agent.status === 'REVOKED';
      checks.push({
        id: 'agent_registered_active',
        name: 'Agent authenticated & active',
        passed: false,
        status: 'FAILED',
        details: isRevoked
          ? `Agent ${agent.name} identity has been REVOKED. All autonomous payments permanently blocked.`
          : `Agent ${agent.name} is currently ${agent.status}. Autonomous payments prohibited.`,
        metric: `Status: ${agent.status}`,
      });
      isBlocked = true;
      if (primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
        primaryReason = isRevoked
          ? `Agent ${agent.name} identity has been REVOKED. Autonomous payments permanently blocked.`
          : `Agent ${agent.name} is currently ${agent.status}. Autonomous payments prohibited.`;
        primaryReasonCode = isRevoked ? 'AGENT_REVOKED' : 'AGENT_SUSPENDED';
      }
    } else {
      checks.push({
        id: 'agent_registered_active',
        name: 'Agent authenticated & active',
        passed: true,
        status: 'PASSED',
        details: `Agent ${agent.name} (${agent.id}) authenticated and ACTIVE (Trust Score: ${agent.trustScore}/100)`,
        metric: `Trust: ${agent.trustScore}/100`,
      });
    }

    // -------------------------------------------------------------
    // CHECK 2: Mandate exists & bound to agent
    // -------------------------------------------------------------
    let mandate: any = null;
    if (mandateId) {
      try {
        mandate = await prisma.mandate.findUnique({
          where: { id: mandateId },
          include: { agent: true },
        });
      } catch {
        // Fallback
      }
      if (!mandate) {
        mandate = mockStore.getMandateById(mandateId);
      }
    }

    if (!mandateId || !mandate) {
      checks.push({
        id: 'mandate_exists',
        name: 'Mandate exists',
        passed: false,
        status: 'FAILED',
        details: mandateId
          ? `Mandate "${mandateId}" not found in governance registry.`
          : 'Missing mandatory mandate_id in payment request.',
      });
      isBlocked = true;
      if (primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
        primaryReason = mandateId
          ? `Mandate "${mandateId}" does not exist.`
          : 'Every payment request must reference a valid mandate_id.';
        primaryReasonCode = mandateId ? 'MANDATE_NOT_FOUND' : 'MANDATE_ID_REQUIRED';
      }
    } else if (agent && mandate.agentId !== agent.id) {
      checks.push({
        id: 'mandate_exists',
        name: 'Mandate exists & agent binding',
        passed: false,
        status: 'FAILED',
        details: `Mandate "${mandate.name}" belongs to agent "${mandate.agentId}", not calling agent "${agent.id}".`,
      });
      isBlocked = true;
      if (primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
        primaryReason = `Mandate belongs to agent "${mandate.agentId}", not "${agent.id}".`;
        primaryReasonCode = 'MANDATE_AGENT_MISMATCH';
      }
    } else {
      checks.push({
        id: 'mandate_exists',
        name: 'Mandate exists & agent binding',
        passed: true,
        status: 'PASSED',
        details: `Mandate "${mandate.name}" (${mandate.id}) verified and bound to ${agent?.name || agentId}`,
      });
    }

    // -------------------------------------------------------------
    // CHECK 3: Mandate is active (not revoked)
    // -------------------------------------------------------------
    if (mandate && mandate.status === 'REVOKED') {
      checks.push({
        id: 'mandate_active',
        name: 'Mandate active status',
        passed: false,
        status: 'FAILED',
        details: `Mandate "${mandate.name}" has been revoked by account administrator.`,
        metric: 'Status: REVOKED',
      });
      isBlocked = true;
      if (primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
        primaryReason = `Mandate "${mandate.name}" has been revoked.`;
        primaryReasonCode = 'MANDATE_REVOKED';
      }
    } else if (mandate) {
      checks.push({
        id: 'mandate_active',
        name: 'Mandate active status',
        passed: true,
        status: 'PASSED',
        details: `Mandate status is ACTIVE. Administrative spending authority intact.`,
        metric: 'Status: ACTIVE',
      });
    } else {
      checks.push({
        id: 'mandate_active',
        name: 'Mandate active status',
        passed: false,
        status: 'FAILED',
        details: 'Cannot verify mandate status because mandate was not found.',
      });
    }

    // -------------------------------------------------------------
    // CHECK 4: Mandate has not expired
    // -------------------------------------------------------------
    const now = new Date();
    if (mandate) {
      const validFrom = new Date(mandate.validFrom);
      const validUntil = new Date(mandate.validUntil);
      const isExpired = now > validUntil;
      const isPremature = now < validFrom;

      if (isExpired || isPremature) {
        checks.push({
          id: 'mandate_not_expired',
          name: 'Mandate validity window',
          passed: false,
          status: 'FAILED',
          details: isExpired
            ? `Mandate expired on ${validUntil.toLocaleDateString()}. Temporal validity exhausted.`
            : `Mandate is not active until ${validFrom.toLocaleDateString()}.`,
          metric: isExpired ? 'EXPIRED' : 'PREMATURE',
        });
        isBlocked = true;
        if (primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
          primaryReason = `Mandate expired on ${validUntil.toLocaleDateString()}.`;
          primaryReasonCode = 'MANDATE_EXPIRED';
        }
      } else {
        const daysLeft = Math.max(0, Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        checks.push({
          id: 'mandate_not_expired',
          name: 'Mandate validity window',
          passed: true,
          status: 'PASSED',
          details: `Mandate is active through ${validUntil.toLocaleDateString()} (${daysLeft} days remaining)`,
          metric: `${daysLeft} days left`,
        });
      }
    } else {
      checks.push({
        id: 'mandate_not_expired',
        name: 'Mandate validity window',
        passed: false,
        status: 'FAILED',
        details: 'Cannot evaluate temporal validity: mandate not found.',
      });
    }

    // -------------------------------------------------------------
    // CHECK 5: Merchant is permitted (multi-merchant whitelist)
    // -------------------------------------------------------------
    if (mandate) {
      let allowedMerchants: string[] = [];
      if (Array.isArray(mandate.allowedMerchants)) {
        allowedMerchants = mandate.allowedMerchants;
      } else if (typeof mandate.allowedMerchants === 'string') {
        try {
          const parsed = JSON.parse(mandate.allowedMerchants);
          if (Array.isArray(parsed)) allowedMerchants = parsed;
        } catch {
          allowedMerchants = mandate.allowedMerchants.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      if (allowedMerchants.length === 0 && mandate.merchant) {
        allowedMerchants = [mandate.merchant];
      }

      const normalizedProposed = merchant.toLowerCase();
      const merchantPermitted =
        allowedMerchants.length === 0 ||
        allowedMerchants.some((m: string) => {
          const target = m.trim().toLowerCase();
          return (
            target === normalizedProposed ||
            normalizedProposed.includes(target) ||
            target.includes(normalizedProposed) ||
            (merchantId && merchantId.toLowerCase() === target)
          );
        });

      if (!merchantPermitted) {
        checks.push({
          id: 'merchant_permitted',
          name: 'Merchant permitted',
          passed: false,
          status: 'FAILED',
          details: `Merchant "${merchant}" is not in authorized whitelist [${allowedMerchants.join(', ')}].`,
          metric: `Unauthorized: ${merchant}`,
        });
        isBlocked = true;
        if (primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
          primaryReason = `Merchant "${merchant}" is not authorized under mandate "${mandate.name}".`;
          primaryReasonCode = 'MERCHANT_NOT_AUTHORIZED';
        }
      } else {
        checks.push({
          id: 'merchant_permitted',
          name: 'Merchant permitted',
          passed: true,
          status: 'PASSED',
          details: `Merchant "${merchant}" is authorized under mandate [${allowedMerchants.join(', ')}]`,
          metric: `Permitted: ${merchant}`,
        });
      }
    } else {
      checks.push({
        id: 'merchant_permitted',
        name: 'Merchant permitted',
        passed: false,
        status: 'FAILED',
        details: 'Cannot verify merchant authorization: mandate missing.',
      });
    }

    // -------------------------------------------------------------
    // CHECK 6: Product / Category is permitted
    // -------------------------------------------------------------
    if (mandate) {
      let allowedCategories: string[] = [];
      if (Array.isArray(mandate.allowedCategories)) {
        allowedCategories = mandate.allowedCategories;
      } else if (typeof mandate.allowedCategories === 'string') {
        try {
          const parsed = JSON.parse(mandate.allowedCategories);
          if (Array.isArray(parsed)) allowedCategories = parsed;
        } catch {
          allowedCategories = mandate.allowedCategories.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      if (allowedCategories.length === 0 && mandate.category) {
        allowedCategories = [mandate.category];
      }

      const normalizedProposedCat = category.toLowerCase();
      const categoryPermitted =
        allowedCategories.length === 0 ||
        allowedCategories.some((c: string) => {
          const target = c.trim().toLowerCase();
          return (
            target === normalizedProposedCat ||
            normalizedProposedCat.includes(target) ||
            target.includes(normalizedProposedCat)
          );
        });

      let patternPermitted = true;
      if (mandate.productPattern && mandate.productPattern.trim() !== '') {
        try {
          const regex = new RegExp(mandate.productPattern, 'i');
          patternPermitted = regex.test(product) || regex.test(category);
        } catch {
          patternPermitted = product.toLowerCase().includes(mandate.productPattern.toLowerCase());
        }
      }

      if (!categoryPermitted || !patternPermitted) {
        checks.push({
          id: 'product_category_permitted',
          name: 'Product category allowed',
          passed: false,
          status: 'FAILED',
          details: !categoryPermitted
            ? `Category "${category}" is outside authorized scope [${allowedCategories.join(', ')}].`
            : `Product "${product}" violates mandate pattern guard (${mandate.productPattern}).`,
          metric: !categoryPermitted ? `Invalid Scope: ${category}` : `Pattern Mismatch: ${product}`,
        });
        isBlocked = true;
        if (primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
          primaryReason = !categoryPermitted
            ? `Category "${category}" not authorized under mandate.`
            : `Product "${product}" violates pattern bound.`;
          primaryReasonCode = !categoryPermitted ? 'CATEGORY_NOT_AUTHORIZED' : 'PRODUCT_PATTERN_MISMATCH';
        }
      } else {
        checks.push({
          id: 'product_category_permitted',
          name: 'Product category allowed',
          passed: true,
          status: 'PASSED',
          details: `Category "${category}" and product "${product}" match authorized mandate scope.`,
          metric: `Authorized: ${category}`,
        });
      }
    } else {
      checks.push({
        id: 'product_category_permitted',
        name: 'Product category allowed',
        passed: false,
        status: 'FAILED',
        details: 'Cannot verify product scope: mandate missing.',
      });
    }

    // -------------------------------------------------------------
    // CHECK 7: Transaction amount is within per-transaction limit
    // -------------------------------------------------------------
    if (mandate) {
      const maxSinglePaise = mandate.maxAmount;
      const maxSingleInr = maxSinglePaise / 100;
      const amountInr = amount / 100;

      if (amount > maxSinglePaise) {
        checks.push({
          id: 'amount_within_limit',
          name: 'Transaction amount within limit',
          passed: false,
          status: 'FAILED',
          details: `Requested amount ₹${amountInr.toLocaleString()} exceeds mandate per-transaction limit of ₹${maxSingleInr.toLocaleString()} (${amount} > ${maxSinglePaise} paise).`,
          metric: `₹${amountInr.toLocaleString()} > ₹${maxSingleInr.toLocaleString()} limit`,
        });
        isBlocked = true;
        if (primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
          primaryReason = `Amount ₹${amountInr.toLocaleString()} exceeds mandate limit of ₹${maxSingleInr.toLocaleString()}.`;
          primaryReasonCode = 'AMOUNT_LIMIT_EXCEEDED';
        }
      } else {
        checks.push({
          id: 'amount_within_limit',
          name: 'Transaction amount within limit',
          passed: true,
          status: 'PASSED',
          details: `Amount ₹${amountInr.toLocaleString()} < ₹${maxSingleInr.toLocaleString()} limit`,
          metric: `₹${amountInr.toLocaleString()} <= ₹${maxSingleInr.toLocaleString()}`,
        });
      }
    } else {
      checks.push({
        id: 'amount_within_limit',
        name: 'Transaction amount within limit',
        passed: false,
        status: 'FAILED',
        details: 'Cannot verify amount ceiling: mandate missing.',
      });
    }

    // -------------------------------------------------------------
    // CHECK 8: Daily spending limit has not been exceeded
    // -------------------------------------------------------------
    let remainingDailyPaise = 0;
    if (mandate) {
      const dailyCapPaise = mandate.dailyLimit;
      const spentTodayPaise = mandate.spentToday || 0;
      remainingDailyPaise = Math.max(0, dailyCapPaise - spentTodayPaise);
      const remainingAfterProposedPaise = remainingDailyPaise - amount;
      const remainingDailyInr = remainingDailyPaise / 100;
      const dailyCapInr = dailyCapPaise / 100;

      if (spentTodayPaise + amount > dailyCapPaise) {
        checks.push({
          id: 'daily_limit_not_exceeded',
          name: 'Daily spending limit not exceeded',
          passed: false,
          status: 'FAILED',
          details: `Daily spending ceiling exceeded. Spent today: ₹${(spentTodayPaise / 100).toLocaleString()}, Proposed: ₹${(amount / 100).toLocaleString()}, Daily cap: ₹${dailyCapInr.toLocaleString()}. Available: ₹${remainingDailyInr.toLocaleString()}.`,
          metric: `Exceeded by ₹${(Math.abs(remainingAfterProposedPaise) / 100).toLocaleString()}`,
        });
        isBlocked = true;
        if (primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
          primaryReason = `Daily spending ceiling exceeded. Available: ₹${remainingDailyInr.toLocaleString()}, requested: ₹${(amount / 100).toLocaleString()}.`;
          primaryReasonCode = 'DAILY_LIMIT_EXCEEDED';
        }
      } else {
        checks.push({
          id: 'daily_limit_not_exceeded',
          name: 'Daily spending limit not exceeded',
          passed: true,
          status: 'PASSED',
          details: `Daily limit remaining ₹${(remainingAfterProposedPaise / 100).toLocaleString()} (Cap: ₹${dailyCapInr.toLocaleString()}, Spent today: ₹${(spentTodayPaise / 100).toLocaleString()})`,
          metric: `Daily remaining ₹${(remainingAfterProposedPaise / 100).toLocaleString()}`,
        });
      }
    } else {
      checks.push({
        id: 'daily_limit_not_exceeded',
        name: 'Daily spending limit not exceeded',
        passed: false,
        status: 'FAILED',
        details: 'Cannot verify daily limit: mandate missing.',
      });
    }

    // -------------------------------------------------------------
    // CHECK 9: Currency is permitted
    // -------------------------------------------------------------
    if (mandate) {
      const mandateCurrency = (mandate.currency || 'INR').toUpperCase();
      if (currency !== mandateCurrency) {
        checks.push({
          id: 'currency_permitted',
          name: 'Currency permitted',
          passed: false,
          status: 'FAILED',
          details: `Requested currency "${currency}" does not match mandate currency "${mandateCurrency}".`,
          metric: `Mismatch: ${currency} !== ${mandateCurrency}`,
        });
        isBlocked = true;
        if (primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
          primaryReason = `Currency mismatch: payment requested in "${currency}", mandate permits only "${mandateCurrency}".`;
          primaryReasonCode = 'CURRENCY_MISMATCH';
        }
      } else {
        checks.push({
          id: 'currency_permitted',
          name: 'Currency permitted',
          passed: true,
          status: 'PASSED',
          details: `Currency "${currency}" matches mandate currency bounds.`,
          metric: `${currency} permitted`,
        });
      }
    } else {
      checks.push({
        id: 'currency_permitted',
        name: 'Currency permitted',
        passed: false,
        status: 'FAILED',
        details: 'Cannot verify currency: mandate missing.',
      });
    }

    // -------------------------------------------------------------
    // CHECK 10: Transaction has not already been processed (Idempotency)
    // -------------------------------------------------------------
    let existingTx: any = null;
    try {
      existingTx = await prisma.transaction.findUnique({
        where: { idempotencyKey },
      });
    } catch {
      // Fallback
    }
    if (!existingTx) {
      existingTx = mockStore.getTransactions().find((t) => t.idempotencyKey === idempotencyKey);
    }

    if (existingTx) {
      checks.push({
        id: 'transaction_not_processed',
        name: 'Transaction not duplicated',
        passed: false,
        status: 'FAILED',
        details: `Duplicate transaction detected with idempotency key "${idempotencyKey}". Already processed as ${existingTx.id}.`,
        metric: `DUPLICATE REPLAY`,
      });
      isBlocked = true;
      if (primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
        primaryReason = `Duplicate payment attempt rejected. Key "${idempotencyKey}" already settled.`;
        primaryReasonCode = 'DUPLICATE_TRANSACTION';
      }
    } else {
      checks.push({
        id: 'transaction_not_processed',
        name: 'Transaction not duplicated',
        passed: true,
        status: 'PASSED',
        details: `Idempotency key "${idempotencyKey}" is unique. Fresh transaction authenticated.`,
        metric: 'Unique key',
      });
    }

    // -------------------------------------------------------------
    // CHECK 11: Human approval required if mandate specifies it
    // -------------------------------------------------------------
    if (mandate && mandate.approvalThreshold && mandate.approvalThreshold > 0) {
      const thresholdPaise = mandate.approvalThreshold;
      const thresholdInr = thresholdPaise / 100;
      const amountInr = amount / 100;

      if (amount > thresholdPaise) {
        requiresApproval = true;
        checks.push({
          id: 'human_approval_required',
          name: 'Human approval requirement evaluated',
          passed: true,
          status: 'WARNING',
          details: `Transaction amount ₹${amountInr.toLocaleString()} exceeds human approval threshold of ₹${thresholdInr.toLocaleString()}. Escalating to supervisor queue.`,
          metric: `Review required: ₹${amountInr.toLocaleString()} > ₹${thresholdInr.toLocaleString()}`,
        });
        if (!isBlocked && primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
          primaryReason = `Amount ₹${amountInr.toLocaleString()} exceeds approval threshold ₹${thresholdInr.toLocaleString()}. Human authorization required.`;
          primaryReasonCode = 'HUMAN_APPROVAL_REQUIRED';
        }
      } else {
        checks.push({
          id: 'human_approval_required',
          name: 'Human approval requirement evaluated',
          passed: true,
          status: 'PASSED',
          details: `Amount ₹${amountInr.toLocaleString()} is below human review threshold ₹${thresholdInr.toLocaleString()}. Autonomous approval granted.`,
          metric: `Auto-pass: ₹${amountInr.toLocaleString()} <= ₹${thresholdInr.toLocaleString()}`,
        });
      }
    } else if (mandate) {
      checks.push({
        id: 'human_approval_required',
        name: 'Human approval requirement evaluated',
        passed: true,
        status: 'PASSED',
        details: 'Mandate specifies no human approval threshold. Autonomous execution authorized within limits.',
        metric: 'Autonomous pass',
      });
    } else {
      checks.push({
        id: 'human_approval_required',
        name: 'Human approval requirement evaluated',
        passed: false,
        status: 'FAILED',
        details: 'Cannot evaluate approval requirements: mandate missing.',
      });
    }

    // -------------------------------------------------------------
    // CHECK 12: Dynamic Trust Tier Governance Control
    // -------------------------------------------------------------
    if (agent) {
      const trustScore = Math.round((agent.trustScore ?? 85) * 10) / 10;
      const trustTier = TrustService.getTrustTier(trustScore);

      if (trustTier === 'HIGH RISK') {
        // HIGH RISK: Block autonomous payments and require explicit user approval
        requiresApproval = true;
        checks.push({
          id: 'trust_tier_governance',
          name: 'Trust Tier Governance Control (HIGH RISK)',
          passed: false,
          status: 'WARNING',
          details: `Agent ${agent.name} is in HIGH RISK tier (${trustScore}/100). Autonomous payments are blocked; explicit supervisory approval required.`,
          metric: `HIGH RISK (${trustScore}/100)`,
        });
        if (!isBlocked && primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
          primaryReason = `Agent trust score (${trustScore}/100) is HIGH RISK. Autonomous execution blocked; explicit human approval required.`;
          primaryReasonCode = 'HIGH_RISK_AGENT_APPROVAL_REQUIRED';
        }
      } else if (trustTier === 'RESTRICTED') {
        // RESTRICTED: Human approval required for higher-value payments
        const singleLimitPaise = mandate ? mandate.maxAmount : 500000;
        const higherValueCeiling = Math.min(250000, Math.floor(singleLimitPaise * 0.5));

        if (amount > higherValueCeiling) {
          requiresApproval = true;
          checks.push({
            id: 'trust_tier_governance',
            name: 'Trust Tier Governance Control (RESTRICTED)',
            passed: false,
            status: 'WARNING',
            details: `Agent ${agent.name} is in RESTRICTED tier (${trustScore}/100). Amount ₹${(amount / 100).toLocaleString('en-IN')} exceeds higher-value threshold of ₹${(higherValueCeiling / 100).toLocaleString('en-IN')}. Human authorization required.`,
            metric: `RESTRICTED: > ₹${(higherValueCeiling / 100).toLocaleString('en-IN')}`,
          });
          if (!isBlocked && primaryReasonCode === 'ALL_POLICIES_SATISFIED') {
            primaryReason = `Agent is in RESTRICTED trust tier (${trustScore}/100). Higher-value payments require supervisory authorization.`;
            primaryReasonCode = 'RESTRICTED_AGENT_HIGHER_VALUE';
          }
        } else {
          checks.push({
            id: 'trust_tier_governance',
            name: 'Trust Tier Governance Control (RESTRICTED)',
            passed: true,
            status: 'PASSED',
            details: `Amount ₹${(amount / 100).toLocaleString('en-IN')} is within restricted tier allowance (<= ₹${(higherValueCeiling / 100).toLocaleString('en-IN')}).`,
            metric: `RESTRICTED Pass`,
          });
        }
      } else {
        checks.push({
          id: 'trust_tier_governance',
          name: `Trust Tier Governance Control (${trustTier})`,
          passed: true,
          status: 'PASSED',
          details: `Agent ${agent.name} is in ${trustTier} tier (${trustScore}/100). Normal mandate rules apply.`,
          metric: `${trustTier} (${trustScore}/100)`,
        });
      }
    }

    // -------------------------------------------------------------
    // Final Decision Compilation
    // -------------------------------------------------------------
    if (isBlocked) {
      decision = 'BLOCK';
    } else if (requiresApproval) {
      decision = 'REQUIRES_HUMAN_APPROVAL';
    } else {
      decision = 'ALLOW';
    }

    const legacyDecision: 'APPROVED' | 'BLOCKED' | 'REVIEW' =
      decision === 'ALLOW' ? 'APPROVED' : decision === 'BLOCK' ? 'BLOCKED' : 'REVIEW';

    const status: 'COMPLETED' | 'PENDING_APPROVAL' | 'REJECTED' =
      decision === 'ALLOW' ? 'COMPLETED' : decision === 'BLOCK' ? 'REJECTED' : 'PENDING_APPROVAL';

    const passedCount = checks.filter((c) => c.passed).length;
    const failedCount = checks.filter((c) => !c.passed).length;

    return {
      decision,
      legacyDecision,
      status,
      reason: primaryReason,
      reasonCode: primaryReasonCode,
      checks,
      summary: {
        totalChecks: checks.length,
        passedChecks: passedCount,
        failedChecks: failedCount,
        requiresHumanApproval: requiresApproval,
      },
      details: {
        transaction_id: transactionId,
        agent_id: agentId,
        mandate_id: mandateId,
        merchant,
        merchant_id: merchantId,
        product,
        category,
        amount,
        amount_inr: amount / 100,
        currency,
        timestamp,
        idempotency_key: idempotencyKey,
        agent_instruction: agentInstruction,
        daily_limit_remaining_paise: remainingDailyPaise,
        daily_limit_remaining_inr: remainingDailyPaise / 100,
        max_amount_paise: mandate ? mandate.maxAmount : 0,
        max_amount_inr: mandate ? mandate.maxAmount / 100 : 0,
        approval_threshold_paise: mandate?.approvalThreshold || null,
        approval_threshold_inr: mandate?.approvalThreshold ? mandate.approvalThreshold / 100 : null,
      },
      agent: agent ? { id: agent.id, name: agent.name, trustScore: agent.trustScore, status: agent.status } : undefined,
      mandate: mandate || undefined,
    };
  }
}
