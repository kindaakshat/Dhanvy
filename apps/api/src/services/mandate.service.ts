import { prisma } from '../db';
import { mockStore } from '../mockStore';

export interface Mandate {
  id: string;
  userId?: string | null;
  agentId: string;
  name: string;
  merchant: string;
  allowedMerchants?: string | string[] | null;
  category: string;
  allowedCategories?: string | string[] | null;
  productPattern?: string | null;
  maxAmount: number; // in paise
  dailyLimit: number; // in paise
  spentToday: number; // in paise
  currency: string;
  validFrom: Date;
  validUntil: Date;
  approvalThreshold?: number | null; // in paise
  approvalRules?: string | null;
  status: string; // 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  createdAt?: Date;
  updatedAt?: Date;
  agent?: any;
}

export interface MachineReadableMandate {
  mandate_id: string;
  user_id: string;
  agent_id: string;
  name: string;
  maximum_transaction_amount: number; // paise
  maximum_transaction_amount_inr: number; // formatted INR
  daily_spending_limit: number; // paise
  daily_spending_limit_inr: number;
  spent_today: number;
  spent_today_inr: number;
  remaining_daily_limit: number;
  remaining_daily_limit_inr: number;
  currency: string;
  allowed_merchants: string[];
  allowed_scope: string[];
  product_pattern?: string | null;
  mandate_creation_time: string; // ISO 8601
  expiry_time: string; // ISO 8601
  mandate_status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  approval_requirements: {
    requires_approval_above: number | null;
    requires_approval_above_inr: number | null;
    currency: string;
    description: string;
  };
}

export interface MandateValidationResult {
  isValid: boolean;
  requiresHumanApproval: boolean;
  reasonCode?: string;
  triggerRule?: string;
  riskScore?: number;
  riskIndicators?: any[];
  message?: string;
  mandate?: Mandate;
  machineReadable?: MachineReadableMandate;
  checks: {
    mandateFound: boolean;
    mandateActive: boolean;
    currencyMatch: boolean;
    merchantAllowed: boolean;
    scopeAllowed: boolean;
    withinSingleLimit: boolean;
    withinDailyLimit: boolean;
    requiresApproval: boolean;
  };
  expectedLimit?: number;
  requestedAmount?: number;
  remainingDailyAllowance?: number;
}

/**
 * Normalizes allowed merchants into a string array.
 */
