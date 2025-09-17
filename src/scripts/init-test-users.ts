import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';

// Configuration de la base de données
const client = new Client({
  host: process.env.DB_ADDR || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'msp',
  password: process.env.DB_PASSWORD || '87Eq8384',
  database: process.env.DB_DATABASE || 'velosi',
});

async function createTestUsers() {
  try {
    await client.connect();
    console.log('✅ Connexion à PostgreSQL établie');

    // Hasher les mots de passe
    const adminPassword = await bcrypt.hash('admin123', 12);
    const commercialPassword = await bcrypt.hash('commercial123', 12);
    const clientPassword = await bcrypt.hash('client123', 12);

    // Insérer un administrateur de test
    const adminQuery = `
      INSERT INTO personnel (nom, prenom, nom_utilisateur, role, email, mot_de_passe, statut)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (nom_utilisateur) DO UPDATE SET
        mot_de_passe = EXCLUDED.mot_de_passe
      RETURNING id, nom_utilisateur, role;
    `;

    const adminResult = await client.query(adminQuery, [
      'Admin',
      'Système',
      'admin',
      'administratif',
      'admin@velosi.com',
      adminPassword,
      'actif',
    ]);

    if (adminResult.rows.length > 0) {
      console.log('✅ Administrateur créé/mis à jour:', adminResult.rows[0]);
    }

    // Insérer un commercial de test
    const commercialResult = await client.query(adminQuery, [
      'Dupont',
      'Jean',
      'jean.dupont',
      'commercial',
      'jean.dupont@velosi.com',
      commercialPassword,
      'actif',
    ]);

    if (commercialResult.rows.length > 0) {
      console.log('✅ Commercial créé/mis à jour:', commercialResult.rows[0]);
    }

    // Insérer un client de test
    const clientQuery = `
      INSERT INTO client (nom, interlocuteur, mot_de_passe, adresse, ville, pays, blocage)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nom;
    `;

    try {
      const clientResult = await client.query(clientQuery, [
        'Entreprise Test',
        'M. Martin',
        clientPassword,
        '123 Rue de la Paix',
        'Paris',
        'France',
        false,
      ]);

      if (clientResult.rows.length > 0) {
        console.log('✅ Client créé:', clientResult.rows[0]);
      }
    } catch (clientError) {
      console.log(
        'ℹ️  Client existe déjà ou erreur:',
        (clientError as Error).message,
      );
    }

    console.log('\n🎉 Utilisateurs de test initialisés avec succès !');
    console.log('\n📋 Comptes créés :');
    console.log('👤 Admin - Username: admin, Password: admin123');
    console.log(
      '👤 Commercial - Username: jean.dupont, Password: commercial123',
    );
    console.log('👤 Client - Username: Entreprise Test, Password: client123');
  } catch (error) {
    console.error(
      '❌ Erreur lors de la création des utilisateurs de test:',
      error,
    );
  } finally {
    await client.end();
  }
}

// Exécuter seulement si appelé directement
if (require.main === module) {
  createTestUsers();
}

export { createTestUsers };
