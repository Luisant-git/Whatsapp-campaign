/**
 * Test script to simulate parsing logic with actual Meta API data
 */

// Simulate the actual field_data from Meta API for Japar's lead
const fieldData = [
  {
    "name": "enter_your_business_type:",
    "values": ["shoe mart"]
  },
  {
    "name": "full_name",
    "values": ["Japar"]
  },
  {
    "name": "phone_number",
    "values": ["+918940079007"]
  },
  {
    "name": "city",
    "values": ["kallakurichi"]
  },
  {
    "name": "company_name",
    "values": ["BATA SHOE BAJAR"]
  },
  {
    "name": "phone_number_verified",
    "values": ["true"]
  }
];

function parseLeadFields(fieldData) {
  const parsed = { status: 'Intake', customFields: {} };
  
  console.log('=== PARSING LEAD FIELDS ===\n');
  
  fieldData.forEach(field => {
    const name = field.name.toLowerCase();
    const values = field.values || [];
    
    console.log(`Processing field: "${field.name}"`);
    console.log(`  - Lower case name: "${name}"`);
    console.log(`  - Values:`, values);
    console.log(`  - First value:`, values[0]);
    
    if (name === 'full_name' || (name.includes('name') && !name.includes('company'))) {
      parsed.name = values[0];
      console.log(`  ✅ Set as NAME\n`);
    } else if (name.includes('email')) {
      parsed.email = values[0];
      console.log(`  ✅ Set as EMAIL\n`);
    } else if ((name.includes('phone') || name.includes('mobile')) && !name.includes('verified')) {
      console.log(`  📞 PHONE FIELD DETECTED (not verified field)`);
      
      const phoneValue = values[0];
      
      if (phoneValue && typeof phoneValue === 'string') {
        const cleanPhone = phoneValue.replace(/\D/g, '');
        
        console.log(`  - Original: ${phoneValue}`);
        console.log(`  - Cleaned: ${cleanPhone}`);
        console.log(`  - Length: ${cleanPhone.length}`);
        
        if (cleanPhone.length >= 10) {
          parsed.phone = cleanPhone;
          console.log(`  ✅ Set as PHONE: ${cleanPhone}\n`);
        } else {
          console.log(`  ❌ Phone too short\n`);
          parsed.phone = null;
        }
      } else {
        console.log(`  ❌ Invalid phone value\n`);
        parsed.phone = null;
      }
    } else if (name.includes('verified')) {
      console.log(`  ⏭️  SKIPPED (verified field)\n`);
    } else if (name.includes('company')) {
      parsed.company = values[0];
      console.log(`  ✅ Set as COMPANY\n`);
    } else if (name.includes('city')) {
      parsed.city = values[0];
      console.log(`  ✅ Set as CITY\n`);
    } else if (name.includes('business') && name.includes('type')) {
      parsed.businessType = values[0];
      console.log(`  ✅ Set as BUSINESS TYPE\n`);
    } else {
      parsed.customFields[field.name] = values[0];
      console.log(`  ℹ️  Added to CUSTOM FIELDS\n`);
    }
  });

  console.log('=== PARSED RESULT ===');
  console.log(JSON.stringify(parsed, null, 2));
  
  return parsed;
}

// Test the parsing
parseLeadFields(fieldData);
