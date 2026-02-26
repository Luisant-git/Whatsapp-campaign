const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3010";

export const getMenuPermission = async (tenantId) => {
  const res = await fetch(
    `${API_BASE_URL}/menu-permission/${tenantId}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to load permissions: ${res.status} ${errText}`);
  }
  return res.json();
};

export const saveMenuPermission = async (tenantId, permission) => {
  const res = await fetch(
    `${API_BASE_URL}/menu-permission/${tenantId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ permission }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to save permissions: ${res.status} ${errText}`);
  }
  return res.json();
};