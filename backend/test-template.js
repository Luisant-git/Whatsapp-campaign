// Test template creation with minimal data
const testTemplate = {
  name: "test_template_123",
  category: "MARKETING", 
  language: "en",
  components: [
    {
      type: "BODY",
      text: "Hello, this is a test message."
    }
  ]
};

console.log('Test this template data in your frontend:', JSON.stringify(testTemplate, null, 2));