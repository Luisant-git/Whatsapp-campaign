const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getCurrentMenuPermission = async () => {
  const res = await fetch(`${API_BASE_URL}/menu-permission/current`, {
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(
      "Failed to load current menu permission:",
      res.status,
      text,
    );
    // No permission data → show all by default
    return { permission: {} };
  }

  return res.json(); // { permission: { ... } }
};