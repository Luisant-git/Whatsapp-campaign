const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3010";

/**
 * Get Menu Permission by Company
 */
export const getMenuPermission = async (companyId) => {
  const response = await fetch(
    `${API_BASE_URL}/api/menu-permission/${companyId}`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch menu permission");
  }

  return await response.json();
};

/**
 * Save / Update Menu Permission
 */
export const saveMenuPermission = async (data) => {
  const response = await fetch(
    `${API_BASE_URL}/api/menu-permission`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to save menu permission");
  }

  return await response.json();
};