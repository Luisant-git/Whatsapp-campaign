/**
 * Helpers for the Meta lead / contact automation sequences.
 *
 * A sequence is the set of active MetaLeadAutomation rules that share the
 * same (targetType, campaignName, groupId) combination. Both the scheduled
 * cron and the "Proceed Next" webhook path must use exactly the same
 * grouping and ordering so that a click continues the same sequence the
 * scheduler would have continued.
 */

export interface AutomationRuleLike {
  id?: number;
  templateName: string;
  delayMinutes: number;
  targetType?: string | null;
  campaignName?: string | null;
  groupId?: number | null;
  isActive?: boolean;
  createdAt?: Date | string | number | null;
}

export function sortAutomationRules<T extends AutomationRuleLike>(rules: T[]): T[] {
  return [...rules].sort((a, b) => {
    const delayDiff = (a.delayMinutes ?? 0) - (b.delayMinutes ?? 0);
    if (delayDiff !== 0) return delayDiff;
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return (a.id ?? 0) - (b.id ?? 0);
  });
}

export function getAutomationSequenceKey(
  rule: Pick<AutomationRuleLike, 'targetType' | 'campaignName' | 'groupId'>,
): string {
  return `${rule.targetType || 'all'}_${rule.campaignName || 'all'}_${rule.groupId || 'all'}`;
}

/**
 * Group rules into sequences while ensuring deterministic rule ordering.
 *
 * Rules are ordered primarily by `delayMinutes: 'asc'`, with equal delays
 * deterministically tie-broken by authoritative configuration order
 * (`createdAt: 'asc'`, followed by `id: 'asc'`).
 */
export function groupAutomationRules<T extends AutomationRuleLike>(
  rules: T[],
): Map<string, T[]> {
  const sequences = new Map<string, T[]>();
  const sorted = sortAutomationRules(rules);

  for (const rule of sorted) {
    const key = getAutomationSequenceKey(rule);
    const existing = sequences.get(key);
    if (existing) {
      existing.push(rule);
    } else {
      sequences.set(key, [rule]);
    }
  }

  return sequences;
}

export function getActiveMetaCampaignNames<T extends AutomationRuleLike>(
  rules: T[],
): Set<string> {
  const names = new Set<string>();
  for (const rule of rules) {
    if (rule.isActive !== false && rule.targetType === 'meta_campaign') {
      const name = rule.campaignName ? String(rule.campaignName).trim() : '';
      if (name) {
        names.add(name);
      }
    }
  }
  return names;
}

/**
 * Determine the single sequence key a MetaLead belongs to under mutually exclusive partitioning.
 *
 * If the lead's campaignName matches an active meta_campaign sequence, it belongs exclusively
 * to that sequence. If campaignName is null, empty, or has no active meta_campaign rules,
 * it falls back to the 'all' sequence.
 */
export function getMetaLeadTargetSequenceKey(
  lead: { campaignName?: string | null },
  activeRules: AutomationRuleLike[],
): string {
  const leadCampaign = lead.campaignName ? String(lead.campaignName).trim() : '';
  const activeCampaigns = getActiveMetaCampaignNames(activeRules);

  if (leadCampaign && activeCampaigns.has(leadCampaign)) {
    return getAutomationSequenceKey({
      targetType: 'meta_campaign',
      campaignName: leadCampaign,
      groupId: null,
    });
  }

  return getAutomationSequenceKey({
    targetType: 'all',
    campaignName: null,
    groupId: null,
  });
}

/**
 * Check whether a lead is eligible for a specific sequence under the mutually exclusive partition.
 */
export function isMetaLeadEligibleForSequence(
  lead: { campaignName?: string | null },
  sequenceKey: string,
  activeRules: AutomationRuleLike[],
): boolean {
  return getMetaLeadTargetSequenceKey(lead, activeRules) === sequenceKey;
}

