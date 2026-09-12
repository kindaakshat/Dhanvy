import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuditService } from '../services/audit.service';
import { mockStore } from '../mockStore';

const router = Router();

// GET audit events with comprehensive filtering
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, agentId, transactionId, mandateId, userId, eventType, actorType } = req.query;

    const filterObj = {
      agentId: agentId as string,
      transactionId: transactionId as string,
      mandateId: mandateId as string,
      userId: userId as string,
      eventType: eventType as string,
      actorType: actorType as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
    };

    try {
      const where: any = {};
      if (agentId) where.agentId = agentId as string;
      if (transactionId) where.transactionId = transactionId as string;
      if (eventType && eventType !== 'ALL') where.eventType = eventType as string;

      const events = await prisma.auditEvent.findMany({
        where,
        orderBy: { sequenceNumber: 'desc' },
        take: filterObj.limit,
        include: {
          agent: { select: { name: true } },
        },
      });

      if (events && events.length > 0) {
        // Enrich events with parsed eventData attributes
        const enriched = events.map((ev) => {
          let parsed: any = {};
          try {
            parsed = JSON.parse(ev.eventData);
          } catch {
            parsed = {};
          }
          return {
            ...ev,
            actorType: parsed.actorType || (ev.actor.toLowerCase().includes('agent') ? 'AGENT' : ev.actor.toLowerCase().includes('user') ? 'USER' : 'SYSTEM'),
            actorId: parsed.actorId || ev.actor,
            userId: parsed.userId || 'usr_demo_01',
            mandateId: parsed.mandateId || null,
            action: parsed.action || ev.eventType,
            previousState: parsed.previousState || null,
            newState: parsed.newState || null,
            reason: parsed.reason || null,
            metadata: parsed.metadata || parsed,
          };
        });

        // Filter in memory for actorType, mandateId, userId if requested
        let filtered = enriched;
        if (mandateId) filtered = filtered.filter(e => e.mandateId === mandateId);
        if (userId) filtered = filtered.filter(e => e.userId === userId);
        if (actorType && actorType !== 'ALL') filtered = filtered.filter(e => e.actorType === actorType);

        return res.json({ success: true, data: filtered });
      }

      // If DB empty, fallback to mockStore
      const data = mockStore.getAuditEvents(filterObj);
      return res.json({ success: true, data });
    } catch (dbErr: any) {
      console.warn('[TrustLayer API] DB query failed in /api/audit, using mockStore:', dbErr.message);
      const data = mockStore.getAuditEvents(filterObj);
      return res.json({ success: true, data });
    }
  } catch (err) {
    next(err);
  }
});

// GET verify cryptographic hash chain
router.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const verification = await AuditService.verifyAuditChain();
    return res.json({
      success: true,
      data: verification,
    });
  } catch (err) {
    next(err);
  }
});

// GET high-resolution 7-step audit timeline for a transaction
router.get('/timeline/:transactionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transactionId } = req.params;
    const timelineData = await AuditService.getTransactionTimeline(transactionId);
    if (!timelineData) {
      return res.status(404).json({ success: false, error: 'Transaction timeline not found' });
    }
    return res.json({ success: true, data: timelineData });
  } catch (err) {
    next(err);
  }
});

// GET full 8-node attribution lineage for a transaction
router.get('/attribution/:transactionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transactionId } = req.params;
    const attributionData = await AuditService.getTransactionAttribution(transactionId);
    if (!attributionData) {
      return res.status(404).json({ success: false, error: 'Transaction attribution not found' });
    }
    return res.json({ success: true, data: attributionData });
  } catch (err) {
    next(err);
  }
});

export default router;
