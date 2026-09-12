import { prisma } from '../db';
import { config } from '../config';
import { mockStore } from '../mockStore';
import { AuditService } from './audit.service';

export type TrustTier = 'TRUSTED' | 'NORMAL' | 'RESTRICTED' | 'HIGH RISK';

export interface TrustControlInfo {
  tier: TrustTier;
  label: string;
  minScore: number;
  maxScore: number;
  badgeClass: string;
  controlsDescription: string;
  isAutonomousAllowed: boolean;
  requiresHigherValueApproval: boolean;
  higherValueThresholdPaise: number; // 250000 = ₹2,500
}

export const TRUST_TIERS: Record<TrustTier, TrustControlInfo> = {
  TRUSTED: {
    tier: 'TRUSTED',
    label: 'Trusted Autonomous Agent',
    minScore: 90,
    maxScore: 100,
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    controlsDescription: 'Normal mandate rules. Full autonomous execution within standard mandate limits.',
    isAutonomousAllowed: true,
    requiresHigherValueApproval: false,
    higherValueThresholdPaise: 0,
  },
  NORMAL: {
    tier: 'NORMAL',
    label: 'Normal Governance Tier',
    minScore: 70,
    maxScore: 89.9,
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    controlsDescription: 'Normal mandate rules. Standard autonomous bounds apply.',
    isAutonomousAllowed: true,
    requiresHigherValueApproval: false,
    higherValueThresholdPaise: 0,
  },
  RESTRICTED: {
    tier: 'RESTRICTED',
    label: 'Restricted Compliance Tier',
    minScore: 40,
    maxScore: 69.9,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    controlsDescription: 'Human approval required for higher-value payments (exceeding ₹2,500 or 50% of single limit).',
    isAutonomousAllowed: true,
    requiresHigherValueApproval: true,
    higherValueThresholdPaise: 250000, // ₹2,500
  },
  'HIGH RISK': {
    tier: 'HIGH RISK',
    label: 'High Risk / Supervised Only',
    minScore: 0,
    maxScore: 39.9,
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    controlsDescription: 'Block autonomous payments. Explicit user/supervisor approval required for all transactions.',
    isAutonomousAllowed: false,
    requiresHigherValueApproval: true,
    higherValueThresholdPaise: 0,
  },
};

export type TrustReason =
  | 'SUCCESS'
  | 'MANDATE_VIOLATION'
  | 'DUPLICATE_ATTEMPT'
  | 'INTENT_DRIFT'
  | 'USER_DISPUTE'
  | 'CONFIRMED_FRAUD'
  | 'SUPERVISOR_REJECTION'
  | 'PAYMENT_REVERSED';

export const SCORE_DELTAS: Record<TrustReason, number> = {
  SUCCESS: 0.5,
  MANDATE_VIOLATION: -5.0,
  DUPLICATE_ATTEMPT: -4.0,
  INTENT_DRIFT: -8.0,
  USER_DISPUTE: -10.0,
  CONFIRMED_FRAUD: -20.0,
  SUPERVISOR_REJECTION: -7.0,
  PAYMENT_REVERSED: -12.0,
};

export const REASON_EXPLANATIONS: Record<TrustReason, (details?: string) => string> = {
  SUCCESS: (d) =>
    d || 'Successful authorized transaction settled cleanly within all mandate constraints (+0.5)',
  MANDATE_VIOLATION: (d) =>
    d || 'Attempted purchase outside mandate boundaries or single transaction limit (-6.0)',
  DUPLICATE_ATTEMPT: (d) =>
    d || 'Duplicate payment replay attempt intercepted by idempotency engine (-4.0)',
  INTENT_DRIFT: (d) =>
    d || 'Semantic substitution or unauthorized merchant drift detected (-8.0)',
  USER_DISPUTE: (d) =>
    d || 'User contested and filed transaction dispute citing agent breach (-10.0)',
  CONFIRMED_FRAUD: (d) =>
    d || 'Confirmed unauthorized or fraudulent agent execution (-20.0)',
  SUPERVISOR_REJECTION: (d) =>
    d || 'Supervisory review queue rejected payment instruction (-7.0)',
  PAYMENT_REVERSED: (d) =>
    d || 'Settlement clawback executed and payment reversed to cardholder account (-12.0)',
};

export function getTrustTier(score: number): TrustTier {
  if (score >= 90) return 'TRUSTED';
  if (score >= 70) return 'NORMAL';
  if (score >= 40) return 'RESTRICTED';
  return 'HIGH RISK';
}

export interface TrustSignalItem {
  id: string;
  name: string;
  type: 'POSITIVE' | 'NEGATIVE';
  impact: string;
  detail: string;
  scoreContribution: number;
}

