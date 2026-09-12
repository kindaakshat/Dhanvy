import * as crypto from 'crypto';

export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export interface MockAgentCapability {
  id: string;
  agentId: string;
  capability: string;
  isAllowed: boolean;
  createdAt: Date;
}

export interface MockMandate {
  id: string;
  userId?: string;
  agentId: string;
  name: string;
  merchant: string;
  allowedMerchants?: string[];
  category: string;
  allowedCategories?: string[];
  productPattern?: string | null;
  maxAmount: number;
  dailyLimit: number;
  spentToday: number;
  currency: string;
  validFrom: Date;
  validUntil: Date;
  approvalThreshold?: number | null;
  status: string; // 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  computedStatus?: string;
  createdAt: Date;
  updatedAt: Date;
  agent?: any;
}

export interface MockTransaction {
  id: string;
  idempotencyKey: string;
  agentId: string;
  mandateId?: string | null;
  intentId?: string | null;
  merchant: string;
  merchantId?: string | null;
  category: string;
  product: string;
  instruction?: string | null;
  amount: number;
  currency: string;
  decision: 'APPROVED' | 'BLOCKED' | 'REVIEW';
  riskScore: number;
  riskReasons: string;
  decisionReasons: string;
  status: string;
  attempts?: number;
  duplicateCount?: number;
  idempotentResponse?: string | null;
  stateHistory?: string | null;
  lastAttemptAt?: Date;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpayStatus?: string | null;
  createdAt: Date;
  updatedAt: Date;
  agent?: any;
  mandate?: any;
  intent?: any;
  auditEvents?: any[];
  approval?: any;
  dispute?: any;
}

export interface MockAuditEvent {
  id: string;
  sequenceNumber: number;
  eventType: string;
  actor: string;
  actorType?: string;
  actorId?: string;
  agentId?: string | null;
  userId?: string | null;
  transactionId?: string | null;
  mandateId?: string | null;
  action?: string;
  previousState?: string | null;
  newState?: string | null;
  reason?: string | null;
  metadata?: any;
  timestamp: Date;
  eventData: string;
  previousHash: string;
  eventHash: string;
  agent?: any;
}

export interface MockApproval {
  id: string;
  transactionId: string;
  agentId: string;
  amount: number;
  merchant: string;
  status: string;
  reason: string;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  transaction?: any;
}

export interface MockDispute {
  id: string;
  transactionId: string;
  agentId: string;
  userId: string;
  amount: number;
  reason: string;
  status: string; // 'OPEN' | 'REVERSAL_REQUESTED' | 'REVERSED' | 'RESOLVED_REFUNDED' | 'RESOLVED_REJECTED'
  resolution?: string | null;
  reversalId?: string | null;
  createdAt: Date;
  resolvedAt?: Date | null;
  transaction?: any;
}

export interface MockAgent {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  status: string;
  trustScore: number;
  createdAt: Date;
  updatedAt: Date;
  capabilities: MockAgentCapability[];
  mandates: MockMandate[];
  _count: {
    transactions: number;
    trustEvents: number;
  };
}

export interface MockTrustEvent {
  id: string;
  agentId: string;
  transactionId?: string | null;
  reason: string;
  explanation?: string;
  scoreDelta: number;
  previousScore: number;
  newScore: number;
  createdAt: Date;
}

