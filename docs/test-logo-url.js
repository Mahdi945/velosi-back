/**
 * Script de test pour vérifier le logo_url de l'organisation Danino
 * 
 * Exécuter avec: node test-logo-url.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function testLogoUrl() {
  const client = new Client({
    host: process.env.DB_ADDR || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'shipnology', // Base principale
  });

  try {
    await client.connect();
    console.log('✅ Connecté à la base de données shipnology');

    // Récupérer l'organisation Danino (ID: 17)
    const result = await client.query(
      'SELECT id, nom, nom_affichage, logo_url, slug, database_name, telephone, adresse, email_contact FROM organisations WHERE id = $1',
      [17]
    );

    if (result.rows.length === 0) {
      console.log('❌ Organisation Danino (ID: 17) introuvable');
      return;
    }

    const org = result.rows[0];
    console.log('\n🏢 Organisation Danino:');
    console.log('   ID:', org.id);
    console.log('   Nom:', org.nom);
    console.log('   Nom affichage:', org.nom_affichage);
    console.log('   Database:', org.database_name);
    console.log('   Slug:', org.slug);
    console.log('   Logo URL:', org.logo_url);
    console.log('   Téléphone:', org.telephone);
    console.log('   Adresse:', org.adresse);
    console.log('   Email contact:', org.email_contact);

    // Vérifications
    console.log('\n🔍 Vérifications:');
    
    if (!org.logo_url) {
      console.log('   ❌ Logo URL est NULL ou vide');
    } else if (org.logo_url.startsWith('http://') || org.logo_url.startsWith('https://')) {
      console.log('   ✅ Logo URL est une URL complète:', org.logo_url);
    } else if (org.logo_url.startsWith('/')) {
      console.log('   ✅ Logo URL est un chemin absolu:', org.logo_url);
      console.log('   📍 URL complète serait: http://localhost:4200' + org.logo_url);
    } else {
      console.log('   ⚠️  Logo URL est un chemin relatif:', org.logo_url);
      console.log('   📍 URL complète serait: http://localhost:4200/' + org.logo_url);
    }

    if (!org.slug) {
      console.log('   ⚠️  Slug est NULL ou vide - le site web affichera velosi.com.tn');
    } else {
      console.log('   ✅ Slug configuré:', org.slug);
      console.log('   🌐 Site web: www.' + org.slug + '.tn');
    }

    if (!org.telephone) {
      console.log('   ⚠️  Téléphone est NULL ou vide - affichera le téléphone par défaut');
    } else {
      console.log('   ✅ Téléphone configuré:', org.telephone);
    }

    if (!org.adresse) {
      console.log('   ⚠️  Adresse est NULL ou vide - affichera l\'adresse par défaut');
    } else {
      console.log('   ✅ Adresse configurée:', org.adresse);
    }

    if (!org.email_contact) {
      console.log('   ⚠️  Email contact est NULL ou vide - affichera l\'email par défaut');
    } else {
      console.log('   ✅ Email contact configuré:', org.email_contact);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
    console.log('\n✅ Connexion fermée');
  }
}

testLogoUrl();
