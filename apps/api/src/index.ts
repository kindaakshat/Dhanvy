import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

import authorizeRouter from './routes/authorize.routes';
import agentsRouter from './routes/agents.routes';
import mandatesRouter from './routes/mandates.routes';
import transactionsRouter from './routes/transactions.routes';
import attackLabRouter from './routes/attackLab.routes';
import auditRouter from './routes/audit.routes';
import approvalsRouter from './routes/approvals.routes';
import disputesRouter from './routes/disputes.routes';
import statsRouter from './routes/stats.routes';
import webhooksRouter from './routes/webhooks.routes';
import verificationRouter from './routes/verification.routes';
import idempotencyRouter from './routes/idempotency.routes';
import agentRouter from './routes/agentActions.routes';
import gatewayRouter from './routes/gateway.routes';
import demoRouter from './routes/demo.routes';
import { authRouter } from './routes/auth.routes';
import { prisma } from './db';
import { ensureDatabaseSchema } from './services/schemaHealer';

// Auto-heal database schema on module load / startup
ensureDatabaseSchema(prisma).catch((err) => {
  console.warn('[TrustLayer API] Schema auto-heal encountered warning:', err);
});

const app = express();

// Security & Parsing
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request logger for development / security auditing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[TrustLayer API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Root gateway endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'LEO API Gateway',
    tagline: 'The control layer for autonomous payments.',
    corePositioning: 'AI agents can decide what to buy. LEO decides what they are actually allowed to pay for.',
    problemStatement: 'PS #10 Making Agentic Commerce Payments Reliable',
    status: 'OPERATIONAL',
    mode: 'RAZORPAY TEST MODE',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      stats: 'GET /api/stats',
      agents: 'GET /api/agents',
      mandates: 'GET /api/mandates',
      transactions: 'GET /api/transactions',
      attackLabPresets: 'GET /api/attack-lab/presets',
      attackLabSimulate: 'POST /api/attack-lab/simulate',
      auditTrail: 'GET /api/audit',
      auditVerify: 'GET /api/audit/verify',
      approvals: 'GET /api/approvals',
      disputes: 'GET /api/disputes',
      authorize: 'POST /api/authorize',
      parseIntent: 'POST /api/authorize/intents/parse',
      webhooks: 'POST /api/webhooks/razorpay',
    },
    documentation: 'https://github.com/kindaakshat/Dhanvy',
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OPERATIONAL',
    system: 'LEO Deterministic Authorization Engine',
    mode: 'RAZORPAY TEST MODE',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health/db-sync', async (req, res) => {
  try {
    await ensureDatabaseSchema(prisma);
    const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const usersCount = await prisma.user.count().catch(() => -1);
    res.json({
      success: true,
      tables: tables.map((t) => t.name),
      usersCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/authorize', authorizeRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/mandates', mandatesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/attack-lab', attackLabRouter);
app.use('/api/audit', auditRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/disputes', disputesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/verify', verificationRouter);
app.use('/api/payments', verificationRouter);
app.use('/api/idempotency', idempotencyRouter);
app.use('/api/agent', agentRouter);
app.use('/api/gateway', gatewayRouter);
app.use('/api/demo', demoRouter);

// One-time admin endpoint: seed missing capabilities for SubscriptionAgent-01
app.post('/api/admin/seed-sub-caps', async (req, res) => {
  try {

    const subCaps = [
      { capability: 'USE_SUBSCRIPTIONS', isAllowed: true },
      { capability: 'CREATE_PAYMENT_ORDER', isAllowed: true },
      { capability: 'USE_RAZORPAY', isAllowed: true },
      { capability: 'VIEW_PRODUCTS', isAllowed: true },
      { capability: 'TRANSFER_TO_PERSON', isAllowed: false },
      { capability: 'MODIFY_MANDATE', isAllowed: false },
      { capability: 'CREATE_MANDATE', isAllowed: false },
    ];
    const results = [];
    for (const cap of subCaps) {
      try {
        const created = await prisma.agentCapability.create({
          data: { agentId: 'agent_sub_01', capability: cap.capability, isAllowed: cap.isAllowed },
        });
        results.push({ status: 'created', capability: cap.capability });
      } catch (e: any) {
        if (e.code === 'P2002') {
          results.push({ status: 'already_exists', capability: cap.capability });
        } else {
          results.push({ status: 'error', capability: cap.capability, error: e.message });
        }
      }
    }
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Centralized error handler (Section 47)
app.use(errorHandler);


const port = config.port;
const isTestRun = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));
if (!isTestRun) {
  app.listen(port, () => {
    console.log(`🛡️  TrustLayer API Server running on port ${port}`);
    console.log(`💳  Razorpay Test Mode: ACTIVE`);
    console.log(`🔒  Cryptographic Audit Chain: ACTIVE`);
  });
}

export default app;