class MockStore {
  private agents: MockAgent[] = [];
  private mandates: MockMandate[] = [];
  private transactions: MockTransaction[] = [];
  private auditEvents: MockAuditEvent[] = [];
  private approvals: MockApproval[] = [];
  private disputes: MockDispute[] = [];
  private trustEvents: MockTrustEvent[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    const now = new Date();
    const future30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Agents
    const a1: MockAgent = {
      id: 'agent-demo-001',
      name: 'Procurement-Agent-Alpha',
      description: 'Autonomous hardware & IT peripherals procurement agent',
      ownerId: 'usr_demo_01',
      status: 'ACTIVE',
      trustScore: 98.5,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      capabilities: [
        { id: 'cap-001', agentId: 'agent-demo-001', capability: 'PURCHASE_ELECTRONICS', isAllowed: true, createdAt: now },
        { id: 'cap-002', agentId: 'agent-demo-001', capability: 'PURCHASE_OFFICE_SUPPLIES', isAllowed: true, createdAt: now },
        { id: 'cap-003', agentId: 'agent-demo-001', capability: 'PURCHASE_GIFT_CARDS', isAllowed: false, createdAt: now },
        { id: 'cap-004', agentId: 'agent-demo-001', capability: 'TRANSFER_FUNDS', isAllowed: false, createdAt: now },
        { id: 'cap-005', agentId: 'agent-demo-001', capability: 'USE_RAZORPAY', isAllowed: true, createdAt: now },
      ],
      mandates: [],
      _count: { transactions: 3, trustEvents: 3 },
    };

    const a2: MockAgent = {
      id: 'agent-demo-002',
      name: 'CustomerSupport-Refund-Agent',
      description: 'Autonomous e-commerce return & customer dispute refund agent',
      ownerId: 'usr_demo_01',
      status: 'ACTIVE',
      trustScore: 84.0,
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      capabilities: [
        { id: 'cap-006', agentId: 'agent-demo-002', capability: 'ISSUE_REFUND', isAllowed: true, createdAt: now },
        { id: 'cap-007', agentId: 'agent-demo-002', capability: 'PROCESS_RETURN', isAllowed: true, createdAt: now },
        { id: 'cap-008', agentId: 'agent-demo-002', capability: 'PURCHASE_MERCHANDISE', isAllowed: false, createdAt: now },
        { id: 'cap-009', agentId: 'agent-demo-002', capability: 'USE_RAZORPAY', isAllowed: true, createdAt: now },
      ],
      mandates: [],
      _count: { transactions: 1, trustEvents: 1 },
    };

    const a3: MockAgent = {
      id: 'agent-demo-003',
      name: 'DevOps-CloudAutoPay',
      description: 'Cloud infrastructure automated bill payment and auto-scaling settlements',
      ownerId: 'usr_demo_01',
      status: 'ACTIVE',
      trustScore: 92.0,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      capabilities: [
        { id: 'cap-010', agentId: 'agent-demo-003', capability: 'PAY_AWS_BILL', isAllowed: true, createdAt: now },
        { id: 'cap-011', agentId: 'agent-demo-003', capability: 'PROVISION_SERVERS', isAllowed: true, createdAt: now },
        { id: 'cap-012', agentId: 'agent-demo-003', capability: 'MODIFY_IAM_ROLES', isAllowed: false, createdAt: now },
        { id: 'cap-013', agentId: 'agent-demo-003', capability: 'USE_RAZORPAY', isAllowed: true, createdAt: now },
      ],
      mandates: [],
      _count: { transactions: 1, trustEvents: 1 },
    };

    const a4: MockAgent = {
      id: 'agent-demo-004',
      name: 'VendorProcure-Restricted',
      description: 'Secondary office vendor procurement agent under compliance observation',
      ownerId: 'usr_demo_01',
      status: 'ACTIVE',
      trustScore: 58.0,
      createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      capabilities: [
        { id: 'cap-014', agentId: 'agent-demo-004', capability: 'PURCHASE_OFFICE_SUPPLIES', isAllowed: true, createdAt: now },
        { id: 'cap-015', agentId: 'agent-demo-004', capability: 'PURCHASE_ELECTRONICS', isAllowed: false, createdAt: now },
        { id: 'cap-016', agentId: 'agent-demo-004', capability: 'USE_RAZORPAY', isAllowed: true, createdAt: now },
      ],
      mandates: [],
      _count: { transactions: 4, trustEvents: 3 },
    };

    const a5: MockAgent = {
      id: 'agent-demo-005',
      name: 'Rogue-Scraper-Bot',
      description: 'Untrusted web scraping agent with repeated mandate and idempotency violations',
      ownerId: 'usr_demo_01',
      status: 'REVIEW_REQUIRED',
      trustScore: 28.0,
      createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      capabilities: [
        { id: 'cap-017', agentId: 'agent-demo-005', capability: 'SCRAPE_PRICES', isAllowed: true, createdAt: now },
        { id: 'cap-018', agentId: 'agent-demo-005', capability: 'EXECUTE_PAYMENT', isAllowed: false, createdAt: now },
        { id: 'cap-019', agentId: 'agent-demo-005', capability: 'USE_RAZORPAY', isAllowed: false, createdAt: now },
      ],
      mandates: [],
      _count: { transactions: 5, trustEvents: 2 },
    };

    // Mandates
    const m1: MockMandate = {
      id: 'mandate-demo-001',
      userId: 'usr_demo_01',
      agentId: 'agent-demo-001',
      name: 'Office Hardware & Peripherals',
      merchant: 'Amazon',
      allowedMerchants: ['Amazon', 'Flipkart', 'Croma'],
      category: 'Electronics',
      allowedCategories: ['Electronics', 'Office Supplies', 'Peripherals'],
      productPattern: 'Keyboard|Mouse|Monitor|Headphones',
      maxAmount: 500000, // ₹5,000
      dailyLimit: 1500000, // ₹15,000
      spentToday: 429900,
      currency: 'INR',
      validFrom: now,
      validUntil: future30Days,
      approvalThreshold: 1500000,
      status: 'ACTIVE',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      agent: { id: a1.id, name: a1.name, trustScore: a1.trustScore, status: a1.status },
    };

    const m2: MockMandate = {
      id: 'mandate-demo-002',
      userId: 'usr_demo_01',
      agentId: 'agent-demo-002',
      name: 'Support Ticket Instant Refunds',
      merchant: 'CustomerRefund',
      allowedMerchants: ['CustomerRefund', 'RazorpayRefunds'],
      category: 'Refund',
      allowedCategories: ['Refund', 'Customer Disputes', 'Returns'],
      productPattern: 'OrderRefund|ReturnCredit',
      maxAmount: 100000, // ₹1,000
      dailyLimit: 500000, // ₹5,000
      spentToday: 0,
      currency: 'INR',
      validFrom: now,
      validUntil: future30Days,
      approvalThreshold: 80000,
      status: 'ACTIVE',
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      agent: { id: a2.id, name: a2.name, trustScore: a2.trustScore, status: a2.status },
    };

    const m3: MockMandate = {
      id: 'mandate-demo-003',
      userId: 'usr_demo_01',
      agentId: 'agent-demo-003',
      name: 'AWS Infrastructure Monthly Bill',
      merchant: 'Amazon Web Services',
      allowedMerchants: ['Amazon Web Services', 'Cloudflare', 'Datadog'],
      category: 'Cloud Infrastructure',
      allowedCategories: ['Cloud Infrastructure', 'Hosting', 'SaaS Subscriptions'],
      productPattern: 'EC2|RDS|S3|Billing',
      maxAmount: 2500000, // ₹25,000
      dailyLimit: 5000000, // ₹50,000
      spentToday: 0,
      currency: 'INR',
      validFrom: now,
      validUntil: future30Days,
      approvalThreshold: 2000000,
      status: 'ACTIVE',
      createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      agent: { id: a3.id, name: a3.name, trustScore: a3.trustScore, status: a3.status },
    };

    // Expired Mandate Example
    const m4: MockMandate = {
      id: 'mandate-demo-004',
      userId: 'usr_demo_01',
      agentId: 'agent-demo-001',
      name: 'Q3 Travel & Conference Booking',
      merchant: 'MakeMyTrip',
      allowedMerchants: ['MakeMyTrip', 'Uber', 'IRCTC'],
      category: 'Travel',
      allowedCategories: ['Travel Tickets', 'Hotel Stays'],
      productPattern: 'Flight|Hotel|Train',
      maxAmount: 1500000, // ₹15,000
      dailyLimit: 3000000, // ₹30,000
      spentToday: 0,
      currency: 'INR',
      validFrom: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      validUntil: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // Expired 5 days ago
      approvalThreshold: 1000000,
      status: 'EXPIRED',
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      agent: { id: a1.id, name: a1.name, trustScore: a1.trustScore, status: a1.status },
    };

    // Revoked Mandate Example
    const m5: MockMandate = {
      id: 'mandate-demo-005',
      userId: 'usr_demo_01',
      agentId: 'agent-demo-002',
      name: 'Legacy Gift Cards & Promo Allowance',
      merchant: 'Amazon',
      allowedMerchants: ['Amazon'],
      category: 'GiftCards',
      allowedCategories: ['Gift Cards'],
      productPattern: 'GiftCard|Voucher',
      maxAmount: 200000, // ₹2,000
      dailyLimit: 500000, // ₹5,000
      spentToday: 0,
      currency: 'INR',
      validFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      validUntil: future30Days,
      approvalThreshold: null,
      status: 'REVOKED',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      agent: { id: a2.id, name: a2.name, trustScore: a2.trustScore, status: a2.status },
    };

    // ShoppingAgent-01 (Google ADK Autonomous Agent)
    const aShop: MockAgent = {
      id: 'agent_shop_01',
      name: 'ShoppingAgent-01',
      description: 'Autonomous purchasing assistant specialized in procurement of office supplies and hardware.',
      ownerId: 'usr_demo_01',
      status: 'ACTIVE',
      trustScore: 94.0,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      capabilities: [
        { id: 'cap-shop-001', agentId: 'agent_shop_01', capability: 'PURCHASE_ELECTRONICS', isAllowed: true, createdAt: now },
        { id: 'cap-shop-002', agentId: 'agent_shop_01', capability: 'VIEW_PRODUCTS', isAllowed: true, createdAt: now },
        { id: 'cap-shop-003', agentId: 'agent_shop_01', capability: 'CREATE_PAYMENT_ORDER', isAllowed: true, createdAt: now },
        { id: 'cap-shop-004', agentId: 'agent_shop_01', capability: 'USE_RAZORPAY', isAllowed: true, createdAt: now },
        { id: 'cap-shop-005', agentId: 'agent_shop_01', capability: 'PURCHASE_SUPPLIES', isAllowed: true, createdAt: now },
        { id: 'cap-shop-006', agentId: 'agent_shop_01', capability: 'TRANSFER_TO_PERSON', isAllowed: false, createdAt: now },
        { id: 'cap-shop-007', agentId: 'agent_shop_01', capability: 'TRANSFER_FUNDS', isAllowed: false, createdAt: now },
        { id: 'cap-shop-008', agentId: 'agent_shop_01', capability: 'MODIFY_MANDATE', isAllowed: false, createdAt: now },
        { id: 'cap-shop-009', agentId: 'agent_shop_01', capability: 'CREATE_MANDATE', isAllowed: false, createdAt: now },
        { id: 'cap-shop-010', agentId: 'agent_shop_01', capability: 'MODIFY_OWN_LIMIT', isAllowed: false, createdAt: now },
        { id: 'cap-shop-011', agentId: 'agent_shop_01', capability: 'CREATE_AGENT', isAllowed: false, createdAt: now },
      ],
      mandates: [],
      _count: { transactions: 2, trustEvents: 2 },
    };

    const mShop: MockMandate = {
      id: 'mnd_amazon_01',
      userId: 'usr_demo_01',
      agentId: 'agent_shop_01',
      name: 'Amazon Office Electronics & Peripherals',
      merchant: 'Amazon',
      allowedMerchants: ['Amazon', 'Flipkart', 'Croma'],
      category: 'Electronics',
      allowedCategories: ['Electronics', 'Office Supplies', 'Peripherals', 'Computers'],
      productPattern: 'Keyboard|Mouse|Headphones|Monitor|Cables|Hub',
      maxAmount: 500000, // ₹5,000
      dailyLimit: 2000000, // ₹20,000
      spentToday: 0,
      currency: 'INR',
      validFrom: now,
      validUntil: future30Days,
      approvalThreshold: 400000,
      status: 'ACTIVE',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: now,
      agent: { id: aShop.id, name: aShop.name, trustScore: aShop.trustScore, status: aShop.status },
    };

    a1.mandates = [m1, m4];
    a2.mandates = [m2, m5];
    a3.mandates = [m3];
    aShop.mandates = [mShop];

    this.agents = [a1, a2, a3, a4, a5, aShop];
    this.mandates = [m1, m2, m3, m4, m5, mShop];

    // Transactions
    const tx1: MockTransaction = {
      id: 'tx-demo-001',
      idempotencyKey: 'idemp-demo-001',
      agentId: a1.id,
      mandateId: m1.id,
      merchant: 'Amazon',
      category: 'Electronics',
      product: 'Keychron K2 Mechanical Keyboard',
      amount: 429900,
      currency: 'INR',
      decision: 'APPROVED',
      riskScore: 12,
      riskReasons: JSON.stringify(['Known trusted merchant', 'Within standard mandate limits', 'High agent trust score']),
      decisionReasons: JSON.stringify(['MANDATE_MATCHED', 'WITHIN_LIMITS', 'TRUST_VERIFIED']),
      status: 'COMPLETED',
      razorpayOrderId: 'order_TL_test_1789125001',
      razorpayPaymentId: 'pay_TL_test_payment_001',
      razorpayStatus: 'paid',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      agent: { id: a1.id, name: a1.name, trustScore: a1.trustScore },
      mandate: { id: m1.id, name: m1.name, maxAmount: m1.maxAmount },
    };

    const tx2: MockTransaction = {
      id: 'tx-demo-002',
      idempotencyKey: 'idemp-demo-002',
      agentId: a1.id,
      mandateId: m1.id,
      merchant: 'Apple Store',
      category: 'Electronics',
      product: 'MacBook Pro M3 Max 64GB',
      amount: 8500000, // ₹85,000
      currency: 'INR',
      decision: 'BLOCKED',
      riskScore: 95,
      riskReasons: JSON.stringify(['Amount exceeds single transaction limit ₹5,000', 'Merchant Apple Store not authorized in Amazon mandate']),
      decisionReasons: JSON.stringify(['AMOUNT_EXCEEDS_SINGLE_LIMIT', 'MERCHANT_NOT_IN_MANDATE']),
      status: 'REJECTED',
      razorpayOrderId: null,
      razorpayPaymentId: null,
      razorpayStatus: null,
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      agent: { id: a1.id, name: a1.name, trustScore: a1.trustScore },
      mandate: { id: m1.id, name: m1.name, maxAmount: m1.maxAmount },
    };

    const tx3: MockTransaction = {
      id: 'tx-demo-003',
      idempotencyKey: 'idemp-demo-003',
      agentId: a1.id,
      mandateId: m1.id,
      merchant: 'Dell India',
      category: 'Electronics',
      product: 'Dell UltraSharp 27-inch 4K Monitor',
      amount: 1850000, // ₹18,500
      currency: 'INR',
      decision: 'REVIEW',
      riskScore: 55,
      riskReasons: JSON.stringify(['Amount ₹18,500 exceeds review threshold ₹15,000', 'First-time merchant interaction']),
      decisionReasons: JSON.stringify(['AMOUNT_EXCEEDS_APPROVAL_THRESHOLD', 'MERCHANT_NEW']),
      status: 'PENDING_APPROVAL',
      razorpayOrderId: null,
      razorpayPaymentId: null,
      razorpayStatus: null,
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      agent: { id: a1.id, name: a1.name, trustScore: a1.trustScore },
      mandate: { id: m1.id, name: m1.name, maxAmount: m1.maxAmount },
    };

    const tx4: MockTransaction = {
      id: 'tx-demo-004',
      idempotencyKey: 'idemp-demo-004',
      agentId: a1.id,
      mandateId: m1.id,
      merchant: 'Amazon',
      category: 'Electronics',
      product: 'Keychron Mechanical Gaming Keyboard',
      amount: 499900, // ₹4,999
      currency: 'INR',
      decision: 'APPROVED',
      riskScore: 20,
      riskReasons: JSON.stringify(['Autonomous purchase initiated']),
      decisionReasons: JSON.stringify(['ALL_POLICIES_SATISFIED']),
      status: 'REVERSED',
      razorpayOrderId: 'order_TL_rev_4999',
      razorpayPaymentId: 'pay_TL_rev_4999',
      razorpayStatus: 'refunded',
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 47 * 60 * 60 * 1000),
      agent: { id: a1.id, name: a1.name, trustScore: a1.trustScore },
      mandate: { id: m1.id, name: m1.name, maxAmount: m1.maxAmount },
    };

