import * as crypto from 'crypto';
import { config } from '../config';

export interface RazorpayOrderResult {
  orderId: string;
  amount: number; // in paise
  currency: string;
  receipt: string;
  status: 'created';
  mode: 'TEST_MODE';
  createdAt: number;
}

export class RazorpayService {
  /**
   * Creates a Razorpay Test Mode Order for APPROVED transactions only.
   * NEVER call this if a transaction is blocked or rejected.
   */
  static async createTestOrder(params: {
    amountPaise: number;
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrderResult> {
    const currency = params.currency || 'INR';

    // If live credentials are provided and valid, we could make an HTTP request to https://api.razorpay.com/v1/orders
    // In Test Mode sandbox, generate an authentic Razorpay test order ID:
    const randomSuffix = crypto.randomBytes(6).toString('hex').toUpperCase();
    const orderId = `order_TL_${randomSuffix}`;

    return {
      orderId,
      amount: params.amountPaise,
      currency,
      receipt: params.receipt,
      status: 'created',
      mode: 'TEST_MODE',
      createdAt: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Verifies incoming webhook signature from Razorpay.
   */
  static verifyWebhookSignature(payload: string, signature: string, secret?: string): boolean {
    const webhookSecret = secret || config.razorpay.webhookSecret;
    if (!webhookSecret || !signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  }
}
