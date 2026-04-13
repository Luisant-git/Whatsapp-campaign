const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010';

export const getLandingContacts = async (page = 1, limit = 10, search = '') => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search: search,
  });

  console.log('🔍 Fetching landing contacts:', {
    url: `${API_BASE_URL}/admin/landing-contacts?${params}`,
    page,
    limit,
    search
  });

  const response = await fetch(`${API_BASE_URL}/admin/landing-contacts?${params}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log('📡 Response status:', response.status);
  console.log('📡 Response ok:', response.ok);

  const data = await response.json();
  console.log('📦 Response data:', data);

  if (!response.ok) {
    const errorMessage = data.message || 'Failed to fetch landing contacts';
    console.error('❌ API Error:', {
      status: response.status,
      message: errorMessage,
      data
    });
    throw new Error(errorMessage);
  }

  return data;
};
