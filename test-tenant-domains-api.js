// Test script to verify tenant domains API
// Run this in browser console on the admin page

async function testTenantDomainsAPI() {
  try {
    console.log('Testing /api/admin/tenants/domains endpoint...');
    
    const response = await fetch('/api/admin/tenants/domains');
    const data = await response.json();
    
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', data);
    
    if (data.tenants && Array.isArray(data.tenants)) {
      console.log(`Found ${data.tenants.length} tenants:`);
      data.tenants.forEach((tenant, index) => {
        console.log(`${index + 1}. ID: ${tenant.id}, Name: ${tenant.name}, Email: ${tenant.email}, Domain: ${tenant.domain || 'None'}`);
      });
    } else {
      console.log('No tenants array found in response');
    }
    
    return data;
  } catch (error) {
    console.error('API Test Error:', error);
    return null;
  }
}

// Run the test
testTenantDomainsAPI();