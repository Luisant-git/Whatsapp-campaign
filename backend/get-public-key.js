const crypto = require('crypto');

const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5F/pwR8Gjg/7m
Za8DoTZCWCJW8f+A8DEYZXlx4VD7bNm0QlqrtoGORvee4FSJ9Xy0WFa+ghBt7mLC
ygWCS1YblfhuvzKcu0OaYVDfKdVPdaMXne9vyHX/9fwP74ANM3nVFIipHNYkW3kW
OcNJfIPQ27INl7h4Us5Uau5Rd36t9hUoWAUo0+o9NeVFoYmBSSkX0QhinTge9HrR
dLwZI/jjQ7Tin8a2TwzP9JwUytLiVrSlz5zBoijhSwkeGK31kbAz+Rz4dXTZF/Z+
aRME5mLqa2bussyBcDXA0FPDEmiOFyqeEwR0fBLCcHugA5EKjDZTuyB3C/yoKFfv
ye0vXlDbAgMBAAECggEAWT/fqZ5gF6mBErV7Q4PLtwfqXwRHkHPBKKNdgPUFaIbf
HtVUBTJ2nBVKN1iySueNXySthyUOKQPmqUhiiaYr+hdBeJ1HGV4OxfUg2srAKZVu
s+ea2crOY0LIbSKuGy90ErPZBbp644McCwSFTvz0TpRw8a7z60j6Zqg9DBlTgyuw
TSjOuyQYpM8vHubUhzHPUXGBmvbaTAUego4HWlKBB6altIBpkzl381J39hloM4q0
SJoTbEzEnKOfcKGkPGLLwgA1pfrwI1B2Ng2HGetS8ozxd4GtWkuM7xq8R0i3Fp71
d/qe6s9X1h1YM3oJA7SZMohrXDPNbsPVClwH7kWG0QKBgQDnWk5XHdrcVQ/nlAEj
IMdIO4dFjpU6jk6zLzy6WUIKrZ5So7+dHJihb4dD84jmwQl+FSB646x69Qd2C8mi
FTSZGh7pHi2pxFE9mnIQpbVcSCnEbQPLwKju6Z2uObtS0KGCxEJfR5ct4STgz/c9
bGyJar3ZKEZpQSSqQRYZZ76bowKBgQDM0AvFU1lDfurtVlQeCOZ4+JpCqIqRjBVV
o48mb6jOtBbV5Pg88tbrVXR4iZZhjfxLJ8wkTWltZSMhGr3Dkx7Iwf0zpgpWi8yu
KRvusu+xPfmRbQ6pKkdV610qbN+PQrZ0dWLWPVyCIhXy/l4ot4HgbGH7qd3Gxj9o
pOIppeVJaQKBgQCkmTBxdLE432AQb9GbT3/ZGVk1mKr9XTAK9gmrv0NoW3vv6caz
HhxNhw7ivorhOefqB1fzdrZJSLmFN/+9zH5+iwIA81KjnSP7wz1yMKNmw4TL1o/D
0A+g4x8nTLXExuCSK9XY+hNKNgvJ0sxhrBlQb1wg+zGVQx617tatPo1zJwKBgAcD
SKPlCrVo7xpZTmAI5ftWZ9HIe5YoOcLI6uniAOGzAOUqBeXwWrOMJYTLET8d4Xmh
Tzge/nEkeWN0yvKbYv50xfqywL/d4ZBFEBPIRLTI7nawSUQ5kl+6w2HkgHMjUaQD
MPMs/rHmAOJlG0xBnEzW6TP4yQM5Xopyutu6NnOhAoGBAN8mDMf7/l8fxmgVkktj
yIi9A812mrIDGD/99TdTh3jB6XuT+fwpjGmEzS5XOYzCaApcE0DNvoP14OmBEBxM
gsRhe4Go8yYVnn9wgRqFpNkYonQ/zahl5cwydhiq1sVErgC5imJa4tiKwMCFzmxR
MmOROPXhnwClx8SPS7hKY+fG
-----END PRIVATE KEY-----`;

const keyObject = crypto.createPrivateKey(privateKey);
const publicKey = crypto.createPublicKey(keyObject);
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

console.log('Public Key:');
console.log(publicKeyPem);

const publicKeyBase64 = publicKeyPem
  .replace('-----BEGIN PUBLIC KEY-----', '')
  .replace('-----END PUBLIC KEY-----', '')
  .replace(/\n/g, '');

console.log('\nBase64 for Meta:');
console.log(publicKeyBase64);
