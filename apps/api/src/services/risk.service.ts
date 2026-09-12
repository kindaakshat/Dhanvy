import { config } from '../config';

export interface RiskEvaluationResult {
  score: number; // 0 - 100
  reasons: string[];
  suggestedDecision: 'APPROVE' | 'REVIEW' | 'BLOCK';
}

export class RiskEngine {
  /**
   * Evaluates deterministic financial and security risk for an agent transaction.
   */
  static evaluateRisk(params: {
    baseScore?: number;
    amount: number;
    mandateLimit?: number;
    isMerchantUnknown?: boolean;
    hasIntentDrift?: boolean;
    driftScore?: number;
    isMandateExpired?: boolean;
    isDuplicateAttempt?: boolean;
    agentTrustScore: number;
    hasCapabilityViolation?: boolean;
    exceedsApprovalThreshold?: boolean;
  }): RiskEvaluationResult {
    let score = params.baseScore !== undefined ? params.baseScore : 10;
    const reasons: string[] = [`Base system risk: +${score}`];

    // Capability violation
    if (params.hasCapabilityViolation) {
      score += 50;
      reasons.push('Privilege or capability violation (+50)');
    }

    // Expired or invalid mandate
    if (params.isMandateExpired) {
      score += 50;
      reasons.push('Mandate window expired or inactive (+50)');
    }

    // Intent drift
    if (params.hasIntentDrift) {
      const addition = Math.min(40, Math.round((params.driftScore || 40) * 0.8));
      score += addition;
      reasons.push(`Significant intent drift detected (+${addition})`);
    }

    // Unknown or anomalous merchant
    if (params.isMerchantUnknown) {
      score += 25;
      reasons.push('Unrecognized or anomalous merchant (+25)');
    }

    // Amount near mandate limit (> 85%)
    if (params.mandateLimit && params.amount >= params.mandateLimit * 0.85) {
      score += 10;
      reasons.push('Transaction amount near mandate threshold ceiling (+10)');
    }

    // Exceeds human approval threshold
    if (params.exceedsApprovalThreshold) {
      score += 20;
      reasons.push('Amount exceeds automated authorization tier (+20)');
    }

    // Duplicate transaction attempt
    if (params.isDuplicateAttempt) {
      score += 30;
      reasons.push('Idempotency collision / duplicate replay attempt (+30)');
    }

    // Low trust score of agent
    if (params.agentTrustScore < 70) {
      score += 20;
      reasons.push(`Degraded agent trust score (${params.agentTrustScore}/100) (+20)`);
    } else if (params.agentTrustScore >= 90) {
      score -= 5;
      reasons.push(`High agent trust credit (-5)`);
    }

    // Clamp between 0 and 100
    const finalScore = Math.max(0, Math.min(100, score));

    // Decision based on configured thresholds
    let suggestedDecision: 'APPROVE' | 'REVIEW' | 'BLOCK';
    if (finalScore >= config.riskThresholds.blockMin) {
      suggestedDecision = 'BLOCK';
    } else if (finalScore > config.riskThresholds.approveMax) {
      suggestedDecision = 'REVIEW';
    } else {
      suggestedDecision = 'APPROVE';
    }

    return {
      score: finalScore,
      reasons,
      suggestedDecision,
    };
  }
}
