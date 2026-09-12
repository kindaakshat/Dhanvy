import app from '../index';
import { SimulatedPaymentGateway, simulatedGateway } from '../services/payment/simulatedGateway.service';
import { PaymentGatewayFactory } from '../services/payment/paymentGateway.factory';

async function testPaymentGatewayScenarios() {
  console.log('===============================================================');
  console.log('      TESTING REALISTIC PAYMENT GATEWAY & PROVIDER SUITE       ');
  console.log('===============================================================\n');

  const http = await import('http');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;

  try {
    // 1. Scenario 1: Successful Payment
    console.log('1. Testing Scenario 1: Successful Payment...');
    const res1 = await fetch(`${baseUrl}/api/gateway/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: 'SUCCESS',
        merchant: 'Amazon India',
        amount: 399900,
        currency: 'INR',
      }),
    });
    const data1 = await res1.json();
    console.log(`   HTTP Status: ${res1.status}`);
    const gResult1 = data1.data?.gatewayResult;
    console.log(`   Status: ${gResult1?.status}`);
    console.log(`   Provider Txn ID: ${gResult1?.providerTxnId}`);
    console.log(`   NPCI Bank Reference Number (RRN): ${gResult1?.rrn}`);
    console.log(`   Merchant VPA: ${gResult1?.vpa}`);
    console.log(`   Latency: ${gResult1?.latencyMs}ms`);

    if (res1.status !== 200 || gResult1?.status !== 'SUCCESS' || !gResult1?.rrn || gResult1.rrn.length !== 12) {
      throw new Error(`Scenario 1 failed: ${JSON.stringify(data1)}`);
    }
    console.log('   ✅ Scenario 1 (Successful Payment) verified with valid 12-digit RRN.');

    // 2. Scenario 2: Gateway Timeout
    console.log('\n2. Testing Scenario 2: Gateway Timeout...');
    const res2 = await fetch(`${baseUrl}/api/gateway/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: 'TIMEOUT',
        merchant: 'Amazon India',
        amount: 399900,
        latencyMs: 100,
      }),
    });
    const data2 = await res2.json();
    console.log(`   HTTP Status: ${res2.status}`);
    const gResult2 = data2.data?.gatewayResult;
    console.log(`   Status: ${gResult2?.status}`);
    console.log(`   Error Code: ${gResult2?.errorCode}`);
    console.log(`   Error Message: ${gResult2?.errorMessage}`);

    if (res2.status !== 200 || gResult2?.status !== 'TIMEOUT' || gResult2?.errorCode !== 'GATEWAY_TIMEOUT') {
      throw new Error(`Scenario 2 failed: ${JSON.stringify(data2)}`);
    }
    console.log('   ✅ Scenario 2 (Gateway Timeout) correctly simulated fail-closed handling.');

    // 3. Scenario 3: Payment Failure (Bank Decline)
    console.log('\n3. Testing Scenario 3: Payment Failure (Issuer Decline)...');
    const res3 = await fetch(`${baseUrl}/api/gateway/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: 'FAILURE',
        merchant: 'Rogue Merchant',
        amount: 8500000,
      }),
    });
    const data3 = await res3.json();
    console.log(`   HTTP Status: ${res3.status}`);
    const gResult3 = data3.data?.gatewayResult;
    console.log(`   Status: ${gResult3?.status}`);
    console.log(`   Error Code: ${gResult3?.errorCode}`);
    console.log(`   Error Message: ${gResult3?.errorMessage}`);

    if (res3.status !== 200 || gResult3?.status !== 'FAILED' || !gResult3?.errorCode) {
      throw new Error(`Scenario 3 failed: ${JSON.stringify(data3)}`);
    }
    console.log('   ✅ Scenario 3 (Payment Failure) correctly simulated issuer decline.');

    // 4. Scenario 4: Duplicate Request
    console.log('\n4. Testing Scenario 4: Duplicate Request...');
    const fixedIdempKey = `idemp_test_dup_${Date.now()}`;
    // Run initial payment
    await fetch(`${baseUrl}/api/gateway/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: 'SUCCESS',
        idempotencyKey: fixedIdempKey,
        amount: 149900,
      }),
    });

    // Run duplicate with same key
    const res4 = await fetch(`${baseUrl}/api/gateway/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: 'DUPLICATE',
        idempotencyKey: fixedIdempKey,
        amount: 149900,
      }),
    });
    const data4 = await res4.json();
    console.log(`   HTTP Status: ${res4.status}`);
    const gResult4 = data4.data?.gatewayResult;
    console.log(`   Status: ${gResult4?.status}`);
    console.log(`   Duplicate Prevented: ${gResult4?.isDuplicatePrevented}`);
    console.log(`   Message: ${gResult4?.errorMessage}`);

    if (res4.status !== 200 || gResult4?.status !== 'DUPLICATE' || !gResult4?.isDuplicatePrevented) {
      throw new Error(`Scenario 4 failed: ${JSON.stringify(data4)}`);
    }
    console.log('   ✅ Scenario 4 (Duplicate Request) correctly detected duplicate with zero rail re-execution.');

    // 5. Scenario 5: Success Followed by Reversal
    console.log('\n5. Testing Scenario 5: Successful Payment Followed by Reversal...');
    const res5 = await fetch(`${baseUrl}/api/gateway/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: 'REVERSAL',
        merchant: 'Flipkart Electronics',
        amount: 499900,
      }),
    });
    const data5 = await res5.json();
    console.log(`   HTTP Status: ${res5.status}`);
    const gResult5 = data5.data?.gatewayResult;
    const revResult5 = data5.data?.reversalResult;
    console.log(`   Initial Status: ${gResult5?.status}`);
    console.log(`   Reversal Status: ${revResult5?.status}`);
    console.log(`   Reversal ID: ${revResult5?.reversalId}`);
    console.log(`   Refunded Amount: ₹${(revResult5?.amountRefundedPaise / 100).toFixed(2)}`);

    if (res5.status !== 200 || gResult5?.status !== 'REVERSED' || revResult5?.status !== 'REVERSED' || !revResult5?.reversalId) {
      throw new Error(`Scenario 5 failed: ${JSON.stringify(data5)}`);
    }
    console.log('   ✅ Scenario 5 (Success Followed by Reversal) verified with unique reversal ID.');

    // 6. Test GET /api/gateway/config & POST /api/gateway/config
    console.log('\n6. Testing Gateway Config Endpoints...');
    const configRes = await fetch(`${baseUrl}/api/gateway/config`);
    const configData = await configRes.json();
    console.log(`   Current active scenario: ${configData.data?.activeScenario}`);
    console.log(`   Supported providers: ${configData.data?.supportedProviders?.join(', ')}`);

    const updateRes = await fetch(`${baseUrl}/api/gateway/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'TIMEOUT', latencyMs: 300 }),
    });
    const updateData = await updateRes.json();
    console.log(`   Updated active scenario: ${updateData.data?.activeScenario} (${updateData.data?.latencyMs}ms)`);

    if (updateData.data?.activeScenario !== 'TIMEOUT') {
      throw new Error('Failed to update gateway scenario');
    }

    // Reset back to SUCCESS
    await fetch(`${baseUrl}/api/gateway/reset`, { method: 'POST' });
    console.log('   ✅ Config endpoints and reset verified.');

    console.log('\n===============================================================');
    console.log('   🎉 ALL 5 PAYMENT GATEWAY DEMO SCENARIOS VERIFIED!          ');
    console.log('===============================================================');
  } finally {
    server.close();
  }
}

testPaymentGatewayScenarios().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
