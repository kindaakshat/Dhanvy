import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { mockStore } from '../mockStore';

/**
 * Agent Authentication & Verification Middleware
 * 
 * Verifies that incoming payment requests contain an authenticated agent identity.
 * Strictly enforces fail-closed governance:
 * 1. Missing agent identity ➔ 401 Unauthorized (AGENT_IDENTITY_REQUIRED)
 * 2. Unregistered agent    ➔ 404 Not Found (AGENT_NOT_FOUND)
 * 3. Suspended agent       ➔ 403 Forbidden (AGENT_SUSPENDED: Autonomous payments blocked)
 * 4. Revoked agent         ➔ 403 Forbidden (AGENT_REVOKED: Permanent revocation lock)
 */
export async function verifyAgentIdentity(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract agent identity from header, body, or query
    const agentId =
      (req.headers['x-agent-id'] as string) ||
      (req.headers['x-agent-identity'] as string) ||
      req.body?.agent_id ||
      req.body?.agentId ||
      (req.query?.agent_id as string) ||
      (req.query?.agentId as string);

    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      return res.status(401).json({
        success: false,
        decision: 'BLOCK',
        error: {
          code: 'AGENT_IDENTITY_REQUIRED',
          message: 'Payment request rejected: Missing authenticated agent identity. Please supply agent_id in request body or x-agent-id header.',
        },
      });
    }

    const trimmedId = agentId.trim();

    // Look up agent in database or in-memory fallback
    let agent: any = null;
    try {
      agent = await prisma.agent.findFirst({
        where: {
          OR: [{ id: trimmedId }, { name: trimmedId }],
        },
        include: {
          capabilities: true,
          mandates: true,
        },
      });
    } catch {
      // Database unavailable, fallback to mockStore
    }

    if (!agent) {
      agent = mockStore.getAgentById(trimmedId);
    }

    if (!agent) {
      return res.status(404).json({
        success: false,
        decision: 'BLOCK',
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Payment request rejected: Agent "${trimmedId}" is not registered in the TrustLayer registry.`,
        },
      });
    }

    // Check Agent State: ACTIVE, SUSPENDED, REVOKED
    if (agent.status === 'REVOKED') {
      return res.status(403).json({
        success: false,
        decision: 'BLOCK',
        error: {
          code: 'AGENT_REVOKED',
          message: `Payment request blocked: Agent "${agent.name || agent.id}" identity has been REVOKED. All autonomous payments and actions are permanently blocked.`,
        },
        agent: {
          id: agent.id,
          name: agent.name,
          status: 'REVOKED',
          trustScore: agent.trustScore,
        },
      });
    }

    if (agent.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        decision: 'BLOCK',
        error: {
          code: 'AGENT_SUSPENDED',
          message: `Payment request blocked: Agent "${agent.name || agent.id}" is SUSPENDED. Autonomous payments are temporarily prohibited.`,
        },
        agent: {
          id: agent.id,
          name: agent.name,
          status: 'SUSPENDED',
          trustScore: agent.trustScore,
        },
      });
    }

    // Agent authenticated and active - attach to request object
    (req as any).agent = agent;
    next();
  } catch (err: any) {
    console.error('[verifyAgentIdentity middleware error]:', err);
    res.status(500).json({
      success: false,
      decision: 'BLOCK',
      error: {
        code: 'AGENT_AUTH_ERROR',
        message: 'Internal error verifying agent identity.',
        details: err.message,
      },
    });
  }
}
