import { prisma } from '../db';
import { mockStore } from '../mockStore';
import { RazorpayService } from './razorpay.service';
import { AuditService } from './audit.service';
import { TrustService } from './trust.service';

export interface MandateApprovalRules {
  requiresApprovalAbove?: number | null; // in paise e.g. 500000 = ₹5,000
  requireForNewMerchants?: boolean;
  requireForHighRiskMerchants?: boolean;
  minTrustScore?: number; // e.g. 75
  requireForFirstTransaction?: boolean;
  requireForCategoryAnomaly?: boolean;
  requireForSpendingSpike?: boolean; // e.g. > 2.5x historical average
}

export const HIGH_RISK_MERCHANTS = [
  'cryptokey', 'binance', 'coinbase', 'darkweb', 'betting',
  'casino', 'gambling', 'giftcard-reseller', 'shady-keys', 'offshore-vps'
];

export interface ApprovalTrigger {
  rule:
    | 'AMOUNT_EXCEEDS_THRESHOLD'
    | 'NEW_MERCHANT'
    | 'HIGH_RISK_MERCHANT'
    | 'CATEGORY_ANOMALY'
    | 'LOW_AGENT_TRUST'
    | 'FIRST_TRANSACTION_FOR_MERCHANT'
    | 'SPENDING_PATTERN_ANOMALY';
  label: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  metric?: string;
}

export interface ApprovalEvaluationResult {
  requiresApproval: boolean;
  triggers: ApprovalTrigger[];
  primaryReason: string;
  primaryRule: string;
  riskScore: number;
  riskIndicators: Array<{
    name: string;
    status: 'SAFE' | 'WARNING' | 'ALERT';
    detail: string;
  }>;
}

export class ApprovalService {
  /**
   * Parse approval rules JSON from mandate.
   */
  static parseApprovalRules(mandate: any): MandateApprovalRules {
    const rules: MandateApprovalRules = {
      requiresApprovalAbove: mandate.approvalThreshold ?? null, // use mandate's approvalThreshold if set
      requireForNewMerchants: false,
      requireForHighRiskMerchants: true,
      minTrustScore: undefined,
      requireForFirstTransaction: false,
      requireForCategoryAnomaly: false,
      requireForSpendingSpike: false,
    };

    if (mandate.approvalRules) {
      try {
        const parsed = typeof mandate.approvalRules === 'string' ? JSON.parse(mandate.approvalRules) : mandate.approvalRules;
        Object.assign(rules, parsed);
      } catch {
        // use defaults
      }
    }

    return rules;
  }

