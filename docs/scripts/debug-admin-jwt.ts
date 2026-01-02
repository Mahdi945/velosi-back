import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '..', '.env') });

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsIm5vbV91dGlsaXNhdGV1ciI6ImFkbWluX21zcCIsInJvbGUiOiJzdXBlcl9hZG1pbiIsInR5cGUiOiJhZG1pbl9tc3AiLCJpYXQiOjE3NjYwMjA5NzIsImV4cCI6MTc2NjA0OTc3Mn0.UJhpdacQ2fzMKbeosRZGLuV3NnOLgX_fj1LD17vO8pc';

console.log('🔍 DEBUG ADMIN JWT');
console.log('===================\n');

console.log('📝 Token:', token);
console.log('\n🔑 JWT_SECRET depuis .env:', process.env.JWT_SECRET);

try {
  // Décoder sans vérifier
  const decoded = jwt.decode(token, { complete: true });
  console.log('\n📦 Token décodé (sans vérification):');
  console.log(JSON.stringify(decoded, null, 2));

  // Vérifier avec le secret
  const secret = process.env.JWT_SECRET || 'velosi-secret-key-2025-ultra-secure';
  console.log('\n🔐 Tentative de vérification avec secret:', secret);
  
  const verified = jwt.verify(token, secret);
  console.log('\n✅ Token VALIDE!');
  console.log('👤 Payload vérifié:');
  console.log(JSON.stringify(verified, null, 2));

} catch (error) {
  console.error('\n❌ ERREUR lors de la vérification:');
  console.error(error.message);
  
  if (error.name === 'TokenExpiredError') {
    console.log('\n⏰ Le token a expiré à:', new Date(error.expiredAt).toLocaleString());
  } else if (error.name === 'JsonWebTokenError') {
    console.log('\n🔧 Erreur de signature - Le secret est probablement incorrect');
    console.log('💡 Essayez de vous reconnecter pour générer un nouveau token');
  }
}
