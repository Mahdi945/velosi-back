// Test complet pour vérifier la réception API et les boutons conditionnels
const apiUrl = 'http://localhost:3000';

// Simulation d'attente pour que l'API soit prête
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteSystem() {
  console.log('🔍 Test complet du système permanent/temporaire');
  console.log('='.repeat(60));
  
  // Attendre que l'API soit prête
  console.log('⏳ Attente du démarrage de l\'API...');
  await wait(3000);
  
  try {
    // Test 1: Vérifier la réception des données API
    console.log('\n📡 Test 1: Vérification de la réception des données API');
    console.log('-'.repeat(50));
    
    const response = await fetch(`${apiUrl}/api/clients`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ API accessible - Status: ${response.status}`);
    console.log(`📊 Clients reçus: ${data.data ? data.data.length : 0}`);
    
    if (data && data.data && Array.isArray(data.data)) {
      const clients = data.data;
      
      // Analyser les types de clients
      console.log('\n🔍 Analyse des clients reçus:');
      
      const permanentClients = [];
      const temporaryClients = [];
      
      clients.slice(0, 5).forEach((client, index) => {
        const isPermanent = client.is_permanent;
        console.log(`\n${index + 1}. ${client.nom} (ID: ${client.id})`);
        console.log(`   - is_permanent: ${isPermanent} (${typeof isPermanent})`);
        console.log(`   - Mot de passe: ${client.mot_de_passe ? 'PRÉSENT' : 'NULL'}`);
        console.log(`   - Keycloak ID: ${client.keycloak_id ? 'PRÉSENT' : 'NULL'}`);
        
        if (isPermanent === true) {
          permanentClients.push(client);
        } else if (isPermanent === false) {
          temporaryClients.push(client);
        }
      });
      
      console.log('\n📈 Statistiques des 5 premiers clients:');
      console.log(`- Clients permanents: ${permanentClients.length}`);
      console.log(`- Clients temporaires: ${temporaryClients.length}`);
      
      // Test 2: Simulation de la logique frontend
      console.log('\n🎨 Test 2: Simulation de l\'affichage frontend');
      console.log('-'.repeat(50));
      
      function toBoolean(value) {
        if (value === true || value === 'true' || value === 1 || value === '1') {
          return true;
        }
        return false;
      }
      
      clients.slice(0, 3).forEach(client => {
        const isPermanentDisplay = toBoolean(client.is_permanent);
        const badgeClass = isPermanentDisplay ? 'bg-success' : 'bg-warning';
        const badgeText = isPermanentDisplay ? 'Permanent' : 'Temporaire';
        const showMakePermanentButton = !isPermanentDisplay;
        
        console.log(`\n👤 ${client.nom}`);
        console.log(`   - Badge affiché: <span class="${badgeClass}">${badgeText}</span>`);
        console.log(`   - Bouton "Rendre Permanent": ${showMakePermanentButton ? 'VISIBLE' : 'MASQUÉ'}`);
        console.log(`   - Indicateur détail: ${isPermanentDisplay ? 'Accès Permanent' : 'Accès Temporaire'}`);
      });
      
      // Test 3: Créer un client temporaire pour test
      console.log('\n🚀 Test 3: Création d\'un client temporaire');
      console.log('-'.repeat(50));
      
      const tempClientData = {
        nom: `Client Test Temporaire ${Date.now()}`,
        interlocuteur: 'Test Interlocuteur',
        adresse: 'Adresse test',
        ville: 'Ville test',
        pays: 'Tunisie',
        categorie: 'Local',
        type_client: 'Particulier',
        is_permanent: false, // CLIENT TEMPORAIRE
        statut: 'actif'
      };
      
      try {
        const createResponse = await fetch(`${apiUrl}/api/clients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tempClientData)
        });
        
        if (createResponse.ok) {
          const newClient = await createResponse.json();
          console.log('✅ Client temporaire créé avec succès');
          console.log(`   - ID: ${newClient.id}`);
          console.log(`   - is_permanent: ${newClient.is_permanent}`);
          console.log(`   - mot_de_passe: ${newClient.mot_de_passe ? 'PRÉSENT' : 'NULL'}`);
          console.log(`   - keycloak_id: ${newClient.keycloak_id ? 'PRÉSENT' : 'NULL'}`);
          
          // Vérifier l'affichage de ce nouveau client
          const displayType = toBoolean(newClient.is_permanent) ? 'PERMANENT' : 'TEMPORAIRE';
          console.log(`   - Sera affiché comme: ${displayType}`);
          console.log(`   - Bouton "Rendre Permanent": ${!toBoolean(newClient.is_permanent) ? 'VISIBLE' : 'MASQUÉ'}`);
        } else {
          const error = await createResponse.text();
          console.log(`❌ Erreur création client: ${createResponse.status} - ${error}`);
        }
      } catch (createError) {
        console.log(`❌ Erreur création: ${createError.message}`);
      }
      
      // Test final: Recommandations
      console.log('\n✨ Test 4: Recommandations pour le frontend');
      console.log('-'.repeat(50));
      console.log('Pour un affichage correct:');
      console.log('1. ✅ La colonne "Accès" dans la liste affiche le type correct');
      console.log('2. ✅ Les badges colorés sont appliqués (vert=permanent, jaune=temporaire)');
      console.log('3. ✅ Le bouton "Rendre Permanent" n\'apparaît que pour les temporaires');
      console.log('4. ✅ L\'indicateur détaillé dans le modal affiche le bon type');
      console.log('\nDonnées à vérifier:');
      console.log('- is_permanent doit être un boolean (true/false)');
      console.log('- La méthode toBoolean() doit traiter correctement ces valeurs');
      console.log('- Les conditions *ngIf doivent utiliser toBoolean(client.is_permanent)');
      
    } else {
      console.log('❌ Format de réponse API incorrect');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

testCompleteSystem();