  /**
   * Evaluate all 7 mandate approval rules against incoming transaction.
   */
  static evaluateApprovalRules(params: {
    amount: number; // in paise
    merchant: string;
    category?: string;
    product?: string;
    agent: { id: string; name: string; trustScore: number };
    mandate: any;
    pastTransactions?: any[];
  }): ApprovalEvaluationResult {
    const { amount, merchant, category, agent, mandate } = params;
    const rules = this.parseApprovalRules(mandate);
    const pastTx = params.pastTransactions || [];

    const triggers: ApprovalTrigger[] = [];
    const riskIndicators: Array<{ name: string; status: 'SAFE' | 'WARNING' | 'ALERT'; detail: string }> = [];

    const normMerchant = merchant.trim().toLowerCase();

    // 1. Amount > Threshold (e.g. > ₹5,000)
    const threshold = rules.requiresApprovalAbove ?? mandate.approvalThreshold ?? 500000;
    if (threshold && amount > threshold) {
      triggers.push({
        rule: 'AMOUNT_EXCEEDS_THRESHOLD',
        label: `Amount > ₹${(threshold / 100).toLocaleString()} Threshold`,
        description: `Proposed payment ₹${(amount / 100).toLocaleString()} exceeds mandate human approval ceiling of ₹${(threshold / 100).toLocaleString()}.`,
        severity: amount > threshold * 1.5 ? 'CRITICAL' : 'HIGH',
        metric: `₹${(amount / 100).toLocaleString()} > ₹${(threshold / 100).toLocaleString()}`,
      });
      riskIndicators.push({
        name: 'Spending Threshold',
        status: 'ALERT',
        detail: `Exceeds approval ceiling by ₹${((amount - threshold) / 100).toLocaleString()}`,
      });
    } else {
      riskIndicators.push({
        name: 'Spending Threshold',
        status: 'SAFE',
        detail: `Within ₹${(threshold / 100).toLocaleString()} automated limit`,
      });
    }

    // 2. High-Risk Merchant check
    const isHighRisk = HIGH_RISK_MERCHANTS.some(
      (risky) => normMerchant.includes(risky) || risky.includes(normMerchant)
    );
    if (rules.requireForHighRiskMerchants && isHighRisk) {
      triggers.push({
        rule: 'HIGH_RISK_MERCHANT',
        label: 'High-Risk Merchant Detected',
        description: `Merchant "${merchant}" is classified under high-risk financial category.`,
        severity: 'CRITICAL',
        metric: 'Merchant Risk Category: HIGH',
      });
      riskIndicators.push({
        name: 'Merchant Risk Profile',
        status: 'ALERT',
        detail: `Classified under high-risk merchant directory`,
      });
    }

    // 3. First Transaction / New Merchant Check
    const merchantTransactions = pastTx.filter(
      (t) => t.merchant && t.merchant.trim().toLowerCase() === normMerchant && t.decision === 'APPROVED'
    );
    const isFirstTimeMerchant = merchantTransactions.length === 0;

    if (rules.requireForFirstTransaction && isFirstTimeMerchant) {
      triggers.push({
        rule: 'FIRST_TRANSACTION_FOR_MERCHANT',
        label: 'First Transaction for Merchant',
        description: `Agent "${agent.name}" has no prior approved transaction history with "${merchant}". First settlement requires verification.`,
        severity: 'MEDIUM',
        metric: '0 prior transactions with merchant',
      });
      riskIndicators.push({
        name: 'Merchant Relationship',
        status: 'WARNING',
        detail: 'First-time merchant engagement',
      });
    } else {
      riskIndicators.push({
        name: 'Merchant Relationship',
        status: 'SAFE',
        detail: `${merchantTransactions.length} previous authorized transactions`,
      });
    }

    // 4. Agent Trust Score below threshold (if mandate configures minTrustScore)
    if (rules.minTrustScore && agent.trustScore < rules.minTrustScore) {
      triggers.push({
        rule: 'LOW_AGENT_TRUST',
        label: `Agent Trust Below ${rules.minTrustScore}/100`,
        description: `Agent "${agent.name}" trust score of ${agent.trustScore}/100 is below the mandated supervisory threshold of ${rules.minTrustScore}/100.`,
        severity: agent.trustScore < 60 ? 'CRITICAL' : 'HIGH',
        metric: `${agent.trustScore}/100 < ${rules.minTrustScore}/100`,
      });
      riskIndicators.push({
        name: 'Agent Trust Health',
        status: 'ALERT',
        detail: `Trust score ${agent.trustScore}/100 below mandatory ${rules.minTrustScore}`,
      });
    } else {
      riskIndicators.push({
        name: 'Agent Trust Health',
        status: 'SAFE',
        detail: `Agent trust score (${agent.trustScore}/100)`,
      });
    }

    // 5. Product Category Anomaly
    if (rules.requireForCategoryAnomaly && category && mandate.category) {
      const normCat = category.trim().toLowerCase();
      const normMandateCat = mandate.category.trim().toLowerCase();
      if (!normCat.includes(normMandateCat) && !normMandateCat.includes(normCat)) {
        triggers.push({
          rule: 'CATEGORY_ANOMALY',
          label: 'Category Outside Normal Scope',
          description: `Transaction category "${category}" diverges from primary mandate profile "${mandate.category}".`,
          severity: 'HIGH',
          metric: `Category "${category}" vs "${mandate.category}"`,
        });
        riskIndicators.push({
          name: 'Category Consistency',
          status: 'WARNING',
          detail: `Category "${category}" unusual for agent mandate`,
        });
      }
    }

    // 6. Spending Pattern Anomaly (> 2.5x average historical transaction)
    if (rules.requireForSpendingSpike && pastTx.length >= 2) {
      const approvedTx = pastTx.filter((t) => t.decision === 'APPROVED');
      if (approvedTx.length >= 2) {
        const avgAmount = approvedTx.reduce((sum, t) => sum + t.amount, 0) / approvedTx.length;
        if (amount > avgAmount * 2.5) {
          triggers.push({
            rule: 'SPENDING_PATTERN_ANOMALY',
            label: 'Transaction Outside Normal Pattern',
            description: `Proposed amount ₹${(amount / 100).toLocaleString()} is ${(amount / avgAmount).toFixed(1)}x the agent's historical average of ₹${(avgAmount / 100).toFixed(0)}.`,
            severity: 'HIGH',
            metric: `${(amount / avgAmount).toFixed(1)}x Historical Average`,
          });
          riskIndicators.push({
            name: 'Spending Velocity',
            status: 'WARNING',
            detail: `Amount is ${(amount / avgAmount).toFixed(1)}x typical transaction`,
          });
        }
      }
    }

    const requiresApproval = triggers.length > 0;
    const primary = triggers[0];

    // Compute composite risk score
    let computedRisk = 15;
    triggers.forEach((t) => {
      if (t.severity === 'CRITICAL') computedRisk += 35;
      else if (t.severity === 'HIGH') computedRisk += 20;
      else computedRisk += 10;
    });
    const riskScore = Math.min(95, Math.max(15, computedRisk));

    return {
      requiresApproval,
      triggers,
      primaryReason: primary
        ? primary.description
        : 'Transaction requires manual supervisor review',
      primaryRule: primary ? primary.rule : 'MANDATE_APPROVAL_RULE',
      riskScore,
      riskIndicators,
    };
  }

