const axios = require('axios');

const pages = [
  { name: 'STEPS Teacher Education', id: '607281372467922', token: 'EAAcMSpblosgBRMv8DNfbqPZBZBZAR1cWL10TQk0wiXXYMMDtwZCuuNlqXUhbZCQ7tiPUz4RcuNO8UgJV9l5bQahZBvyiuXpIkpsPkFmEetfWcZCB8zVQQLZBZAIDlnfwkZCTBRwWsNc6aSIq3jzHRaCR369tS8ZAjmyImoaoNZBxYHNG2qvwHzEhmun5XXRlJZCGcdQijaSOV31GIrgHImNYbW9EicsqdZBuPh4zEcSbsUUJ6QpgZDZD' },
  { name: 'Chinnasalem Sengundha Mahajana Sangam', id: '613093741880845', token: 'EAAcMSpblosgBRCfScZA2UwEqakViRTZCeUZCvbIn63rsrrJQbMAsxENvkCrxMEGZBymWjBj3sG9OOZBKCMxdfbwvfm3YZAvm2YpI1Yr84OaEKdN62qRexatLZAMsDKuZBGB2H5vM95N6WnWlChXmkeL4PpOhhrJYcRjI9zbBNzhBb7PKoDTWjqcodcmDrYEledz7fQDnplOXtZBGNnZCclZClRcZCc6bEBJXx9GIvVcQdFh3zgZDZD' },
  { name: 'Akshaya Agro Products', id: '480089595178444', token: 'EAAcMSpblosgBRLtdHXeMDBZAIaABTk2QEZAFNtIzwDFJEE1Fx1ZBW6OszzOUT13jzStgAHQ3GdpnqFH7ZCGpwGDCofZB5fxJ9xmmZBZAQpno9EV91ZBhCsX5LZB0OifoKgEvo3DSESVg2bqVrmDQBFKD4Ea6KnHABANpr8VoE7PZARd0W0aDKaCr53Wa6zSInaVkHVFV4GXU74BeEsPoGWLIQMf6Mv8D3VjijeMFKIiZAzOhwZDZD' },
  { name: 'Uruththira Paint Mall', id: '109511338913096', token: 'EAAcMSpblosgBREqnZByoDbht4JhbZBxhHvouLiBoZCZChPGZBdTjlOHuy7mmwi0aA4N2I6lEFTt9jzf9zZB8yNsKC2DHb4PGlW2kuB0k1Vm3YJe46jZCjUqOXnpcGKBKTTYAxL94QUNxXLMuhrtYVyqq2iUBskZBZAQe36PtdIZASDQDDVlL0uroIZCMLcFtN39iEvXWiKAhOFCJXwIMUbn95NDkwjAkoinHinxbhIU9XoK' },
  { name: 'I Cope', id: '101835026240633', token: 'EAAcMSpblosgBRPaJi9mLGExDT7nyE3krzw6ZCRKkuuPJPOWHicadKltXF3AIBAn89ZAYGujCDDGzc4semdR21fU0pAyEXBRZCIXCF5iUTAFd4QSKLX6CiXK9xTZBsXJBsUQ8LUzQwBBp0of5C2Wmo9qpWoUyl0QcODDDSmnlGKrhQhe6oKqYtBNbSZCEte96WGJ4c5IBPfwSBPlRAxPjztxX3CZBhgumcTCNog4oeh' },
  { name: 'Thulir Organics', id: '107618268979823', token: 'EAAcMSpblosgBRKHhnW6KdFiKa6tIrRjsg4hCMYO1wAqGS0ZCBHvAKiUb4ZB5fxfn7LaXEB9SxXUIBV3skQpZCzu5OwmJ6JCBEMMZCLVqb347N0OSeZBeHhsBZCrP1rvZAT29tK7T7Pt3S29I67Jewb5I2GyqTkHdqnuTXuaVIxRDxlJL0VY8AdgvHKnubXt1JrgVispQKwEFabcar2teOCCyYIMeik1XWRIev1rKipe' }
];

const targetFormId = '1249504476890606';

async function findFormOwner() {
  console.log('🔍 Searching for form owner...\n');
  
  for (const page of pages) {
    console.log(`Checking: ${page.name}`);
    
    try {
      // Check if this page has the form
      const formCheck = await axios.get(`https://graph.facebook.com/v25.0/${targetFormId}`, {
        params: { 
          access_token: page.token,
          fields: 'id,name,page_id,status,leads_count'
        }
      });
      
      console.log(`✅ FOUND! Form belongs to: ${page.name}`);
      console.log(`   Form Name: ${formCheck.data.name}`);
      console.log(`   Form ID: ${formCheck.data.id}`);
      console.log(`   Page ID: ${formCheck.data.page_id}`);
      console.log(`   Status: ${formCheck.data.status}`);
      console.log(`   Leads Count: ${formCheck.data.leads_count || 0}`);
      console.log(`\n   Use this Page Access Token:`);
      console.log(`   ${page.token}\n`);
      
      // Try to get leads
      const leadsCheck = await axios.get(`https://graph.facebook.com/v25.0/${targetFormId}/leads`, {
        params: { access_token: page.token }
      });
      
      console.log(`   Total Leads Available: ${leadsCheck.data.data.length}`);
      return;
      
    } catch (error) {
      console.log(`   ❌ Not accessible from this page`);
    }
  }
  
  console.log('\n⚠️  Form not found in any of your pages. The form might belong to a different account.');
}

findFormOwner();