export interface TrustReport {
  agentId: string;
  agentName: string;
  trustScore: number;
  trustTier: TrustTier;
  tierInfo: TrustControlInfo;
  currentRestrictions: string;
  positiveSignals: TrustSignalItem[];
  negativeSignals: TrustSignalItem[];
  metrics: {
    totalTransactions: number;
    authorizedTransactions: number;
    blockedTransactions: number;
    disputedTransactions: number;
    reversedTransactions: number;
    duplicateAttempts: number;
    mandateViolations: number;
    humanRejections: number;
    humanRejectionRate: number;
    disputeRate: number;
    mandateViolationRate: number;
  };
  scoreHistory: Array<{
    id: string;
    timestamp: string;
    previousScore: number;
    newScore: number;
    scoreDelta: number;
    reason: string;
    explanation: string;
    transactionId?: string | null;
  }>;
}

export class TrustService {
  /**
   * Returns deterministic trust tier for a given numerical score.
   */
  static getTrustTier(score: number): TrustTier {
    return getTrustTier(score);
  }

  /**
   * Returns control info and restrictions for a score or tier.
   */
  static getControlInfo(scoreOrTier: number | TrustTier): TrustControlInfo {
    const tier = typeof scoreOrTier === 'number' ? getTrustTier(scoreOrTier) : scoreOrTier;
    return TRUST_TIERS[tier] || TRUST_TIERS.NORMAL;
  }

  /**
   * Generates a fully transparent trust report for an agent with positive and negative signals.
   */
  static async getTrustReport(agentId: string): Promise<TrustReport> {
    let agent: any = null;
    let transactions: any[] = [];
    let trustEvents: any[] = [];
    let disputes: any[] = [];

    try {
      agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          transactions: { orderBy: { createdAt: 'desc' }, take: 100 },
          trustEvents: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });

