/**
 * Payment Provider Abstraction
 * 
 * Clean interface contract allowing the LEO reliability and authorization layer
 * to communicate with any payment rail (Simulated Gateway, Razorpay, UPI AutoPay, Stripe)
 * without coupling core mandate, verification, or trust logic to payment gateway internals.
 */

export type PaymentGatewayType = 'SIMULATED' | 'RAZORPAY' | 'UPI';

export type PaymentExecutionStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'TIMEOUT'
  | 'PENDING'
  | 'REVERSED'
  | 'DUPLICATE';

export interface AuthorizePaymentParams {
  transactionId: string;
  agentId: string;
  mandateId?: string;
  merchant: string;
  merchantId?: string;
  product: string;
  amountPaise: number;
  currency: string;
  idempotencyKey: string;
  agentInstruction?: string;
  metadata?: Record<string, any>;
}

export interface GatewayAuthorizationResult {
  authorizationId: string;
  status: 'AUTHORIZED' | 'DECLINED' | 'TIMEOUT';
  authorizedAmount: number;
  currency: string;
  provider: PaymentGatewayType;
  expiresAt: string;
  authCode: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: Record<string, any>;
}

export interface ProcessPaymentParams {
  transactionId: string;
  authorizationId?: string;
  agentId: string;
  mandateId?: string;
  merchant: string;
  merchantId?: string;
  product: string;
  amountPaise: number;
  currency: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface GatewayPaymentResult {
  providerTxnId: string;
  orderId?: string;
  paymentId?: string;
  rrn: string; // 12-digit Bank Reference Number (standard for Indian NPCI UPI / IMPS / Card)
  status: PaymentExecutionStatus;
  amountPaise: number;
  currency: string;
  provider: PaymentGatewayType;
  timestamp: string;
  latencyMs: number;
  receiptNumber: string;
  vpa?: string; // Virtual Payment Address e.g. "amazon@icici"
  authCode?: string;
  errorCode?: string;
  errorMessage?: string;
  isDuplicatePrevented?: boolean;
  reversalId?: string;
  rawResponse?: Record<string, any>;
}

export interface ReversePaymentParams {
  transactionId: string;
  providerTxnId: string;
  amountPaise: number;
  reason: string;
  idempotencyKey?: string;
}

export interface GatewayReversalResult {
  reversalId: string;
  originalProviderTxnId: string;
  rrn: string;
  status: 'REVERSED' | 'FAILED';
  amountRefundedPaise: number;
  currency: string;
  timestamp: string;
  provider: PaymentGatewayType;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: Record<string, any>;
}

export interface PaymentProvider {
  readonly providerType: PaymentGatewayType;

  /**
   * Pre-authorizes funds on the payment rail without immediate capture.
   */
  authorize(params: AuthorizePaymentParams): Promise<GatewayAuthorizationResult>;

  /**
   * Processes settlement / capture on the payment rail.
   */
  processPayment(params: ProcessPaymentParams): Promise<GatewayPaymentResult>;

  /**
   * Reverses or claws back a previously settled transaction.
   */
  reversePayment(params: ReversePaymentParams): Promise<GatewayReversalResult>;

  /**
   * Queries real-time status of a transaction from the payment gateway.
   */
  getTransaction(providerTxnId: string): Promise<GatewayPaymentResult | null>;
}
