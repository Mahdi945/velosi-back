import { Client } from 'pg';

// Récupérer les variables d'environnement
const client = new Client({
  host: process.env.DB_ADDR || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'msp',
  password: process.env.DB_PASSWORD || '87Eq8384',
  database: process.env.DB_DATABASE || 'velosi',
});

async function testConnection() {
  try {
    await client.connect(); // Connexion à PostgreSQL
    console.log('✅ Connexion réussie à PostgreSQL');

    const res = await client.query('SELECT * FROM personnel'); // Lire la table
    console.log('Contenu de la table personnel :');
    console.table(res.rows); // Afficher en tableau dans le terminal
  } catch (err) {
    console.error('❌ Erreur de connexion ou de requête :', err);
  } finally {
    await client.end(); // Fermer la connexion
  }
}

testConnection();