    tx1.status = 'DISPUTED';
    this.transactions = [tx1, tx2, tx3, tx4];

    // Approvals
    this.approvals = [
      {
        id: 'approval-demo-001',
        transactionId: tx3.id,
        agentId: a1.id,
        amount: 1850000,
        merchant: 'Dell India',
        status: 'PENDING',
        reason: 'Transaction exceeds standard ceiling (₹15,000) but within hard limit. Requires human approval.',
        reviewedBy: null,
        reviewedAt: null,
        createdAt: tx3.createdAt,
        transaction: tx3,
      },
    ];

    // Disputes
    this.disputes = [
      {
        id: 'dsp_demo_001',
        transactionId: tx1.id,
        agentId: a1.id,
        userId: 'usr_demo_01',
        amount: 429900,
        reason: 'Agent exceeded mandate',
        status: 'OPEN',
        resolution: null,
        reversalId: null,
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        resolvedAt: null,
        transaction: tx1,
      },
      {
        id: 'dsp_demo_002',
        transactionId: tx4.id,
        agentId: a1.id,
        userId: 'usr_demo_01',
        amount: 499900,
        reason: 'Outside mandate',
        status: 'REVERSED',
        resolution: 'Reversal completed: ₹4,999 returned to customer',
        reversalId: 'rev_892143_mandate_breach',
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        resolvedAt: new Date(now.getTime() - 47 * 60 * 60 * 1000),
        transaction: tx4,
      },
    ];

