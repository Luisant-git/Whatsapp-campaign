export const META_PRICING_SOURCE = 'https://developers.facebook.com/docs/whatsapp/pricing/';
export const META_PRICING_EFFECTIVE_DATE = 'October 1, 2026';

// Simplified authoritative Meta rate card data based on official docs
// Rates are usually tiered, but for this implementation we use the base tier (Tier 1/Standard).
export const META_PRICING_RATES = {
  IN: {
    name: 'India',
    currency: 'INR',
    MARKETING: 0.7265,
    UTILITY: 0.3082,
    AUTHENTICATION: 0.1100, // International Authentication may be higher, using domestic
    SERVICE: 0.2906,
  },
  US: {
    name: 'United States',
    currency: 'USD',
    MARKETING: 0.0250,
    UTILITY: 0.0150,
    AUTHENTICATION: 0.0135,
    SERVICE: 0.0088,
  },
  GB: {
    name: 'United Kingdom',
    currency: 'GBP',
    MARKETING: 0.0401,
    UTILITY: 0.0215,
    AUTHENTICATION: 0.0200,
    SERVICE: 0.0238,
  },
  BR: {
    name: 'Brazil',
    currency: 'BRL',
    MARKETING: 0.3100,
    UTILITY: 0.1700,
    AUTHENTICATION: 0.1500,
    SERVICE: 0.1600,
  }
};

export const getMetaRate = (countryCode, category) => {
  const market = META_PRICING_RATES[countryCode];
  if (!market) return null;
  const rate = market[category];
  if (rate === undefined || rate === null) return null;
  return { rate, currency: market.currency };
};
