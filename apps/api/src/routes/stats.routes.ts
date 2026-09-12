import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { mockStore } from '../mockStore';
import { optionalAuth } from '../middleware/auth';

const router = Router();
router.use(optionalAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const isScoped = req.user && req.user.role !== 'ADMIN';
    const userId = req.user?.id;
    const txAgentWhere = isScoped ? { agent: { ownerId: userId } } : {};
    const agentWhere = isScoped ? { ownerId: userId } : {};
    const mandateWhere = isScoped ? { userId } : {};

    const [
      totalTxCount,
      authorizedTxCount,
      blockedTxCount,
      pendingApprovalTxCount,
      disputedTxCount,
      reversedTxCount,
      duplicatesPreventedCount,
      totalValueAgg,
      amountBlockedAgg,
      amountReversedAgg,
      activeAgentsCount,
      totalAgentsCount,
      activeMandatesCount,
      totalMandatesCount,
      agentAggregate,
      recentFeed,
    ] = await Promise.all([
      // 1. Total Transactions
      prisma.transaction.count({ where: txAgentWhere }),
      // 2. Authorized
      prisma.transaction.count({ where: { ...txAgentWhere, decision: 'APPROVED' } }),
      // 3. Blocked
      prisma.transaction.count({ where: { ...txAgentWhere, decision: 'BLOCKED' } }),
      // 4. Pending Approval
      prisma.transaction.count({
        where: {
          ...txAgentWhere,
          OR: [
            { decision: 'REVIEW' },
            { status: 'PENDING_APPROVAL' },
            { status: 'PENDING_HUMAN_APPROVAL' },
          ],
        },
      }),
      // 5. Disputed
      prisma.transaction.count({
        where: {
          ...txAgentWhere,
          OR: [
            { status: 'DISPUTED' },
            { dispute: { isNot: null } },
          ],
        },
      }),
      // 6. Reversed
      prisma.transaction.count({
        where: {
          ...txAgentWhere,
          OR: [
            { status: 'REVERSED' },
            { dispute: { status: 'REVERSED' } },
          ],
        },
      }),
      // 7. Duplicates Prevented
      prisma.transaction.count({
        where: {
          ...txAgentWhere,
          OR: [
            { duplicateCount: { gt: 0 } },
            { decisionReasons: { contains: 'DUPLICATE' } },
          ],
        },
      }),
      // 8. Total Transaction Value (sum of approved/settled transactions)
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          ...txAgentWhere,
          decision: 'APPROVED',
          status: { notIn: ['BLOCKED', 'REJECTED'] },
        },
      }),
      // 9. Amount Blocked (sum of blocked transactions)
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...txAgentWhere, decision: 'BLOCKED' },
      }),
      // 10. Amount Reversed (sum of reversed transactions)
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          ...txAgentWhere,
          OR: [
            { status: 'REVERSED' },
            { dispute: { status: 'REVERSED' } },
          ],
        },
      }),
      // 11. Active Agents
      prisma.agent.count({ where: { ...agentWhere, status: 'ACTIVE' } }),
      // 12. Total Agents
      prisma.agent.count({ where: agentWhere }),
      // 13. Active Mandates
      prisma.mandate.count({ where: { ...mandateWhere, status: 'ACTIVE' } }),
      // 14. Total Mandates
      prisma.mandate.count({ where: mandateWhere }),
      // 15. Agent Aggregate (average trust score)
      prisma.agent.aggregate({
        _avg: { trustScore: true },
        _count: { id: true },
        where: agentWhere,
      }),
      // 16. Recent Feed
      prisma.transaction.findMany({
        where: txAgentWhere,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: { select: { id: true, name: true, trustScore: true, status: true } },
          mandate: { select: { id: true, name: true, merchant: true, maxAmount: true, status: true } },
          dispute: true,
          approval: true,
        },
      }),
    ]);

    const averageTrustScore = agentAggregate._avg.trustScore
      ? Math.round(agentAggregate._avg.trustScore * 10) / 10
      : 100.0;

    const totalTransactionValue = totalValueAgg._sum.amount || 0;
    const amountBlocked = amountBlockedAgg._sum.amount || 0;
    const amountReversed = amountReversedAgg._sum.amount || 0;

    return res.json({
      success: true,
      isDemoData: true,
      dataSource: 'DATABASE_LIVE',
      metrics: {
        // Core counts required by user
        totalTransactions: totalTxCount,
        authorizedTransactions: authorizedTxCount,
        blockedTransactions: blockedTxCount,
        pendingApproval: pendingApprovalTxCount,
        disputedTransactions: disputedTxCount,
        reversedTransactions: reversedTxCount,
        duplicatesPrevented: duplicatesPreventedCount,

        // Financial & platform values required by user
        totalTransactionValue, // in paise
        amountBlocked,         // in paise
        amountReversed,        // in paise
        totalTransactionValueInr: Math.round(totalTransactionValue / 100),
        amountBlockedInr: Math.round(amountBlocked / 100),
        amountReversedInr: Math.round(amountReversed / 100),

        activeAgents: activeAgentsCount,
        totalAgents: totalAgentsCount,
        activeMandates: activeMandatesCount,
        totalMandates: totalMandatesCount,
        averageTrustScore,

        // Backward compatibility
        reviewQueue: pendingApprovalTxCount,
      },
      liveFeed: recentFeed,
    });
  } catch (err: any) {
    console.warn('[TrustLayer API] DB query failed in /api/stats, falling back to in-memory store:', err.message);
    return res.json(mockStore.getStats());
  }
});

export default router;