    // Trust Events (History explaining why score changed)
    this.trustEvents = [
      {
        id: 'te-seed-001',
        agentId: 'agent-demo-001',
        transactionId: 'tx-demo-001',
        reason: 'SUCCESS',
        explanation: 'Successful authorized purchase of Keychron K2 Keyboard settled cleanly (+0.5 pts)',
        scoreDelta: 0.5,
        previousScore: 93.5,
        newScore: 94.0,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        id: 'te-seed-002',
        agentId: 'agent-demo-001',
        transactionId: null,
        reason: 'SUCCESS',
        explanation: 'Low dispute rate stability bonus awarded (+0.5 pts)',
        scoreDelta: 0.5,
        previousScore: 93.0,
        newScore: 93.5,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        id: 'te-seed-003',
        agentId: 'agent-demo-001',
        transactionId: 'tx-demo-004',
        reason: 'MANDATE_VIOLATION',
        explanation: 'Attempted purchase outside authorized mandate product category (-6.0 pts)',
        scoreDelta: -6.0,
        previousScore: 99.0,
        newScore: 93.0,
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      },
      {
        id: 'te-seed-004',
        agentId: 'agent-demo-004',
        transactionId: null,
        reason: 'MANDATE_VIOLATION',
        explanation: 'Single transaction amount exceeded permitted single ceiling of ₹5,000 (-6.0 pts)',
        scoreDelta: -6.0,
        previousScore: 64.0,
        newScore: 58.0,
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
      {
        id: 'te-seed-005',
        agentId: 'agent-demo-004',
        transactionId: null,
        reason: 'DUPLICATE_ATTEMPT',
        explanation: 'Immediate duplicate replay intercepted by idempotency engine (-4.0 pts)',
        scoreDelta: -4.0,
        previousScore: 68.0,
        newScore: 64.0,
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      {
        id: 'te-seed-006',
        agentId: 'agent-demo-004',
        transactionId: null,
        reason: 'USER_DISPUTE',
        explanation: 'Cardholder filed dispute for unapproved item delivery (-10.0 pts)',
        scoreDelta: -10.0,
        previousScore: 78.0,
        newScore: 68.0,
        createdAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
      },
      {
        id: 'te-seed-007',
        agentId: 'agent-demo-005',
        transactionId: null,
        reason: 'CONFIRMED_FRAUD',
        explanation: 'High-frequency automated debit attempts flagged as anomalous rogue activity (-20.0 pts)',
        scoreDelta: -20.0,
        previousScore: 48.0,
        newScore: 28.0,
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        id: 'te-seed-008',
        agentId: 'agent-demo-005',
        transactionId: null,
        reason: 'USER_DISPUTE',
        explanation: 'Multiple user dispute contests received across automated charges (-10.0 pts)',
        scoreDelta: -10.0,
        previousScore: 58.0,
        newScore: 48.0,
        createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
      },
    ];

    // Audit Events (Immutable SHA-256 Chained Log)
    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const auditData = [
      {
        seq: 1,
        type: 'SYSTEM_INITIALIZED',
        actor: 'SYSTEM',
        actorType: 'SYSTEM',
        actorId: 'system_core',
        agentId: null,
        userId: 'usr_demo_01',
        txId: null,
        mandateId: null,
        action: 'BOOTSTRAP',
        previousState: null,
        newState: 'OPERATIONAL',
        reason: 'LEO Autonomous Payment Governance Layer initialized with SHA-256 cipher chain',
        data: { version: '1.0.0', environment: 'PRODUCTION_VERCEL', cipher: 'SHA-256' },
      },
      {
        seq: 2,
        type: 'AGENT_REGISTERED',
        actor: 'usr_demo_01',
        actorType: 'USER',
        actorId: 'usr_demo_01',
        agentId: aShop.id,
        userId: 'usr_demo_01',
        txId: null,
        mandateId: null,
        action: 'REGISTER_AGENT',
        previousState: null,
        newState: 'ACTIVE',
        reason: 'Registered autonomous procurement agent ShoppingAgent-01 with trust score 94.0',
        data: { agentId: aShop.id, agentName: aShop.name, trustScore: 94.0 },
      },
      {
        seq: 3,
        type: 'MANDATE_CREATED',
        actor: 'usr_demo_01',
        actorType: 'USER',
        actorId: 'usr_demo_01',
        agentId: aShop.id,
        userId: 'usr_demo_01',
        txId: null,
        mandateId: mShop.id,
        action: 'CREATE_MANDATE',
        previousState: null,
        newState: 'ACTIVE',
        reason: 'Issued mandate mnd_amazon_01: ₹5,000 single tx limit, ₹20,000 daily limit',
        data: { mandateId: mShop.id, maxAmount: 500000, dailyLimit: 2000000, allowedMerchants: ['Amazon', 'Flipkart', 'Croma'] },
      },
      {
        seq: 4,
        type: 'PAYMENT_REQUESTED',
        actor: aShop.name,
        actorType: 'AGENT',
        actorId: aShop.id,
        agentId: aShop.id,
        userId: 'usr_demo_01',
        txId: tx1.id,
        mandateId: m1.id,
        action: 'SUBMIT_PAYMENT_REQUEST',
        previousState: 'CREATED',
        newState: 'VALIDATING',
        reason: 'Agent requested ₹4,299 for Keychron K2 Mechanical Keyboard from Amazon',
        data: { amount: 429900, merchant: 'Amazon', product: 'Keychron K2 Mechanical Keyboard', idempotencyKey: 'idemp-demo-001' },
      },
      {
        seq: 5,
        type: 'PAYMENT_VALIDATED',
        actor: 'LEO Deterministic Engine',
        actorType: 'SYSTEM',
        actorId: 'leo_validator',
        agentId: aShop.id,
        userId: 'usr_demo_01',
        txId: tx1.id,
        mandateId: m1.id,
        action: 'VALIDATE_BOUNDS',
        previousState: 'VALIDATING',
        newState: 'AUTHORIZED',
        reason: 'All 11 verification bounds deterministically satisfied. Within ₹5,000 limit.',
        data: { checksPassed: 11, totalChecks: 11, riskScore: 12 },
      },
      {
        seq: 6,
        type: 'PAYMENT_EXECUTED',
        actor: 'Razorpay Test Mode',
        actorType: 'GATEWAY',
        actorId: 'rzp_test_gateway',
        agentId: aShop.id,
        userId: 'usr_demo_01',
        txId: tx1.id,
        mandateId: m1.id,
        action: 'CREATE_ORDER',
        previousState: 'AUTHORIZED',
        newState: 'SUCCESS',
        reason: 'Razorpay Test Mode order generated and settled: order_TL_test_1789125001',
        data: { razorpayOrderId: 'order_TL_test_1789125001', razorpayStatus: 'paid', amount: 429900 },
      },
      {
        seq: 7,
        type: 'PAYMENT_REQUESTED',
        actor: aShop.name,
        actorType: 'AGENT',
        actorId: aShop.id,
        agentId: aShop.id,
        userId: 'usr_demo_01',
        txId: tx2.id,
        mandateId: m1.id,
        action: 'SUBMIT_PAYMENT_REQUEST',
        previousState: 'CREATED',
        newState: 'VALIDATING',
        reason: 'Agent requested ₹85,000 for MacBook Pro M3 Max from Apple Store',
        data: { amount: 8500000, merchant: 'Apple Store', product: 'MacBook Pro M3 Max 64GB' },
      },
      {
        seq: 8,
        type: 'PAYMENT_BLOCKED',
        actor: 'LEO Deterministic Engine',
        actorType: 'SYSTEM',
        actorId: 'leo_validator',
        agentId: aShop.id,
        userId: 'usr_demo_01',
        txId: tx2.id,
        mandateId: m1.id,
        action: 'BLOCK_PAYMENT',
        previousState: 'VALIDATING',
        newState: 'BLOCKED',
        reason: 'Amount ₹85,000 exceeds single limit ₹5,000 & merchant Apple Store not authorized',
        data: { amount: 8500000, merchant: 'Apple Store', decision: 'BLOCKED', riskScore: 95, reasons: ['AMOUNT_EXCEEDS_SINGLE_LIMIT', 'MERCHANT_NOT_IN_MANDATE'] },
      },
      {
        seq: 9,
        type: 'APPROVAL_REQUESTED',
        actor: 'LEO Deterministic Engine',
        actorType: 'SYSTEM',
        actorId: 'leo_hitl_engine',
        agentId: a1.id,
        userId: 'usr_demo_01',
        txId: tx3.id,
        mandateId: m1.id,
        action: 'ESCALATE_TO_SUPERVISOR',
        previousState: 'VALIDATING',
        newState: 'PENDING_HUMAN_APPROVAL',
        reason: 'Amount ₹18,500 exceeds standard ceiling (₹15,000). Escalated to supervisor review queue.',
        data: { amount: 1850000, merchant: 'Dell India', approvalThreshold: 1500000 },
      },
      {
        seq: 10,
        type: 'DUPLICATE_PAYMENT_PREVENTED',
        actor: 'LEO Idempotency Engine',
        actorType: 'SYSTEM',
        actorId: 'leo_idempotency_engine',
        agentId: aShop.id,
        userId: 'usr_demo_01',
        txId: tx1.id,
        mandateId: m1.id,
        action: 'PREVENT_REPLAY',
        previousState: 'VALIDATING',
        newState: 'BLOCKED',
        reason: 'Immediate replay of identical idempotency key idemp-demo-001 halted. Gateway not contacted.',
        data: { idempotencyKey: 'idemp-demo-001', duplicatePaymentPrevented: true },
      },
      {
        seq: 11,
        type: 'PAYMENT_REVERSED',
        actor: 'usr_demo_01',
        actorType: 'USER',
        actorId: 'usr_demo_01',
        agentId: a1.id,
        userId: 'usr_demo_01',
        txId: tx1.id,
        mandateId: m1.id,
        action: 'RESOLVE_DISPUTE_REFUND',
        previousState: 'SUCCESS',
        newState: 'REVERSED',
        reason: 'Product delivered had damaged packaging; initiated dispute and refund clawback',
        data: { disputeId: 'dispute-demo-001', refundAmount: 429900 },
      },
    ];

    this.auditEvents = auditData.map(item => {
      const payload = JSON.stringify({
        sequenceNumber: item.seq,
        eventType: item.type,
        actor: item.actor,
        agentId: item.agentId,
        transactionId: item.txId,
        timestamp: now.toISOString(),
        eventData: item.data,
        previousHash: prevHash,
      });
      const eventHash = sha256(payload);
      const ev: MockAuditEvent = {
        id: `audit-demo-${item.seq}`,
        sequenceNumber: item.seq,
        eventType: item.type,
        actor: item.actor,
        actorType: item.actorType,
        actorId: item.actorId,
        agentId: item.agentId,
        userId: item.userId,
        transactionId: item.txId,
        mandateId: item.mandateId,
        action: item.action,
        previousState: item.previousState,
        newState: item.newState,
        reason: item.reason,
        metadata: item.data,
        timestamp: now,
        eventData: JSON.stringify(item.data),
        previousHash: prevHash,
        eventHash,
        agent: item.agentId ? { name: aShop.name } : undefined,
      };
      prevHash = eventHash;
      return ev;
    });
  }

  // --- STATS ---
  getStats() {
    const activeAgents = this.agents.filter(a => a.status === 'ACTIVE').length;
    const authorizedTransactions = this.transactions.filter(t => t.decision === 'APPROVED').length;
    const blockedTransactions = this.transactions.filter(t => t.decision === 'BLOCKED').length;
    const pendingApproval = this.approvals.filter(a => a.status === 'PENDING').length ||
      this.transactions.filter(t => t.decision === 'REVIEW' || t.status === 'PENDING_APPROVAL' || t.status === 'PENDING_HUMAN_APPROVAL').length;
    const disputedTransactions = this.transactions.filter(t => t.status === 'DISPUTED').length ||
      this.disputes.filter(d => d.status === 'OPEN' || d.status === 'REVERSAL_REQUESTED').length;
    const reversedTransactions = this.transactions.filter(t => t.status === 'REVERSED').length ||
      this.disputes.filter(d => d.status === 'REVERSED').length;
    const duplicatesPrevented = this.transactions.filter(t => (t.duplicateCount && t.duplicateCount > 0) || t.decisionReasons?.includes('DUPLICATE')).length || 1;

    const totalTransactionValue = this.transactions
      .filter(t => t.decision === 'APPROVED' && t.status !== 'REJECTED' && t.status !== 'BLOCKED')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const amountBlocked = this.transactions
      .filter(t => t.decision === 'BLOCKED')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const amountReversed = this.transactions
      .filter(t => t.status === 'REVERSED')
      .reduce((acc, t) => acc + (t.amount || 0), 0) || (this.disputes.filter(d => d.status === 'REVERSED').reduce((acc, d) => acc + (d.amount || 0), 0));

    const avgTrust = this.agents.length
      ? Math.round((this.agents.reduce((acc, a) => acc + a.trustScore, 0) / this.agents.length) * 10) / 10
      : 100.0;
    const activeMandates = this.mandates.filter(m => m.status === 'ACTIVE').length;

    return {
      success: true,
      isDemoData: true,
      dataSource: 'MEMORY_STORE',
      metrics: {
        totalTransactions: this.transactions.length,
        authorizedTransactions,
        blockedTransactions,
        pendingApproval,
        disputedTransactions,
        reversedTransactions,
        duplicatesPrevented,

        totalTransactionValue,
        amountBlocked,
        amountReversed,
        totalTransactionValueInr: Math.round(totalTransactionValue / 100),
        amountBlockedInr: Math.round(amountBlocked / 100),
        amountReversedInr: Math.round(amountReversed / 100),

        activeAgents,
        totalAgents: this.agents.length,
        activeMandates,
        totalMandates: this.mandates.length,
        averageTrustScore: avgTrust,

        reviewQueue: pendingApproval,
      },
      liveFeed: this.transactions.slice(0, 20).map(tx => ({
        ...tx,
        agent: tx.agent || this.agents.find(a => a.id === tx.agentId),
        mandate: tx.mandate || this.mandates.find(m => m.id === tx.mandateId),
        dispute: this.disputes.find(d => d.transactionId === tx.id),
        approval: this.approvals.find(a => a.transactionId === tx.id),
      })),
    };
  }

  // --- AGENTS ---
  getAgents() {
    return this.agents;
  }

  getAgentById(id: string) {
    const agent = this.agents.find(a => a.id === id || a.name === id || (id === 'ShoppingAgent-01' && a.id === 'agent_shop_01'));
    if (!agent) return null;
    return {
      ...agent,
      transactions: this.transactions.filter(t => t.agentId === agent.id),
      trustEvents: this.getTrustEvents(agent.id),
    };
  }

  getTrustEvents(agentId?: string): MockTrustEvent[] {
    if (agentId) {
      return this.trustEvents.filter(e => e.agentId === agentId);
    }
    return this.trustEvents;
  }

  createAgent(data: {
    name: string;
    description?: string;
    ownerId?: string;
    permissions?: string[];
    status?: string;
  }) {
    const now = new Date();
    const id = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const permissions = data.permissions && data.permissions.length > 0
      ? data.permissions
      : ['PURCHASE_ELECTRONICS', 'VIEW_PRODUCTS', 'CREATE_PAYMENT_ORDER', 'USE_RAZORPAY'];

    const capabilities: MockAgentCapability[] = permissions.map((cap, idx) => ({
      id: `cap_${id}_${idx + 1}`,
      agentId: id,
      capability: cap,
      isAllowed: true,
      createdAt: now,
    }));

    const agent: MockAgent = {
      id,
      name: data.name.trim(),
      description: data.description || 'Autonomous procurement assistant',
      ownerId: data.ownerId || 'usr_demo_01',
      status: data.status || 'ACTIVE',
      trustScore: 85.0,
      createdAt: now,
      updatedAt: now,
      capabilities,
      mandates: [],
      _count: { transactions: 0, trustEvents: 0 },
    };

    this.agents.unshift(agent);

    this.recordAuditEvent({
      eventType: 'AGENT_REGISTERED',
      actor: agent.ownerId,
      actorType: 'USER',
      actorId: agent.ownerId,
      agentId: agent.id,
      userId: agent.ownerId,
      action: 'REGISTER_AGENT',
      previousState: undefined,
      newState: agent.status,
      reason: `Registered new autonomous agent ${agent.name} with baseline trust 85.0`,
      metadata: {
        agentId: agent.id,
        agentName: agent.name,
        permissions,
        status: agent.status,
        trustScore: agent.trustScore,
      },
    });

    return agent;
  }

  updateAgentStatus(id: string, status: string, reason?: string) {
    const agent = this.agents.find(a => a.id === id || a.name === id);
    if (!agent) return null;
    const previousState = agent.status;
    agent.status = status;
    agent.updatedAt = new Date();

    const eventType = status === 'REVOKED' ? 'AGENT_REVOKED' : status === 'SUSPENDED' ? 'AGENT_SUSPENDED' : 'AGENT_ACTIVATED';
    this.recordAuditEvent({
      eventType,
      actor: 'usr_demo_01',
      actorType: 'USER',
      actorId: 'usr_demo_01',
      agentId: agent.id,
      userId: agent.ownerId,
      action: `SET_STATUS_${status}`,
      previousState,
      newState: status,
      reason: reason || `Agent ${agent.name} status transitioned from ${previousState} to ${status}`,
      metadata: {
        agentId: agent.id,
        agentName: agent.name,
        previousState,
        newState: status,
      },
    });

    return agent;
  }

  getAgentPayments(agentId: string) {
    const agent = this.agents.find(a => a.id === agentId || a.name === agentId);
    const targetId = agent ? agent.id : agentId;
    return this.transactions.filter(t => t.agentId === targetId);
  }

  getAgentMandates(agentId: string) {
    const agent = this.agents.find(a => a.id === agentId || a.name === agentId);
    const targetId = agent ? agent.id : agentId;
    return this.getMandates({ agentId: targetId });
  }

  adjustTrust(agentId: string, delta: number, reason: string, explanation?: string) {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) return null;
    const previousScore = agent.trustScore;
    const newScore = Math.max(0, Math.min(100, Math.round((previousScore + delta) * 10) / 10));
    agent.trustScore = newScore;
    if (newScore < 40) {
      agent.status = 'SUSPENDED';
    } else {
      agent.status = 'ACTIVE';
    }
    agent.updatedAt = new Date();

    const ev: MockTrustEvent = {
      id: `te-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      agentId,
      transactionId: null,
      reason,
      explanation: explanation || `Trust score adjusted by ${delta > 0 ? `+${delta}` : delta} pts (${reason})`,
      scoreDelta: delta,
      previousScore,
      newScore,
      createdAt: new Date(),
    };
    this.trustEvents.unshift(ev);
    agent._count.trustEvents = (agent._count.trustEvents || 0) + 1;

    return { previousScore, newScore, reason, explanation: ev.explanation };
  }

  // --- MANDATES ---
  getMandates(filter?: { agentId?: string; status?: string; userId?: string }) {
    let list = this.mandates.map((m) => {
      let computedStatus = m.status;
      if (m.status !== 'REVOKED' && new Date() > new Date(m.validUntil)) {
        computedStatus = 'EXPIRED';
      }
      return {
        ...m,
        status: computedStatus,
        computedStatus,
        userId: m.userId || 'usr_demo_01',
        allowedMerchants: m.allowedMerchants && m.allowedMerchants.length > 0 ? m.allowedMerchants : [m.merchant],
        allowedCategories: m.allowedCategories && m.allowedCategories.length > 0 ? m.allowedCategories : [m.category],
      };
    });

    if (filter?.agentId) {
      list = list.filter((m) => m.agentId === filter.agentId);
    }
    if (filter?.userId) {
      list = list.filter((m) => m.userId === filter.userId);
    }
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter((m) => m.computedStatus === filter.status || m.status === filter.status);
    }
    return list;
  }

  getMandateById(id: string) {
    const m = this.mandates.find((item) => item.id === id);
    if (!m) return null;
    let computedStatus = m.status;
    if (m.status !== 'REVOKED' && new Date() > new Date(m.validUntil)) {
      computedStatus = 'EXPIRED';
    }
    return {
      ...m,
      status: computedStatus,
      computedStatus,
      userId: m.userId || 'usr_demo_01',
      allowedMerchants: m.allowedMerchants && m.allowedMerchants.length > 0 ? m.allowedMerchants : [m.merchant],
      allowedCategories: m.allowedCategories && m.allowedCategories.length > 0 ? m.allowedCategories : [m.category],
    };
  }

  createMandate(data: any) {
    const now = new Date();
    const validUntil = data.validUntil
      ? new Date(data.validUntil)
      : new Date(now.getTime() + (data.validUntilDays || 30) * 24 * 60 * 60 * 1000);
    const agent = this.agents.find((a) => a.id === data.agentId);

    const allowedMerchants = Array.isArray(data.allowedMerchants) && data.allowedMerchants.length > 0
      ? data.allowedMerchants
      : (data.allowedMerchants ? String(data.allowedMerchants).split(',').map((s: string) => s.trim()) : [data.merchant || 'Amazon']);

    const allowedCategories = Array.isArray(data.allowedCategories) && data.allowedCategories.length > 0
      ? data.allowedCategories
      : (data.allowedCategories ? String(data.allowedCategories).split(',').map((s: string) => s.trim()) : [data.category || 'General']);

    const primaryMerchant = data.merchant || allowedMerchants[0];
    const primaryCategory = data.category || allowedCategories[0];

    const mandate: MockMandate = {
      id: data.id || `mnd_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      userId: data.userId || 'usr_demo_01',
      agentId: data.agentId,
      name: data.name,
      merchant: primaryMerchant,
      allowedMerchants,
      category: primaryCategory,
      allowedCategories,
      productPattern: data.productPattern || null,
      maxAmount: data.maxAmount,
      dailyLimit: data.dailyLimit,
      spentToday: 0,
      currency: data.currency || 'INR',
      validFrom: data.validFrom ? new Date(data.validFrom) : now,
      validUntil,
      approvalThreshold: data.approvalThreshold || null,
      status: 'ACTIVE',
      computedStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      agent: agent ? { id: agent.id, name: agent.name, trustScore: agent.trustScore, status: agent.status } : undefined,
    };

    this.mandates.unshift(mandate);
    if (agent) {
      agent.mandates.push(mandate);
    }
    return mandate;
  }

