import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
  console.log('Seeding TrustLayer demo database...');

  // Clean existing data
  await prisma.session.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.trustEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.intent.deleteMany();
  await prisma.mandate.deleteMany();
  await prisma.agentCapability.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Demo User
  const demoUser = await prisma.user.create({
    data: {
      id: 'usr_demo_01',
      email: 'demo@trustlayer.dev',
      name: 'Demo User (SecOps)',
      passwordHash: bcrypt.hashSync('DemoPassword123!', 10),
      role: 'ADMIN',
    },
  });

  // 2. Create Agents
  const shoppingAgent = await prisma.agent.create({
    data: {
      id: 'agent_shop_01',
      name: 'ShoppingAgent-01',
      description: 'Autonomous agent specialized in procurement of office supplies and hardware.',
      ownerId: demoUser.id,
      status: 'ACTIVE',
      trustScore: 94.0,
    },
  });

  const travelAgent = await prisma.agent.create({
    data: {
      id: 'agent_travel_01',
      name: 'TravelAgent-01',
      description: 'Corporate travel booking agent with strict flight and hotel bounds.',
      ownerId: demoUser.id,
      status: 'ACTIVE',
      trustScore: 88.5,
    },
  });

  const subAgent = await prisma.agent.create({
    data: {
      id: 'agent_sub_01',
      name: 'SubscriptionAgent-01',
      description: 'Recurring software and API subscription payment agent.',
      ownerId: demoUser.id,
      status: 'ACTIVE',
      trustScore: 99.2,
    },
  });

  // 3. Agent Capabilities (Section 13)
  // ShoppingAgent-01
  const shoppingCaps = [
    { capability: 'PURCHASE_ELECTRONICS', isAllowed: true },
    { capability: 'VIEW_PRODUCTS', isAllowed: true },
    { capability: 'CREATE_PAYMENT_ORDER', isAllowed: true },
    { capability: 'USE_RAZORPAY', isAllowed: true },
    { capability: 'PURCHASE_SUPPLIES', isAllowed: true },
    { capability: 'TRANSFER_TO_PERSON', isAllowed: false },
    { capability: 'MODIFY_MANDATE', isAllowed: false },
    { capability: 'CREATE_MANDATE', isAllowed: false },
    { capability: 'MODIFY_OWN_LIMIT', isAllowed: false },
    { capability: 'CREATE_AGENT', isAllowed: false },
  ];

  for (const cap of shoppingCaps) {
    await prisma.agentCapability.create({
      data: {
        agentId: shoppingAgent.id,
        capability: cap.capability,
        isAllowed: cap.isAllowed,
      },
    });
  }

  // TravelAgent-01 Capabilities
  const travelCaps = [
    { capability: 'PURCHASE_TRAVEL', isAllowed: true },
    { capability: 'VIEW_FLIGHTS', isAllowed: true },
    { capability: 'CREATE_PAYMENT_ORDER', isAllowed: true },
    { capability: 'USE_RAZORPAY', isAllowed: true },
    { capability: 'TRANSFER_TO_PERSON', isAllowed: false },
    { capability: 'MODIFY_MANDATE', isAllowed: false },
  ];

  for (const cap of travelCaps) {
    await prisma.agentCapability.create({
      data: {
        agentId: travelAgent.id,
        capability: cap.capability,
        isAllowed: cap.isAllowed,
      },
    });
  }

  // SubscriptionAgent-01 Capabilities
  const subCaps = [
    { capability: 'USE_SUBSCRIPTIONS', isAllowed: true },
    { capability: 'CREATE_PAYMENT_ORDER', isAllowed: true },
    { capability: 'USE_RAZORPAY', isAllowed: true },
    { capability: 'VIEW_PRODUCTS', isAllowed: true },
    { capability: 'TRANSFER_TO_PERSON', isAllowed: false },
    { capability: 'MODIFY_MANDATE', isAllowed: false },
    { capability: 'CREATE_MANDATE', isAllowed: false },
  ];

  for (const cap of subCaps) {
    await prisma.agentCapability.create({
      data: {
        agentId: subAgent.id,
        capability: cap.capability,
        isAllowed: cap.isAllowed,
      },
    });
  }


  const now = new Date();
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const amazonMandate = await prisma.mandate.create({
    data: {
      id: 'mnd_amazon_01',
      userId: demoUser.id,
      agentId: shoppingAgent.id,
      name: 'Amazon Office Electronics & Peripherals',
      merchant: 'Amazon',
      allowedMerchants: JSON.stringify(['Amazon', 'Flipkart', 'Croma']),
      category: 'Electronics',
      allowedCategories: JSON.stringify(['Electronics', 'Office Supplies', 'Peripherals', 'Computers']),
      productPattern: 'Keyboard|Mouse|Headphones|Monitor|Cables|Office Supplies|Supplies|Stationery|Desk|Bundle',
      maxAmount: 500000, // ₹5,000
      dailyLimit: 2000000, // ₹20,000
      spentToday: 399900, // ₹3,999 already spent
      currency: 'INR',
      validFrom: now,
      validUntil: thirtyDaysLater,
      approvalThreshold: 500000, // ₹5,000
      status: 'ACTIVE',
    },
  });

  const travelMandate = await prisma.mandate.create({
    data: {
      id: 'mnd_makemytrip_01',
      userId: demoUser.id,
      agentId: travelAgent.id,
      name: 'MakeMyTrip Domestic Travel Bounds',
      merchant: 'MakeMyTrip',
      allowedMerchants: JSON.stringify(['MakeMyTrip', 'Uber', 'IRCTC']),
      category: 'Travel',
      allowedCategories: JSON.stringify(['Travel Tickets', 'Hotel Stays']),
      productPattern: 'Flight|Hotel',
      maxAmount: 1500000, // ₹15,000
      dailyLimit: 5000000, // ₹50,000
      spentToday: 0,
      currency: 'INR',
      validFrom: now,
      validUntil: thirtyDaysLater,
      approvalThreshold: 1000000, // ₹10,000
      status: 'ACTIVE',
    },
  });

  const subMandate = await prisma.mandate.create({
    data: {
      id: 'mnd_aws_01',
      userId: demoUser.id,
      agentId: subAgent.id,
      name: 'Cloud Infrastructure Mandate',
      merchant: 'AWS',
      allowedMerchants: JSON.stringify(['AWS', 'Cloudflare', 'Datadog']),
      category: 'Cloud Services',
      allowedCategories: JSON.stringify(['Cloud Infrastructure', 'Hosting', 'SaaS Subscriptions']),
      productPattern: 'Compute|Storage|Database',
      maxAmount: 2500000, // ₹25,000
      dailyLimit: 5000000, // ₹50,000
      spentToday: 1845000,
      currency: 'INR',
      validFrom: now,
      validUntil: thirtyDaysLater,
      approvalThreshold: 2000000,
      status: 'ACTIVE',
    },
  });

  const expiredMandate = await prisma.mandate.create({
    data: {
      id: 'mnd_expired_01',
      userId: demoUser.id,
      agentId: shoppingAgent.id,
      name: 'Q3 Office Stationery & Supplies',
      merchant: 'Staples',
      allowedMerchants: JSON.stringify(['Staples', 'Amazon']),
      category: 'Office Supplies',
      allowedCategories: JSON.stringify(['Stationery', 'Paper', 'Ink']),
      productPattern: 'Paper|Pens|Folders',
      maxAmount: 200000, // ₹2,000
      dailyLimit: 500000, // ₹5,000
      spentToday: 0,
      currency: 'INR',
      validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired 5 days ago
      approvalThreshold: 150000,
      status: 'EXPIRED',
    },
  });

  const revokedMandate = await prisma.mandate.create({
    data: {
      id: 'mnd_revoked_01',
      userId: demoUser.id,
      agentId: shoppingAgent.id,
      name: 'High-Risk Experimental Procurement',
      merchant: 'DirectTransfer',
      allowedMerchants: JSON.stringify(['DirectTransfer', 'P2PPay']),
      category: 'Fund Transfer',
      allowedCategories: JSON.stringify(['Wire', 'Transfer']),
      productPattern: 'Transfer|Wire',
      maxAmount: 5000000, // ₹50,000
      dailyLimit: 10000000, // ₹100,000
      spentToday: 0,
      currency: 'INR',
      validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      validUntil: thirtyDaysLater,
      approvalThreshold: 1000000,
      status: 'REVOKED',
    },
  });

  // 5. Seed Historical Intent
  const initialIntent = await prisma.intent.create({
    data: {
      id: 'int_demo_01',
      agentId: shoppingAgent.id,
      rawPrompt: 'Buy a Logitech keyboard from Amazon under ₹5,000',
      merchant: 'Amazon',
      category: 'Electronics',
      product: 'Logitech K380',
      maxAmount: 500000,
      currency: 'INR',
      validityMinutes: 60,
      parserType: 'RULE_BASED',
      parserVersion: '1.0.0',
      structuredData: JSON.stringify({
        extractedMerchant: 'Amazon',
        extractedCategory: 'Electronics',
        extractedProduct: 'Logitech K380 Keyboard',
        maxPricePaise: 500000,
        confidence: 0.98,
      }),
    },
  });

  // 6. Seed Historical Transactions
  // Transaction 1: Approved Logitech Keyboard (matches Demo Story Section 55)
  const txApproved = await prisma.transaction.create({
    data: {
      id: 'tx_demo_app_01',
      idempotencyKey: 'idemp_demo_shop_001',
      agentId: shoppingAgent.id,
      mandateId: amazonMandate.id,
      intentId: initialIntent.id,
      merchant: 'Amazon',
      category: 'Electronics',
      product: 'Logitech K380 Multi-Device Bluetooth Keyboard',
      amount: 399900, // ₹3,999
      currency: 'INR',
      decision: 'APPROVED',
      riskScore: 12,
      riskReasons: JSON.stringify([
        'Base risk: +10',
        'Merchant matches mandate (+0)',
        'Amount well below limit (+2)',
        'Trust score healthy (+0)',
      ]),
      decisionReasons: JSON.stringify([
        'MANDATE_VERIFIED',
        'INTENT_ALIGNED',
        'RISK_ACCEPTABLE',
        'RAZORPAY_TEST_ORDER_CREATED',
      ]),
      status: 'COMPLETED',
      razorpayOrderId: 'order_TL_DEMO_998124',
      razorpayStatus: 'paid',
      createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
    },
  });

  // Transaction 2: Blocked Amount Override
  const txBlockedAmount = await prisma.transaction.create({
    data: {
      id: 'tx_demo_blk_01',
      idempotencyKey: 'idemp_demo_shop_002',
      agentId: shoppingAgent.id,
      mandateId: amazonMandate.id,
      merchant: 'Amazon',
      category: 'Electronics',
      product: 'Mechanical Gaming Keyboard Pro RGB',
      amount: 649900, // ₹6,499 (exceeds ₹5,000)
      currency: 'INR',
      decision: 'BLOCKED',
      riskScore: 78,
      riskReasons: JSON.stringify([
        'Amount limit exceeded (+50)',
        'Near daily budget ceiling (+18)',
        'Base risk (+10)',
      ]),
      decisionReasons: JSON.stringify([
        'AMOUNT_LIMIT_EXCEEDED',
        'MANDATE_CEILING_BREACH',
      ]),
      status: 'REJECTED',
      createdAt: new Date(Date.now() - 1000 * 60 * 20),
    },
  });

  // Transaction 3: Review Queue (Needs human approval)
  const txPendingReview = await prisma.transaction.create({
    data: {
      id: 'tx_demo_rev_01',
      idempotencyKey: 'idemp_demo_shop_003',
      agentId: shoppingAgent.id,
      mandateId: amazonMandate.id,
      merchant: 'Amazon',
      category: 'Electronics',
      product: 'Dell 24-inch UltraSharp Monitor',
      amount: 449900, // ₹4,499 (Exceeds approval threshold of ₹4,000)
      currency: 'INR',
      decision: 'REVIEW',
      riskScore: 48,
      riskReasons: JSON.stringify([
        'Exceeds human approval threshold of ₹4,000 (+30)',
        'Base risk (+10)',
        'High value single item (+8)',
      ]),
      decisionReasons: JSON.stringify(['HUMAN_APPROVAL_REQUIRED']),
      status: 'PENDING_APPROVAL',
      createdAt: new Date(Date.now() - 1000 * 60 * 8),
    },
  });

  // Create corresponding Approval entry
  await prisma.approval.create({
    data: {
      transactionId: txPendingReview.id,
      agentId: shoppingAgent.id,
      amount: 449900,
      merchant: 'Amazon',
      status: 'PENDING',
      reason: 'Transaction ₹4,499 exceeds mandate human review threshold of ₹4,000',
    },
  });

  // 7. Cryptographic Audit Trail (Section 22 & 44)
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  let seq = 1;

  const auditEventsList = [
    {
      type: 'USER_INTENT_CREATED',
      actor: 'Demo User (SecOps)',
      agentId: shoppingAgent.id,
      txId: txApproved.id,
      data: { prompt: 'Buy a Logitech keyboard from Amazon under ₹5,000' },
      timeOffset: 45 * 60 * 1000 + 4000,
    },
    {
      type: 'INTENT_PARSED',
      actor: 'RuleBasedIntentParser v1.0',
      agentId: shoppingAgent.id,
      txId: txApproved.id,
      data: { merchant: 'Amazon', category: 'Electronics', maxPrice: 500000 },
      timeOffset: 45 * 60 * 1000 + 3000,
    },
    {
      type: 'CAPABILITY_CHECKED',
      actor: 'CapabilityEngine',
      agentId: shoppingAgent.id,
      txId: txApproved.id,
      data: { requiredCapability: 'PURCHASE_ELECTRONICS', status: 'VERIFIED_ALLOWED' },
      timeOffset: 45 * 60 * 1000 + 2000,
    },
    {
      type: 'MANDATE_VALIDATED',
      actor: 'MandateEngine',
      agentId: shoppingAgent.id,
      txId: txApproved.id,
      data: { mandateId: amazonMandate.id, maxAllowed: 500000, requested: 399900, valid: true },
      timeOffset: 45 * 60 * 1000 + 1500,
    },
    {
      type: 'RISK_EVALUATED',
      actor: 'RiskEngine',
      agentId: shoppingAgent.id,
      txId: txApproved.id,
      data: { score: 12, category: 'LOW', factors: ['Base 10', 'Amount within bounds'] },
      timeOffset: 45 * 60 * 1000 + 1000,
    },
    {
      type: 'AUTHORIZATION_APPROVED',
      actor: 'DeterministicAuthService',
      agentId: shoppingAgent.id,
      txId: txApproved.id,
      data: { decision: 'APPROVED', status: 'PROCEED_TO_PAYMENT' },
      timeOffset: 45 * 60 * 1000 + 500,
    },
    {
      type: 'RAZORPAY_ORDER_CREATED',
      actor: 'RazorpayPaymentService (TEST MODE)',
      agentId: shoppingAgent.id,
      txId: txApproved.id,
      data: { orderId: 'order_TL_DEMO_998124', amountPaise: 399900, currency: 'INR' },
      timeOffset: 45 * 60 * 1000,
    },
    // Events for the blocked transaction
    {
      type: 'AUTHORIZATION_BLOCKED',
      actor: 'MandateEngine',
      agentId: shoppingAgent.id,
      txId: txBlockedAmount.id,
      data: { reasonCode: 'AMOUNT_LIMIT_EXCEEDED', requested: 649900, limit: 500000 },
      timeOffset: 20 * 60 * 1000,
    },
  ];

  for (const item of auditEventsList) {
    const timestamp = new Date(Date.now() - item.timeOffset);
    const payloadString = JSON.stringify({
      seq,
      type: item.type,
      actor: item.actor,
      agentId: item.agentId,
      txId: item.txId,
      timestamp: timestamp.toISOString(),
      data: item.data,
      prevHash,
    });
    const currentHash = sha256(payloadString);

    await prisma.auditEvent.create({
      data: {
        sequenceNumber: seq,
        eventType: item.type,
        actor: item.actor,
        agentId: item.agentId,
        transactionId: item.txId,
        timestamp,
        eventData: JSON.stringify(item.data),
        previousHash: prevHash,
        eventHash: currentHash,
      },
    });

    prevHash = currentHash;
    seq++;
  }

  // 8. Trust Events (Section 23)
  await prisma.trustEvent.create({
    data: {
      agentId: shoppingAgent.id,
      transactionId: txApproved.id,
      reason: 'SUCCESS',
      scoreDelta: 0.2,
      previousScore: 93.8,
      newScore: 94.0,
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
    },
  });

  await prisma.trustEvent.create({
    data: {
      agentId: shoppingAgent.id,
      transactionId: txBlockedAmount.id,
      reason: 'MANDATE_VIOLATION',
      scoreDelta: -5.0,
      previousScore: 99.0,
      newScore: 94.0,
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
    },
  });

  console.log('✅ Demo database seeded successfully with 3 agents, 3 mandates, 3 transactions, cryptographic audit chain, and trust events!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
