const axios = require('axios');
require('dotenv').config();

const META_CATALOG_ID = process.env.META_CATALOG_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const API_URL = 'https://graph.facebook.com/v18.0';

async function testMetaAPI() {
  console.log('🔍 Testing Meta API Connection...\n');
  console.log('Catalog ID:', META_CATALOG_ID);
  console.log('Token (first 20 chars):', META_ACCESS_TOKEN?.substring(0, 20) + '...\n');

  try {
    // Test 1: Verify access token
    console.log('Test 1: Verifying Access Token...');
    const tokenResponse = await axios.get(
      `${API_URL}/me?fields=id,name`,
      {
        headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
        timeout: 10000,
      }
    );
    console.log('✅ Token Valid:', tokenResponse.data);

    // Test 2: Check catalog access
    console.log('\nTest 2: Checking Catalog Access...');
    const catalogResponse = await axios.get(
      `${API_URL}/${META_CATALOG_ID}?fields=id,name,product_count`,
      {
        headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
        timeout: 10000,
      }
    );
    console.log('✅ Catalog Accessible:', catalogResponse.data);

    // Test 3: Try to add a test product
    console.log('\nTest 3: Testing Product Upload...');
    const testProduct = {
      retailer_id: `test_${Date.now()}`,
      name: 'Test Product',
      description: 'This is a test product',
      price: 10000, // ₹100 in paise
      currency: 'INR',
      availability: 'in stock',
      condition: 'new',
      brand: 'Test Brand',
      image_url: 'https://via.placeholder.com/300',
      url: 'https://example.com',
    };

    const uploadResponse = await axios.post(
      `${API_URL}/${META_CATALOG_ID}/products`,
      testProduct,
      {
        headers: {
          Authorization: `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    console.log('✅ Product Upload Successful:', uploadResponse.data);
    console.log('\n🎉 All tests passed! Your Meta API is working correctly.');

  } catch (error) {
    console.error('\n❌ Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.error?.message || error.message,
      details: error.response?.data,
      code: error.code,
    });

    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('\n💡 Solution: Your access token is invalid or expired.');
      console.log('   1. Go to Meta Business Suite');
      console.log('   2. Generate a new access token with catalog_management permission');
      console.log('   3. Update META_ACCESS_TOKEN in .env file');
    } else if (error.response?.status === 404) {
      console.log('\n💡 Solution: Catalog ID not found.');
      console.log('   1. Verify META_CATALOG_ID in .env file');
      console.log('   2. Check if the catalog exists in Meta Commerce Manager');
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.log('\n💡 Solution: Request timed out.');
      console.log('   1. Check your internet connection');
      console.log('   2. Meta API might be slow, try again');
    }
  }
}

testMetaAPI();