  revokeMandate(id: string) {
    const mandate = this.mandates.find((m) => m.id === id);
    if (!mandate) return null;
    mandate.status = 'REVOKED';
    mandate.computedStatus = 'REVOKED';
    mandate.updatedAt = new Date();
    return mandate;
  }

  extendMandate(id: string, days: number = 30) {
    const mandate = this.mandates.find((m) => m.id === id);
    if (!mandate) return null;
    const base = new Date(mandate.validUntil) > new Date() ? new Date(mandate.validUntil) : new Date();
    mandate.validUntil = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    if (mandate.status === 'EXPIRED') {
      mandate.status = 'ACTIVE';
    }
    mandate.computedStatus = 'ACTIVE';
    mandate.updatedAt = new Date();
    return mandate;
  }

  // --- TRANSACTIONS ---
  getTransactions(filter?: { decision?: string; agentId?: string; limit?: number }) {
    let txs = [...this.transactions];
    if (filter?.decision && filter.decision !== 'ALL') {
      txs = txs.filter(t => t.decision === filter.decision);
    }
    if (filter?.agentId) {
      txs = txs.filter(t => t.agentId === filter.agentId);
    }
    if (filter?.limit) {
      txs = txs.slice(0, filter.limit);
    }
    return txs;
  }

  getTransactionById(id: string) {
    const tx = this.transactions.find(t => t.id === id);
    if (!tx) return null;
    const agent = this.agents.find(a => a.id === tx.agentId);
    const mandate = tx.mandateId ? this.mandates.find(m => m.id === tx.mandateId) : null;
    const approval = this.approvals.find(a => a.transactionId === tx.id);
    const dispute = this.disputes.find(d => d.transactionId === tx.id);
    const events = this.auditEvents.filter(e => e.transactionId === tx.id);

    return {
      ...tx,
      agent,
      mandate,
      approval,
      dispute,
      auditEvents: events,
    };
  }

