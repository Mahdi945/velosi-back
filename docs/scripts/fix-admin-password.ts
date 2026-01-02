import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

/**
 * Script pour corriger le mot de passe admin MSP directement via TypeORM
 * Évite les problèmes d'échappement de caractères avec psql
 */

async function fixAdminPassword() {
  console.log('🔧 Connexion à la base de données shipnology...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_ADDR || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'msp',
    password: process.env.DB_PASSWORD || '87Eq8384',
    database: 'shipnology',
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connecté à shipnology\n');

    // Générer le hash bcrypt
    const password = 'Admin123!';
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);

    console.log(`🔐 Mot de passe : ${password}`);
    console.log(`🔑 Hash généré : ${hash}\n`);

    // Vérifier que le hash fonctionne
    const isValid = await bcrypt.compare(password, hash);
    console.log(`✅ Vérification du hash : ${isValid ? 'OK' : 'ERREUR'}\n`);

    // Mettre à jour dans la base
    console.log('📝 Mise à jour du mot de passe dans la base...');
    
    const result = await dataSource.query(
      `UPDATE admin_msp SET mot_de_passe = $1 WHERE nom_utilisateur = $2`,
      [hash, 'admin_msp']
    );

    console.log(`✅ Mise à jour réussie (${result[1]} ligne(s) modifiée(s))\n`);

    // Vérifier le résultat
    const admin = await dataSource.query(
      `SELECT id, nom, prenom, email, nom_utilisateur, role, statut, 
       LENGTH(mot_de_passe) as hash_length,
       LEFT(mot_de_passe, 15) || '...' as hash_preview
       FROM admin_msp WHERE nom_utilisateur = $1`,
      ['admin_msp']
    );

    console.log('📊 Admin MSP après mise à jour :');
    console.log('─────────────────────────────────────────────────────');
    console.table(admin);
    console.log('─────────────────────────────────────────────────────\n');

    // Test de connexion
    console.log('🧪 Test de connexion avec le nouveau mot de passe...');
    const storedHash = admin[0].mot_de_passe;
    const fullAdmin = await dataSource.query(
      `SELECT mot_de_passe FROM admin_msp WHERE nom_utilisateur = $1`,
      ['admin_msp']
    );
    
    const testResult = await bcrypt.compare(password, fullAdmin[0].mot_de_passe);
    
    if (testResult) {
      console.log('✅ Test réussi ! La connexion devrait fonctionner.\n');
      console.log('🎉 IDENTIFIANTS DE CONNEXION :');
      console.log('─────────────────────────────────────────────────────');
      console.log('URL      : http://localhost:4200/admin-msp/login');
      console.log('Username : admin_msp');
      console.log('Password : Admin123!');
      console.log('─────────────────────────────────────────────────────\n');
    } else {
      console.log('❌ Erreur : Le test de connexion a échoué !\n');
    }

  } catch (error) {
    console.error('❌ Erreur :', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Déconnexion de la base de données');
  }
}

fixAdminPassword().catch(console.error);
