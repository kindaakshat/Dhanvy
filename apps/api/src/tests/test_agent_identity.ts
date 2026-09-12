import app from '../index';
import { prisma } from '../db';
import { mockStore } from '../mockStore';

async function testAgentIdentitySuite() {
  console.log('===============================================================');
  console.log('       TESTING AGENT IDENTITY AND REGISTRATION SUITE           ');
  console.log('===============================================================\n');

  const http = await import('http');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;

  try {
    // 1. Register a new agent
    console.log('1. Testing Agent Registration (POST /api/agents)...');
    const regPayload = {
      name: `Test-Procure-Agent-${Date.now()}`,
      description: 'Autonomous test agent for supply chain validation',
      ownerId: 'usr_demo_01',
      permissions: ['PURCHASE_ELECTRONICS', 'CREATE_PAYMENT_ORDER', 'USE_RAZORPAY'],
    };

    const regRes = await fetch(`${baseUrl}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload),
    });

    const regData = await regRes.json();
    console.log(`   Registration HTTP Status: ${regRes.status}`);
    if (regRes.status !== 201 || !regData.data.agent_id) {
      throw new Error(`Failed to register agent: ${JSON.stringify(regData)}`);
    }

    const newAgent = regData.data;
    console.log(`   ✅ Agent registered: ${newAgent.agent_name} (ID: ${newAgent.agent_id})`);
    console.log(`   Owner: ${newAgent.owner_id} | Status: ${newAgent.status} | Trust: ${newAgent.trust_score}`);
    console.log(`   Permissions: [${newAgent.permissions.join(', ')}]`);

    // Verify first-class fields
    if (!newAgent.agent_id || !newAgent.agent_name || !newAgent.owner_id || !newAgent.permissions || !newAgent.created_at) {
      throw new Error('Missing first-class attributes on registered agent record');
    }

    // 2. Test verifyAgentIdentity middleware with missing agent identity
    console.log('\n2. Testing Middleware: Missing agent identity (POST /api/verify)...');
    const missingRes = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant: 'Amazon',
        amount: 250000,
      }),
    });
    const missingData = await missingRes.json();
    console.log(`   Missing agent HTTP Status: ${missingRes.status}`);
    if (missingRes.status !== 401 || missingData.error?.code !== 'AGENT_IDENTITY_REQUIRED') {
      throw new Error(`Expected 401 AGENT_IDENTITY_REQUIRED, got ${missingRes.status}: ${JSON.stringify(missingData)}`);
    }
    console.log(`   ✅ Correctly rejected with 401 AGENT_IDENTITY_REQUIRED`);

    // 3. Test verifyAgentIdentity middleware with unregistered agent
    console.log('\n3. Testing Middleware: Unregistered agent identity (POST /api/verify)...');
    const unregRes = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: 'unknown_agent_99999',
        merchant: 'Amazon',
        amount: 250000,
      }),
    });
    const unregData = await unregRes.json();
    console.log(`   Unregistered agent HTTP Status: ${unregRes.status}`);
    if (unregRes.status !== 404 || unregData.error?.code !== 'AGENT_NOT_FOUND') {
      throw new Error(`Expected 404 AGENT_NOT_FOUND, got ${unregRes.status}: ${JSON.stringify(unregData)}`);
    }
    console.log(`   ✅ Correctly rejected with 404 AGENT_NOT_FOUND`);

    // 4. Test payment request with ACTIVE agent
    console.log('\n4. Testing Middleware: Active agent (POST /api/verify)...');
    const activeRes = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: newAgent.agent_id,
        mandate_id: 'mnd_amazon_01',
        merchant: 'Amazon',
        product: 'Office Mouse',
        amount: 129900,
      }),
    });
    const activeData = await activeRes.json();
    console.log(`   Active agent HTTP Status: ${activeRes.status}`);
    if (activeRes.status !== 200) {
      throw new Error(`Expected 200 for active agent, got ${activeRes.status}: ${JSON.stringify(activeData)}`);
    }
    console.log(`   ✅ Active agent successfully processed by pre-payment engine`);

    // 5. Suspend the agent (PATCH /api/agents/:id/status -> SUSPENDED)
    console.log('\n5. Testing Suspend Agent (PATCH /api/agents/:id/status)...');
    const suspendRes = await fetch(`${baseUrl}/api/agents/${newAgent.agent_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SUSPENDED', reason: 'Administrative observation' }),
    });
    const suspendData = await suspendRes.json();
    console.log(`   Suspend HTTP Status: ${suspendRes.status}`);
    if (suspendRes.status !== 200 || suspendData.data.status !== 'SUSPENDED') {
      throw new Error(`Failed to suspend agent: ${JSON.stringify(suspendData)}`);
    }
    console.log(`   ✅ Agent status updated to SUSPENDED`);

    // 6. Test payment request with SUSPENDED agent -> MUST BE BLOCKED
    console.log('\n6. Testing Middleware: Payment request with SUSPENDED agent...');
    const suspPayRes = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: newAgent.agent_id,
        merchant: 'Amazon',
        amount: 129900,
      }),
    });
    const suspPayData = await suspPayRes.json();
    console.log(`   Suspended agent payment HTTP Status: ${suspPayRes.status}`);
    if (suspPayRes.status !== 403 || suspPayData.error?.code !== 'AGENT_SUSPENDED') {
      throw new Error(`Expected 403 AGENT_SUSPENDED, got ${suspPayRes.status}: ${JSON.stringify(suspPayData)}`);
    }
    console.log(`   ✅ Middleware strictly BLOCKED payment with 403 AGENT_SUSPENDED`);

    // 7. Revoke the agent (PATCH /api/agents/:id/status -> REVOKED)
    console.log('\n7. Testing Revoke Agent (PATCH /api/agents/:id/status)...');
    const revokeRes = await fetch(`${baseUrl}/api/agents/${newAgent.agent_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REVOKED', reason: 'Permanent cryptographic decommission' }),
    });
    const revokeData = await revokeRes.json();
    console.log(`   Revoke HTTP Status: ${revokeRes.status}`);
    if (revokeRes.status !== 200 || revokeData.data.status !== 'REVOKED') {
      throw new Error(`Failed to revoke agent: ${JSON.stringify(revokeData)}`);
    }
    console.log(`   ✅ Agent status updated to REVOKED`);

    // 8. Test payment request with REVOKED agent -> MUST BE PERMANENTLY BLOCKED
    console.log('\n8. Testing Middleware: Payment request with REVOKED agent...');
    const revPayRes = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: newAgent.agent_id,
        merchant: 'Amazon',
        amount: 129900,
      }),
    });
    const revPayData = await revPayRes.json();
    console.log(`   Revoked agent payment HTTP Status: ${revPayRes.status}`);
    if (revPayRes.status !== 403 || revPayData.error?.code !== 'AGENT_REVOKED') {
      throw new Error(`Expected 403 AGENT_REVOKED, got ${revPayRes.status}: ${JSON.stringify(revPayData)}`);
    }
    console.log(`   ✅ Middleware strictly BLOCKED payment with 403 AGENT_REVOKED`);

    // 9. Test Header-based authentication (x-agent-id)
    console.log('\n9. Testing Header-based authentication (x-agent-id)...');
    const headerPayRes = await fetch(`${baseUrl}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-id': 'agent_shop_01',
      },
      body: JSON.stringify({
        merchant: 'Amazon',
        mandate_id: 'mnd_amazon_01',
        amount: 129900,
      }),
    });
    const headerPayData = await headerPayRes.json();
    console.log(`   Header auth HTTP Status: ${headerPayRes.status}`);
    if (headerPayRes.status !== 200) {
      throw new Error(`Expected 200 with x-agent-id header, got ${headerPayRes.status}: ${JSON.stringify(headerPayData)}`);
    }
    console.log(`   ✅ x-agent-id header authentication verified successfully`);

    // 10. Test Agent Payments & Mandates sub-endpoints
    console.log('\n10. Testing Agent Payments & Mandates Endpoints...');
    const paymentsRes = await fetch(`${baseUrl}/api/agents/agent_shop_01/payments`);
    const paymentsData = await paymentsRes.json();
    console.log(`   GET /api/agents/agent_shop_01/payments: ${paymentsRes.status} (found ${paymentsData.data?.length} records)`);

    const mandatesRes = await fetch(`${baseUrl}/api/agents/agent_shop_01/mandates`);
    const mandatesData = await mandatesRes.json();
    console.log(`   GET /api/agents/agent_shop_01/mandates: ${mandatesRes.status} (found ${mandatesData.data?.length} mandates)`);

    if (paymentsRes.status !== 200 || mandatesRes.status !== 200) {
      throw new Error('Failed to retrieve agent payments or mandates');
    }
    console.log(`   ✅ Payment history and mandate assignments endpoints verified`);

    console.log('\n===============================================================');
    console.log('   🎉 ALL AGENT IDENTITY & REGISTRATION SUITE TESTS PASSED!   ');
    console.log('===============================================================');
  } finally {
    server.close();
  }
}

testAgentIdentitySuite().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
