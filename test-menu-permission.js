// Quick test to set Menu Permissions for tenant 1
const API_BASE_URL = 'http://localhost:3000'; // Adjust if different

async function setMenuPermission() {
  try {
    const response = await fetch(`${API_BASE_URL}/menu-permission/1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        permission: {
          dashboard: true,
          contacts: true,
          campaigns: true,
          chatbot: false,  // Disable chatbot
          quickReply: true,
          whatsappChat: true
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Menu permission set successfully:', result);
    } else {
      console.error('Failed to set menu permission:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

setMenuPermission();