  createTransaction(data: any) {
    const now = new Date();
    const tx: MockTransaction = {
      id: data.id || `tx-${Date.now()}`,
      idempotencyKey: data.idempotencyKey,
      agentId: data.agentId,
      mandateId: data.mandateId || null,
      merchant: data.merchant,
      merchantId: data.merchantId || null,
      category: data.category || 'General',
      product: data.product,
      instruction: data.instruction || data.userIntentPrompt || null,
      amount: data.amount,
      currency: data.currency || 'INR',
      decision: data.decision,
      riskScore: data.riskScore,
      riskReasons: typeof data.riskReasons === 'string' ? data.riskReasons : JSON.stringify(data.riskReasons),
      decisionReasons: typeof data.decisionReasons === 'string' ? data.decisionReasons : JSON.stringify(data.decisionReasons),
      status: data.status,
      attempts: data.attempts || 1,
      duplicateCount: data.duplicateCount || 0,
      idempotentResponse: data.idempotentResponse || null,
      stateHistory: data.stateHistory || JSON.stringify([{ state: data.status || 'CREATED', timestamp: now.toISOString() }]),
      lastAttemptAt: now,
      razorpayOrderId: data.razorpayOrderId || null,
      razorpayPaymentId: data.razorpayPaymentId || null,
      razorpayStatus: data.razorpayStatus || null,
      createdAt: now,
      updatedAt: now,
      agent: this.agents.find(a => a.id === data.agentId),
      mandate: data.mandateId ? this.mandates.find(m => m.id === data.mandateId) : null,
    };
    this.transactions.unshift(tx);
    return tx;
  }

  updateTransaction(id: string, data: Partial<MockTransaction>) {
    const tx = this.transactions.find(t => t.id === id);
    if (!tx) return null;
    Object.assign(tx, data, { updatedAt: new Date() });
    return tx;
  }

  // --- AUDIT TRAIL ---
  getAuditEvents(filter?: {
    agentId?: string;
    transactionId?: string;
    mandateId?: string;
    userId?: string;
    eventType?: string;
    actorType?: string;
    limit?: number;
  }) {
    let evs = [...this.auditEvents];
    if (filter?.agentId) {
      evs = evs.filter(e => e.agentId === filter.agentId);
    }
    if (filter?.transactionId) {
      evs = evs.filter(e => e.transactionId === filter.transactionId);
    }
    if (filter?.mandateId) {
      evs = evs.filter(e => e.mandateId === filter.mandateId);
    }
    if (filter?.userId) {
      evs = evs.filter(e => e.userId === filter.userId);
    }
    if (filter?.eventType && filter.eventType !== 'ALL') {
      evs = evs.filter(e => e.eventType === filter.eventType);
    }
    if (filter?.actorType && filter.actorType !== 'ALL') {
      evs = evs.filter(e => e.actorType === filter.actorType);
    }
    if (filter?.limit) {
      evs = evs.slice(0, filter.limit);
    }
    return evs;
  }

  recordAuditEvent(params: {
    eventType: string;
    actor: string;
    actorType?: string;
    actorId?: string;
    agentId?: string;
    userId?: string;
    transactionId?: string;
    mandateId?: string;
    action?: string;
    previousState?: string;
    newState?: string;
    reason?: string;
    metadata?: Record<string, any>;
    eventData?: Record<string, any>;
  }) {
    const lastEvent = this.auditEvents[0]; // newest is first
    const previousHash = lastEvent?.eventHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const sequenceNumber = (lastEvent?.sequenceNumber || 0) + 1;
    const timestamp = new Date();

    const mergedData = {
      ...(params.eventData || {}),
      ...(params.metadata ? { metadata: params.metadata } : {}),
      actorType: params.actorType || (params.actor.toLowerCase().includes('agent') ? 'AGENT' : params.actor.toLowerCase().includes('user') ? 'USER' : 'SYSTEM'),
      actorId: params.actorId || params.actor,
      userId: params.userId || 'usr_demo_01',
      mandateId: params.mandateId || null,
      action: params.action || params.eventType,
      previousState: params.previousState || null,
      newState: params.newState || null,
      reason: params.reason || null,
    };

    const payload = JSON.stringify({
      sequenceNumber,
      eventType: params.eventType,
      actor: params.actor,
      agentId: params.agentId || null,
      transactionId: params.transactionId || null,
      timestamp: timestamp.toISOString(),
      eventData: mergedData,
      previousHash,
    });

    const eventHash = sha256(payload);

    const ev: MockAuditEvent = {
      id: `audit-${Date.now()}-${sequenceNumber}`,
      sequenceNumber,
      eventType: params.eventType,
      actor: params.actor,
      actorType: mergedData.actorType,
      actorId: mergedData.actorId,
      agentId: params.agentId || null,
      userId: mergedData.userId,
      transactionId: params.transactionId || null,
      mandateId: mergedData.mandateId,
      action: mergedData.action,
      previousState: mergedData.previousState,
      newState: mergedData.newState,
      reason: mergedData.reason,
      metadata: params.metadata || params.eventData || {},
      timestamp,
      eventData: JSON.stringify(mergedData),
      previousHash,
      eventHash,
      agent: params.agentId ? { name: this.agents.find(a => a.id === params.agentId || a.name === params.agentId)?.name || 'Unknown' } : undefined,
    };

    this.auditEvents.unshift(ev);
    return ev;
  }

