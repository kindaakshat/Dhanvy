import * as crypto from 'crypto';
import {
  PaymentProvider,
  PaymentGatewayType,
  AuthorizePaymentParams,
  GatewayAuthorizationResult,
  ProcessPaymentParams,
  GatewayPaymentResult,
  ReversePaymentParams,
  GatewayReversalResult,
} from './paymentProvider.interface';

export type GatewayDemoScenario =
  | 'SUCCESS'
  | 'TIMEOUT'
  | 'FAILURE'
  | 'DUPLICATE'
  | 'REVERSAL';

export interface GatewayScenarioConfig {
  scenario: GatewayDemoScenario;
  latencyMs: number;
  failureCode?: string;
  failureMessage?: string;
}

export class SimulatedPaymentGateway implements PaymentProvider {
  readonly providerType: PaymentGatewayType = 'SIMULATED';

  // In-memory gateway state for idempotency & transaction lookup
  private transactionLedger: Map<string, GatewayPaymentResult> = new Map();
  private idempotencyIndex: Map<string, string> = new Map(); // idempotencyKey -> providerTxnId

  // Active scenario config (default: SUCCESS)
  private config: GatewayScenarioConfig = {
    scenario: 'SUCCESS',
    latencyMs: 150,
  };

  /**
   * Generates an authentic 12-digit Bank Reference Number (RRN)
   * conforming to standard NPCI / UPI / IMPS banking rails (e.g., 425519827104).
   */
  public static generateRRN(): string {
    const yearCode = '4'; // 2024-2026 epoch marker
    const dayOfYear = String(Math.floor(Math.random() * 365) + 1).padStart(3, '0');
    const randomDigits = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
    return `${yearCode}${dayOfYear}${randomDigits}`;
  }

  /**
   * Generates a realistic provider transaction identifier.
   */
  public static generateTxnId(): string {
    const randomHex = crypto.randomBytes(6).toString('hex');
    return `pay_sim_${randomHex}`;
  }

  /**
   * Generates a realistic order identifier.
   */
  public static generateOrderId(): string {
    const randomHex = crypto.randomBytes(6).toString('hex');
    return `order_sim_${randomHex}`;
  }

  /**
   * Generates a realistic reversal / refund identifier.
   */
  public static generateReversalId(): string {
    const randomHex = crypto.randomBytes(6).toString('hex');
    return `rev_sim_${randomHex}`;
  }

