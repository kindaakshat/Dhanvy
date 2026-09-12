import { prisma } from '../db';
import { mockStore } from '../mockStore';

export interface CapabilityValidationResult {
  isValid: boolean;
  reasonCode?: string;
  message?: string;
}

export class CapabilityService {
  /**
   * Deterministically validates whether an agent has permissions to perform an operation.
   */
  static async validateCapability(params: {
    agentId: string;
    requiredCapability: string;
    attemptedCapabilityModification?: boolean;
  }): Promise<CapabilityValidationResult> {
    let agent: any = null;
    try {
      agent = await prisma.agent.findUnique({
        where: { id: params.agentId },
        include: { capabilities: true },
      });
    } catch {
      agent = mockStore.getAgentById(params.agentId);
    }
    if (!agent) {
      agent = mockStore.getAgentById(params.agentId);
    }

    if (!agent) {
      return {
        isValid: false,
        reasonCode: 'AGENT_NOT_FOUND',
        message: `Agent with ID ${params.agentId} was not found in TrustLayer registry.`,
      };
    }

    if (agent.status === 'SUSPENDED') {
      return {
        isValid: false,
        reasonCode: 'AGENT_SUSPENDED',
        message: `Agent ${agent.name} is currently SUSPENDED due to low trust score or policy infractions.`,
      };
    }

    // Privilege escalation check: agents cannot self-modify capabilities or mandates
    if (params.attemptedCapabilityModification) {
      return {
        isValid: false,
        reasonCode: 'PRIVILEGE_ESCALATION',
        message: 'Security Violation: Autonomous agents are strictly forbidden from modifying capabilities or mandate bounds.',
      };
    }

    // Find the capability
    const capRecord = ((agent.capabilities || []) as any[]).find(
      (c: any) => c.capability.toUpperCase() === params.requiredCapability.toUpperCase()
    );

    if (!capRecord) {
      return {
        isValid: false,
        reasonCode: 'CAPABILITY_MISSING',
        message: `Agent ${agent.name} lacks required capability ${params.requiredCapability}.`,
      };
    }

    if (!capRecord.isAllowed) {
      return {
        isValid: false,
        reasonCode: 'CAPABILITY_DISABLED',
        message: `Capability ${params.requiredCapability} is explicitly FORBIDDEN for agent ${agent.name}.`,
      };
    }

    return { isValid: true };
  }
}
