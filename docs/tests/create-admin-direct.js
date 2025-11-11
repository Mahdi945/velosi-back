/**
 * Script de création d'un administrateur directement dans Supabase
 * Usage: node create-admin-direct.js
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.production' });

// ==========================================
// CONFIGURATION
// ==========================================
const DB_CONFIG = {
  host: process.env.DB_ADDR,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: {
    rejectUnauthorized: false // Nécessaire pour Supabase
  }
};

const ADMIN_USER = {
  nom: 'Ahmed',
  prenom: 'Admin',
  nom_utilisateur: 'ahmed', // ✅ Username pour connexion
  email: 'ahmed@velosi.com',
  password: '87Eq8384',
  role: 'administratif', // ✅ Rôle administratif
  genre: 'Homme',
  statut: 'actif',
  telephone: '+33612345678',
  first_login: false, // Pas de changement de mot de passe requis
  photo: 'uploads/profiles/default-avatar.png',
  location_tracking_enabled: false
};

// ==========================================
// FONCTION PRINCIPALE
// ==========================================
async function createAdmin() {
  const client = new Client(DB_CONFIG);
  
  try {
    console.log('========================================');
    console.log('  Création Administrateur Supabase');
    console.log('========================================\n');
    
    // Connexion à Supabase
    console.log('📡 Connexion à Supabase...');
    console.log(`   Host: ${DB_CONFIG.host}`);
    console.log(`   Database: ${DB_CONFIG.database}`);
    console.log(`   User: ${DB_CONFIG.user}\n`);
    
    await client.connect();
    console.log('✅ Connecté à Supabase!\n');
    
    // Vérifier si la table existe
    console.log('🔍 Vérification de la table personnel...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'personnel'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      throw new Error('❌ La table personnel n\'existe pas!');
    }
    console.log('✅ Table personnel trouvée\n');
    
    // Vérifier si l'utilisateur existe déjà
    console.log('🔍 Vérification si l\'utilisateur existe déjà...');
    const existingUser = await client.query(
      'SELECT id, nom_utilisateur, email, role FROM personnel WHERE nom_utilisateur = $1 OR email = $2',
      [ADMIN_USER.nom_utilisateur, ADMIN_USER.email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️  Utilisateur existant trouvé:');
      console.log('   ID:', existingUser.rows[0].id);
      console.log('   Username:', existingUser.rows[0].nom_utilisateur);
      console.log('   Email:', existingUser.rows[0].email);
      console.log('   Rôle:', existingUser.rows[0].role);
      console.log('\n🗑️  Suppression de l\'ancien utilisateur...');
      
      await client.query(
        'DELETE FROM personnel WHERE nom_utilisateur = $1 OR email = $2',
        [ADMIN_USER.nom_utilisateur, ADMIN_USER.email]
      );
      console.log('✅ Ancien utilisateur supprimé\n');
    } else {
      console.log('ℹ️  Aucun utilisateur existant trouvé\n');
    }
    
    // Générer le hash bcrypt du mot de passe
    console.log('🔐 Génération du hash bcrypt...');
    console.log('   Mot de passe:', ADMIN_USER.password);
    const passwordHash = bcrypt.hashSync(ADMIN_USER.password, 10);
    console.log('   Hash généré:', passwordHash.substring(0, 30) + '...\n');
    
    // Insérer le nouvel administrateur
    console.log('📝 Création du nouvel administrateur...');
    const insertQuery = `
      INSERT INTO personnel (
        nom,
        prenom,
        nom_utilisateur,
        email,
        mot_de_passe,
        role,
        genre,
        statut,
        telephone,
        first_login,
        photo,
        location_tracking_enabled,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, nom, prenom, nom_utilisateur, email, role, statut, genre, created_at;
    `;
    
    const result = await client.query(insertQuery, [
      ADMIN_USER.nom,
      ADMIN_USER.prenom,
      ADMIN_USER.nom_utilisateur,
      ADMIN_USER.email,
      passwordHash,
      ADMIN_USER.role,
      ADMIN_USER.genre,
      ADMIN_USER.statut,
      ADMIN_USER.telephone,
      ADMIN_USER.first_login,
      ADMIN_USER.photo,
      ADMIN_USER.location_tracking_enabled
    ]);
    
    const newUser = result.rows[0];
    
    console.log('✅ Administrateur créé avec succès!\n');
    console.log('========================================');
    console.log('  INFORMATIONS UTILISATEUR');
    console.log('========================================');
    console.log('ID:', newUser.id);
    console.log('Nom:', newUser.nom, newUser.prenom);
    console.log('Username:', newUser.nom_utilisateur);
    console.log('Email:', newUser.email);
    console.log('Rôle:', newUser.role);
    console.log('Genre:', newUser.genre);
    console.log('Statut:', newUser.statut);
    console.log('Créé le:', newUser.created_at);
    console.log('========================================\n');
    
    // Vérifier le hash
    console.log('🧪 Vérification du hash bcrypt...');
    const isValid = bcrypt.compareSync(ADMIN_USER.password, passwordHash);
    console.log(isValid ? '✅ Hash valide - Le mot de passe fonctionne!' : '❌ Hash invalide!');
    console.log('\n========================================');
    console.log('  IDENTIFIANTS DE CONNEXION');
    console.log('========================================');
    console.log('Username:', ADMIN_USER.nom_utilisateur);
    console.log('Email:', ADMIN_USER.email);
    console.log('Mot de passe:', ADMIN_USER.password);
    console.log('========================================\n');
    
    console.log('✅ SUCCÈS: Vous pouvez maintenant vous connecter!');
    console.log('   URL Frontend: https://velosi-front.vercel.app/login\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('\nDétails:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('📡 Connexion Supabase fermée.');
  }
}

// ==========================================
// EXÉCUTION
// ==========================================
createAdmin();