  /**
   * Generates a realistic Virtual Payment Address (UPI VPA).
   */
  public static generateVPA(merchant: string): string {
    const clean = merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${clean || 'merchant'}@icici`;
  }

  /**
   * Configure the active simulation scenario for demos.
   */
  public setScenario(scenario: GatewayDemoScenario, options?: { latencyMs?: number; failureCode?: string; failureMessage?: string }) {
    this.config = {
      scenario,
      latencyMs: options?.latencyMs ?? (scenario === 'TIMEOUT' ? 800 : 150),
      failureCode: options?.failureCode,
      failureMessage: options?.failureMessage,
    };
  }

  /**
   * Get the current scenario configuration.
   */
  public getScenario(): GatewayScenarioConfig {
    return { ...this.config };
  }

  /**
   * Reset the gateway ledger and restore default SUCCESS scenario.
   */
  public reset() {
    this.transactionLedger.clear();
    this.idempotencyIndex.clear();
    this.config = {
      scenario: 'SUCCESS',
      latencyMs: 150,
    };
  }

  /**
   * Pre-authorization on the simulated gateway.
   */
  async authorize(params: AuthorizePaymentParams): Promise<GatewayAuthorizationResult> {
    const effectiveScenario = params.metadata?.scenarioOverride || this.config.scenario;
    const latency = params.metadata?.latencyOverride || this.config.latencyMs;

    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }

    if (effectiveScenario === 'TIMEOUT') {
      return {
        authorizationId: `auth_sim_timeout_${Date.now()}`,
        status: 'TIMEOUT',
        authorizedAmount: 0,
        currency: params.currency,
        provider: this.providerType,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        authCode: 'ERR_TIMEOUT',
        errorCode: 'GATEWAY_TIMEOUT',
        errorMessage: 'Upstream banking gateway pre-authorization timed out after latency window.',
      };
    }

    if (effectiveScenario === 'FAILURE') {
      return {
        authorizationId: `auth_sim_failed_${Date.now()}`,
        status: 'DECLINED',
        authorizedAmount: 0,
        currency: params.currency,
        provider: this.providerType,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        authCode: 'ERR_DECLINED',
        errorCode: this.config.failureCode || 'ISSUER_DECLINED',
        errorMessage: this.config.failureMessage || 'Pre-authorization declined by customer issuing bank.',
      };
    }

    const authId = `auth_sim_${crypto.randomBytes(6).toString('hex')}`;
    return {
      authorizationId: authId,
      status: 'AUTHORIZED',
      authorizedAmount: params.amountPaise,
      currency: params.currency,
      provider: this.providerType,
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
      authCode: `AUTH_${Math.floor(100000 + Math.random() * 900000)}`,
      rawResponse: {
        mode: 'SIMULATED_GATEWAY',
        merchantVpa: SimulatedPaymentGateway.generateVPA(params.merchant),
      },
    };
  }

  /**
   * Core payment processing on the simulated gateway.
   * Executes one of the 5 hackathon demo scenarios.
   */
  async processPayment(params: ProcessPaymentParams): Promise<GatewayPaymentResult> {
    const effectiveScenario = (params.metadata?.scenarioOverride as GatewayDemoScenario) || this.config.scenario;
    const latency = params.metadata?.latencyOverride || this.config.latencyMs;

    // Simulate realistic wire latency
    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }

    const now = new Date();
    const rrn = SimulatedPaymentGateway.generateRRN();
    const vpa = SimulatedPaymentGateway.generateVPA(params.merchant);
    const receiptNumber = `rcpt_${params.idempotencyKey.slice(0, 10)}_${Date.now().toString().slice(-4)}`;

    // -------------------------------------------------------------
    // SCENARIO 4: DUPLICATE REQUEST (Gateway-Level Idempotency)
    // -------------------------------------------------------------
    const existingTxnId = this.idempotencyIndex.get(params.idempotencyKey);
    if (existingTxnId || effectiveScenario === 'DUPLICATE') {
      if (existingTxnId) {
        const original = this.transactionLedger.get(existingTxnId);
        if (original) {
          return {
            ...original,
            status: 'DUPLICATE',
            isDuplicatePrevented: true,
            latencyMs: latency,
            errorMessage: 'Duplicate request detected by gateway. Original settlement returned without re-charging rails.',
          };
        }
      }

      // If forced scenario without prior key, generate synthetic duplicate response
      const dupTxnId = SimulatedPaymentGateway.generateTxnId();
      return {
        providerTxnId: dupTxnId,
        orderId: SimulatedPaymentGateway.generateOrderId(),
        paymentId: dupTxnId,
        rrn,
        status: 'DUPLICATE',
        amountPaise: params.amountPaise,
        currency: params.currency,
        provider: this.providerType,
        timestamp: now.toISOString(),
        latencyMs: latency,
        receiptNumber,
        vpa,
        authCode: 'DUP_PREVENTED',
        isDuplicatePrevented: true,
        errorMessage: 'Duplicate idempotency key detected at payment gateway. Zero rail execution.',
        rawResponse: {
          duplicatePrevented: true,
          gatewayCacheHit: true,
        },
      };
    }

    // -------------------------------------------------------------
    // SCENARIO 2: GATEWAY TIMEOUT
    // -------------------------------------------------------------
    if (effectiveScenario === 'TIMEOUT') {
      const timeoutTxnId = SimulatedPaymentGateway.generateTxnId();
      return {
        providerTxnId: timeoutTxnId,
        orderId: SimulatedPaymentGateway.generateOrderId(),
        paymentId: timeoutTxnId,
        rrn,
        status: 'TIMEOUT',
        amountPaise: params.amountPaise,
        currency: params.currency,
        provider: this.providerType,
        timestamp: now.toISOString(),
        latencyMs: latency,
        receiptNumber,
        vpa,
        errorCode: 'GATEWAY_TIMEOUT',
        errorMessage: `Upstream banking rail timed out after ${latency}ms. Settlement confirmation not received.`,
        rawResponse: {
          timeoutSeconds: latency / 1000,
          gatewayStatus: 'NETWORK_TIMEOUT',
        },
      };
    }

    // -------------------------------------------------------------
    // SCENARIO 3: PAYMENT FAILURE
    // -------------------------------------------------------------
    if (effectiveScenario === 'FAILURE') {
      const failTxnId = SimulatedPaymentGateway.generateTxnId();
      return {
        providerTxnId: failTxnId,
        orderId: SimulatedPaymentGateway.generateOrderId(),
        paymentId: failTxnId,
        rrn,
        status: 'FAILED',
        amountPaise: params.amountPaise,
        currency: params.currency,
        provider: this.providerType,
        timestamp: now.toISOString(),
        latencyMs: latency,
        receiptNumber,
        vpa,
        errorCode: this.config.failureCode || 'ISSUER_DECLINED',
        errorMessage: this.config.failureMessage || 'Transaction declined by issuer bank (Insufficient funds or risk limit exceeded).',
        rawResponse: {
          bankResponseCode: '05',
          bankMessage: 'Do Not Honor / Card Issuer Declined',
        },
      };
    }

    // -------------------------------------------------------------
    // SCENARIO 5: SUCCESSFUL PAYMENT FOLLOWED BY REVERSAL
    // -------------------------------------------------------------
    if (effectiveScenario === 'REVERSAL') {
      const txnId = SimulatedPaymentGateway.generateTxnId();
      const orderId = SimulatedPaymentGateway.generateOrderId();
      const reversalId = SimulatedPaymentGateway.generateReversalId();

      const result: GatewayPaymentResult = {
        providerTxnId: txnId,
        orderId,
        paymentId: txnId,
        rrn,
        status: 'REVERSED',
        amountPaise: params.amountPaise,
        currency: params.currency,
        provider: this.providerType,
        timestamp: now.toISOString(),
        latencyMs: latency,
        receiptNumber,
        vpa,
        authCode: `AUTH_${Math.floor(100000 + Math.random() * 900000)}`,
        reversalId,
        rawResponse: {
          originalSettlement: 'SUCCESS',
          reversalStatus: 'COMPLETED',
          reversalId,
          amountRefunded: params.amountPaise,
          reason: 'Automated post-settlement reversal demonstration',
        },
      };

      this.transactionLedger.set(txnId, result);
      this.idempotencyIndex.set(params.idempotencyKey, txnId);
      return result;
    }

    // -------------------------------------------------------------
    // SCENARIO 1: SUCCESSFUL PAYMENT (Default)
    // -------------------------------------------------------------
    const txnId = SimulatedPaymentGateway.generateTxnId();
    const orderId = SimulatedPaymentGateway.generateOrderId();

    const result: GatewayPaymentResult = {
      providerTxnId: txnId,
      orderId,
      paymentId: txnId,
      rrn,
      status: 'SUCCESS',
      amountPaise: params.amountPaise,
      currency: params.currency,
      provider: this.providerType,
      timestamp: now.toISOString(),
      latencyMs: latency,
      receiptNumber,
      vpa,
      authCode: `AUTH_${Math.floor(100000 + Math.random() * 900000)}`,
      rawResponse: {
        mode: 'SIMULATED_TEST_GATEWAY',
        gateway: 'NPCI_UPI_SIMULATOR',
        bankRrn: rrn,
        merchantVpa: vpa,
        settlementTime: now.toISOString(),
      },
    };

    this.transactionLedger.set(txnId, result);
    this.idempotencyIndex.set(params.idempotencyKey, txnId);
    return result;
  }

  /**
   * Reverses or claws back a previously settled transaction on the simulated gateway.
   */
  async reversePayment(params: ReversePaymentParams): Promise<GatewayReversalResult> {
    const latency = 120;
    await new Promise((resolve) => setTimeout(resolve, latency));

    const reversalId = SimulatedPaymentGateway.generateReversalId();
    const rrn = SimulatedPaymentGateway.generateRRN();
    const now = new Date();

    const existing = this.transactionLedger.get(params.providerTxnId);
    if (existing) {
      existing.status = 'REVERSED';
      existing.reversalId = reversalId;
    }

    return {
      reversalId,
      originalProviderTxnId: params.providerTxnId,
      rrn,
      status: 'REVERSED',
      amountRefundedPaise: params.amountPaise,
      currency: 'INR',
      timestamp: now.toISOString(),
      provider: this.providerType,
      rawResponse: {
        reversalStatus: 'COMPLETED',
        clawbackMethod: 'INSTANT_ORIGINAL_PAYMENT_METHOD',
        reason: params.reason,
      },
    };
  }

  /**
   * Retrieves transaction status by providerTxnId.
   */
  async getTransaction(providerTxnId: string): Promise<GatewayPaymentResult | null> {
    return this.transactionLedger.get(providerTxnId) || null;
  }
}

// Export singleton instance
export const simulatedGateway = new SimulatedPaymentGateway();
