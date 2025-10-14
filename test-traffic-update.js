const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';
const headers = {
    'Content-Type': 'application/json',
    'x-user-id': '1'
};

async function testLeadTrafficUpdate() {
    console.log('🧪 Test de modification du traffic Import/Export pour les prospects...');

    try {
        // 1. Récupérer la liste des prospects
        console.log('📋 Récupération des prospects...');
        const leadsResponse = await fetch(`${API_URL}/crm/leads?limit=5`, {
            method: 'GET',
            headers
        });

        if (!leadsResponse.ok) {
            throw new Error(`Erreur lors de la récupération des prospects: ${leadsResponse.status}`);
        }

        const leadsData = await leadsResponse.json();
        
        if (!leadsData.data || leadsData.data.length === 0) {
            console.log('⚠️  Aucun prospect trouvé. Création d\'un prospect de test...');
            
            // Créer un prospect de test
            const newLeadData = {
                fullName: 'Test Traffic Modification',
                email: 'test.traffic@example.com',
                company: 'Transport Test Co',
                source: 'website',
                traffic: 'import'
            };

            const createResponse = await fetch(`${API_URL}/crm/leads`, {
                method: 'POST',
                headers,
                body: JSON.stringify(newLeadData)
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Erreur lors de la création: ${errorText}`);
            }

            const createdLead = await createResponse.json();
            console.log('✅ Prospect créé:', createdLead.id);
            leadsData.data = [createdLead];
        }

        // 2. Prendre le premier prospect et modifier son traffic
        const leadToUpdate = leadsData.data[0];
        console.log(`📝 Test sur le prospect ID: ${leadToUpdate.id}`);
        console.log(`   Nom: ${leadToUpdate.fullName}`);
        console.log(`   Traffic actuel: ${leadToUpdate.traffic || 'Non défini'}`);

        // Déterminer le nouveau traffic (basculer entre import et export)
        const currentTraffic = leadToUpdate.traffic;
        const newTraffic = currentTraffic === 'import' ? 'export' : 'import';
        
        console.log(`🔄 Modification de '${currentTraffic}' vers '${newTraffic}'...`);

        // 3. Effectuer la mise à jour
        const updateData = {
            traffic: newTraffic
        };

        const updateResponse = await fetch(`${API_URL}/crm/leads/${leadToUpdate.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Erreur lors de la mise à jour: ${errorText}`);
        }

        const updatedLead = await updateResponse.json();
        console.log('✅ Mise à jour effectuée');

        // 4. Vérifier que la modification a bien eu lieu
        console.log('🔍 Vérification de la modification...');
        
        const verifyResponse = await fetch(`${API_URL}/crm/leads/${leadToUpdate.id}`, {
            method: 'GET',
            headers
        });

        if (!verifyResponse.ok) {
            throw new Error(`Erreur lors de la vérification: ${verifyResponse.status}`);
        }

        const verifiedLead = await verifyResponse.json();
        
        console.log('📊 Résultat de la vérification:');
        console.log(`   Traffic avant: ${currentTraffic}`);
        console.log(`   Traffic après: ${verifiedLead.traffic}`);
        console.log(`   Traffic attendu: ${newTraffic}`);

        // 5. Validation
        if (verifiedLead.traffic === newTraffic) {
            console.log('✅ SUCCÈS: La modification du traffic fonctionne correctement!');
            return true;
        } else {
            console.log('❌ ÉCHEC: La modification du traffic n\'a pas été sauvegardée');
            console.log(`   Attendu: "${newTraffic}", Reçu: "${verifiedLead.traffic}"`);
            return false;
        }

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        return false;
    }
}

async function testOpportunityTrafficUpdate() {
    console.log('\n🧪 Test de modification du traffic pour les opportunités...');

    try {
        // Récupérer les opportunités
        console.log('📋 Récupération des opportunités...');
        const opportunitiesResponse = await fetch(`${API_URL}/crm/opportunities?limit=5`, {
            method: 'GET',
            headers
        });

        if (!opportunitiesResponse.ok) {
            throw new Error(`Erreur lors de la récupération des opportunités: ${opportunitiesResponse.status}`);
        }

        const opportunitiesData = await opportunitiesResponse.json();
        
        if (!opportunitiesData.data || opportunitiesData.data.length === 0) {
            console.log('⚠️  Aucune opportunité trouvée pour le test');
            return false;
        }

        const oppToUpdate = opportunitiesData.data[0];
        console.log(`📝 Test sur l'opportunité ID: ${oppToUpdate.id}`);
        console.log(`   Titre: ${oppToUpdate.title}`);
        console.log(`   Traffic actuel: ${oppToUpdate.traffic || 'Non défini'}`);

        // Basculer le traffic
        const currentTraffic = oppToUpdate.traffic;
        const newTraffic = currentTraffic === 'import' ? 'export' : 'import';
        
        console.log(`🔄 Modification de '${currentTraffic}' vers '${newTraffic}'...`);

        // Mise à jour
        const updateData = {
            traffic: newTraffic
        };

        const updateResponse = await fetch(`${API_URL}/crm/opportunities/${oppToUpdate.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Erreur lors de la mise à jour: ${errorText}`);
        }

        // Vérification
        const verifyResponse = await fetch(`${API_URL}/crm/opportunities/${oppToUpdate.id}`, {
            method: 'GET',
            headers
        });

        const verifiedOpp = await verifyResponse.json();
        
        console.log('📊 Résultat de la vérification:');
        console.log(`   Traffic avant: ${currentTraffic}`);
        console.log(`   Traffic après: ${verifiedOpp.traffic}`);
        
        if (verifiedOpp.traffic === newTraffic) {
            console.log('✅ SUCCÈS: La modification du traffic fonctionne pour les opportunités!');
            return true;
        } else {
            console.log('❌ ÉCHEC: La modification du traffic des opportunités a échoué');
            return false;
        }

    } catch (error) {
        console.error('❌ Erreur lors du test des opportunités:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Test de modification du traffic Import/Export\n');
    
    const leadResult = await testLeadTrafficUpdate();
    const oppResult = await testOpportunityTrafficUpdate();
    
    console.log('\n📊 Résumé des tests:');
    console.log(`- Prospects: ${leadResult ? '✅ Réussi' : '❌ Échoué'}`);
    console.log(`- Opportunités: ${oppResult ? '✅ Réussi' : '❌ Échoué'}`);
    
    if (leadResult && oppResult) {
        console.log('\n🎉 Tous les tests sont réussis! La modification Import/Export fonctionne.');
    } else {
        console.log('\n⚠️  Certains tests ont échoué. Vérifier les logs ci-dessus.');
    }
}

// Attendre que le serveur soit prêt puis lancer les tests
setTimeout(() => {
    main().catch(console.error);
}, 2000);