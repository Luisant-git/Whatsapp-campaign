const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getCurrentMenuPermission = async () => {
  const res = await fetch(`${API_BASE_URL}/subscription/current`, {
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(
      "Failed to load current subscription:",
      res.status,
      text,
    );
    return { permission: {} };
  }

  const data = await res.json();
  
  // Convert menuPermissions array to object format { key: true }
  if (data.subscription?.menuPermissions) {
    const permissions = {};
    data.subscription.menuPermissions.forEach(key => {
      permissions[key] = true;
    });
    return { permission: permissions };
  }
  
  return { permission: {} };
};