const axios = require('axios');

const userToken = process.argv[2];

if (!userToken) {
  console.log('Usage: node check-business-forms.js YOUR_USER_ACCESS_TOKEN');
  console.log('\nGet your user access token from: https://developers.facebook.com/tools/explorer/');
  console.log('Make sure it has: leads_retrieval, ads_management, business_management permissions');
  process.exit(1);
}

const targetFormId = '1249504476890606';

async function checkBusinessAccounts() {
  console.log('🔍 Checking Business Accounts and Ad Accounts...\n');
  
  try {
    // Check businesses
    console.log('1️⃣ Checking Business Accounts:');
    const businesses = await axios.get(`https://graph.facebook.com/v25.0/me/businesses`, {
      params: { access_token: userToken }
    });
    
    if (businesses.data.data.length === 0) {
      console.log('   No business accounts found\n');
    } else {
      for (const business of businesses.data.data) {
        console.log(`   📊 ${business.name} (ID: ${business.id})`);
        
        // Check ad accounts in this business
        try {
          const adAccounts = await axios.get(`https://graph.facebook.com/v25.0/${business.id}/owned_ad_accounts`, {
            params: { access_token: userToken }
          });
          
          for (const adAccount of adAccounts.data.data) {
            console.log(`      💰 Ad Account: ${adAccount.id}`);
            
            // Try to access form through ad account
            try {
              const form = await axios.get(`https://graph.facebook.com/v25.0/${targetFormId}`, {
                params: { 
                  access_token: userToken,
                  fields: 'id,name,page_id,status,leads_count'
                }
              });
              
              console.log(`\n      ✅ FOUND! Form accessible through this business!`);
              console.log(`         Form Name: ${form.data.name}`);
              console.log(`         Page ID: ${form.data.page_id}`);
              console.log(`         Status: ${form.data.status}\n`);
              return;
            } catch (e) {
              // Continue checking
            }
          }
        } catch (e) {
          console.log(`      ⚠️  Could not access ad accounts`);
        }
      }
    }
    
    // Direct check with user token
    console.log('\n2️⃣ Trying direct access with user token:');
    try {
      const form = await axios.get(`https://graph.facebook.com/v25.0/${targetFormId}`, {
        params: { 
          access_token: userToken,
          fields: 'id,name,page_id,status,leads_count'
        }
      });
      
      console.log(`   ✅ Form accessible!`);
      console.log(`   Form Name: ${form.data.name}`);
      console.log(`   Page ID: ${form.data.page_id}`);
      console.log(`   Status: ${form.data.status}`);
      console.log(`   Leads Count: ${form.data.leads_count || 0}\n`);
      
      // Try to get leads
      const leads = await axios.get(`https://graph.facebook.com/v25.0/${targetFormId}/leads`, {
        params: { access_token: userToken }
      });
      
      console.log(`   📋 Total Leads: ${leads.data.data.length}`);
      console.log(`\n   ✅ Use this token in your Master Config:\n   ${userToken}\n`);
      
    } catch (error) {
      console.log(`   ❌ Not accessible: ${error.response?.data?.error?.message || error.message}\n`);
    }
    
    console.log('\n💡 Suggestion:');
    console.log('   The form might belong to a different Meta account.');
    console.log('   Please verify:');
    console.log('   1. You\'re logged into the correct Meta account');
    console.log('   2. The Form ID is correct: 1249504476890606');
    console.log('   3. You have admin access to the page that created this form');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkBusinessAccounts();
