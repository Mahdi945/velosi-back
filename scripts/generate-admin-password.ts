import * as bcrypt from 'bcryptjs';

/**
 * Script pour générer un hash bcrypt pour le mot de passe admin MSP
 * Utiliser ce script pour créer des mots de passe sécurisés
 */

async function generateAdminPassword() {
  const password = 'Admin123!';
  const saltRounds = 12;

  console.log('🔐 Génération du hash bcrypt pour le mot de passe admin MSP...\n');
  console.log(`Mot de passe en clair : ${password}`);
  
  const hash = await bcrypt.hash(password, saltRounds);
  
  console.log(`\nHash bcrypt généré :\n${hash}\n`);
  
  // Vérifier que le hash fonctionne
  const isValid = await bcrypt.compare(password, hash);
  console.log(`✅ Vérification du hash : ${isValid ? 'OK' : 'ERREUR'}\n`);
  
  console.log('📋 Requête SQL pour mettre à jour la base de données :');
  console.log('─────────────────────────────────────────────────────');
  console.log(`UPDATE admin_msp 
SET mot_de_passe = '${hash}' 
WHERE nom_utilisateur = 'admin_msp';`);
  console.log('─────────────────────────────────────────────────────\n');
  
  // Tester aussi d'autres mots de passe communs
  console.log('🔑 Autres hashes utiles :');
  
  const passwords = [
    'Password123!',
    'Velosi2025!',
    'SuperAdmin123!'
  ];
  
  for (const pwd of passwords) {
    const h = await bcrypt.hash(pwd, saltRounds);
    console.log(`\n${pwd} => \n${h}`);
  }
}

generateAdminPassword().catch(console.error);