export function parseAllowedMerchants(mandate: Mandate): string[] {
  if (Array.isArray(mandate.allowedMerchants)) {
    return mandate.allowedMerchants;
  }
  if (typeof mandate.allowedMerchants === 'string' && mandate.allowedMerchants.trim() !== '') {
    try {
      const parsed = JSON.parse(mandate.allowedMerchants);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return mandate.allowedMerchants.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  if (mandate.merchant) {
    return mandate.merchant.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Normalizes allowed categories / scope into a string array.
 */
export function parseAllowedCategories(mandate: Mandate): string[] {
  if (Array.isArray(mandate.allowedCategories)) {
    return mandate.allowedCategories;
  }
  if (typeof mandate.allowedCategories === 'string' && mandate.allowedCategories.trim() !== '') {
    try {
      const parsed = JSON.parse(mandate.allowedCategories);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return mandate.allowedCategories.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  if (mandate.category) {
    return mandate.category.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Resolves current dynamic status ('ACTIVE', 'REVOKED', or 'EXPIRED').
 */
export function resolveMandateStatus(mandate: Mandate): 'ACTIVE' | 'EXPIRED' | 'REVOKED' {
  if (mandate.status === 'REVOKED') return 'REVOKED';
  const now = new Date();
  const validUntil = new Date(mandate.validUntil);
  if (now > validUntil) return 'EXPIRED';
  return 'ACTIVE';
}

/**
 * Converts a raw database or in-memory mandate into the strict machine-readable mandate protocol format.
 */
export function toMachineReadableMandate(mandate: Mandate): MachineReadableMandate {
  const allowedMerchants = parseAllowedMerchants(mandate);
  const allowedScope = parseAllowedCategories(mandate);
  const status = resolveMandateStatus(mandate);
  const remainingDaily = Math.max(0, mandate.dailyLimit - (mandate.spentToday || 0));

  return {
    mandate_id: mandate.id,
    user_id: mandate.userId || 'usr_demo_01',
    agent_id: mandate.agentId,
    name: mandate.name,
    maximum_transaction_amount: mandate.maxAmount,
    maximum_transaction_amount_inr: mandate.maxAmount / 100,
    daily_spending_limit: mandate.dailyLimit,
    daily_spending_limit_inr: mandate.dailyLimit / 100,
    spent_today: mandate.spentToday || 0,
    spent_today_inr: (mandate.spentToday || 0) / 100,
    remaining_daily_limit: remainingDaily,
    remaining_daily_limit_inr: remainingDaily / 100,
    currency: mandate.currency || 'INR',
    allowed_merchants: allowedMerchants,
    allowed_scope: allowedScope,
    product_pattern: mandate.productPattern || null,
    mandate_creation_time: mandate.createdAt ? new Date(mandate.createdAt).toISOString() : new Date().toISOString(),
    expiry_time: new Date(mandate.validUntil).toISOString(),
    mandate_status: status,
    approval_requirements: {
      requires_approval_above: mandate.approvalThreshold || null,
      requires_approval_above_inr: mandate.approvalThreshold ? mandate.approvalThreshold / 100 : null,
      currency: mandate.currency || 'INR',
      description: mandate.approvalThreshold
        ? `Transactions exceeding ₹${(mandate.approvalThreshold / 100).toLocaleString()} require supervisor approval`
        : 'No human approval required within mandate limits',
    },
  };
}

/**
 * REUSABLE PURE VALIDATION FUNCTION
 * Evaluates payment constraints deterministically against a mandate.
 * Independent of database or transport layers so other modules can depend directly on it.
 */
export function validatePaymentAgainstMandate(params: {
  mandate: Mandate;
  amount: number; // in paise
  merchant: string;
  category?: string;
  product?: string;
  currency?: string;
}): MandateValidationResult {
  const { mandate, amount, merchant } = params;
  const currency = params.currency || 'INR';
  const machineReadable = toMachineReadableMandate(mandate);

  const checks = {
    mandateFound: true,
    mandateActive: false,
    currencyMatch: false,
    merchantAllowed: false,
    scopeAllowed: false,
    withinSingleLimit: false,
    withinDailyLimit: false,
    requiresApproval: false,
  };

  // 1. Mandate Status & Validity Window
  if (mandate.status === 'REVOKED') {
    return {
      isValid: false,
      requiresHumanApproval: false,
      reasonCode: 'MANDATE_REVOKED',
      message: `Mandate "${mandate.name}" (${mandate.id}) has been revoked by the account administrator.`,
      mandate,
      machineReadable,
      checks,
    };
  }

  const now = new Date();
  if (now < new Date(mandate.validFrom) || now > new Date(mandate.validUntil)) {
    return {
      isValid: false,
      requiresHumanApproval: false,
      reasonCode: 'MANDATE_EXPIRED',
      message: `Mandate "${mandate.name}" expired on ${new Date(mandate.validUntil).toISOString()}. Payment rejected by temporal enforcement.`,
      mandate,
      machineReadable,
      checks,
    };
  }
  checks.mandateActive = true;

  // 2. Currency Enforcement
  if (mandate.currency && currency.toUpperCase() !== mandate.currency.toUpperCase()) {
    return {
      isValid: false,
      requiresHumanApproval: false,
      reasonCode: 'CURRENCY_MISMATCH',
      message: `Payment currency "${currency}" does not match mandate currency "${mandate.currency}".`,
      mandate,
      machineReadable,
      checks,
    };
  }
  checks.currencyMatch = true;

  // 3. Allowed Merchants Check (Multi-merchant support)
  const allowedMerchants = parseAllowedMerchants(mandate);
  const normalizedMerchant = merchant.trim().toLowerCase();
  const merchantAllowed = allowedMerchants.length === 0 || allowedMerchants.some((m) => {
    const target = m.trim().toLowerCase();
    return target === normalizedMerchant || normalizedMerchant.includes(target) || target.includes(normalizedMerchant);
  });

  if (!merchantAllowed) {
    return {
      isValid: false,
      requiresHumanApproval: false,
      reasonCode: 'MERCHANT_NOT_AUTHORIZED',
      message: `Merchant "${merchant}" is unauthorized. Allowed merchants under mandate: [${allowedMerchants.join(', ')}].`,
      mandate,
      machineReadable,
      checks,
    };
  }
  checks.merchantAllowed = true;

  // 4. Allowed Category & Scope Check
  const allowedScopes = parseAllowedCategories(mandate);
  if (params.category && allowedScopes.length > 0) {
    const normCategory = params.category.trim().toLowerCase();
    const scopeAllowed = allowedScopes.some((s) => {
      const target = s.trim().toLowerCase();
      return target === normCategory || normCategory.includes(target) || target.includes(normCategory);
    });

    if (!scopeAllowed) {
      return {
        isValid: false,
        requiresHumanApproval: false,
        reasonCode: 'CATEGORY_NOT_AUTHORIZED',
        message: `Category "${params.category}" is outside authorized scope: [${allowedScopes.join(', ')}].`,
        mandate,
        machineReadable,
        checks,
      };
    }
  }
  checks.scopeAllowed = true;

  // 5. Product Pattern Matching (Optional regex / pattern check)
  if (mandate.productPattern && params.product) {
    try {
      const regex = new RegExp(mandate.productPattern, 'i');
      if (!regex.test(params.product)) {
        return {
          isValid: false,
          requiresHumanApproval: false,
          reasonCode: 'PRODUCT_PATTERN_MISMATCH',
          message: `Product "${params.product}" does not match authorized pattern "${mandate.productPattern}".`,
          mandate,
          machineReadable,
          checks,
        };
      }
    } catch {
      // Ignore invalid regex in user pattern
    }
  }

  // 6. Single Transaction Ceiling Check
  if (amount > mandate.maxAmount) {
    return {
      isValid: false,
      requiresHumanApproval: false,
      reasonCode: 'AMOUNT_LIMIT_EXCEEDED',
      message: `Requested amount ₹${(amount / 100).toLocaleString()} exceeds maximum single transaction limit ₹${(mandate.maxAmount / 100).toLocaleString()}.`,
      expectedLimit: mandate.maxAmount,
      requestedAmount: amount,
      mandate,
      machineReadable,
      checks,
    };
  }
  checks.withinSingleLimit = true;

  // 7. Daily Cumulative Spending Cap Check
  const currentSpent = mandate.spentToday || 0;
  if (currentSpent + amount > mandate.dailyLimit) {
    return {
      isValid: false,
      requiresHumanApproval: false,
      reasonCode: 'DAILY_LIMIT_EXCEEDED',
      message: `Requested amount ₹${(amount / 100).toLocaleString()} pushes daily spend to ₹${((currentSpent + amount) / 100).toLocaleString()}, exceeding daily cap of ₹${(mandate.dailyLimit / 100).toLocaleString()}.`,
      expectedLimit: mandate.dailyLimit,
      requestedAmount: currentSpent + amount,
      remainingDailyAllowance: Math.max(0, mandate.dailyLimit - currentSpent),
      mandate,
      machineReadable,
      checks,
    };
  }
  checks.withinDailyLimit = true;

  // 8. Human Review Escalation Threshold Check
  let requiresHumanApproval = false;
  if (mandate.approvalThreshold && amount > mandate.approvalThreshold) {
    requiresHumanApproval = true;
    checks.requiresApproval = true;
    return {
      isValid: true,
      requiresHumanApproval: true,
      reasonCode: 'HUMAN_APPROVAL_REQUIRED',
      message: `Transaction amount ₹${(amount / 100).toLocaleString()} exceeds automatic authorization threshold ₹${(mandate.approvalThreshold / 100).toLocaleString()}. Human supervisor review required before settlement.`,
      expectedLimit: mandate.approvalThreshold,
      requestedAmount: amount,
      mandate,
      machineReadable,
      checks,
    };
  }

  return {
    isValid: true,
    requiresHumanApproval: false,
    mandate,
    machineReadable,
    checks,
  };
}

export class MandateService {
  /**
   * Evaluates proposed payment against mandate parameters.
   */
  static async validateMandate(params: {
    agentId: string;
    mandateId: string;
    merchant: string;
    category?: string;
    product?: string;
    amount: number; // in paise
    currency?: string;
  }): Promise<MandateValidationResult> {
    const emptyChecks = {
      mandateFound: false,
      mandateActive: false,
      currencyMatch: false,
      merchantAllowed: false,
      scopeAllowed: false,
      withinSingleLimit: false,
      withinDailyLimit: false,
      requiresApproval: false,
    };

    if (!params.mandateId || params.mandateId.trim() === '') {
      return {
        isValid: false,
        requiresHumanApproval: false,
        reasonCode: 'MANDATE_ID_REQUIRED',
        message: 'Every payment request must reference a valid mandate_id.',
        checks: emptyChecks,
      };
    }

    let mandate: Mandate | null = null;
    try {
      mandate = await prisma.mandate.findUnique({
        where: { id: params.mandateId },
      });
    } catch {
      // Fallback to mockStore
    }

    if (!mandate) {
      mandate = mockStore.getMandateById(params.mandateId) as any;
    }

    if (!mandate) {
      return {
        isValid: false,
        requiresHumanApproval: false,
        reasonCode: 'MANDATE_NOT_FOUND',
        message: `Mandate with ID "${params.mandateId}" does not exist in the TrustLayer registry.`,
        checks: emptyChecks,
      };
    }

    // Verify mandate belongs to requested agent
    if (params.agentId && mandate.agentId !== params.agentId) {
      return {
        isValid: false,
        requiresHumanApproval: false,
        reasonCode: 'MANDATE_AGENT_MISMATCH',
        message: `Mandate "${mandate.name}" belongs to agent "${mandate.agentId}", not "${params.agentId}".`,
        mandate,
        machineReadable: toMachineReadableMandate(mandate),
        checks: emptyChecks,
      };
    }

    return validatePaymentAgainstMandate({
      mandate,
      amount: params.amount,
      merchant: params.merchant,
      category: params.category,
      product: params.product,
      currency: params.currency,
    });
  }

  /**
   * Standalone validator by ID.
   */
  static async validateMandateById(
    mandateId: string,
    payment: {
      amount: number;
      merchant: string;
      category?: string;
      product?: string;
      currency?: string;
    }
  ): Promise<MandateValidationResult> {
    return this.validateMandate({
      agentId: '',
      mandateId,
      ...payment,
    });
  }

  /**
   * List mandates with filters.
   */
  static async listMandates(filter?: { agentId?: string; status?: string; userId?: string }): Promise<MachineReadableMandate[]> {
    try {
      const where: any = {};
      if (filter?.agentId) where.agentId = filter.agentId;
      if (filter?.status && filter.status !== 'ALL') where.status = filter.status;
      if (filter?.userId) where.userId = filter.userId;

      const mandates = await prisma.mandate.findMany({
        where,
        include: {
          agent: {
            select: { id: true, name: true, trustScore: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (mandates && mandates.length > 0) {
        return mandates.map((m) => toMachineReadableMandate(m as any));
      }
    } catch {
      // Fallback
    }

    return mockStore.getMandates(filter).map((m) => toMachineReadableMandate(m as any));
  }

  /**
   * Get single machine-readable mandate by ID.
   */
  static async getMandateById(id: string): Promise<MachineReadableMandate | null> {
    try {
      const mandate = await prisma.mandate.findUnique({
        where: { id },
        include: {
          agent: {
            select: { id: true, name: true, trustScore: true, status: true },
          },
        },
      });
      if (mandate) return toMachineReadableMandate(mandate as any);
    } catch {
      // Fallback
    }

    const mock = mockStore.getMandateById(id);
    return mock ? toMachineReadableMandate(mock as any) : null;
  }

  /**
   * Create a new machine-readable mandate.
   */
  static async createMandate(data: {
    agentId: string;
    userId?: string;
    name: string;
    merchant?: string;
    allowedMerchants?: string[];
    category?: string;
    allowedCategories?: string[];
    productPattern?: string;
    maxAmount: number;
    dailyLimit: number;
    currency?: string;
    validUntilDays?: number;
    validUntil?: Date | string;
    approvalThreshold?: number;
  }): Promise<MachineReadableMandate> {
    const now = new Date();
    const validUntil = data.validUntil
      ? new Date(data.validUntil)
      : new Date(now.getTime() + (data.validUntilDays || 30) * 24 * 60 * 60 * 1000);

    const merchantsList = data.allowedMerchants && data.allowedMerchants.length > 0
      ? data.allowedMerchants
      : [data.merchant || 'Amazon'];

    const categoriesList = data.allowedCategories && data.allowedCategories.length > 0
      ? data.allowedCategories
      : [data.category || 'General'];

    const primaryMerchant = data.merchant || merchantsList[0];
    const primaryCategory = data.category || categoriesList[0];

    try {
      const mandate = await prisma.mandate.create({
        data: {
          agentId: data.agentId,
          userId: data.userId || 'usr_demo_01',
          name: data.name,
          merchant: primaryMerchant,
          allowedMerchants: JSON.stringify(merchantsList),
          category: primaryCategory,
          allowedCategories: JSON.stringify(categoriesList),
          productPattern: data.productPattern || null,
          maxAmount: data.maxAmount,
          dailyLimit: data.dailyLimit,
          currency: data.currency || 'INR',
          validFrom: now,
          validUntil,
          approvalThreshold: data.approvalThreshold || null,
          status: 'ACTIVE',
        },
      });

      return toMachineReadableMandate(mandate as any);
    } catch {
      const mock = mockStore.createMandate({
        ...data,
        allowedMerchants: merchantsList,
        allowedCategories: categoriesList,
        validUntil,
      });
      return toMachineReadableMandate(mock as any);
    }
  }

  /**
   * Revoke a mandate.
   */
  static async revokeMandate(id: string): Promise<MachineReadableMandate | null> {
    try {
      const mandate = await prisma.mandate.update({
        where: { id },
        data: { status: 'REVOKED' },
      });
      return toMachineReadableMandate(mandate as any);
    } catch {
      const mock = mockStore.revokeMandate(id);
      return mock ? toMachineReadableMandate(mock as any) : null;
    }
  }

  /**
   * Extend mandate validity.
   */
  static async extendMandate(id: string, days: number = 30): Promise<MachineReadableMandate | null> {
    try {
      const existing = await prisma.mandate.findUnique({ where: { id } });
      if (!existing) throw new Error('Not found in DB');

      const base = new Date(existing.validUntil) > new Date() ? new Date(existing.validUntil) : new Date();
      const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

      const updated = await prisma.mandate.update({
        where: { id },
        data: {
          validUntil: newExpiry,
          status: 'ACTIVE',
        },
      });
      return toMachineReadableMandate(updated as any);
    } catch {
      const mock = mockStore.extendMandate(id, days);
      return mock ? toMachineReadableMandate(mock as any) : null;
    }
  }
}
