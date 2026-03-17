const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010';

export async function getTenantNotes(tenantId) {
  const res = await fetch(`${API_BASE_URL}/tenentnote/tenant/${tenantId}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch tenant notes');
  }

  return res.json();
}

export async function createTenantNote(payload) {
  const res = await fetch(`${API_BASE_URL}/tenentnote`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to create tenant note');
  }

  return res.json();
}

export async function updateTenantNote(noteId, payload) {
  const res = await fetch(`${API_BASE_URL}/tenentnote/${noteId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to update tenant note');
  }

  return res.json();
}

export async function deleteTenantNote(noteId) {
  const res = await fetch(`${API_BASE_URL}/tenentnote/${noteId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to delete tenant note');
  }

  return res.json();
}