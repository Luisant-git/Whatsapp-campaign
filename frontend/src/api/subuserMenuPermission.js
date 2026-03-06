const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getSubUserMenuPermission = async (subUserId) => {
  const res = await fetch(`${API_BASE_URL}/subuser-menu-permission/${subUserId}`, {
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Failed to load subuser permission");
  return data; // { subUserId, permission: {...} } OR { subUserId, permission: {} }
};

export const saveSubUserMenuPermission = async (subUserId, permission) => {
  const res = await fetch(`${API_BASE_URL}/subuser-menu-permission/${subUserId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permission }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Failed to save subuser permission");
  return data;
};