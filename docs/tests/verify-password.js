/**
 * Script de vérification de hash bcrypt
 * Usage: node verify-password.js
 */

const bcrypt = require('bcryptjs');

// ==========================================
// Configuration
// ==========================================
const testPassword = '87Eq8384';
const testHash = '$2a$10$fHkoz9vaBbS.1a8WoMnGtunJdEBiYfgoWAxu9xocSmJGxpiKHNpZa';

console.log('========================================');
console.log('  Vérification de Hash Bcrypt');
console.log('========================================\n');

console.log('🔐 Mot de passe testé:', testPassword);
console.log('🔑 Hash bcrypt:', testHash);
console.log('');

// Vérifier si le mot de passe correspond au hash
const isValid = bcrypt.compareSync(testPassword, testHash);

if (isValid) {
    console.log('✅ SUCCÈS: Le mot de passe correspond au hash!');
    console.log('');
    console.log('Ce hash peut être utilisé en toute sécurité dans la base de données.');
} else {
    console.log('❌ ERREUR: Le mot de passe ne correspond PAS au hash!');
    console.log('');
    console.log('Vérifiez:');
    console.log('1. Le mot de passe est correct');
    console.log('2. Le hash n\'est pas corrompu');
}

console.log('========================================\n');

// ==========================================
// Générer un nouveau hash
// ==========================================
console.log('📦 Génération d\'un nouveau hash pour comparaison...\n');

const newHash = bcrypt.hashSync(testPassword, 10);
console.log('Nouveau hash généré:');
console.log(newHash);
console.log('');

// Vérifier le nouveau hash
const newHashValid = bcrypt.compareSync(testPassword, newHash);
console.log('Vérification du nouveau hash:', newHashValid ? '✅ Valide' : '❌ Invalide');
console.log('');

console.log('========================================');
console.log('ℹ️  Note: Chaque hash bcrypt est unique,');
console.log('   même pour le même mot de passe.');
console.log('========================================');
