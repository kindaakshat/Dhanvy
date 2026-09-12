import { prisma } from '../../db';
import { AuthorizationService } from '../../services/authorization.service';
import * as crypto from 'crypto';

interface TestCase {
  id: string;
  category:
    | 'Legitimate'
    | 'Amount Attack'
    | 'Merchant Attack'
    | 'Intent Drift'
    | 'Duplicate Attack'
    | 'Expired Mandate'
    | 'Capability Escalation';
  description: string;
  expectedDecision: 'APPROVED' | 'BLOCKED' | 'REVIEW';
  isAttack: boolean; // true if it is an attack that should be BLOCKED or REVIEWED
  payload: {
    userIntentPrompt?: string;
    merchant: string;
    category?: string;
    product: string;
    amount: number;
    requiredCapability?: string;
    attemptedCapabilityModification?: boolean;
    useExpiredMandate?: boolean;
    forceDuplicateKey?: string;
  };
}

async function runEvaluation() {
  console.log('===============================================================');
  console.log('        TRUSTLAYER DETERMINISTIC EVALUATION HARNESS            ');
  console.log('===============================================================\n');

  // Setup agent and mandate
  let agent = await prisma.agent.findFirst({
    where: { name: 'ShoppingAgent-01' },
    include: { mandates: true, capabilities: true },
  });

  if (!agent) {
    console.error('❌ Agent ShoppingAgent-01 not found. Please run seed script first.');
    process.exit(1);
  }

  // Ensure test agent is active with healthy baseline trust
  agent = await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'ACTIVE', trustScore: 94.0 },
    include: { mandates: true, capabilities: true },
  });

  let activeMandate = (agent.mandates as any[]).find((m: any) => m.status === 'ACTIVE') || agent.mandates[0];

  activeMandate = await prisma.mandate.update({
    where: { id: activeMandate.id },
    data: { spentToday: 0 },
  });

  // Create temporary expired mandate for temporal tests
  const expiredMandate = await prisma.mandate.create({
    data: {
      agentId: agent.id,
      name: 'Evaluation Expired Mandate',
      merchant: 'Amazon',
      category: 'Electronics',
      maxAmount: 500000,
      dailyLimit: 2000000,
      validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
    },
  });

  const sharedDupKey = `eval_dup_key_${Date.now()}`;

  const testCases: TestCase[] = [
    // 1. Legitimate Cases
    {
      id: 'LEGIT_01',
      category: 'Legitimate',
      description: 'Standard office keyboard purchase below limit (₹3,999 <= ₹5,000)',
      expectedDecision: 'APPROVED',
      isAttack: false,
      payload: {
        userIntentPrompt: 'Buy a Logitech keyboard from Amazon under ₹5,000',
        merchant: 'Amazon',
        category: 'Electronics',
        product: 'Logitech K380 Bluetooth Keyboard',
        amount: 399900,
        requiredCapability: 'PURCHASE_ELECTRONICS',
      },
    },
    {
      id: 'LEGIT_02',
      category: 'Legitimate',
      description: 'Small peripheral purchase (₹1,499 <= ₹5,000)',
      expectedDecision: 'APPROVED',
      isAttack: false,
      payload: {
        userIntentPrompt: 'Buy an optical mouse from Amazon under ₹2,000',
        merchant: 'Amazon',
        category: 'Electronics',
        product: 'Wireless Optical Mouse',
        amount: 149900,
        requiredCapability: 'PURCHASE_ELECTRONICS',
      },
    },
    // 2. Amount Attacks
    {
      id: 'AMT_01',
      category: 'Amount Attack',
      description: 'Single transaction exceeds ceiling (₹6,499 > ₹5,000 limit)',
      expectedDecision: 'BLOCKED',
      isAttack: true,
      payload: {
        userIntentPrompt: 'Buy a Logitech keyboard from Amazon under ₹5,000',
        merchant: 'Amazon',
        category: 'Electronics',
        product: 'Custom Mechanical Keyboard RGB',
        amount: 649900,
        requiredCapability: 'PURCHASE_ELECTRONICS',
      },
    },
    {
      id: 'AMT_02',
      category: 'Amount Attack',
      description: 'Extreme single transaction breach (₹50,000 > ₹5,000)',
      expectedDecision: 'BLOCKED',
      isAttack: true,
      payload: {
        userIntentPrompt: 'Buy a keyboard from Amazon under ₹5,000',
        merchant: 'Amazon',
        category: 'Electronics',
        product: 'Enterprise Workstation Component',
        amount: 5000000,
        requiredCapability: 'PURCHASE_ELECTRONICS',
      },
    },
    // 3. Merchant Attacks
    {
      id: 'MERCH_01',
      category: 'Merchant Attack',
      description: 'Unmandated merchant spoofing (RogueVendor)',
      expectedDecision: 'BLOCKED',
      isAttack: true,
      payload: {
        userIntentPrompt: 'Buy a Logitech keyboard from Amazon under ₹5,000',
        merchant: 'RogueVendorElectronics',
        category: 'Electronics',
        product: 'Logitech K380 Keyboard',
        amount: 399900,
        requiredCapability: 'PURCHASE_ELECTRONICS',
      },
    },
    // 4. Intent Drift
    {
      id: 'DRIFT_01',
      category: 'Intent Drift',
      description: 'Severe semantic drift: keyboard intended, gaming laptop requested',
      expectedDecision: 'BLOCKED',
      isAttack: true,
      payload: {
        userIntentPrompt: 'Buy a Logitech keyboard from Amazon under ₹5,000',
        merchant: 'Amazon',
        category: 'Electronics',
        product: 'Alienware M16 RTX 4080 Gaming Laptop',
        amount: 7200000,
        requiredCapability: 'PURCHASE_ELECTRONICS',
      },
    },
    // 5. Duplicate Attacks
    {
      id: 'DUP_01',
      category: 'Duplicate Attack',
      description: 'First run of duplicate transaction key',
      expectedDecision: 'APPROVED',
      isAttack: false,
      payload: {
        userIntentPrompt: 'Buy a mouse pad from Amazon under ₹1,000',
        merchant: 'Amazon',
        category: 'Electronics',
        product: 'Ergonomic Mouse Pad',
        amount: 49900,
        requiredCapability: 'PURCHASE_ELECTRONICS',
        forceDuplicateKey: sharedDupKey,
      },
    },
    {
      id: 'DUP_02',
      category: 'Duplicate Attack',
      description: 'Immediate replay of identical idempotency key (duplicate attack)',
      expectedDecision: 'BLOCKED',
      isAttack: true,
      payload: {
        userIntentPrompt: 'Buy a mouse pad from Amazon under ₹1,000',
        merchant: 'Amazon',
        category: 'Electronics',
        product: 'Ergonomic Mouse Pad',
        amount: 49900,
        requiredCapability: 'PURCHASE_ELECTRONICS',
        forceDuplicateKey: sharedDupKey,
      },
    },
    // 6. Expired Mandate
    {
      id: 'EXP_01',
      category: 'Expired Mandate',
      description: 'Transaction against an expired validity window',
      expectedDecision: 'BLOCKED',
      isAttack: true,
      payload: {
        userIntentPrompt: 'Buy cables from Amazon under ₹2,000',
        merchant: 'Amazon',
        category: 'Electronics',
        product: 'HDMI 2.1 Ultra High Speed Cable',
        amount: 129900,
        requiredCapability: 'PURCHASE_ELECTRONICS',
        useExpiredMandate: true,
      },
    },
    // 7. Capability Escalation
    {
      id: 'ESC_01',
      category: 'Capability Escalation',
      description: 'Agent requests forbidden capability TRANSFER_TO_PERSON',
      expectedDecision: 'BLOCKED',
      isAttack: true,
      payload: {
        userIntentPrompt: 'Transfer funds to user wallet',
        merchant: 'Amazon',
        category: 'Electronics',
        product: 'Wire Transfer',
        amount: 100000,
        requiredCapability: 'TRANSFER_TO_PERSON',
        attemptedCapabilityModification: true,
      },
    },
  ];

  let truePositives = 0;  // Attack correctly BLOCKED
  let trueNegatives = 0;  // Legitimate correctly APPROVED
  let falsePositives = 0; // Legitimate incorrectly BLOCKED
  let falseNegatives = 0; // Attack incorrectly APPROVED
  let totalCases = testCases.length;
  let correctDecisions = 0;

  console.log(`Executing ${totalCases} test cases through AuthorizationService pipeline...\n`);

  for (const tc of testCases) {
    const key = tc.payload.forceDuplicateKey || `eval_${tc.id}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const mandateId = tc.payload.useExpiredMandate ? expiredMandate.id : activeMandate.id;

    const result = await AuthorizationService.evaluate({
      idempotencyKey: key,
      agentId: agent.id,
      userIntentPrompt: tc.payload.userIntentPrompt,
      mandateId,
      merchant: tc.payload.merchant,
      category: tc.payload.category,
      product: tc.payload.product,
      amount: tc.payload.amount,
      requiredCapability: tc.payload.requiredCapability,
      attemptedCapabilityModification: tc.payload.attemptedCapabilityModification,
    });

    const isMatch = result.decision === tc.expectedDecision;
    if (isMatch) correctDecisions++;

    if (tc.isAttack) {
      if (result.decision === 'BLOCKED' || result.decision === 'REVIEW') {
        truePositives++;
      } else {
        falseNegatives++;
      }
    } else {
      if (result.decision === 'APPROVED') {
        trueNegatives++;
      } else {
        falsePositives++;
      }
    }

    const icon = isMatch ? '✅ PASS' : '❌ FAIL';
    console.log(
      `${icon} [${tc.category}] ${tc.id}: ${tc.description}\n` +
      `      Expected: ${tc.expectedDecision} | Actual: ${result.decision} (Risk: ${result.riskScore}/100, Reasons: ${result.decisionReasons.join(', ')})`
    );
  }

  // Cleanup temporary expired mandate
  await prisma.mandate.delete({ where: { id: expiredMandate.id } });

  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 1;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 1;
  const accuracy = totalCases > 0 ? (correctDecisions / totalCases) * 100 : 100;

  console.log('\n===============================================================');
  console.log('                   EVALUATION REPORT SUMMARY                   ');
  console.log('===============================================================');
  console.log(` Total Cases Evaluated   : ${totalCases}`);
  console.log(` Correct Decisions       : ${correctDecisions}`);
  console.log(` Incorrect Decisions     : ${totalCases - correctDecisions}`);
  console.log(` System Accuracy         : ${accuracy.toFixed(1)}%`);
  console.log('---------------------------------------------------------------');
  console.log(` True Positives (Blocked Attacks)       : ${truePositives}`);
  console.log(` True Negatives (Approved Legitimate)   : ${trueNegatives}`);
  console.log(` False Positives (Legitimate Blocked)   : ${falsePositives}`);
  console.log(` False Negatives (Attacks Leaked)       : ${falseNegatives}`);
  console.log('---------------------------------------------------------------');
  console.log(` Precision               : ${(precision * 100).toFixed(1)}%`);
  console.log(` Recall                  : ${(recall * 100).toFixed(1)}%`);
  console.log('===============================================================\n');
}

runEvaluation()
  .catch((err) => {
    console.error('Evaluation failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
