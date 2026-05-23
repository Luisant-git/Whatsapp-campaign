const https = require('https');

function checkSSL(hostname) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: 443,
      path: '/',
      method: 'GET',
      rejectUnauthorized: true // This will fail if cert is invalid
    };

    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate();
      
      console.log('\n=== SSL CERTIFICATE CHECK ===\n');
      console.log('✅ SSL Certificate is valid');
      console.log('\nCertificate Details:');
      console.log('  Subject:', cert.subject?.CN || 'N/A');
      console.log('  Issuer:', cert.issuer?.CN || 'N/A');
      console.log('  Valid From:', cert.valid_from);
      console.log('  Valid To:', cert.valid_to);
      console.log('  Days until expiry:', Math.floor((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24)));
      
      resolve(true);
    });

    req.on('error', (error) => {
      console.log('\n=== SSL CERTIFICATE CHECK ===\n');
      console.log('❌ SSL Certificate issue detected');
      console.log('Error:', error.message);
      console.log('\nThis could be why Meta cannot verify the webhook.');
      console.log('Please ensure your SSL certificate is valid and trusted.');
      reject(error);
    });

    req.end();
  });
}

checkSSL('whatsapp.api.luisant.cloud').catch(() => {});
