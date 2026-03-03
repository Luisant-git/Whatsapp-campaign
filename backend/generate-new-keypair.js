const crypto = require('crypto');

// Generate new RSA keypair
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

console.log('=== NEW PRIVATE KEY (update in meta-flow.service.ts) ===');
console.log(privateKey);
console.log('\n=== NEW PUBLIC KEY (upload to Meta) ===');
console.log(publicKey);
