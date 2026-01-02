import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';

async function updateAdminPassword() {
  // Créer la connexion à la base shipnology
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'msp',
    password: '87Eq8384',
    database: 'shipnology',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connexion à la base shipnology établie');

    // Générer le hash pour "Admin123!"
    const password = 'Admin123!';
    const hash = await bcrypt.hash(password, 12);
    
    console.log('\n📝 Informations:');
    console.log('Mot de passe:', password);
    console.log('Hash généré:', hash);
    console.log('Longueur hash:', hash.length);

    // Mettre à jour avec une requête paramétrée sécurisée
    const result = await dataSource.query(
      'UPDATE admin_msp SET mot_de_passe = $1 WHERE nom_utilisateur = $2 RETURNING id, nom_utilisateur, role',
      [hash, 'admin_msp']
    );

    if (result.length > 0) {
      console.log('\n✅ Mot de passe mis à jour avec succès:');
      console.log(result[0]);

      // Vérifier que le hash fonctionne
      const verification = await dataSource.query(
        'SELECT mot_de_passe FROM admin_msp WHERE nom_utilisateur = $1',
        ['admin_msp']
      );

      const hashFromDb = verification[0].mot_de_passe;
      console.log('\n🔍 Vérification:');
      console.log('Hash en base (longueur):', hashFromDb.length);
      console.log('Hash commence par:', hashFromDb.substring(0, 10));

      // Test de comparaison
      const isMatch = await bcrypt.compare(password, hashFromDb);
      console.log('Comparaison bcrypt:', isMatch ? '✅ VALIDE' : '❌ INVALIDE');

    } else {
      console.log('❌ Aucun admin_msp trouvé pour mise à jour');
    }

    await dataSource.destroy();
    console.log('\n✅ Terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

updateAdminPassword();
