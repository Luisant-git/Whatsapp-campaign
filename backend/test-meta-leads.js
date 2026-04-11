const axios = require('axios');

// Configuration
const config = {
  pageId: 'YOUR_PAGE_ID',
  formId: 'YOUR_FORM_ID',
  accessToken: 'YOUR_ACCESS_TOKEN',
  apiUrl: 'http://localhost:3000', // Change to your backend URL
};

// Test 1: Fetch leads from Facebook
async function testFetchLeads() {
  console.log('\n=== Testing Facebook API ===');
  try {
    const url = `https://graph.facebook.com/v25.0/${config.formId}/leads`;
    const { data } = await axios.get(url, {
      params: { access_token: config.accessToken },
    });
    
    console.log('✓ Successfully fetched leads from Facebook');
    console.log(`  Found ${data.data?.length || 0} leads`);
    
    if (data.data && data.data.length > 0) {
      console.log('\n  Sample lead:');
      console.log('  Lead ID:', data.data[0].id);
      console.log('  Created:', data.data[0].created_time);
      console.log('  Fields:', data.data[0].field_data.map(f => f.name).join(', '));
    }
    
    return true;
  } catch (error) {
    console.error('✗ Failed to fetch leads from Facebook');
    console.error('  Error:', error.response?.data || error.message);
    return false;
  }
}

// Test 2: Sync leads to backend
async function testSyncLeads() {
  console.log('\n=== Testing Backend Sync ===');
  try {
    const { data } = await axios.post(`${config.apiUrl}/meta-leads/sync`, {
      pageId: config.pageId,
      formId: config.formId,
      accessToken: config.accessToken,
    });
    
    console.log('✓ Successfully synced leads to backend');
    console.log(`  Synced ${data.count} leads`);
    return true;
  } catch (error) {
    console.error('✗ Failed to sync leads to backend');
    console.error('  Error:', error.response?.data || error.message);
    return false;
  }
}

// Test 3: Fetch leads from backend
async function testGetLeads() {
  console.log('\n=== Testing Backend API ===');
  try {
    const { data } = await axios.get(`${config.apiUrl}/meta-leads`, {
      params: { page: 1, limit: 10 },
    });
    
    console.log('✓ Successfully fetched leads from backend');
    console.log(`  Total leads: ${data.pagination.total}`);
    console.log(`  Intake: ${data.data.filter(l => l.status === 'Intake').length}`);
    console.log(`  Qualified: ${data.data.filter(l => l.status === 'Qualified').length}`);
    console.log(`  Converted: ${data.data.filter(l => l.status === 'Converted').length}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to fetch leads from backend');
    console.error('  Error:', error.response?.data || error.message);
    return false;
  }
}

// Test 4: Verify webhook endpoint
async function testWebhookVerification() {
  console.log('\n=== Testing Webhook Verification ===');
  try {
    const verifyToken = 'test_verify_token';
    const challenge = 'test_challenge_123';
    
    const { data } = await axios.get(`${config.apiUrl}/meta-leads/webhook`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': challenge,
      },
    });
    
    if (data === challenge) {
      console.log('✓ Webhook verification working');
      return true;
    } else {
      console.log('✗ Webhook verification failed - wrong response');
      return false;
    }
  } catch (error) {
    console.error('✗ Webhook verification failed');
    console.error('  Error:', error.response?.data || error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=================================');
  console.log('Meta Lead Ads Integration Tests');
  console.log('=================================');
  
  if (config.pageId === 'YOUR_PAGE_ID') {
    console.error('\n⚠ Please update the configuration in this file first!');
    console.log('\nUpdate these values:');
    console.log('  - pageId: Your Facebook Page ID');
    console.log('  - formId: Your Lead Form ID');
    console.log('  - accessToken: Your Page Access Token');
    console.log('  - apiUrl: Your backend URL (if different)');
    return;
  }
  
  const results = {
    facebook: await testFetchLeads(),
    sync: await testSyncLeads(),
    backend: await testGetLeads(),
    webhook: await testWebhookVerification(),
  };
  
  console.log('\n=================================');
  console.log('Test Results Summary');
  console.log('=================================');
  console.log('Facebook API:', results.facebook ? '✓ PASS' : '✗ FAIL');
  console.log('Backend Sync:', results.sync ? '✓ PASS' : '✗ FAIL');
  console.log('Backend API:', results.backend ? '✓ PASS' : '✗ FAIL');
  console.log('Webhook:', results.webhook ? '✓ PASS' : '✗ FAIL');
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\nOverall:', allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
}

runTests();
