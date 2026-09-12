import { prisma } from '../db';
import { mockStore } from '../mockStore';
import { AuditService } from './audit.service';

export type TransactionState =
  | 'CREATED'
  | 'VALIDATING'
  | 'PENDING_APPROVAL'
  | 'AUTHORIZED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'BLOCKED'
  | 'REVERSED';

export interface StateTransitionEvent {
  state: TransactionState;
  timestamp: string;
  reason?: string;
  actor?: string;
  metadata?: Record<string, any>;
}

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  action: 'PROCEED' | 'RETURN_ORIGINAL' | 'BLOCK_DUPLICATE' | 'IN_FLIGHT_WAIT' | 'RETRY_ALLOWED';
  existingTransaction: any | null;
  idempotencyStatus: 'FRESH_TRANSACTION' | 'DUPLICATE_DETECTED' | 'ORIGINAL_TRANSACTION_RETURNED' | 'IN_PROCESSING' | 'RETRYABLE_FAILED';
  attemptNumber: number;
  message: string;
  stateHistory: StateTransitionEvent[];
  cachedResponse?: any;
}

export class IdempotencyService {
  /**
   * Look up transaction by idempotency key across DB and mockStore
   */
  static async findByKey(idempotencyKey: string): Promise<any | null> {
    if (!idempotencyKey) return null;
    let tx: any = null;
    try {
      tx = await prisma.transaction.findUnique({
        where: { idempotencyKey },
        include: { agent: true, mandate: true },
      });
    } catch {
      // Fallback
    }

    if (!tx) {
      tx = mockStore.getTransactions().find((t) => t.idempotencyKey === idempotencyKey) || null;
    }

    return tx;
  }

