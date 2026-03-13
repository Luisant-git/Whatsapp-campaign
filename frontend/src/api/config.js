// Determine API base URL based on current domain
const getCurrentDomain = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // If accessing via custom domain (not the main domains), use same domain for API
    if (hostname !== 'whatsapp.luisant.cloud' && hostname !== 'localhost') {
      const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : '';
      return `${protocol}//${hostname}${portSuffix}`;
    }
  }
  
  // Fallback to environment variable or default
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';
};

export const API_BASE_URL = getCurrentDomain();