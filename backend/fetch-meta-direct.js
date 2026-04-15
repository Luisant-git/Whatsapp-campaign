/**
 * Script to fetch raw lead data from Meta API with provided credentials
 */

const axios = require('axios');

async function fetchMetaLeadDirect() {
  const ACCESS_TOKEN = 'EAAcMSpblosgBRA6vGX8uvsi5gwE98ZBWjErfZADmtW13hBe1kSnNjT3kT0kzMSicZAjZCnrYID1OW0NCoMIex2M8OETXidZBKn2EbaLTeTsomOgqyuaWFrBg5tX5EDymCRYovXoOkZC8DryLPgBFRdNUm69TaGeuVRI6BSWUE9phpxjm6ZBaa6svuViROP0EebY0NhaGgZCQTYaZCJnUeG6qq7wHOENey9n54Qg96ZBgaHEMoZD';
  const LEAD_ID = '1706720297160097'; // Most recent lead from your database
  
  try {
    console.log('🔍 Fetching lead from Meta API...');
    console.log('Lead ID:', LEAD_ID);
    console.log('');
    
    const url = `https://graph.facebook.com/v25.0/${LEAD_ID}`;
    const response = await axios.get(url, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'id,created_time,field_data,form_id'
      }
    });
    
    console.log('✅ Raw Meta API Response:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(response.data, null, 2));
    console.log('='.repeat(80));
    
    console.log('\n📊 Detailed Field Data Analysis:');
    console.log('='.repeat(80));
    
    if (response.data.field_data) {
      response.data.field_data.forEach((field, idx) => {
        console.log(`\n${idx + 1}. Field Name: "${field.name}"`);
        console.log(`   Lower case: "${field.name.toLowerCase()}"`);
        console.log(`   Values Array:`, field.values);
        console.log(`   First Value: "${field.values[0]}"`);
        console.log(`   Value Type: ${typeof field.values[0]}`);
        console.log(`   Is "true" string?: ${field.values[0] === 'true'}`);
        console.log(`   Is boolean true?: ${field.values[0] === true}`);
        
        // Check if field name contains phone-related keywords
        const lowerName = field.name.toLowerCase();
        if (lowerName.includes('phone') || lowerName.includes('mobile') || lowerName.includes('number')) {
          console.log('   ⚠️  THIS IS A PHONE FIELD!');
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Analysis:');
    console.log('Look for the phone field above and check what value it contains.');
    console.log('If it shows "true" or true (boolean), that means Meta is not returning');
    console.log('the actual phone number - possibly due to privacy settings or form configuration.');
    
  } catch (error) {
    if (error.response?.data?.error) {
      console.error('❌ Meta API Error:');
      console.error('   Code:', error.response.data.error.code);
      console.error('   Message:', error.response.data.error.message);
      console.error('   Type:', error.response.data.error.type);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

fetchMetaLeadDirect();