      if (agent) {
        transactions = agent.transactions || [];
        trustEvents = agent.trustEvents || [];
        disputes = await prisma.dispute.findMany({
          where: { agentId },
          take: 50,
        });
      }
    } catch {
      // Prisma fallback to mockStore
    }

    if (!agent) {
      const mockAgent = mockStore.getAgentById(agentId);
      if (!mockAgent) {
        throw new Error(`Agent ${agentId} not found`);
      }
      agent = mockAgent;
      transactions = mockStore.getTransactions().filter((t) => t.agentId === agentId);
      trustEvents = mockStore.getTrustEvents(agentId);
      disputes = mockStore.getDisputes().filter((d) => d.agent_id === agentId || d.agentId === agentId);
    }

    const currentScore = Math.round((agent.trustScore ?? 85.0) * 10) / 10;
    const tier = getTrustTier(currentScore);
    const tierInfo = TRUST_TIERS[tier];

    // Compute metrics
    const totalTransactions = transactions.length;
    const authorizedTransactions = transactions.filter((t) => t.decision === 'APPROVED' || t.status === 'SUCCESS').length;
    const blockedTransactions = transactions.filter((t) => t.decision === 'BLOCKED').length;
    const disputedTransactions = disputes.length;
    const reversedTransactions = transactions.filter((t) => t.status === 'REVERSED').length;
    const duplicateAttempts = transactions.filter((t) => t.duplicateCount > 0 || t.decisionReasons?.includes('DUPLICATE_TRANSACTION')).length;
    
    // Mandate violations count
    const mandateViolations = transactions.filter((t) => {
      const reasons = typeof t.decisionReasons === 'string' ? t.decisionReasons : JSON.stringify(t.decisionReasons || []);
      return (
        reasons.includes('AMOUNT_LIMIT_EXCEEDED') ||
        reasons.includes('MERCHANT_NOT_AUTHORIZED') ||
        reasons.includes('CATEGORY_NOT_AUTHORIZED') ||
        reasons.includes('PRODUCT_PATTERN_MISMATCH') ||
        reasons.includes('DAILY_LIMIT_EXCEEDED') ||
        reasons.includes('MANDATE_EXPIRED')
      );
    }).length;

    // Human rejections count
    const humanRejections = transactions.filter((t) => t.status === 'REJECTED' || t.decision === 'REVIEW' && t.status === 'REJECTED').length;
    const reviewRequests = transactions.filter((t) => t.decision === 'REVIEW' || t.status === 'PENDING_HUMAN_APPROVAL').length;
    const humanRejectionRate = reviewRequests > 0 ? Math.round((humanRejections / reviewRequests) * 100) : 0;
    const disputeRate = totalTransactions > 0 ? Math.round((disputedTransactions / totalTransactions) * 1000) / 10 : 0;
    const mandateViolationRate = totalTransactions > 0 ? Math.round((mandateViolations / totalTransactions) * 1000) / 10 : 0;

    // -------------------------------------------------------------
    // Calculate Transparent Positive Signals
    // -------------------------------------------------------------
    const positiveSignals: TrustSignalItem[] = [
      {
        id: 'sig_pos_authorized',
        name: 'Successful Authorized Transactions',
        type: 'POSITIVE',
        impact: `+${Math.min(15.0, Math.round(authorizedTransactions * 0.5 * 10) / 10)} pts`,
        detail: `${authorizedTransactions} payments authorized and settled cleanly without policy exceptions`,
        scoreContribution: Math.min(15.0, Math.round(authorizedTransactions * 0.5 * 10) / 10),
      },
      {
        id: 'sig_pos_low_dispute',
        name: 'Low Dispute Rate Stability',
        type: 'POSITIVE',
        impact: disputeRate < 1.0 ? '+5.0 pts' : '+0.0 pts',
        detail: `Dispute rate is ${disputeRate}% (${disputedTransactions}/${totalTransactions || 1} transactions contested)`,
        scoreContribution: disputeRate < 1.0 ? 5.0 : 0.0,
      },
      {
        id: 'sig_pos_low_violation',
        name: 'Mandate Compliance Reliability',
        type: 'POSITIVE',
        impact: mandateViolationRate < 5.0 ? '+5.0 pts' : '+0.0 pts',
        detail: `Mandate violation rate is ${mandateViolationRate}% across merchant, category, and limit bounds`,
        scoreContribution: mandateViolationRate < 5.0 ? 5.0 : 0.0,
      },
    ];

    // -------------------------------------------------------------
    // Calculate Transparent Negative Signals
    // -------------------------------------------------------------
    const negativeSignals: TrustSignalItem[] = [
      {
        id: 'sig_neg_mandate',
        name: 'Attempted Purchases Outside Mandate',
        type: 'NEGATIVE',
        impact: mandateViolations > 0 ? `-${mandateViolations * 6.0} pts` : '0 pts',
        detail: `${mandateViolations} transaction requests breached configured spending caps or merchant bounds`,
        scoreContribution: mandateViolations * -6.0,
      },
      {
        id: 'sig_neg_duplicate',
        name: 'Duplicate Payment Replay Attempts',
        type: 'NEGATIVE',
        impact: duplicateAttempts > 0 ? `-${duplicateAttempts * 4.0} pts` : '0 pts',
        detail: `${duplicateAttempts} replay collisions intercepted by LEO idempotency cache`,
        scoreContribution: duplicateAttempts * -4.0,
      },
      {
        id: 'sig_neg_dispute',
        name: 'User Disputes & Contests',
        type: 'NEGATIVE',
        impact: disputedTransactions > 0 ? `-${disputedTransactions * 10.0} pts` : '0 pts',
        detail: `${disputedTransactions} payments contested by user for exceeding instructions or wrong items`,
        scoreContribution: disputedTransactions * -10.0,
      },
      {
        id: 'sig_neg_reversals',
        name: 'Settlement Clawbacks & Reversals',
        type: 'NEGATIVE',
        impact: reversedTransactions > 0 ? `-${reversedTransactions * 12.0} pts` : '0 pts',
        detail: `${reversedTransactions} payments clawed back through the recovery reversal engine`,
        scoreContribution: reversedTransactions * -12.0,
      },
    ];

    if (humanRejectionRate > 30) {
      negativeSignals.push({
        id: 'sig_neg_human_reject',
        name: 'High Human Supervisory Rejection Rate',
        type: 'NEGATIVE',
        impact: '-8.0 pts',
        detail: `Supervisor queue rejected ${humanRejectionRate}% of human review escalations`,
        scoreContribution: -8.0,
      });
    }

    // Build Score History Timeline
    const scoreHistory = trustEvents.map((ev: any) => ({
      id: ev.id,
      timestamp: (ev.createdAt instanceof Date ? ev.createdAt : new Date(ev.createdAt)).toISOString(),
      previousScore: ev.previousScore,
      newScore: ev.newScore,
      scoreDelta: ev.scoreDelta,
      reason: ev.reason,
      explanation:
        ev.explanation ||
        REASON_EXPLANATIONS[ev.reason as TrustReason]?.(ev.reason) ||
        `Trust score adjusted by ${ev.scoreDelta > 0 ? `+${ev.scoreDelta}` : ev.scoreDelta} pts (${ev.reason})`,
      transactionId: ev.transactionId || null,
    }));

    return {
      agentId: agent.id,
      agentName: agent.name,
      trustScore: currentScore,
      trustTier: tier,
      tierInfo,
      currentRestrictions: tierInfo.controlsDescription,
      positiveSignals,
      negativeSignals,
      metrics: {
        totalTransactions,
        authorizedTransactions,
        blockedTransactions,
        disputedTransactions,
        reversedTransactions,
        duplicateAttempts,
        mandateViolations,
        humanRejections,
        humanRejectionRate,
        disputeRate,
        mandateViolationRate,
      },
      scoreHistory,
    };
  }

  /**
   * Applies trust delta to an agent, records the reason explanation, and updates audit log.
   */
  static async adjustTrust(params: {
    agentId: string;
    reason: TrustReason;
    transactionId?: string;
    details?: string;
  }) {
    const delta = SCORE_DELTAS[params.reason] || 0;
    const explanation = REASON_EXPLANATIONS[params.reason]?.(params.details);

    try {
      const agent = await prisma.agent.findUnique({
        where: { id: params.agentId },
      });

      if (!agent) {
        throw new Error(`Agent ${params.agentId} not found`);
      }

      const previousScore = agent.trustScore;
      let newScore = Math.round((previousScore + delta) * 10) / 10;

      // Clamp between 0 and 100
      if (newScore > 100) newScore = 100;
      if (newScore < 0) newScore = 0;

      const prevTier = getTrustTier(previousScore);
      const newTier = getTrustTier(newScore);

      // Determine operational status: only SUSPENDED if in HIGH RISK tier (< 40)
      let status = agent.status;
      if (newScore < 40) {
        status = 'SUSPENDED';
      } else {
        status = 'ACTIVE';
      }

      // Persist event and agent score update
      const [trustEvent, updatedAgent] = await prisma.$transaction([
        prisma.trustEvent.create({
          data: {
            agentId: agent.id,
            transactionId: params.transactionId,
            reason: params.reason,
            scoreDelta: delta,
            previousScore,
            newScore,
          },
        }),
        prisma.agent.update({
          where: { id: agent.id },
          data: {
            trustScore: newScore,
            status,
          },
        }),
      ]);

      // Emit SHA-256 Audit Event
      await AuditService.recordEvent({
        eventType: 'AGENT_TRUST_UPDATED',
        actor: 'LEO Trust Governance Engine',
        actorType: 'SYSTEM',
        actorId: 'leo_trust_engine',
        agentId: agent.id,
        transactionId: params.transactionId,
        action: 'ADJUST_TRUST_SCORE',
        previousState: `${previousScore}/100 (${prevTier})`,
        newState: `${newScore}/100 (${newTier})`,
        reason: explanation,
        metadata: {
          previousScore,
          newScore,
          scoreDelta: delta,
          previousTier: prevTier,
          newTier,
          reason: params.reason,
          explanation,
        },
      });

      return {
        trustEvent: {
          ...trustEvent,
          explanation,
        },
        updatedAgent: {
          ...updatedAgent,
          trustTier: newTier,
          controls: TRUST_TIERS[newTier],
        },
      };
    } catch (err: any) {
      console.warn('[TrustLayer API] TrustService DB update failed, falling back to mockStore:', err.message);
      const res = mockStore.adjustTrust(params.agentId, delta, params.reason, explanation);
      const prev = res?.previousScore || 100;
      const nw = res?.newScore || 100;
      const newTier = getTrustTier(nw);

      return {
        trustEvent: {
          id: `te-${Date.now()}`,
          agentId: params.agentId,
          transactionId: params.transactionId || null,
          reason: params.reason,
          explanation,
          scoreDelta: delta,
          previousScore: prev,
          newScore: nw,
          createdAt: new Date(),
        },
        updatedAgent: {
          ...mockStore.getAgentById(params.agentId),
          trustScore: nw,
          trustTier: newTier,
          controls: TRUST_TIERS[newTier],
        },
      };
    }
  }

  /**
   * Fleet-wide trust metrics and tier distribution.
   */
  static async getFleetOverview() {
    let agents: any[] = [];
    try {
      agents = await prisma.agent.findMany();
    } catch {
      agents = mockStore.getAgents();
    }

    const tierCounts: Record<TrustTier, number> = {
      TRUSTED: 0,
      NORMAL: 0,
      RESTRICTED: 0,
      'HIGH RISK': 0,
    };

    let totalScore = 0;
    agents.forEach((a) => {
      const score = a.trustScore ?? 85;
      totalScore += score;
      const tier = getTrustTier(score);
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    const averageTrustScore = agents.length > 0 ? Math.round((totalScore / agents.length) * 10) / 10 : 85.0;

    return {
      totalAgents: agents.length,
      averageTrustScore,
      tierCounts,
      tiers: TRUST_TIERS,
    };
  }
}
