// src/api/subuser.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010';

/**
 * Parse backend error response safely
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
  const res = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
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





/* ===========================
   SUB USER APIs
=========================== */


/**
 * GET /subuser
 * Fetch all sub users
 */
export const getSubUsers = async () => {
  return request(
    '/subuser',
    { method: 'GET' },
    'Failed to fetch sub users'
  );
};


/**
 * GET /subuser/:id
 * Fetch single sub user
 */
export const getSubUserById = async (id) => {
  return request(
    `/subuser/${Number(id)}`,
    { method: 'GET' },
    'Failed to fetch sub user'
  );
};


/**
 * POST /subuser
 * Create sub user
 * payload: { username, mobileNumber, designation?, isActive? }
 */
export const createSubUser = async (payload) => {
  return request(
    '/subuser',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'Failed to create sub user'
  );
};


/**
 * PATCH /subuser/:id
 * Update sub user
 * payload can be partial
 */
export const updateSubUser = async (id, payload) => {
  return request(
    `/subuser/${Number(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    'Failed to update sub user'
  );
};


/**
 * DELETE /subuser/:id
 * Remove sub user
 */
export const deleteSubUser = async (id) => {
  return request(
    `/subuser/${Number(id)}`,
    {
      method: 'DELETE',
    },
    'Failed to delete sub user'
  );
};
