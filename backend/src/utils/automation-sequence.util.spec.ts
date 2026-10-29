import {
  getAutomationSequenceKey,
  groupAutomationRules,
  getActiveMetaCampaignNames,
  getMetaLeadTargetSequenceKey,
  isMetaLeadEligibleForSequence,
} from './automation-sequence.util';

describe('automation sequence helpers', () => {
  it('builds the same sequence keys the cron uses', () => {
    expect(
      getAutomationSequenceKey({
        targetType: 'contact_group',
        campaignName: null,
        groupId: 7,
      }),
    ).toBe('contact_group_all_7');

    expect(
      getAutomationSequenceKey({
        targetType: 'meta_campaign',
        campaignName: 'Diwali',
        groupId: null,
      }),
    ).toBe('meta_campaign_Diwali_all');

    expect(
      getAutomationSequenceKey({
        targetType: 'all',
        campaignName: null,
        groupId: null,
      }),
    ).toBe('all_all_all');
  });

  it('groups rules by sequence while preserving delay order', () => {
    const rules = [
      { templateName: 'first', delayMinutes: 0, targetType: 'contact_group', groupId: 1 },
      { templateName: 'other', delayMinutes: 5, targetType: 'all' },
      { templateName: 'second', delayMinutes: 10, targetType: 'contact_group', groupId: 1 },
      { templateName: 'third', delayMinutes: 15, targetType: 'contact_group', groupId: 1 },
    ];

    const sequences = groupAutomationRules(rules);

    expect([...sequences.keys()]).toEqual(['contact_group_all_1', 'all_all_all']);
    expect(sequences.get('contact_group_all_1')?.map((r) => r.templateName)).toEqual([
      'first',
      'second',
      'third',
    ]);
    expect(sequences.get('all_all_all')?.map((r) => r.templateName)).toEqual([
      'other',
    ]);
  });

  describe('mutually exclusive MetaLead sequence partitioning', () => {
    const activeRules = [
      { templateName: 'diwali_1', delayMinutes: 0, targetType: 'meta_campaign', campaignName: 'Diwali', isActive: true },
      { templateName: 'diwali_2', delayMinutes: 5, targetType: 'meta_campaign', campaignName: 'Diwali', isActive: true },
      { templateName: 'summer_1', delayMinutes: 0, targetType: 'meta_campaign', campaignName: 'SummerSale', isActive: true },
      { templateName: 'inactive_1', delayMinutes: 0, targetType: 'meta_campaign', campaignName: 'OldPromo', isActive: false },
      { templateName: 'all_1', delayMinutes: 0, targetType: 'all', isActive: true },
      { templateName: 'all_2', delayMinutes: 10, targetType: 'all', isActive: true },
    ];

    it('extracts active trimmed campaign names correctly and ignores inactive rules', () => {
      const names = getActiveMetaCampaignNames(activeRules);
      expect(names.has('Diwali')).toBe(true);
      expect(names.has('SummerSale')).toBe(true);
      expect(names.has('OldPromo')).toBe(false);
      expect(names.size).toBe(2);
    });

    it('routes a lead with an active campaign exclusively to that campaign sequence', () => {
      const lead = { campaignName: 'Diwali' };
      const key = getMetaLeadTargetSequenceKey(lead, activeRules);
      expect(key).toBe('meta_campaign_Diwali_all');

      expect(isMetaLeadEligibleForSequence(lead, 'meta_campaign_Diwali_all', activeRules)).toBe(true);
      expect(isMetaLeadEligibleForSequence(lead, 'all_all_all', activeRules)).toBe(false);
      expect(isMetaLeadEligibleForSequence(lead, 'meta_campaign_SummerSale_all', activeRules)).toBe(false);
    });

    it('falls back to all_all_all when lead campaignName has no active matching sequence', () => {
      const lead = { campaignName: 'UnmappedCampaign' };
      const key = getMetaLeadTargetSequenceKey(lead, activeRules);
      expect(key).toBe('all_all_all');

      expect(isMetaLeadEligibleForSequence(lead, 'all_all_all', activeRules)).toBe(true);
      expect(isMetaLeadEligibleForSequence(lead, 'meta_campaign_UnmappedCampaign_all', activeRules)).toBe(false);
    });

    it('falls back to all_all_all when lead campaignName matches an inactive sequence', () => {
      const lead = { campaignName: 'OldPromo' };
      const key = getMetaLeadTargetSequenceKey(lead, activeRules);
      expect(key).toBe('all_all_all');

      expect(isMetaLeadEligibleForSequence(lead, 'all_all_all', activeRules)).toBe(true);
      expect(isMetaLeadEligibleForSequence(lead, 'meta_campaign_OldPromo_all', activeRules)).toBe(false);
    });

    it('falls back to all_all_all when lead campaignName is null, undefined, or empty whitespace', () => {
      expect(getMetaLeadTargetSequenceKey({ campaignName: null }, activeRules)).toBe('all_all_all');
      expect(getMetaLeadTargetSequenceKey({ campaignName: undefined }, activeRules)).toBe('all_all_all');
      expect(getMetaLeadTargetSequenceKey({ campaignName: '   ' }, activeRules)).toBe('all_all_all');

      expect(isMetaLeadEligibleForSequence({ campaignName: null }, 'all_all_all', activeRules)).toBe(true);
      expect(isMetaLeadEligibleForSequence({ campaignName: '   ' }, 'all_all_all', activeRules)).toBe(true);
    });

    it('guarantees mutual exclusivity: any given lead is eligible for exactly one sequence', () => {
      const leads = [
        { campaignName: 'Diwali' },
        { campaignName: 'SummerSale' },
        { campaignName: 'OtherCampaign' },
        { campaignName: null },
      ];

      const allSequenceKeys = [
        'meta_campaign_Diwali_all',
        'meta_campaign_SummerSale_all',
        'all_all_all',
      ];

      for (const lead of leads) {
        const eligibleKeys = allSequenceKeys.filter((key) =>
          isMetaLeadEligibleForSequence(lead, key, activeRules),
        );
        expect(eligibleKeys).toHaveLength(1);
      }
    });
  });

  describe('deterministic template ordering with equal delays', () => {
    it('preserves exact configured template order when delayMinutes are equal using createdAt and id', () => {
      const now = Date.now();
      const rules = [
        // Rule B has equal delay but was created earlier
        {
          id: 102,
          templateName: 'step_2_created_second',
          delayMinutes: 0,
          targetType: 'all',
          createdAt: new Date(now + 1000),
        },
        {
          id: 101,
          templateName: 'step_1_created_first',
          delayMinutes: 0,
          targetType: 'all',
          createdAt: new Date(now),
        },
        // Rule C has delay 5
        {
          id: 103,
          templateName: 'step_3_delayed_5m',
          delayMinutes: 5,
          targetType: 'all',
          createdAt: new Date(now + 2000),
        },
        // Rule D & E both have delay 10 and identical createdAt; tie-broken deterministically by id
        {
          id: 105,
          templateName: 'step_5_id_105',
          delayMinutes: 10,
          targetType: 'all',
          createdAt: new Date(now + 5000),
        },
        {
          id: 104,
          templateName: 'step_4_id_104',
          delayMinutes: 10,
          targetType: 'all',
          createdAt: new Date(now + 5000),
        },
      ];

      const sequences = groupAutomationRules(rules);
      const sequence = sequences.get('all_all_all');

      expect(sequence?.map((r) => r.templateName)).toEqual([
        'step_1_created_first',
        'step_2_created_second',
        'step_3_delayed_5m',
        'step_4_id_104',
        'step_5_id_105',
      ]);
    });
  });
});

