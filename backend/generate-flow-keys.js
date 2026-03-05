const crypto = require('crypto');
const fs = require('fs');

console.log('🔑 Generating new RSA key pair for Meta Flow...');

// Generate 2048-bit RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Save keys to files
fs.writeFileSync('flow_public.pem', publicKey);
fs.writeFileSync('flow_private.pem', privateKey);

console.log('✅ Keys generated successfully!');
console.log('\n📁 Files created:');
console.log('- flow_public.pem (upload to Meta)');
console.log('- flow_private.pem (use in your server)');

console.log('\n🔥 NEXT STEPS:');
console.log('1. Upload flow_public.pem to Meta Business Manager > WhatsApp > Flows > Encryption');
console.log('2. Copy flow_private.pem content to your service');
console.log('3. Restart your backend');

console.log('\n📋 Private Key (copy this to your service):');
console.log(privateKey);