export const META_PRICING_SOURCE = 'https://developers.facebook.com/docs/whatsapp/pricing/';
export const META_PRICING_EFFECTIVE_DATE = 'October 1, 2026';

// Authoritative Meta WhatsApp Business rate cards
export const META_PRICING_RATES = {
  IN: {
    name: 'India',
    currency: 'INR',
    MARKETING: 0.8631,
    MARKETING_LITE: 0.0000,
    UTILITY: 0.1150,
    AUTHENTICATION: 0.1150,
    AUTHENTICATION_INTL: 2.3000,
    AI_PROVIDER: 0.0000,
    SERVICE: 0.0000,
  },
  US: {
    name: 'United States',
    currency: 'USD',
    MARKETING: 0.0250,
    MARKETING_LITE: 0.0000,
    UTILITY: 0.0150,
    AUTHENTICATION: 0.0135,
    AUTHENTICATION_INTL: 0.0500,
    AI_PROVIDER: 0.0000,
    SERVICE: 0.0000,
  },
  GB: {
    name: 'United Kingdom',
    currency: 'GBP',
    MARKETING: 0.0401,
    MARKETING_LITE: 0.0000,
    UTILITY: 0.0215,
    AUTHENTICATION: 0.0200,
    AUTHENTICATION_INTL: 0.0600,
    AI_PROVIDER: 0.0000,
    SERVICE: 0.0000,
  },
  BR: {
    name: 'Brazil',
    currency: 'BRL',
    MARKETING: 0.3100,
    MARKETING_LITE: 0.0000,
    UTILITY: 0.1700,
    AUTHENTICATION: 0.1500,
    AUTHENTICATION_INTL: 0.5000,
    AI_PROVIDER: 0.0000,
    SERVICE: 0.0000,
  }
};

export const META_CATEGORIES = [
  { key: 'MARKETING', name: 'Marketing', color: '#00a3e0' },
  { key: 'MARKETING_LITE', name: 'Marketing – lite', color: '#f59e0b' },
  { key: 'UTILITY', name: 'Utility', color: '#8b5cf6' },
  { key: 'AUTHENTICATION', name: 'Authentication', color: '#ea580c' },
  { key: 'AUTHENTICATION_INTL', name: 'Authentication – international', color: '#9a3412' },
  { key: 'AI_PROVIDER', name: 'AI provider', color: '#0d9488' },
  { key: 'SERVICE', name: 'Service', color: '#10b981' },
];

export const getMetaRate = (countryCode, category) => {
  const normCat = (category || '').toUpperCase().replace(/[\s–-]+/g, '_');
  const market = META_PRICING_RATES[countryCode] || META_PRICING_RATES['IN'];
  if (!market) return null;
  const rawRate = market[normCat] !== undefined ? market[normCat] : market[category];
  if (rawRate === undefined || rawRate === null) return null;
  return { 
    rate: rawRate, 
    rateWithTax: rawRate, 
    currency: market.currency,
  };
};
