const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010';

/**
 * 1️⃣ Get overall multi-tenant message analytics
 * GET /analytics/admin
 */
export async function getAdminAnalytics() {
  const response = await fetch(`${API_URL}/analytics/admin`, {
    method: 'GET',
    credentials: 'include', // required for SessionGuard
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch overall admin analytics');
  }

  return response.json();
}

/**
 * 2️⃣ Get tenant subscription analytics (Central DB only)
 * GET /analytics/admin/tenant-subscriptions
 */
export async function getTenantSubscriptionAnalytics() {
    const response = await fetch(
      `${API_URL}/analytics/admin/tenant-subscriptions`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  
    const data = await response.json();
    console.log('Tenant Analytics:', data);
  
    if (!response.ok) {
      throw new Error('Failed to fetch tenant subscription analytics');
    }
  
    return data;
  }