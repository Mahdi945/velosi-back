const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Données de test pour créer un personnel commercial avec objectifs
const testCommercial = {
  nom: 'Commercial',
  prenom: 'Test',
  nom_utilisateur: `commercial_${Date.now()}`,
  role: 'commercial',
  telephone: '+33123456789',
  email: `commercial${Date.now()}@velosi.com`,
  genre: 'Homme',
  mot_de_passe: 'CommercialPassword123!',
  // Objectifs commerciaux
  objectif_titre: 'Augmenter le CA de 20%',
  objectif_description: 'Objectif de croissance pour le trimestre',
  objectif_ca: 150000,
  objectif_clients: 25,
  objectif_date_fin: '2025-12-31'
};

async function testCommercialWithObjectifs() {
  console.log('🎯 Test de création d\'un commercial avec objectifs...\n');

  try {
    // Étape 1: Créer un personnel commercial avec objectifs
    console.log('📝 Création d\'un personnel commercial avec objectifs...');
    console.log('Données commercial:', JSON.stringify({
      ...testCommercial,
      mot_de_passe: '[MASQUÉ]'
    }, null, 2));
    
    const createResponse = await axios.post(`${API_BASE_URL}/api/users/personnel`, testCommercial);
    
    if (createResponse.status === 201) {
      const createdCommercial = createResponse.data.personnel || createResponse.data;
      console.log('✅ Personnel commercial créé avec succès!');
      console.log(`- ID: ${createdCommercial.id}`);
      console.log(`- Nom d'utilisateur: ${createdCommercial.nom_utilisateur}`);
      console.log(`- Rôle: ${createdCommercial.role}`);
      console.log(`- Keycloak ID: ${createdCommercial.keycloak_id || 'NULL'}`);

      // Étape 2: Vérifier les objectifs créés
      console.log('\n🔍 Vérification des objectifs commerciaux...');
      
      try {
        const objectifsResponse = await axios.get(`${API_BASE_URL}/api/objectifs-commerciaux/personnel/${createdCommercial.id}`);
        
        if (objectifsResponse.status === 200) {
          const objectifs = objectifsResponse.data;
          console.log(`✅ ${objectifs.length} objectif(s) trouvé(s)`);
          
          if (objectifs.length > 0) {
            const objectif = objectifs[0];
            console.log('📋 Détails de l\'objectif:');
            console.log(`- ID: ${objectif.id}`);
            console.log(`- Titre: ${objectif.titre}`);
            console.log(`- Description: ${objectif.description}`);
            console.log(`- Objectif CA: ${objectif.objectif_ca}€`);
            console.log(`- Objectif clients: ${objectif.objectif_clients}`);
            console.log(`- Date fin: ${objectif.date_fin}`);
            console.log(`- Statut: ${objectif.statut}`);
            console.log(`- Progression: ${objectif.progression}%`);
            
            console.log('\n🎉 SUCCÈS: Commercial créé avec objectifs synchronisés!');
          } else {
            console.log('❌ ÉCHEC: Aucun objectif trouvé pour ce commercial');
          }
        } else {
          console.log('❌ Erreur lors de la récupération des objectifs:', objectifsResponse.status);
        }
      } catch (objectifError) {
        console.log('❌ Erreur lors de la vérification des objectifs:', objectifError.message);
        if (objectifError.response) {
          console.log('Détails:', objectifError.response.data);
        }
      }

      // Étape 3: Tester la création directe d'un objectif via l'API
      console.log('\n🎯 Test de création directe d\'objectif via API...');
      
      const directObjectif = {
        id_personnel: createdCommercial.id,
        titre: 'Objectif direct via API',
        description: 'Test de création directe',
        objectif_ca: 50000,
        objectif_clients: 10,
        date_debut: '2025-01-01',
        date_fin: '2025-06-30',
        statut: 'en_cours',
        progression: 0
      };

      try {
        const directObjectifResponse = await axios.post(`${API_BASE_URL}/api/objectifs-commerciaux`, directObjectif);
        
        if (directObjectifResponse.status === 201) {
          console.log('✅ Objectif créé directement via API avec succès!');
          const nouvelObjectif = directObjectifResponse.data;
          console.log(`- ID: ${nouvelObjectif.id}`);
          console.log(`- Titre: ${nouvelObjectif.titre}`);
        } else {
          console.log('❌ Erreur création directe:', directObjectifResponse.status);
        }
      } catch (directError) {
        console.log('❌ Erreur création directe d\'objectif:', directError.message);
        if (directError.response) {
          console.log('Détails:', directError.response.data);
        }
      }

    } else {
      console.log('❌ Erreur lors de la création du commercial:', createResponse.status);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
  }
}

// Exécuter le test
testCommercialWithObjectifs();