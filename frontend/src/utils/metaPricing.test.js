import { getMetaRate, META_PRICING_EFFECTIVE_DATE, META_PRICING_SOURCE, META_PRICING_RATES } from './metaPricing';

describe('Meta Pricing Table Verification', () => {
  it('should export the correct official source URL', () => {
    expect(META_PRICING_SOURCE).toBe('https://developers.facebook.com/docs/whatsapp/pricing/');
  });

  it('should export an effective date', () => {
    expect(META_PRICING_EFFECTIVE_DATE).toBeTruthy();
  });

  it('should fetch valid rate for India (IN) Marketing', () => {
    const rateData = getMetaRate('IN', 'MARKETING');
    expect(rateData).not.toBeNull();
    expect(rateData.rate).toBe(0.7265);
    expect(rateData.currency).toBe('INR');
  });

  it('should fetch valid rate for US Service', () => {
    const rateData = getMetaRate('US', 'SERVICE');
    expect(rateData.rate).toBe(0.0088);
    expect(rateData.currency).toBe('USD');
  });

  it('should return null for invalid or missing markets', () => {
    expect(getMetaRate('INVALID_MARKET', 'MARKETING')).toBeNull();
    expect(getMetaRate('XYZ', 'UTILITY')).toBeNull();
  });

  it('should return null for invalid categories', () => {
    expect(getMetaRate('IN', 'INVALID_CAT')).toBeNull();
  });

  it('should ensure all configured markets have all 4 categories', () => {
    Object.keys(META_PRICING_RATES).forEach(market => {
      expect(META_PRICING_RATES[market].MARKETING).toBeDefined();
      expect(META_PRICING_RATES[market].UTILITY).toBeDefined();
      expect(META_PRICING_RATES[market].AUTHENTICATION).toBeDefined();
      expect(META_PRICING_RATES[market].SERVICE).toBeDefined();
    });
  });
});
