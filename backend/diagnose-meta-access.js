const axios = require('axios');

async function diagnoseMetaAccess() {
  const accessToken = process.argv[2];
  
  if (!accessToken) {
    console.log('Usage: node diagnose-meta-access.js YOUR_ACCESS_TOKEN');
    process.exit(1);
  }

  console.log('🔍 Diagnosing Meta API Access...\n');

  try {
    // Check token info
    console.log('1️⃣ Checking Access Token Info:');
    const debugToken = await axios.get(`https://graph.facebook.com/v25.0/debug_token`, {
      params: { 
        input_token: accessToken,
        access_token: accessToken
      }
    });
    console.log('   Token Type:', debugToken.data.data.type);
    console.log('   App ID:', debugToken.data.data.app_id);
    console.log('   User ID:', debugToken.data.data.user_id);
    console.log('   Expires:', debugToken.data.data.expires_at ? new Date(debugToken.data.data.expires_at * 1000) : 'Never');
    console.log('');

    // Check pages
    console.log('2️⃣ Checking Pages You Manage:');
    const pages = await axios.get(`https://graph.facebook.com/v25.0/me/accounts`, {
      params: { access_token: accessToken }
    });
    
    if (pages.data.data.length === 0) {
      console.log('   ⚠️  No pages found. This might be a User token, not a Page token.');
    } else {
      pages.data.data.forEach(page => {
        console.log(`   📄 ${page.name} (ID: ${page.id})`);
      });
    }
    console.log('');

    // Check lead forms
    console.log('3️⃣ Checking Lead Forms:');
    if (pages.data.data.length > 0) {
      for (const page of pages.data.data) {
        try {
          const forms = await axios.get(`https://graph.facebook.com/v25.0/${page.id}/leadgen_forms`, {
            params: { access_token: accessToken }
          });
          
          if (forms.data.data.length > 0) {
            console.log(`   Page: ${page.name}`);
            forms.data.data.forEach(form => {
              console.log(`      📋 Form: ${form.name} (ID: ${form.id})`);
            });
          }
        } catch (error) {
          console.log(`   ⚠️  Could not access forms for ${page.name}`);
        }
      }
    } else {
      console.log('   ⚠️  No pages available to check forms');
    }
    console.log('');

    // Try to access the specific form
    console.log('4️⃣ Testing Access to Form ID 1249504476890606:');
    try {
      const form = await axios.get(`https://graph.facebook.com/v25.0/1249504476890606`, {
        params: { 
          access_token: accessToken,
          fields: 'id,name,page_id,status'
        }
      });
      console.log('   ✅ Form accessible!');
      console.log('   Form Name:', form.data.name);
      console.log('   Page ID:', form.data.page_id);
      console.log('   Status:', form.data.status);
    } catch (error) {
      console.log('   ❌ Cannot access this form');
      console.log('   Error:', error.response?.data?.error?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

diagnoseMetaAccess();