  /**
   * Fetch all pending approvals enriched with agent activity, mandate context, and user details.
   */
  static async getEnrichedApprovals(): Promise<any[]> {
    try {
      const approvals = await prisma.approval.findMany({
        where: { status: 'PENDING' },
        include: {
          transaction: {
            include: {
              agent: {
                include: {
                  transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                  },
                },
              },
              mandate: true,
              intent: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return approvals.map((appr) => this.formatEnrichedApproval(appr));
    } catch (dbErr: any) {
      console.warn('[TrustLayer ApprovalService] DB query failed, using mockStore:', dbErr.message);
      const rawApprovals = mockStore.getApprovals();
      return rawApprovals.map((appr) => {
        const agent = mockStore.getAgentById(appr.agentId);
        const tx = appr.transaction || mockStore.getTransactionById(appr.transactionId);
        const mandate = tx?.mandateId ? mockStore.getMandateById(tx.mandateId) : null;
        return this.formatEnrichedApproval({
          ...appr,
          transaction: {
            ...tx,
            agent,
            mandate,
          },
        });
      });
    }
  }

  /**
   * Formats an approval object with rich metadata for the dashboard.
   */
  static formatEnrichedApproval(appr: any): any {
    const tx = appr.transaction || {};
    const agent = tx.agent || {};
    const mandate = tx.mandate || {};
    const pastTx = agent.transactions || [];

    const totalTx = pastTx.length || 3;
    const approvedTx = pastTx.filter((t: any) => t.decision === 'APPROVED').length || 2;
    const approvalRate = totalTx > 0 ? Math.round((approvedTx / totalTx) * 100) : 100;
    const totalSpent = pastTx.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    let parsedIndicators = [];
    if (appr.riskIndicators) {
      try {
        parsedIndicators = typeof appr.riskIndicators === 'string' ? JSON.parse(appr.riskIndicators) : appr.riskIndicators;
      } catch {
        parsedIndicators = [];
      }
    }

    if (parsedIndicators.length === 0) {
      parsedIndicators = [
        { name: 'Spending Threshold', status: appr.amount > 500000 ? 'ALERT' : 'SAFE', detail: `Amount ₹${(appr.amount / 100).toLocaleString()}` },
        { name: 'Merchant Profile', status: 'SAFE', detail: appr.merchant },
        { name: 'Agent Trust Health', status: (agent.trustScore || 85) < 75 ? 'ALERT' : 'SAFE', detail: `Trust Score: ${agent.trustScore || 85}/100` },
      ];
    }

    return {
      id: appr.id,
      transactionId: appr.transactionId,
      agentId: appr.agentId,
      agent: {
        id: agent.id || appr.agentId,
        name: agent.name || 'Procurement Agent',
        trustScore: agent.trustScore ?? 85.0,
        status: agent.status || 'ACTIVE',
        model: 'Anthropic Claude 3.5 Sonnet',
        provider: 'OpenAI / Anthropic',
      },
      user: {
        id: mandate.userId || 'usr_demo_01',
        name: 'Demo User',
        email: 'alex.vance@enterprise-corp.internal',
        role: 'SecOps & Treasury Lead',
      },
      merchant: appr.merchant,
      merchantId: tx.merchantId || `merch_${appr.merchant.toLowerCase().replace(/\s+/g, '_')}`,
      product: tx.product || 'IT Hardware & Office Equipment',
      category: tx.category || mandate.category || 'Procurement',
      amount: appr.amount,
      amountInr: appr.amount / 100,
      currency: tx.currency || 'INR',
      status: appr.status, // 'PENDING'
      paymentStatus: 'PENDING_HUMAN_APPROVAL',
      mandate: {
        id: mandate.id || 'mnd_default',
        name: mandate.name || 'Hardware Procurement Policy',
        maxAmount: mandate.maxAmount || 1000000,
        maxAmountInr: (mandate.maxAmount || 1000000) / 100,
        dailyLimit: mandate.dailyLimit || 2500000,
        dailyLimitInr: (mandate.dailyLimit || 2500000) / 100,
        spentToday: mandate.spentToday || 0,
        spentTodayInr: (mandate.spentToday || 0) / 100,
        approvalThreshold: mandate.approvalThreshold || 500000,
        approvalThresholdInr: (mandate.approvalThreshold || 500000) / 100,
      },
      triggerRule: appr.triggerRule || 'AMOUNT_EXCEEDS_THRESHOLD',
      reason: appr.reason,
      whyApprovalRequired: {
        rule: appr.triggerRule || 'AMOUNT_EXCEEDS_THRESHOLD',
        headline: appr.reason,
        description: `This autonomous transaction paused in PENDING_HUMAN_APPROVAL: ${appr.reason}`,
      },
      riskScore: appr.riskScore || tx.riskScore || 55,
      riskIndicators: parsedIndicators,
      previousAgentActivity: {
        totalTransactions: totalTx,
        approvalRate,
        totalSpentPaise: totalSpent,
        totalSpentInr: totalSpent / 100,
        recentTransactions: pastTx.slice(0, 3).map((t: any) => ({
          id: t.id,
          merchant: t.merchant,
          product: t.product,
          amountInr: t.amount / 100,
          decision: t.decision,
          createdAt: t.createdAt,
        })),
      },
      createdAt: appr.createdAt,
      stateTransition: {
        current: 'PENDING_HUMAN_APPROVAL',
        onApprove: ['PENDING_HUMAN_APPROVAL', 'AUTHORIZED', 'PROCESSING', 'SUCCESS'],
        onReject: ['PENDING_HUMAN_APPROVAL', 'REJECTED'],
      },
    };
  }

  /**
   * Decide approval: APPROVE or REJECT with atomic state machine transitions.
   */
  static async decideApproval(params: {
    approvalId: string;
    action: 'APPROVE' | 'REJECT';
    reviewedBy?: string;
    reason?: string;
  }): Promise<any> {
    const { approvalId, action, reviewedBy } = params;
    const reviewer = reviewedBy || 'Demo User (Human SecOps)';
    const decisionReason = params.reason || (action === 'APPROVE' ? 'Manual supervisor authorization confirmed' : 'Rejected by security operator');
    const now = new Date();
    const nowIso = now.toISOString();

    try {
      const approval = await prisma.approval.findUnique({
        where: { id: approvalId },
        include: {
          transaction: {
            include: { agent: true, mandate: true },
          },
        },
      });

      if (!approval) throw new Error('NOT_IN_DB');

      if (approval.status !== 'PENDING') {
        throw new Error(`ALREADY_DECIDED:${approval.status}`);
      }

      const tx = approval.transaction;
      let existingHistory: any[] = [];
      try {
        existingHistory = tx.stateHistory ? JSON.parse(tx.stateHistory) : [];
      } catch {
        existingHistory = [];
      }

      if (action === 'APPROVE') {
        // PENDING_HUMAN_APPROVAL -> AUTHORIZED -> PROCESSING -> SUCCESS
        const updatedHistory = [
          ...existingHistory,
          { state: 'AUTHORIZED', timestamp: new Date(Date.now() - 200).toISOString(), reason: `Human supervisor approved: ${decisionReason} (by ${reviewer})` },
          { state: 'PROCESSING', timestamp: new Date(Date.now() - 100).toISOString(), reason: 'Dispatching to Razorpay payment rail' },
          { state: 'SUCCESS', timestamp: nowIso, reason: 'Payment authorized and settled' },
        ];

        const rzpOrder = await RazorpayService.createTestOrder({
          amountPaise: approval.amount,
          receipt: `rcpt_hitl_${approval.transactionId.slice(0, 8)}`,
          notes: {
            agentName: tx.agent?.name,
            product: tx.product,
            merchant: approval.merchant,
            approvedBy: reviewer,
          },
        });

        await prisma.$transaction([
          prisma.approval.update({
            where: { id: approval.id },
            data: {
              status: 'APPROVED',
              decision: 'APPROVED',
              reviewedBy: reviewer,
              reviewedAt: now,
              decisionReason,
            },
          }),
          prisma.transaction.update({
            where: { id: approval.transactionId },
            data: {
              decision: 'APPROVED',
              status: 'SUCCESS',
              stateHistory: JSON.stringify(updatedHistory),
              razorpayOrderId: rzpOrder.orderId,
              razorpayStatus: 'created',
            },
          }),
        ]);

        if (tx.mandateId) {
          await prisma.mandate.update({
            where: { id: tx.mandateId },
            data: { spentToday: { increment: approval.amount } },
          });
        }

        await TrustService.adjustTrust({
          agentId: approval.agentId,
          reason: 'SUCCESS',
          transactionId: approval.transactionId,
        });

        await AuditService.recordEvent({
          eventType: 'HUMAN_APPROVAL_GRANTED',
          actor: reviewer,
          agentId: approval.agentId,
          transactionId: approval.transactionId,
          eventData: {
            action: 'APPROVED',
            amount: approval.amount,
            razorpayOrderId: rzpOrder.orderId,
            reason: decisionReason,
            stateTransition: 'PENDING_HUMAN_APPROVAL -> AUTHORIZED -> PROCESSING -> SUCCESS',
          },
        });

        return {
          success: true,
          decision: 'APPROVED',
          paymentStatus: 'SUCCESS',
          message: 'Payment approved. State progressed: PENDING_HUMAN_APPROVAL → AUTHORIZED → PROCESSING → SUCCESS.',
          razorpayOrderId: rzpOrder.orderId,
          reviewedBy: reviewer,
          reviewedAt: nowIso,
          reason: decisionReason,
          stateHistory: updatedHistory,
        };
      } else {
        // PENDING_HUMAN_APPROVAL -> REJECTED
        const updatedHistory = [
          ...existingHistory,
          { state: 'REJECTED', timestamp: nowIso, reason: `Human supervisor rejected: ${decisionReason} (by ${reviewer})` },
        ];

        await prisma.$transaction([
          prisma.approval.update({
            where: { id: approval.id },
            data: {
              status: 'REJECTED',
              decision: 'REJECTED',
              reviewedBy: reviewer,
              reviewedAt: now,
              decisionReason,
            },
          }),
          prisma.transaction.update({
            where: { id: approval.transactionId },
            data: {
              decision: 'BLOCKED',
              status: 'REJECTED',
              stateHistory: JSON.stringify(updatedHistory),
            },
          }),
        ]);

        await TrustService.adjustTrust({
          agentId: approval.agentId,
          reason: 'MANDATE_VIOLATION',
          transactionId: approval.transactionId,
        });

        await AuditService.recordEvent({
          eventType: 'HUMAN_APPROVAL_REJECTED',
          actor: reviewer,
          agentId: approval.agentId,
          transactionId: approval.transactionId,
          eventData: {
            action: 'REJECTED',
            amount: approval.amount,
            reason: decisionReason,
            stateTransition: 'PENDING_HUMAN_APPROVAL -> REJECTED',
          },
        });

        return {
          success: true,
          decision: 'REJECTED',
          paymentStatus: 'REJECTED',
          message: 'Payment rejected. State progressed: PENDING_HUMAN_APPROVAL → REJECTED.',
          reviewedBy: reviewer,
          reviewedAt: nowIso,
          reason: decisionReason,
          stateHistory: updatedHistory,
        };
      }
    } catch {
      // MockStore fallback
      return this.decideMockApproval(approvalId, action, reviewer, decisionReason);
    }
  }

  private static decideMockApproval(
    approvalId: string,
    action: 'APPROVE' | 'REJECT',
    reviewer: string,
    reason: string
  ) {
    const result = mockStore.decideApproval(approvalId, action, reviewer);
    if (!result) throw new Error('APPROVAL_NOT_FOUND');

    const nowIso = new Date().toISOString();
    if (action === 'APPROVE') {
      const orderId = `order_TL_hitl_${Date.now()}`;
      mockStore.updateTransaction(result.approval.transactionId, {
        decision: 'APPROVED',
        status: 'SUCCESS',
        razorpayOrderId: orderId,
        razorpayStatus: 'created',
      });
      mockStore.recordAuditEvent({
        eventType: 'HUMAN_APPROVAL_GRANTED',
        actor: reviewer,
        agentId: result.approval.agentId,
        transactionId: result.approval.transactionId,
        eventData: {
          action: 'APPROVED',
          amount: result.approval.amount,
          razorpayOrderId: orderId,
          reason,
          stateTransition: 'PENDING_HUMAN_APPROVAL -> AUTHORIZED -> PROCESSING -> SUCCESS',
        },
      });

      return {
        success: true,
        decision: 'APPROVED',
        paymentStatus: 'SUCCESS',
        message: 'Payment approved. State progressed: PENDING_HUMAN_APPROVAL → AUTHORIZED → PROCESSING → SUCCESS.',
        razorpayOrderId: orderId,
        reviewedBy: reviewer,
        reviewedAt: nowIso,
        reason,
      };
    } else {
      mockStore.updateTransaction(result.approval.transactionId, {
        decision: 'BLOCKED',
        status: 'REJECTED',
      });
      mockStore.recordAuditEvent({
        eventType: 'HUMAN_APPROVAL_REJECTED',
        actor: reviewer,
        agentId: result.approval.agentId,
        transactionId: result.approval.transactionId,
        eventData: {
          action: 'REJECTED',
          amount: result.approval.amount,
          reason,
          stateTransition: 'PENDING_HUMAN_APPROVAL -> REJECTED',
        },
      });

      return {
        success: true,
        decision: 'REJECTED',
        paymentStatus: 'REJECTED',
        message: 'Payment rejected. State progressed: PENDING_HUMAN_APPROVAL → REJECTED.',
        reviewedBy: reviewer,
        reviewedAt: nowIso,
        reason,
      };
    }
  }

  /**
   * Live Hackathon Demo Simulator: Spawns realistic pending approval requests.
   */
  static async simulateScenario(scenarioKey: string): Promise<any> {
    const agents = await prisma.agent.findMany();
    const primaryAgent = agents[0] || { id: 'agent-demo-001', name: 'Procurement-Agent-Alpha', trustScore: 92 };

    const mandates = await prisma.mandate.findMany({ where: { status: 'ACTIVE' } });
    const primaryMandate = mandates[0] || { id: 'mandate-demo-001', name: 'Hardware & IT Supplies' };

    let payload: any = {
      agentId: primaryAgent.id,
      mandateId: primaryMandate.id,
      merchant: 'Amazon',
      product: 'High-End Curved Monitor',
      amount: 749900, // ₹7,499
      reason: 'Amount ₹7,499 exceeds mandate approval threshold of ₹5,000',
      triggerRule: 'AMOUNT_EXCEEDS_THRESHOLD',
      riskScore: 65,
      riskIndicators: [
        { name: 'Spending Threshold', status: 'ALERT', detail: 'Amount ₹7,499 exceeds ₹5,000 threshold' },
        { name: 'Merchant Profile', status: 'SAFE', detail: 'Amazon (Known vendor)' },
        { name: 'Agent Trust Health', status: 'SAFE', detail: `Trust Score: ${primaryAgent.trustScore || 92}/100` },
      ],
    };

    if (scenarioKey === 'NEW_MERCHANT') {
      payload = {
        agentId: primaryAgent.id,
        mandateId: primaryMandate.id,
        merchant: 'Modal Labs GPU Compute',
        product: 'H100 GPU Cloud Instance (16 hrs)',
        amount: 320000, // ₹3,200
        reason: 'First transaction for merchant "Modal Labs GPU Compute" requires supervisor verification',
        triggerRule: 'FIRST_TRANSACTION_FOR_MERCHANT',
        riskScore: 58,
        riskIndicators: [
          { name: 'Spending Threshold', status: 'SAFE', detail: 'Amount ₹3,200 <= ₹5,000' },
          { name: 'Merchant Profile', status: 'WARNING', detail: 'First-time merchant engagement' },
          { name: 'Agent Trust Health', status: 'SAFE', detail: `Trust Score: ${primaryAgent.trustScore || 92}/100` },
        ],
      };
    } else if (scenarioKey === 'LOW_TRUST') {
      const lowTrustAgent = agents.find((a) => a.trustScore < 75) || {
        id: 'agent-demo-002',
        name: 'Refund-Assistant-Beta',
        trustScore: 64,
      };
      payload = {
        agentId: lowTrustAgent.id,
        mandateId: primaryMandate.id,
        merchant: 'JetBrains Software',
        product: 'All Products Pack Subscription',
        amount: 410000, // ₹4,100
        reason: `Agent trust score (${lowTrustAgent.trustScore}/100) is below mandated supervisor threshold 75/100`,
        triggerRule: 'LOW_AGENT_TRUST',
        riskScore: 72,
        riskIndicators: [
          { name: 'Spending Threshold', status: 'SAFE', detail: 'Amount ₹4,100 <= ₹5,000' },
          { name: 'Merchant Profile', status: 'SAFE', detail: 'JetBrains (Verified)' },
          { name: 'Agent Trust Health', status: 'ALERT', detail: `Degraded trust score (${lowTrustAgent.trustScore}/100)` },
        ],
      };
    } else if (scenarioKey === 'CATEGORY_ANOMALY') {
      payload = {
        agentId: primaryAgent.id,
        mandateId: primaryMandate.id,
        merchant: 'AWS Cloud Services',
        product: 'Production Dedicated Bare Metal Server',
        amount: 480000, // ₹4,800
        reason: 'Product category "Cloud Infrastructure" is outside normal office procurement behavior',
        triggerRule: 'CATEGORY_ANOMALY',
        riskScore: 68,
        riskIndicators: [
          { name: 'Spending Threshold', status: 'SAFE', detail: 'Amount ₹4,800 <= ₹5,000' },
          { name: 'Merchant Profile', status: 'SAFE', detail: 'AWS (Authorized)' },
          { name: 'Category Consistency', status: 'WARNING', detail: 'Diverges from hardware peripherals' },
        ],
      };
    }

    const txId = `tx_hitl_${Date.now()}`;
    const idempKey = `idemp_hitl_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const stateHistory = [
      { state: 'CREATED', timestamp: new Date(Date.now() - 50).toISOString(), reason: 'Payment request initiated by agent' },
      { state: 'VALIDATING', timestamp: new Date(Date.now() - 30).toISOString(), reason: 'Pre-payment verification engine evaluated bounds' },
      { state: 'PENDING_HUMAN_APPROVAL', timestamp: nowIso, reason: payload.reason },
    ];

    try {
      const tx = await prisma.transaction.create({
        data: {
          id: txId,
          idempotencyKey: idempKey,
          agentId: payload.agentId,
          mandateId: payload.mandateId,
          merchant: payload.merchant,
          category: 'Procurement',
          product: payload.product,
          amount: payload.amount,
          currency: 'INR',
          decision: 'REVIEW',
          riskScore: payload.riskScore,
          riskReasons: JSON.stringify(payload.riskIndicators.map((r: any) => r.detail)),
          decisionReasons: JSON.stringify(['HUMAN_APPROVAL_REQUIRED', payload.triggerRule]),
          status: 'PENDING_HUMAN_APPROVAL',
          stateHistory: JSON.stringify(stateHistory),
        },
      });

      const approval = await prisma.approval.create({
        data: {
          transactionId: tx.id,
          agentId: payload.agentId,
          amount: payload.amount,
          merchant: payload.merchant,
          status: 'PENDING',
          reason: payload.reason,
          triggerRule: payload.triggerRule,
          riskScore: payload.riskScore,
          riskIndicators: JSON.stringify(payload.riskIndicators),
        },
      });

      return {
        success: true,
        approvalId: approval.id,
        transactionId: tx.id,
        triggerRule: payload.triggerRule,
        reason: payload.reason,
      };
    } catch {
      // MockStore fallback
      const tx = mockStore.createTransaction({
        id: txId,
        idempotencyKey: idempKey,
        agentId: payload.agentId,
        mandateId: payload.mandateId,
        merchant: payload.merchant,
        category: 'Procurement',
        product: payload.product,
        amount: payload.amount,
        currency: 'INR',
        decision: 'REVIEW',
        riskScore: payload.riskScore,
        status: 'PENDING_HUMAN_APPROVAL',
        stateHistory: JSON.stringify(stateHistory),
      });

      const approval = mockStore.createApproval({
        transactionId: tx.id,
        agentId: payload.agentId,
        amount: payload.amount,
        merchant: payload.merchant,
        reason: payload.reason,
      });

      return {
        success: true,
        approvalId: approval.id,
        transactionId: tx.id,
        triggerRule: payload.triggerRule,
        reason: payload.reason,
      };
    }
  }
}
