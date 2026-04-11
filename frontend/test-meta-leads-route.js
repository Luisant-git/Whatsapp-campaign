// Quick test - paste this in browser console on your app

// Test 1: Check if MetaLeads component exists
console.log('MetaLeads component loaded:', typeof MetaLeads !== 'undefined');

// Test 2: Check menu config
console.log('Menu config:', MENU_CONFIG);

// Test 3: Check if route mapping exists
console.log('Route mapping:', MENU_TO_VIEW['campaigns.meta-leads']);

// Test 4: Manually trigger the view
localStorage.setItem('activeView', 'meta-leads');
window.location.reload();

// Or directly set state (if you have access to React DevTools)
// Find the App component and update activeView state to 'meta-leads'