  getTransactionTimeline(txId: string) {
    const tx = this.transactions.find(t => t.id === txId);
    if (!tx) return null;

    const baseTime = tx.createdAt ? new Date(tx.createdAt) : new Date();
    const formatTime = (d: Date) => d.toTimeString().split(' ')[0]; // e.g. "10:32:01"
    const addSecs = (secs: number) => new Date(baseTime.getTime() + secs * 1000);

    const isApproved = tx.decision === 'APPROVED';
    const isReview = tx.decision === 'REVIEW';
    const amountInr = (tx.amount / 100).toLocaleString('en-IN');

    const timeline = [
      {
        step: 1,
        time: formatTime(baseTime),
        timestamp: baseTime.toISOString(),
        title: `Agent requested ₹${amountInr}`,
        action: 'PAYMENT_REQUESTED',
        actor: tx.agent?.name || 'ShoppingAgent-01',
        actorType: 'AGENT',
        status: 'PASSED',
        latency: '+0ms',
        details: `Procurement request submitted for "${tx.product}" at ${tx.merchant}.`,
      },
      {
        step: 2,
        time: formatTime(addSecs(0)),
        timestamp: addSecs(0).toISOString(),
        title: 'Mandate verified',
        action: 'MANDATE_VERIFIED',
        actor: 'LEO Mandate Engine',
        actorType: 'SYSTEM',
        status: 'PASSED',
        latency: '+14ms',
        details: `Active envelope ${tx.mandateId || 'mnd_amazon_01'} validated with daily quota intact.`,
      },
      {
        step: 3,
        time: formatTime(addSecs(1)),
        timestamp: addSecs(1).toISOString(),
        title: 'Merchant verified',
        action: 'MERCHANT_VERIFIED',
        actor: 'LEO Whitelist Engine',
        actorType: 'SYSTEM',
        status: tx.decisionReasons?.includes('MERCHANT_NOT_IN_MANDATE') || tx.decisionReasons?.includes('MERCHANT_NOT_AUTHORIZED') ? 'FAILED' : 'PASSED',
        latency: '+28ms',
        details: `Merchant "${tx.merchant}" checked against mandate authorization directory.`,
      },
      {
        step: 4,
        time: formatTime(addSecs(1)),
        timestamp: addSecs(1).toISOString(),
        title: 'Amount limit verified',
        action: 'AMOUNT_VERIFIED',
        actor: 'LEO Ceiling Engine',
        actorType: 'SYSTEM',
        status: tx.decisionReasons?.includes('AMOUNT_EXCEEDS_SINGLE_LIMIT') || tx.decisionReasons?.includes('AMOUNT_LIMIT_EXCEEDED') ? 'FAILED' : 'PASSED',
        latency: '+41ms',
        details: `₹${amountInr} compared against per-transaction ceiling.`,
      },
      {
        step: 5,
        time: formatTime(addSecs(1)),
        timestamp: addSecs(1).toISOString(),
        title: isApproved ? 'Payment authorized' : isReview ? 'Approval required' : 'Payment blocked',
        action: isApproved ? 'PAYMENT_AUTHORIZED' : isReview ? 'APPROVAL_REQUESTED' : 'PAYMENT_BLOCKED',
        actor: 'LEO Deterministic Gateway',
        actorType: 'SYSTEM',
        status: isApproved ? 'PASSED' : isReview ? 'WARNING' : 'FAILED',
        latency: '+65ms',
        details: isApproved
          ? `All 11 verification bounds satisfied. Decision: APPROVED (Risk: ${tx.riskScore}/100).`
          : isReview
          ? `Amount exceeds threshold. Escalated to human supervisor review.`
          : `Deterministic rejection: ${(tx.decisionReasons ? JSON.parse(tx.decisionReasons) : ['POLICY_VIOLATION']).join(', ')}.`,
      },
      {
        step: 6,
        time: formatTime(addSecs(2)),
        timestamp: addSecs(2).toISOString(),
        title: isApproved ? 'Gateway accepted payment' : 'Gateway dispatch inhibited',
        action: isApproved ? 'GATEWAY_ACCEPTED' : 'GATEWAY_HALTED',
        actor: 'Razorpay Test Mode',
        actorType: 'GATEWAY',
        status: isApproved ? 'PASSED' : 'INFO',
        latency: '+140ms',
        details: isApproved
          ? `Razorpay Test Mode order created: ${tx.razorpayOrderId || 'order_TL_test_' + tx.id.slice(0, 8)}.`
          : 'Payment rail call inhibited. Blocked transactions never contact payment gateways.',
      },
      {
        step: 7,
        time: formatTime(addSecs(3)),
        timestamp: addSecs(3).toISOString(),
        title: isApproved ? 'Payment successful' : isReview ? 'Pending human approval' : 'Payment blocked',
        action: isApproved ? 'PAYMENT_SUCCESSFUL' : isReview ? 'PENDING_APPROVAL' : 'PAYMENT_TERMINATED',
        actor: 'LEO Settlement Registry',
        actorType: 'SYSTEM',
        status: isApproved ? 'PASSED' : isReview ? 'WARNING' : 'FAILED',
        latency: '+195ms',
        details: isApproved
          ? `Cryptographic receipt signed and appended to immutable SHA-256 ledger.`
          : isReview
          ? `Held in supervisory queue. Cannot proceed to payment rail until human signs off.`
          : `Transaction halted without financial impact.`,
      },
    ];

    return {
      transactionId: tx.id,
      decision: tx.decision,
      status: tx.status,
      amountInr,
      merchant: tx.merchant,
      timeline,
    };
  }

  getTransactionAttribution(txId: string) {
    const tx = this.transactions.find(t => t.id === txId);
    if (!tx) return null;

    const agent = this.agents.find(a => a.id === tx.agentId);
    const mandate = this.mandates.find(m => m.id === tx.mandateId);
    const approval = this.approvals.find(a => a.transactionId === tx.id);

    return {
      transactionId: tx.id,
      user: {
        id: 'usr_demo_01',
        name: 'Demo User (SecOps Lead)',
        role: 'ADMIN',
        email: 'alex@trustlayer.dev',
      },
      agent: {
        id: agent?.id || tx.agentId,
        name: agent?.name || 'ShoppingAgent-01',
        trustScore: agent?.trustScore || 94.0,
        status: agent?.status || 'ACTIVE',
      },
      instruction: tx.instruction || 'Find and procure office accessories matching approved budget',
      mandate: mandate ? {
        id: mandate.id,
        name: mandate.name,
        maxAmountPaise: mandate.maxAmount,
        maxAmountInr: mandate.maxAmount / 100,
        dailyLimitInr: mandate.dailyLimit / 100,
        spentTodayInr: (mandate.spentToday || 0) / 100,
        allowedMerchants: mandate.allowedMerchants,
        allowedCategories: mandate.allowedCategories,
        status: mandate.status,
      } : null,
      validationChecks: {
        totalChecks: 11,
        passedChecks: tx.decision === 'APPROVED' ? 11 : 9,
        failedChecks: tx.decision === 'APPROVED' ? 0 : 2,
        requiresApproval: tx.decision === 'REVIEW',
        summary: tx.decision === 'APPROVED' ? 'All bounds passed' : 'Policy threshold breach',
      },
      humanApproval: approval ? {
        id: approval.id,
        status: approval.status,
        amountInr: approval.amount / 100,
        reason: approval.reason,
        reviewedBy: approval.reviewedBy,
        reviewedAt: approval.reviewedAt,
      } : null,
      transaction: {
        id: tx.id,
        idempotencyKey: tx.idempotencyKey,
        amountPaise: tx.amount,
        amountInr: tx.amount / 100,
        currency: tx.currency,
        merchant: tx.merchant,
        product: tx.product,
        status: tx.status,
        createdAt: tx.createdAt,
      },
      paymentResult: {
        decision: tx.decision,
        status: tx.status,
        riskScore: tx.riskScore,
        razorpayOrderId: tx.razorpayOrderId,
        razorpayStatus: tx.razorpayStatus || (tx.decision === 'APPROVED' ? 'paid' : 'not_invoked'),
        message: tx.decision === 'APPROVED'
          ? 'Authorized and captured via Razorpay Test Mode'
          : tx.decision === 'REVIEW'
          ? 'Awaiting human authorization before payment dispatch'
          : 'Payment blocked by LEO. Gateway was never called.',
      },
    };
  }

