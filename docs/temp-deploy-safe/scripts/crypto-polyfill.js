// Polyfill pour crypto.randomUUID dans les anciens environnements Node.js
const nodeCrypto = require('crypto');

if (!global.crypto) {
  global.crypto = {
    randomUUID: () => nodeCrypto.randomUUID(),
  };
}

console.log('✅ Polyfill crypto chargé');
