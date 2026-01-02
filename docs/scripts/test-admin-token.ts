import * as jwt from 'jsonwebtoken';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsIm5vbV91dGlsaXNhdGV1ciI6ImFkbWluX21zcCIsInJvbGUiOiJzdXBlcl9hZG1pbiIsInR5cGUiOiJhZG1pbl9tc3AiLCJpYXQiOjE3NjYwMTczOTQsImV4cCI6MTc2NjA0NjE5NH0.8veJ8V8er1N26htmUKIMAxGzH5CD48bG6PdYTAeE23Y';

console.log('\n=== DÉCODAGE DU TOKEN (sans vérification) ===');
try {
  const decoded = jwt.decode(token, { complete: true });
  console.log('Header:', decoded?.header);
  console.log('Payload:', decoded?.payload);
  
  const payload: any = decoded?.payload;
  if (payload) {
    const now = Math.floor(Date.now() / 1000);
    console.log('\n⏰ Timestamp actuel:', now);
    console.log('⏰ Token iat (émis):', payload.iat, '(' + new Date(payload.iat * 1000).toISOString() + ')');
    console.log('⏰ Token exp (expire):', payload.exp, '(' + new Date(payload.exp * 1000).toISOString() + ')');
    console.log('✅ Token expiré?', now > payload.exp ? 'OUI ❌' : 'NON ✅');
  }
} catch (error) {
  console.error('Erreur décodage:', error);
}

console.log('\n=== VÉRIFICATION AVEC DIFFÉRENTS SECRETS ===');

const secrets = [
  'velosi-secret-key-2025-ultra-secure',
  process.env.JWT_SECRET,
  'another-secret',
];

for (const secret of secrets) {
  if (!secret) continue;
  
  console.log(`\n🔑 Test avec secret: "${secret.substring(0, 20)}..."`);
  try {
    const verified = jwt.verify(token, secret);
    console.log('✅ SUCCÈS! Token valide avec ce secret');
    console.log('Payload vérifié:', verified);
  } catch (error: any) {
    console.log('❌ ÉCHEC:', error.message);
  }
}

console.log('\n=== RECOMMANDATION ===');
console.log('Si aucun secret ne fonctionne, le token a été signé avec un autre secret.');
console.log('Solution: Reconnectez-vous pour obtenir un nouveau token.');
