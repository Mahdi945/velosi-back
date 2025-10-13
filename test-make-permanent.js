// Test pour vérifier que makePermanent fonctionne correctement
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'velosi_erp',
  user: 'postgres',
  password: 'mahdi123456',
});

async function testMakePermanent() {
  try {
    await client.connect();
    console.log('✅ Connexion à la base de données réussie');

    // 1. Trouver un client temporaire
    const tempClients = await client.query(`
      SELECT id, nom, is_permanent, mot_de_passe, keycloak_id, email
      FROM client 
      WHERE is_permanent = false 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    console.log('\n📋 Clients temporaires disponibles:');
    tempClients.rows.forEach(client => {
      console.log(`  - ID: ${client.id}, Nom: ${client.nom}, Password: ${client.mot_de_passe ? 'PRÉSENT' : 'NULL'}, Keycloak: ${client.keycloak_id ? 'OUI' : 'NON'}`);
    });

    if (tempClients.rows.length === 0) {
      console.log('❌ Aucun client temporaire trouvé pour tester');
      
      // Créer un client temporaire pour test
      console.log('\n🚀 Création d\'un client temporaire pour test...');
      const createResult = await client.query(`
        INSERT INTO client (nom, interlocuteur, is_permanent, created_at)
        VALUES ('Test Client Temporaire', 'Test Contact', false, NOW())
        RETURNING id, nom, is_permanent
      `);
      
      console.log('✅ Client temporaire créé:', createResult.rows[0]);
      return;
    }

    const testClient = tempClients.rows[0];
    console.log(`\n🎯 Client sélectionné pour test: ${testClient.nom} (ID: ${testClient.id})`);

    // 2. Afficher l'état avant makePermanent
    console.log('\n📊 État AVANT makePermanent:');
    console.log(`  - is_permanent: ${testClient.is_permanent}`);
    console.log(`  - mot_de_passe: ${testClient.mot_de_passe ? 'PRÉSENT' : 'NULL'}`);
    console.log(`  - keycloak_id: ${testClient.keycloak_id ? testClient.keycloak_id : 'NULL'}`);

    // 3. Appeler l'API makePermanent
    console.log('\n🔄 Appel de l\'API makePermanent...');
    const apiUrl = 'http://localhost:3000';
    
    try {
      const response = await fetch(`${apiUrl}/api/clients/${testClient.id}/make-permanent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      console.log('📡 Réponse API:', result);

      if (result.success) {
        console.log('✅ API makePermanent a réussi');
        
        // 4. Vérifier l'état après makePermanent
        console.log('\n📊 Vérification dans la BD après makePermanent...');
        const updatedClient = await client.query(`
          SELECT id, nom, is_permanent, mot_de_passe, keycloak_id
          FROM client 
          WHERE id = $1
        `, [testClient.id]);

        if (updatedClient.rows.length > 0) {
          const updated = updatedClient.rows[0];
          console.log('📋 État APRÈS makePermanent:');
          console.log(`  - is_permanent: ${updated.is_permanent}`);
          console.log(`  - mot_de_passe: ${updated.mot_de_passe ? 'PRÉSENT (hashé)' : 'NULL'}`);
          console.log(`  - keycloak_id: ${updated.keycloak_id ? updated.keycloak_id : 'NULL'}`);

          // Vérification des critères de succès
          const checks = {
            isPermanent: updated.is_permanent === true,
            hasPassword: updated.mot_de_passe !== null && updated.mot_de_passe !== '',
            hasKeycloak: updated.keycloak_id !== null
          };

          console.log('\n✅ Vérification des critères:');
          console.log(`  ✅ is_permanent = true: ${checks.isPermanent ? 'OUI' : 'NON'}`);
          console.log(`  ✅ mot_de_passe enregistré: ${checks.hasPassword ? 'OUI' : 'NON'}`);
          console.log(`  ✅ keycloak_id présent: ${checks.hasKeycloak ? 'OUI' : 'NON'}`);

          if (checks.isPermanent && checks.hasPassword) {
            console.log('\n🎉 TEST RÉUSSI: Le client est maintenant permanent avec mot de passe enregistré!');
          } else {
            console.log('\n❌ TEST ÉCHOUÉ: Certains critères ne sont pas remplis');
          }
        }
      } else {
        console.log('❌ L\'API makePermanent a échoué:', result.message);
      }

    } catch (apiError) {
      console.error('❌ Erreur lors de l\'appel API:', apiError.message);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

testMakePermanent();