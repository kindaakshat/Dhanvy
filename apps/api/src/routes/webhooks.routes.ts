import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { RazorpayService } from '../services/razorpay.service';
import { AuditService } from '../services/audit.service';
import { TrustService } from '../services/trust.service';

const router = Router();

router.post('/razorpay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature (in development or test mode, check if signature provided or matches)
    const isValidSignature = RazorpayService.verifyWebhookSignature(rawBody, signature);

    // If in test mode and no signature passed, allow test simulations with warning
    if (!isValidSignature && process.env.NODE_ENV === 'production') {
      return res.status(400).json({
        error: {
          code: 'INVALID_WEBHOOK_SIGNATURE',
          message: 'Razorpay webhook signature verification failed.',
        },
      });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured' || event === 'order.paid') {
      const orderId = payload?.payment?.entity?.order_id || payload?.order?.entity?.id;
      const paymentId = payload?.payment?.entity?.id;

      if (orderId) {
        const tx = await prisma.transaction.findFirst({
          where: { razorpayOrderId: orderId },
        });

        if (tx) {
          await prisma.transaction.update({
            where: { id: tx.id },
            data: {
              razorpayPaymentId: paymentId || `pay_${Date.now()}`,
              razorpayStatus: 'paid',
            },
          });

          await AuditService.recordEvent({
            eventType: 'PAYMENT_COMPLETED',
            actor: 'Razorpay Webhook Rail',
            agentId: tx.agentId,
            transactionId: tx.id,
            eventData: {
              orderId,
              paymentId,
              status: 'CAPTURED',
            },
          });

          await TrustService.adjustTrust({
            agentId: tx.agentId,
            reason: 'SUCCESS',
            transactionId: tx.id,
          });
        }
      }
    } else if (event === 'payment.failed') {
      const orderId = payload?.payment?.entity?.order_id;
      if (orderId) {
        const tx = await prisma.transaction.findFirst({
          where: { razorpayOrderId: orderId },
        });
        if (tx) {
          await prisma.transaction.update({
            where: { id: tx.id },
            data: { razorpayStatus: 'failed' },
          });

          await AuditService.recordEvent({
            eventType: 'PAYMENT_FAILED',
            actor: 'Razorpay Webhook Rail',
            agentId: tx.agentId,
            transactionId: tx.id,
            eventData: { orderId, reason: payload?.payment?.entity?.error_description },
          });
        }
      }
    }

    res.json({ status: 'ok', received: true });
  } catch (err) {
    next(err);
  }
});

export default router;
