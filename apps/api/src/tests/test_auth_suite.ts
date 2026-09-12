import app from '../index';
import { prisma } from '../db';
import bcrypt from 'bcryptjs';

interface TestStepResult {
  step: number;
  name: string;
  passed: boolean;
  details: string;
}

const testResults: TestStepResult[] = [];

function record(step: number, name: string, passed: boolean, details: string) {
  testResults.push({ step, name, passed, details });
  const badge = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge} [Step ${step.toString().padStart(2, '0')}] ${name}`);
  console.log(`         ${details}\n`);
}

async function runAuthTestSuite() {
  console.log('===============================================================');
  console.log('       LEO PLATFORM: COMPREHENSIVE AUTH & ISOLATION SUITE      ');
  console.log('===============================================================\n');

  const http = await import('http');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;

  const timestamp = Date.now();
  const aliceEmail = `alice_${timestamp}@dhanvy.dev`;
  const alicePassword = 'AlicePassword123!';
  const bobEmail = `bob_${timestamp}@dhanvy.dev`;
  const bobPassword = 'BobPassword123!';

  let aliceToken = '';
  let aliceId = '';
  let aliceAgentId = '';
  let aliceMandateId = '';

  let bobToken = '';
  let bobId = '';
  let bobAgentId = '';

  try {
    // -------------------------------------------------------------------------
    // STEP 1: User Registration creates real DB record with hashed password
    // -------------------------------------------------------------------------
    console.log('1. Testing User Registration (POST /api/auth/signup)...');
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice SecOps',
        email: aliceEmail,
        password: alicePassword,
      }),
    });

    const signupData = await signupRes.json();
    if (signupRes.status === 201 && signupData.success && signupData.data.token) {
      aliceToken = signupData.data.token;
      aliceId = signupData.data.user.id;

      // Verify DB record directly
      const dbUser = await prisma.user.findUnique({ where: { id: aliceId } });
      const isPlaintext = dbUser?.passwordHash === alicePassword;
      const isBcryptHash = dbUser?.passwordHash?.startsWith('$2') || false;
      const bcryptVerified = await bcrypt.compare(alicePassword, dbUser?.passwordHash || '');

      record(
        1,
        'User Registration & Server-Side Password Hashing',
        Boolean(dbUser && !isPlaintext && isBcryptHash && bcryptVerified && !('passwordHash' in signupData.data.user)),
        `User ${aliceEmail} created with bcrypt hash prefix ($2). Raw password NEVER stored. Hash omitted from API response.`
      );
    } else {
      record(1, 'User Registration & Server-Side Password Hashing', false, JSON.stringify(signupData));
    }

    // -------------------------------------------------------------------------
    // STEP 2: Automatic Starter Workspace Provisioning
    // -------------------------------------------------------------------------
    console.log('2. Verifying Automatic Starter Workspace Provisioning...');
    const userAgents = await prisma.agent.findMany({ where: { ownerId: aliceId } });
    const userMandates = await prisma.mandate.findMany({ where: { userId: aliceId } });

    if (userAgents.length > 0 && userMandates.length > 0) {
      aliceAgentId = userAgents[0].id;
      aliceMandateId = userMandates[0].id;
      record(
        2,
        'Starter Workspace Provisioning',
        true,
        `Provisioned starter agent [${userAgents[0].name}] (ID: ${aliceAgentId}) and mandate (ID: ${aliceMandateId}).`
      );
    } else {
      record(2, 'Starter Workspace Provisioning', false, `Agents: ${userAgents.length}, Mandates: ${userMandates.length}`);
    }

    // -------------------------------------------------------------------------
    // STEP 3: Protected Session Lookup (GET /api/auth/me)
    // -------------------------------------------------------------------------
    console.log('3. Testing Authenticated Session Validation (GET /api/auth/me)...');
    // Valid token
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const meData = await meRes.json();

    // Missing token
    const noAuthRes = await fetch(`${baseUrl}/api/auth/me`);
    const noAuthData = await noAuthRes.json();

    // Invalid token
    const badTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid_garbage_token_xyz' },
    });

    const step3Passed =
      meRes.status === 200 &&
      meData.data.user.email === aliceEmail &&
      noAuthRes.status === 401 &&
      badTokenRes.status === 401;

    record(
      3,
      'Protected Session Validation & Route Guarding',
      step3Passed,
      `Valid Bearer token returns 200. Missing token returns 401. Invalid token returns 401.`
    );

    // -------------------------------------------------------------------------
    // STEP 4: Login Authentication & Credential Verification
    // -------------------------------------------------------------------------
    console.log('4. Testing User Login (POST /api/auth/login)...');
    // Wrong password
    const badPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: aliceEmail, password: 'WrongPassword999!' }),
    });

    // Correct password
    const goodPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: aliceEmail, password: alicePassword }),
    });
    const goodPassData = await goodPassRes.json();

    const step4Passed =
      badPassRes.status === 401 &&
      goodPassRes.status === 200 &&
      Boolean(goodPassData.data?.token);

    record(
      4,
      'Login Authentication & Credential Verification',
      step4Passed,
      `Incorrect password rejected with 401. Valid password authenticated with 200 and new active session token.`
    );

    // -------------------------------------------------------------------------
    // STEP 5: Second User Registration (Bob) for Cross-Tenant Testing
    // -------------------------------------------------------------------------
    console.log('5. Registering Second User (Bob) for Multi-Tenancy Isolation...');
    const bobSignupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Finance',
        email: bobEmail,
        password: bobPassword,
      }),
    });
    const bobSignupData = await bobSignupRes.json();
    bobToken = bobSignupData.data.token;
    bobId = bobSignupData.data.user.id;

    const bobAgents = await prisma.agent.findMany({ where: { ownerId: bobId } });
    bobAgentId = bobAgents[0]?.id || '';

    record(
      5,
      'Second Tenant Registration',
      Boolean(bobToken && bobAgentId),
      `Bob registered (ID: ${bobId}) with isolated starter agent [${bobAgents[0]?.name}].`
    );

    // -------------------------------------------------------------------------
    // STEP 6: Cross-Tenant Agent Isolation
    // -------------------------------------------------------------------------
    console.log('6. Verifying Cross-Tenant Agent Isolation (Bob cannot view/modify Alice)...');
    // Bob tries to access Alice's agent
    const bobAccessAliceAgentRes = await fetch(`${baseUrl}/api/agents/${aliceAgentId}`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });

    // Bob tries to update Alice's agent status
    const bobModifyAliceAgentRes = await fetch(`${baseUrl}/api/agents/${aliceAgentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({ status: 'SUSPENDED', reason: 'Malicious unauthorized change' }),
    });

    const step6Passed =
      bobAccessAliceAgentRes.status === 403 &&
      bobModifyAliceAgentRes.status === 403;

    record(
      6,
      'Cross-Tenant Agent Ownership Enforcement',
      step6Passed,
      `Bob GET Alice Agent -> 403 Forbidden. Bob PATCH Alice Agent -> 403 Forbidden. Tenant boundaries strictly enforced.`
    );

    // -------------------------------------------------------------------------
    // STEP 7: Cross-Tenant Mandate Isolation
    // -------------------------------------------------------------------------
    console.log('7. Verifying Cross-Tenant Mandate Isolation (Bob cannot view/revoke Alice)...');
    // Bob tries to view Alice's mandate
    const bobAccessAliceMandateRes = await fetch(`${baseUrl}/api/mandates/${aliceMandateId}`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });

    // Bob tries to revoke Alice's mandate
    const bobRevokeAliceMandateRes = await fetch(`${baseUrl}/api/mandates/${aliceMandateId}/revoke`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({ reason: 'Malicious revocation attempt' }),
    });

    const step7Passed =
      bobAccessAliceMandateRes.status === 403 &&
      bobRevokeAliceMandateRes.status === 403;

    record(
      7,
      'Cross-Tenant Mandate Ownership Enforcement',
      step7Passed,
      `Bob GET Alice Mandate -> 403 Forbidden. Bob PATCH Revoke Alice Mandate -> 403 Forbidden.`
    );

    // -------------------------------------------------------------------------
    // STEP 8: Scoped Agent Lists per Authenticated User
    // -------------------------------------------------------------------------
    console.log('8. Verifying Scoped Fleet Listing per User...');
    const aliceFleetRes = await fetch(`${baseUrl}/api/agents`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const aliceFleet = await aliceFleetRes.json();

    const bobFleetRes = await fetch(`${baseUrl}/api/agents`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    const bobFleet = await bobFleetRes.json();

    const aliceHasBobAgent = aliceFleet.data.some((a: any) => a.id === bobAgentId);
    const bobHasAliceAgent = bobFleet.data.some((a: any) => a.id === aliceAgentId);

    const step8Passed = !aliceHasBobAgent && !bobHasAliceAgent;

    record(
      8,
      'Multi-Tenant Fleet Listing Isolation',
      step8Passed,
      `Alice sees ${aliceFleet.data.length} agents (0 from Bob). Bob sees ${bobFleet.data.length} agents (0 from Alice).`
    );

    // -------------------------------------------------------------------------
    // STEP 9: Password Reset Lifecycle
    // -------------------------------------------------------------------------
    console.log('9. Testing Password Reset Flow...');
    // Request reset
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: aliceEmail }),
    });
    const forgotData = await forgotRes.json();

    // Inspect reset token in database
    const aliceUserWithToken = await prisma.user.findUnique({ where: { email: aliceEmail } });
    const resetToken = aliceUserWithToken?.resetToken;

    let resetSuccess = false;
    if (resetToken) {
      const newAlicePassword = 'NewAlicePassword999!';
      const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          newPassword: newAlicePassword,
        }),
      });
      const resetData = await resetRes.json();

      // Test login with old password (should fail 401)
      const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: aliceEmail, password: alicePassword }),
      });

      // Test login with new password (should succeed 200)
      const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: aliceEmail, password: newAlicePassword }),
      });

      resetSuccess =
        resetRes.status === 200 &&
        oldLoginRes.status === 401 &&
        newLoginRes.status === 200;
    }

    record(
      9,
      'Password Reset Lifecycle (Forgot -> Reset -> Re-authenticate)',
      resetSuccess,
      `Reset token generated securely. Password updated and re-hashed. Old password rejected (401), new password authenticated (200).`
    );

    // -------------------------------------------------------------------------
    // STEP 10: Logout & Session Invalidation
    // -------------------------------------------------------------------------
    console.log('10. Testing Logout and Session Invalidation...');
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bobToken}` },
    });

    const verifyInvalidatedRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });

    const step10Passed = logoutRes.status === 200 && verifyInvalidatedRes.status === 401;

    record(
      10,
      'Logout & Session Invalidation',
      step10Passed,
      `Logout returned 200. Subsequent request with invalidated token immediately rejected with 401 Unauthorized.`
    );

    // -------------------------------------------------------------------------
    // STEP 11: Seeded Demo Account Authenticates Correctly
    // -------------------------------------------------------------------------
    console.log('11. Verifying Default Demo Account (demo@trustlayer.dev)...');
    const demoLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@trustlayer.dev',
        password: 'DemoPassword123!',
      }),
    });
    const demoData = await demoLoginRes.json();

    const step11Passed =
      demoLoginRes.status === 200 &&
      demoData.data.user.role === 'ADMIN' &&
      demoData.data.user.email === 'demo@trustlayer.dev';

    record(
      11,
      'Demo Account Preserved & Authenticates with Bcrypt',
      step11Passed,
      `Demo account authenticated successfully. Role: ${demoData.data?.user?.role}, ID: ${demoData.data?.user?.id}. Existing seed data intact.`
    );

  } finally {
    server.close();
  }

  // Summary
  console.log('===============================================================');
  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;
  console.log(`AUTH TEST RESULTS: ${passedCount}/${totalCount} PASSED (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('===============================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runAuthTestSuite().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
