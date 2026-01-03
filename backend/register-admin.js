// Test script to register first admin
// Run this with: node register-admin.js

const API_URL = 'http://localhost:3010';

async function registerAdmin() {
  try {
    const response = await fetch(`${API_URL}/admin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        name: 'Admin User',
        password: 'admin123'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Admin registered successfully!');
      console.log('Email:', data.admin.email);
      console.log('Name:', data.admin.name);
      console.log('\nYou can now login with:');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
    } else {
      console.error('❌ Registration failed:', data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

registerAdmin();
