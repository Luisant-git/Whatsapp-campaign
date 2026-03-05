// src/api/subuser.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';


/**
 * Parse backend error safely
 */
const parseError = async (res, fallback) => {
  try {
    const data = await res.json();
    return data?.message || fallback;
  } catch {
    return fallback;
  }
};

/**
 * Base request wrapper
 */
const request = async (endpoint, options = {}, fallbackError) => {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include', // send cookies/session
    headers: {
      Accept: 'application/json',
      ...(options.body && { 'Content-Type': 'application/json' }),
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(await parseError(res, fallbackError));
  }

  return res.json();
};

/* ========================= SUB USER APIs ========================= */

/**
 * Register a new sub-user
 * POST /admin/subusers/register
 */
export const createSubUser = async (payload) => {
  return request(
    '/admin/subusers/register',
    { method: 'POST', body: JSON.stringify(payload) },
    'Failed to create sub-user'
  );
};

/**
 * Get all active sub-users of a tenant
 * GET /admin/tenants/:tenantId/subusers
 */
export const getTenantSubUsers = async (tenantId) => {
  const data = await request(
    `/admin/tenants/${tenantId}/subusers`,
    { method: "GET" },
    "Failed to fetch sub-users"
  );

  // normalize to array for the UI
  return Array.isArray(data?.subUsers) ? data.subUsers : [];
};


export const updateSubUser = async (id, payload) => {
  return request(
    `/admin/subusers/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    "Failed to update sub-user"
  );
};
/**
 * Deactivate a sub-user (soft delete)
 * PATCH /admin/subusers/:id/deactivate
 */
export const deactivateSubUser = async (id) => {
  return request(
    `/admin/subusers/${id}/deactivate`,
    { method: 'PATCH' },
    'Failed to deactivate sub-user'
  );
};