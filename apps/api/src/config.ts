import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TrustLayerDemo123',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'test_secret_demo_key',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_trustlayer_test_demo',
    isTestMode: true,
  },
  riskThresholds: {
    approveMax: 39,
    reviewMax: 69,
    blockMin: 70,
  },
  trustThresholds: {
    activeMin: 70,
    reviewMin: 40,
    suspendMax: 39,
  },
};
