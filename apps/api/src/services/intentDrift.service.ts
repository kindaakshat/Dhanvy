export interface DriftDifference {
  field: string;
  intentValue: string;
  actionValue: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface IntentDriftResult {
  driftDetected: boolean;
  driftScore: number; // 0 to 100
  differences: DriftDifference[];
  reasonCode?: string;
}

export class IntentDriftService {
  /**
   * Evaluates semantic and financial deviation between original User Intent and Agent Action.
   */
  static detectDrift(params: {
    intent: {
      merchant?: string | null;
      category?: string | null;
      product?: string | null;
      maxAmount?: number | null; // in paise
      currency?: string | null;
    };
    action: {
      merchant: string;
      category?: string;
      product: string;
      amount: number; // in paise
      currency?: string;
    };
  }): IntentDriftResult {
    const differences: DriftDifference[] = [];
    let driftScore = 0;

    // 1. Merchant Comparison
    if (params.intent.merchant && params.intent.merchant.toLowerCase() !== 'unknown merchant') {
      const intentM = params.intent.merchant.toLowerCase().trim();
      const actionM = params.action.merchant.toLowerCase().trim();
      if (intentM !== actionM) {
        differences.push({
          field: 'Merchant',
          intentValue: params.intent.merchant,
          actionValue: params.action.merchant,
          severity: 'HIGH',
          description: `Merchant changed from authorized "${params.intent.merchant}" to "${params.action.merchant}"`,
        });
        driftScore += 40;
      }
    }

    // 2. Product Semantic Alignment
    if (params.intent.product && params.intent.product.toLowerCase() !== 'requested item') {
      const intentP = params.intent.product.toLowerCase();
      const actionP = params.action.product.toLowerCase();

      // Check if keywords overlap
      const intentWords = intentP.split(/\s+/).filter((w) => w.length > 2);
      const matchedWord = intentWords.some((w) => actionP.includes(w));

      if (!matchedWord) {
        differences.push({
          field: 'Product',
          intentValue: params.intent.product,
          actionValue: params.action.product,
          severity: 'HIGH',
          description: `Agent substituted intent product "${params.intent.product}" with unrelated item "${params.action.product}"`,
        });
        driftScore += 45;
      }
    }

    // 3. Amount Drift
    if (params.intent.maxAmount && params.intent.maxAmount > 0) {
      if (params.action.amount > params.intent.maxAmount) {
        const ratio = params.action.amount / params.intent.maxAmount;
        const severity = ratio > 2 ? 'HIGH' : 'MEDIUM';
        differences.push({
          field: 'Amount',
          intentValue: `₹${(params.intent.maxAmount / 100).toLocaleString()}`,
          actionValue: `₹${(params.action.amount / 100).toLocaleString()}`,
          severity,
          description: `Action amount exceeds intended maximum ceiling by ${Math.round((ratio - 1) * 100)}%`,
        });
        driftScore += ratio > 2 ? 50 : 25;
      }
    }

    // 4. Currency Discrepancy
    if (params.intent.currency && params.action.currency) {
      if (params.intent.currency.toUpperCase() !== params.action.currency.toUpperCase()) {
        differences.push({
          field: 'Currency',
          intentValue: params.intent.currency,
          actionValue: params.action.currency,
          severity: 'HIGH',
          description: `Currency mismatch: requested ${params.action.currency}, expected ${params.intent.currency}`,
        });
        driftScore += 30;
      }
    }

    const driftDetected = differences.length > 0;
    const finalDriftScore = Math.min(100, driftScore);

    return {
      driftDetected,
      driftScore: finalDriftScore,
      differences,
      reasonCode: driftDetected ? 'INTENT_DRIFT_DETECTED' : undefined,
    };
  }
}