  verifyAuditChain() {
    const ascending = [...this.auditEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';

    for (const ev of ascending) {
      if (ev.previousHash !== expectedPrev) {
        return {
          isValid: false,
          totalEvents: ascending.length,
          brokenAtSequence: ev.sequenceNumber,
          details: `Hash mismatch at sequence ${ev.sequenceNumber}. Expected ${expectedPrev}, found ${ev.previousHash}`,
        };
      }
      expectedPrev = ev.eventHash;
    }

    return {
      isValid: true,
      totalEvents: ascending.length,
    };
  }

  // --- APPROVALS ---
  getApprovals() {
    return this.approvals.filter(a => a.status === 'PENDING').map(a => ({
      ...a,
      transaction: this.transactions.find(t => t.id === a.transactionId),
    }));
  }

  getApprovalById(id: string) {
    const a = this.approvals.find(app => app.id === id);
    if (!a) return null;
    return {
      ...a,
      transaction: this.transactions.find(t => t.id === a.transactionId),
    };
  }

  createApproval(data: any) {
    const approval: MockApproval = {
      id: `approval-${Date.now()}`,
      transactionId: data.transactionId,
      agentId: data.agentId,
      amount: data.amount,
      merchant: data.merchant,
      status: 'PENDING',
      reason: data.reason,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
    };
    this.approvals.unshift(approval);
    return approval;
  }

  decideApproval(id: string, action: 'APPROVE' | 'REJECT', reviewer: string) {
    const approval = this.approvals.find(a => a.id === id);
    if (!approval) return null;

    approval.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    approval.reviewedBy = reviewer;
    approval.reviewedAt = new Date();

    const tx = this.transactions.find(t => t.id === approval.transactionId);
    if (tx) {
      if (action === 'APPROVE') {
        tx.decision = 'APPROVED';
        tx.status = 'COMPLETED';
        tx.razorpayOrderId = `order_TL_appr_${Date.now()}`;
        tx.razorpayStatus = 'created';
      } else {
        tx.decision = 'BLOCKED';
        tx.status = 'REJECTED';
      }
      tx.updatedAt = new Date();
    }

    return { approval, transaction: tx };
  }

  // --- DISPUTES ---
  getDisputes() {
    return this.disputes.map(d => {
      const tx = this.transactions.find(t => t.id === d.transactionId);
      return {
        ...d,
        dispute_id: d.id,
        transaction_id: d.transactionId,
        user_id: d.userId || 'usr_demo_01',
        agent_id: d.agentId,
        created_at: d.createdAt,
        reversal_id: d.reversalId || null,
        transaction: tx,
      };
    });
  }

  createDispute(data: { transactionId: string; reason?: string; userId?: string }) {
    const tx = this.transactions.find(t => t.id === data.transactionId);
    if (!tx) return null;

    const dispute: MockDispute = {
      id: `dsp_${Date.now()}`,
      transactionId: tx.id,
      agentId: tx.agentId,
      userId: data.userId || 'usr_demo_01',
      amount: tx.amount,
      reason: data.reason || 'Agent exceeded mandate',
      status: 'OPEN',
      resolution: null,
      reversalId: null,
      createdAt: new Date(),
      resolvedAt: null,
      transaction: tx,
    };

    const prevState = tx.status;
    tx.status = 'DISPUTED';
    tx.updatedAt = new Date();

    this.disputes.unshift(dispute);
    this.adjustTrust(tx.agentId, -10, 'USER_DISPUTE');

    // Emit 14-field audit event
    this.recordAuditEvent({
      eventType: 'PAYMENT_DISPUTED',
      actor: 'User/Cardholder',
      actorType: 'USER',
      actorId: data.userId || 'usr_demo_01',
      agentId: tx.agentId,
      userId: data.userId || 'usr_demo_01',
      transactionId: tx.id,
      mandateId: tx.mandateId || undefined,
      action: 'DISPUTE_FILED',
      previousState: prevState,
      newState: 'DISPUTED',
      reason: dispute.reason,
      metadata: {
        disputeId: dispute.id,
        amount: dispute.amount,
        merchant: tx.merchant,
      },
    });

    return {
      ...dispute,
      dispute_id: dispute.id,
      transaction_id: dispute.transactionId,
      user_id: dispute.userId,
      agent_id: dispute.agentId,
      created_at: dispute.createdAt,
      reversal_id: dispute.reversalId,
    };
  }

  reversePayment(disputeId: string) {
    const dispute = this.disputes.find(d => d.id === disputeId);
    if (!dispute) return null;

    const tx = this.transactions.find(t => t.id === dispute.transactionId);
    const reversalId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    // 1. Audit transition: REVERSAL_REQUESTED
    this.recordAuditEvent({
      eventType: 'REVERSAL_REQUESTED',
      actor: 'SecOps Gateway / User',
      actorType: 'SYSTEM',
      actorId: 'leo_settlement_reversal',
      agentId: dispute.agentId,
      userId: dispute.userId || 'usr_demo_01',
      transactionId: dispute.transactionId,
      mandateId: tx?.mandateId || undefined,
      action: 'REQUEST_REVERSAL',
      previousState: tx ? tx.status : 'DISPUTED',
      newState: 'REVERSAL_REQUESTED',
      reason: `Initiated payment reversal for disputed transaction: ${dispute.reason}`,
      metadata: {
        disputeId: dispute.id,
        amount: dispute.amount,
        reversalId,
      },
    });

    // 2. Final state: REVERSED
    if (tx) {
      tx.status = 'REVERSED';
      tx.updatedAt = now;
    }

    dispute.status = 'REVERSED';
    dispute.resolution = `Reversal completed: ₹${(dispute.amount / 100).toLocaleString('en-IN')} returned to customer`;
    dispute.reversalId = reversalId;
    dispute.resolvedAt = now;

    // 3. Audit transition: PAYMENT_REVERSED
    this.recordAuditEvent({
      eventType: 'PAYMENT_REVERSED',
      actor: 'LEO Settlement Registry',
      actorType: 'SYSTEM',
      actorId: 'leo_settlement_core',
      agentId: dispute.agentId,
      userId: dispute.userId || 'usr_demo_01',
      transactionId: dispute.transactionId,
      mandateId: tx?.mandateId || undefined,
      action: 'EXECUTE_REVERSAL',
      previousState: 'REVERSAL_REQUESTED',
      newState: 'REVERSED',
      reason: `Payment reversed successfully. ${dispute.resolution}`,
      metadata: {
        disputeId: dispute.id,
        reversalId,
        amountPaise: dispute.amount,
        amountInr: dispute.amount / 100,
        merchant: tx?.merchant,
        status: 'COMPLETED',
      },
    });

    return {
      dispute: {
        ...dispute,
        dispute_id: dispute.id,
        transaction_id: dispute.transactionId,
        user_id: dispute.userId,
        agent_id: dispute.agentId,
        created_at: dispute.createdAt,
        reversal_id: dispute.reversalId,
      },
      transaction: tx,
      reversalId,
      reversal_id: reversalId,
      status: 'COMPLETED',
      amountReturnedPaise: dispute.amount,
      amountReturnedInr: dispute.amount / 100,
      reason: dispute.reason,
    };
  }

  resolveDispute(id: string, resolution: string, isFraudConfirmed?: boolean) {
    const dispute = this.disputes.find(d => d.id === id);
    if (!dispute) return null;

    dispute.status = resolution === 'REFUND' ? 'REVERSED' : 'RESOLVED_REJECTED';
    dispute.resolution = resolution;
    dispute.resolvedAt = new Date();

    if (isFraudConfirmed) {
      this.adjustTrust(dispute.agentId, -20, 'CONFIRMED_FRAUD');
    }

    return {
      ...dispute,
      dispute_id: dispute.id,
      transaction_id: dispute.transactionId,
      user_id: dispute.userId,
      agent_id: dispute.agentId,
      created_at: dispute.createdAt,
      reversal_id: dispute.reversalId,
    };
  }
}

export const mockStore = new MockStore();
