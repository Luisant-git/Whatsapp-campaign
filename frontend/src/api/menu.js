const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3010";

export const getTenantMenus = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/tenant/menus`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.allowedMenus; // e.g., ["chats", "quick-reply", "chatbot", "analytics"]
};