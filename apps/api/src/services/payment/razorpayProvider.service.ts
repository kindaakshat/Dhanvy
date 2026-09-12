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
import { RazorpayService } from '../razorpay.service';

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly providerType: PaymentGatewayType = 'RAZORPAY';

  async authorize(params: AuthorizePaymentParams): Promise<GatewayAuthorizationResult> {
    const order = await RazorpayService.createTestOrder({
      amountPaise: params.amountPaise,
      currency: params.currency,
      receipt: `rcpt_${params.idempotencyKey.slice(0, 12)}`,
      notes: {
        agentId: params.agentId,
        product: params.product,
        merchant: params.merchant,
      },
    });

    return {
      authorizationId: order.orderId,
      status: 'AUTHORIZED',
      authorizedAmount: order.amount,
      currency: order.currency,
      provider: this.providerType,
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
      authCode: `RZP_${order.orderId.slice(-6)}`,
      rawResponse: order,
    };
  }

  async processPayment(params: ProcessPaymentParams): Promise<GatewayPaymentResult> {
    const order = await RazorpayService.createTestOrder({
      amountPaise: params.amountPaise,
      currency: params.currency,
      receipt: `rcpt_${params.idempotencyKey.slice(0, 12)}`,
      notes: {
        agentId: params.agentId,
        product: params.product,
        merchant: params.merchant,
      },
    });

    const randomSuffix = Math.floor(100000000 + Math.random() * 900000000);
    const rrn = `4255${randomSuffix}`;

    return {
      providerTxnId: `pay_${order.orderId.replace('order_', '')}`,
      orderId: order.orderId,
      paymentId: `pay_${order.orderId.replace('order_', '')}`,
      rrn,
      status: 'SUCCESS',
      amountPaise: params.amountPaise,
      currency: params.currency,
      provider: this.providerType,
      timestamp: new Date().toISOString(),
      latencyMs: 220,
      receiptNumber: order.receipt,
      vpa: `${params.merchant.toLowerCase().replace(/[^a-z0-9]/g, '')}@razorpay`,
      authCode: `RZP_AUTH_${order.orderId.slice(-6)}`,
      rawResponse: order,
    };
  }

  async reversePayment(params: ReversePaymentParams): Promise<GatewayReversalResult> {
    const refundId = `rfnd_sim_${Math.random().toString(36).substring(2, 10)}`;
    const randomSuffix = Math.floor(100000000 + Math.random() * 900000000);

    return {
      reversalId: refundId,
      originalProviderTxnId: params.providerTxnId,
      rrn: `4255${randomSuffix}`,
      status: 'REVERSED',
      amountRefundedPaise: params.amountPaise,
      currency: 'INR',
      timestamp: new Date().toISOString(),
      provider: this.providerType,
      rawResponse: {
        refundId,
        provider: 'RAZORPAY_TEST_MODE',
        reason: params.reason,
      },
    };
  }

  async getTransaction(providerTxnId: string): Promise<GatewayPaymentResult | null> {
    return null;
  }
}

export const razorpayProvider = new RazorpayPaymentProvider();
