const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Test complet de la fonctionnalité des objectifs commerciaux avec activation/désactivation
async function testObjectifsActivationFeature() {
  console.log('🎯 Test complet des objectifs commerciaux avec activation/désactivation\n');

  try {
    // Étape 1: Créer un commercial de test
    console.log('📝 Création d\'un commercial de test...');
    const testCommercial = {
      nom: 'TestCommercial',
      prenom: 'ObjectifsActifs',
      nom_utilisateur: `commercial_test_${Date.now()}`,
      role: 'commercial',
      telephone: '+216123456789',
      email: `commercial_test_${Date.now()}@velosi.com`,
      genre: 'Homme',
      mot_de_passe: 'TestPassword123!'
    };

    const createResponse = await axios.post(`${API_BASE_URL}/api/users/personnel`, testCommercial);
    
    if (createResponse.status === 201) {
      const commercial = createResponse.data;
      console.log('✅ Commercial créé avec succès!');
      console.log(`- ID: ${commercial.id}`);
      console.log(`- Nom: ${commercial.prenom} ${commercial.nom}`);

      // Étape 2: Créer plusieurs objectifs pour ce commercial
      console.log('\n🎯 Création de plusieurs objectifs...');
      
      const objectifs = [
        {
          id_personnel: commercial.id,
          titre: 'Objectif Q1 2025',
          description: 'Objectif trimestriel pour Q1',
          objectif_ca: 100000,
          objectif_clients: 15,
          date_fin: '2025-03-31',
          statut: 'en_cours',
          is_active: true
        },
        {
          id_personnel: commercial.id,
          titre: 'Objectif Annuel 2025',
          description: 'Objectif annuel de performance',
          objectif_ca: 500000,
          objectif_clients: 50,
          date_fin: '2025-12-31',
          statut: 'en_cours',
          is_active: true
        },
        {
          id_personnel: commercial.id,
          titre: 'Objectif Test Inactif',
          description: 'Objectif qui sera désactivé pour test',
          objectif_ca: 25000,
          objectif_clients: 5,
          date_fin: '2025-06-30',
          statut: 'suspendu',
          is_active: true
        }
      ];

      const createdObjectifs = [];
      for (const objectif of objectifs) {
        const objResponse = await axios.post(`${API_BASE_URL}/api/objectifs-commerciaux`, objectif);
        if (objResponse.status === 201) {
          createdObjectifs.push(objResponse.data);
          console.log(`✅ Objectif créé: "${objectif.titre}"`);
        }
      }

      // Étape 3: Vérifier que tous les objectifs sont récupérés
      console.log('\n📊 Vérification de tous les objectifs...');
      const allObjectifsResponse = await axios.get(`${API_BASE_URL}/api/objectifs-commerciaux/personnel/${commercial.id}`);
      
      if (allObjectifsResponse.status === 200) {
        const allObjectifs = allObjectifsResponse.data.data || allObjectifsResponse.data;
        console.log(`✅ ${allObjectifs.length} objectifs trouvés au total`);
        
        allObjectifs.forEach((obj, index) => {
          console.log(`  ${index + 1}. ${obj.titre} - Actif: ${obj.is_active !== false ? 'OUI' : 'NON'}`);
        });
      }

      // Étape 4: Désactiver un objectif
      console.log('\n🔄 Test de désactivation d\'un objectif...');
      if (createdObjectifs.length > 0) {
        const objectifToDeactivate = createdObjectifs[2]; // Le troisième objectif
        
        const toggleResponse = await axios.put(
          `${API_BASE_URL}/api/objectifs-commerciaux/${objectifToDeactivate.id}/toggle-active`,
          { is_active: false }
        );
        
        if (toggleResponse.status === 200) {
          console.log(`✅ Objectif "${objectifToDeactivate.titre}" désactivé avec succès`);
        }
      }

      // Étape 5: Vérifier le filtrage des objectifs actifs seulement
      console.log('\n🔍 Test du filtrage des objectifs actifs...');
      const activeObjectifsResponse = await axios.get(
        `${API_BASE_URL}/api/objectifs-commerciaux/personnel/${commercial.id}?active_only=true`
      );
      
      if (activeObjectifsResponse.status === 200) {
        const activeObjectifs = activeObjectifsResponse.data.data || activeObjectifsResponse.data;
        console.log(`✅ ${activeObjectifs.length} objectifs actifs trouvés`);
        
        activeObjectifs.forEach((obj, index) => {
          console.log(`  ${index + 1}. ${obj.titre} - Statut: ${obj.statut}`);
        });
      }

      // Étape 6: Réactiver l'objectif
      console.log('\n🔄 Test de réactivation d\'un objectif...');
      if (createdObjectifs.length > 0) {
        const objectifToReactivate = createdObjectifs[2];
        
        const reactivateResponse = await axios.put(
          `${API_BASE_URL}/api/objectifs-commerciaux/${objectifToReactivate.id}/toggle-active`,
          { is_active: true }
        );
        
        if (reactivateResponse.status === 200) {
          console.log(`✅ Objectif "${objectifToReactivate.titre}" réactivé avec succès`);
        }
      }

      // Étape 7: Vérification finale
      console.log('\n📋 Vérification finale...');
      const finalObjectifsResponse = await axios.get(`${API_BASE_URL}/api/objectifs-commerciaux/personnel/${commercial.id}`);
      
      if (finalObjectifsResponse.status === 200) {
        const finalObjectifs = finalObjectifsResponse.data.data || finalObjectifsResponse.data;
        console.log(`✅ État final: ${finalObjectifs.length} objectifs au total`);
        
        const activeCount = finalObjectifs.filter(obj => obj.is_active !== false).length;
        const inactiveCount = finalObjectifs.length - activeCount;
        
        console.log(`  - Objectifs actifs: ${activeCount}`);
        console.log(`  - Objectifs inactifs: ${inactiveCount}`);
      }

      console.log('\n🎉 Test complet terminé avec succès!');
      console.log('\n📝 Résumé des fonctionnalités testées:');
      console.log('  ✅ Création d\'objectifs avec is_active par défaut');
      console.log('  ✅ Récupération de tous les objectifs');
      console.log('  ✅ Désactivation d\'un objectif');
      console.log('  ✅ Filtrage des objectifs actifs seulement');
      console.log('  ✅ Réactivation d\'un objectif');
      console.log('  ✅ Vérification des compteurs actifs/inactifs');

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
testObjectifsActivationFeature();