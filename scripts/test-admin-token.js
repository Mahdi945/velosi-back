const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsIm5vbV91dGlsaXNhdGV1ciI6ImFkbWluX21zcCIsInJvbGUiOiJzdXBlcl9hZG1pbiIsInR5cGUiOiJhZG1pbl9tc3AiLCJpYXQiOjE3NjYwMjA5NzIsImV4cCI6MTc2NjA0OTc3Mn0.UJhpdacQ2fzMKbeosRZGLuV3NnOLgX_fj1LD17vO8pc';

console.log('🔍 Décodage du token...\n');

// Décoder sans vérifier la signature
const decoded = jwt.decode(token);
console.log('📦 Payload décodé:', JSON.stringify(decoded, null, 2));

// Vérifier l'expiration
const now = Math.floor(Date.now() / 1000);
const expiresIn = decoded.exp - now;
console.log(`\n⏰ Expire dans: ${expiresIn} secondes (${Math.floor(expiresIn / 60)} minutes)`);
console.log(`📅 Date d'expiration: ${new Date(decoded.exp * 1000).toLocaleString()}`);
console.log(`🕐 Date actuelle: ${new Date().toLocaleString()}`);

if (expiresIn <= 0) {
  console.log('\n❌ TOKEN EXPIRÉ!');
} else {
  console.log('\n✅ Token valide (non expiré)');
}

// Test avec le JWT_SECRET de l'env
const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production-MSP-2024';
console.log('\n🔑 Test de vérification avec JWT_SECRET...');
try {
  const verified = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token vérifié avec succès!');
  console.log('📦 Données vérifiées:', JSON.stringify(verified, null, 2));
} catch (error) {
  console.log('❌ Erreur de vérification:', error.message);
}
