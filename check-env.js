#!/usr/bin/env node

/**
 * Script de vérification des variables d'environnement critiques
 * Utilisé avant le démarrage de l'application pour éviter les erreurs silencieuses
 */

const requiredEnvVars = [
  'DB_ADDR',
  'DB_PORT',
  'DB_DATABASE',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'NODE_ENV'
];

const optionalEnvVars = [
  'FRONTEND_URL',
  'ALLOWED_ORIGINS',
  'PORT',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'KEYCLOAK_URL',
  'KEYCLOAK_REALM',
  'KEYCLOAK_CLIENT_ID'
];

console.log('🔍 Vérification des variables d\'environnement...\n');

let hasErrors = false;
const missingVars = [];
const presentVars = [];

// Vérifier les variables obligatoires
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ ERREUR: Variable obligatoire manquante: ${varName}`);
    missingVars.push(varName);
    hasErrors = true;
  } else {
    presentVars.push(varName);
    // Masquer les valeurs sensibles
    const value = varName.includes('PASSWORD') || varName.includes('SECRET') 
      ? '***MASQUÉ***' 
      : process.env[varName];
    console.log(`✅ ${varName}: ${value}`);
  }
});

console.log('\n📋 Variables optionnelles:');
optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    const value = varName.includes('PASSWORD') || varName.includes('SECRET') 
      ? '***MASQUÉ***' 
      : process.env[varName];
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚠️  ${varName}: non définie (optionnel)`);
  }
});

console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.error(`\n❌ ${missingVars.length} variable(s) manquante(s):`);
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error('\n💡 Ajoutez ces variables dans Railway Dashboard → Variables\n');
  process.exit(1);
} else {
  console.log(`\n✅ Toutes les variables obligatoires sont présentes (${presentVars.length}/${requiredEnvVars.length})`);
  console.log('🚀 Démarrage de l\'application...\n');
  process.exit(0);
}
