// Script to register admin
// Run this with: node register-admin.js
// Or with custom credentials: node register-admin.js admin@domain.com "Admin Name" password123

const API_URL = process.env.API_URL || 'http://localhost:3010';

async function registerAdmin() {
  // Get credentials from command line arguments or use defaults
  const email = process.argv[2] || 'admin@example.com';
  const name = process.argv[3] || 'Admin User';
  const password = process.argv[4] || 'admin123';

  console.log('\n🔐 Registering admin...');
  console.log('Email:', email);
  console.log('Name:', name);
  console.log('');

  try {
    const response = await fetch(`${API_URL}/admin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Admin registered successfully!');
      console.log('Email:', data.admin.email);
      console.log('Name:', data.admin.name);
      console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('\n💡 Usage: node register-admin.js <email> <name> <password>');
    } else {
      console.error('❌ Registration failed:', data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

registerAdmin();
