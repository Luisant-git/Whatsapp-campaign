const crypto = require('crypto');

const rsaPrivateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAsWm+AXsg8DB2igq+42dYMPw2SPlTqoEij4M21SUyoyfmfwCz
ifPHOm3YgyHwyXDJ/t8OUii6AL4FD7zQXe/Y7sK6Z/o9E460UlORxDG3sWxEUlNC
ng0BzKRzi+kpf2QUU2i39tXLHnQw3yiOLIngzBCPbmHNJte8sz2wcOWhmTY5lgUi
luoRSLBH+lE6jnW4EIcjjK7ybpLf9b71oKOLTC3SRdHev8mpKDX5sVLDV5AzlsNC
auOCUiZ1gSLQbN54Q0Jx9bWec3QoiCmHr/mKnowwMpLKjbgSn1pdunf3pAhiBJXO
T0I/7POWT25PpG/AHWXMxdMvoFXhWFCODP1e1QIDAQABAoIBABjtkzGRE/U70gQe
c2jvdfBYF+aUBeIAyBLjLHqxgdZz/kqdFh0NoFJA6fmu9K7RRsilndUEfPIqwPpP
nPV+BHyz5s5CVn+ffw3MSUCIfdeTr1vj8AnWKQkQmF2x0s9gCA0aOzMXIjWyvMU2
ZRez/d6eexDW9CT/jjefNOIAGf81Z6qj+lAFNWEkSBXFZ+Ujlvu9BxNwrdl3wfAR
OBUlMsaQfWETI4Rut6kRjr6iXkyPKZP6w5ARj7UcXNyBc+ZIJNN4lPPiGZcowAxC
IblMDfjGaTINyXkTTFomv2etM+HXUNo0lO11bc9PnOz9r10CUxZXqTSeVkJPwhIW
Cobx10cCgYEA6UPd6bxA3evvLK/fTD4bNJXPOzWfkUpcxzPhFbcHuyt+bEoTR/xj
dxIS7G1a8HfmBPvp49+P5vwKuPOxUMqnWynWmcRSQS5UJaeCcuLVzHL2kjB1DFtU
MbbNIhUNrXj31TVZ6RJxNUQ4GEMEXbuHKkiLXgNJHGA8BjCITpcz8DcCgYEAwrRT
iYftJck2jpdssydD1sYuqYMWvQ80g8QSjWB9P6fUVTCtC1ef2eG6I2c3QI/rntE3
mPw/lTObKRM1zMJknrOa19w76pJ/fGgiB25qeTdRyPmKTYMA93vV37ZbRp9ZJTmA
ub4iViFqhGJT8esV7NB0MgIeITArv7iCDHl861MCgYEA4ZLPtohl8jWGRSCOP5yP
knqMvCVO+aF/tuNkdytYPpgA2ZeIrcRUK4E+64OUvZY0yf0SYVqAPk7dz51Zi1du
H6qF7Iz9PisfFIq4i4DwX5WM/DH//sMS2EB+fsb9QxQIFhZRrCI5d9lQpaWpQztl
qm4c1/01ZktpwFKOffGaOGECgYAjd3moGcyHD4oSm16/m61t2Bfz5N8lfTmRrwu6
GRN3nvi8s+sxn7qMk+O2Qzz7U7wV6AJ6qahjY00mREuOivKNPiY8n++CIUF7xfQ8
6k4W2o7ZTyt0RyLL8hDZeXxS9v/kGf9q1kmm6tteVhL4hFwwESC5Y01dukqd19xI
rXCl5QKBgQDfB+BCGRPpe8rB6se19WyxVRLViCRO2DHA5tvyx/hujCA6GBuXMJNs
/3fBbXiEO8RNg/5cHiZUoFJKaLbSUkT/gIF327vMgHE41q6+NA8J7qVdzaDvuAnL
1BZFVFoAPe4+zw08D3l5KmGyHa8VPbMRCvsseiNRJBmivvylhKWouw==
-----END RSA PRIVATE KEY-----`;

// Convert RSA to PKCS#8
const keyObject = crypto.createPrivateKey(rsaPrivateKey);
const pkcs8Key = keyObject.export({ type: 'pkcs8', format: 'pem' });

console.log('PKCS#8 Private Key (use this in your code):');
console.log(pkcs8Key);

// Extract public key
const publicKey = crypto.createPublicKey(keyObject);
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

console.log('\nPublic Key (upload to Meta):');
console.log(publicKeyPem);