  /**
   * Parse state history JSON safely
   */
  static parseHistory(rawHistory?: string | null): StateTransitionEvent[] {
    if (!rawHistory) return [];
    try {
      const parsed = JSON.parse(rawHistory);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Evaluate incoming payment request against the idempotency state machine
   */
  static async evaluateIdempotency(idempotencyKey: string): Promise<IdempotencyCheckResult> {
    const existingTx = await this.findByKey(idempotencyKey);

    if (!existingTx) {
      return {
        isDuplicate: false,
        action: 'PROCEED',
        existingTransaction: null,
        idempotencyStatus: 'FRESH_TRANSACTION',
        attemptNumber: 1,
        message: 'Unique idempotency key verified. Proceeding with deterministic validation.',
        stateHistory: [],
      };
    }

    const currentAttempts = (existingTx.attempts || 1) + 1;
    const history = this.parseHistory(existingTx.stateHistory);
    const status = existingTx.status?.toUpperCase() || 'SUCCESS';

    // 1. If it has already succeeded (SUCCESS or legacy COMPLETED)
    if (status === 'SUCCESS' || status === 'COMPLETED') {
      await this.recordDuplicateAttempt(existingTx, currentAttempts);

      let cachedRes: any = null;
      if (existingTx.idempotentResponse) {
        try {
          cachedRes = JSON.parse(existingTx.idempotentResponse);
        } catch {
          // Ignore
        }
      }

      // Attempt 2: DUPLICATE DETECTED
      if (currentAttempts === 2) {
        return {
          isDuplicate: true,
          action: 'BLOCK_DUPLICATE',
          existingTransaction: existingTx,
          idempotencyStatus: 'DUPLICATE_DETECTED',
          attemptNumber: currentAttempts,
          message: 'Duplicate payment prevented. Key already processed.',
          stateHistory: history,
          cachedResponse: cachedRes,
        };
      }

      // Attempt 3+: ORIGINAL TRANSACTION RETURNED
      return {
        isDuplicate: true,
        action: 'RETURN_ORIGINAL',
        existingTransaction: existingTx,
        idempotencyStatus: 'ORIGINAL_TRANSACTION_RETURNED',
        attemptNumber: currentAttempts,
        message: 'Duplicate payment prevented. Original transaction returned.',
        stateHistory: history,
        cachedResponse: cachedRes,
      };
    }

    // 2. If it is currently processing (PROCESSING or VALIDATING)
    if (status === 'PROCESSING' || status === 'VALIDATING') {
      return {
        isDuplicate: true,
        action: 'IN_FLIGHT_WAIT',
        existingTransaction: existingTx,
        idempotencyStatus: 'IN_PROCESSING',
        attemptNumber: currentAttempts,
        message: 'Duplicate payment prevented. Payment is currently in-flight on settlement rail.',
        stateHistory: history,
      };
    }

    // 3. If it previously failed in a retryable state (FAILED)
    if (status === 'FAILED') {
      return {
        isDuplicate: true,
        action: 'RETRY_ALLOWED',
        existingTransaction: existingTx,
        idempotencyStatus: 'RETRYABLE_FAILED',
        attemptNumber: currentAttempts,
        message: 'Previous transaction attempt failed in retryable state. Safe re-attempt permitted.',
        stateHistory: history,
      };
    }

    // 4. If previously BLOCKED by policy
    return {
      isDuplicate: true,
      action: 'BLOCK_DUPLICATE',
      existingTransaction: existingTx,
      idempotencyStatus: 'DUPLICATE_DETECTED',
      attemptNumber: currentAttempts,
      message: 'Duplicate payment prevented. Original request was rejected by policy bounds.',
      stateHistory: history,
    };
  }

  /**
   * Record a duplicate attempt and update metadata
   */
  static async recordDuplicateAttempt(existingTx: any, nextAttemptNumber: number): Promise<void> {
    const now = new Date();
    const history = this.parseHistory(existingTx.stateHistory);
    history.push({
      state: existingTx.status as TransactionState,
      timestamp: now.toISOString(),
      reason: `Duplicate replay attempt #${nextAttemptNumber} received and prevented.`,
      actor: 'TrustLayer Idempotency Engine',
    });

    const newHistoryJson = JSON.stringify(history);
    const newDuplicateCount = (existingTx.duplicateCount || 0) + 1;

    try {
      await prisma.transaction.update({
        where: { id: existingTx.id },
        data: {
          attempts: nextAttemptNumber,
          duplicateCount: newDuplicateCount,
          lastAttemptAt: now,
          stateHistory: newHistoryJson,
        },
      });
    } catch {
      // MockStore update
      mockStore.updateTransaction(existingTx.id, {
        attempts: nextAttemptNumber,
        duplicateCount: newDuplicateCount,
        lastAttemptAt: now,
        stateHistory: newHistoryJson,
      });
    }

    // Write audit event
    await AuditService.recordEvent({
      eventType: 'DUPLICATE_PAYMENT_PREVENTED',
      actor: 'TrustLayer Idempotency Engine',
      agentId: existingTx.agentId,
      transactionId: existingTx.id,
      eventData: {
        idempotencyKey: existingTx.idempotencyKey,
        attemptNumber: nextAttemptNumber,
        duplicateCount: newDuplicateCount,
        originalAmount: existingTx.amount,
        merchant: existingTx.merchant,
        message: 'Duplicate payment prevented. Zero payment rail leakage.',
      },
    });
  }

  /**
   * Transition a transaction's state in database
   */
  static async transitionState(
    transactionId: string,
    newState: TransactionState,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    const now = new Date();
    let tx: any = await prisma.transaction.findUnique({ where: { id: transactionId } }).catch(() => null);
    if (!tx) {
      tx = mockStore.getTransactions().find((t) => t.id === transactionId) || null;
    }
    if (!tx) return null;

    const history = this.parseHistory(tx.stateHistory);
    history.push({
      state: newState,
      timestamp: now.toISOString(),
      reason,
      actor: 'TrustLayer State Machine',
      metadata,
    });

    const updateData = {
      status: newState,
      stateHistory: JSON.stringify(history),
      updatedAt: now,
    };

    try {
      return await prisma.transaction.update({
        where: { id: transactionId },
        data: updateData,
      });
    } catch {
      return mockStore.updateTransaction(transactionId, updateData);
    }
  }

  /**
   * Cache canonical authorization response JSON
   */
  static async cacheCanonicalResponse(transactionId: string, response: any): Promise<void> {
    const serialized = JSON.stringify(response);
    try {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { idempotentResponse: serialized },
      });
    } catch {
      mockStore.updateTransaction(transactionId, { idempotentResponse: serialized });
    }
  }
}
