// Test script to verify backend API endpoints
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing API endpoints...');
  
  try {
    // Test base endpoint
    console.log('\n1. Testing base endpoint...');
    const baseResponse = await fetch(`${API_BASE}/`);
    const baseData = await baseResponse.text();
    console.log('✅ Base endpoint:', baseData);
    
    // Test connections endpoint (should return 401 without auth)
    console.log('\n2. Testing connections endpoint (no auth)...');
    const connectionsResponse = await fetch(`${API_BASE}/api/connections/requests`);
    console.log('📊 Connections endpoint status:', connectionsResponse.status);
    console.log('📊 Connections endpoint headers:', Object.fromEntries(connectionsResponse.headers.entries()));
    
    if (connectionsResponse.status === 401) {
      console.log('✅ Endpoint exists but requires authentication (expected)');
    } else if (connectionsResponse.status === 404) {
      console.log('❌ Endpoint not found - route not registered');
    } else {
      console.log('🤔 Unexpected status:', connectionsResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();




