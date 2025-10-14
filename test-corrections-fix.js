const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';
const headers = {
    'Content-Type': 'application/json',
    'x-user-id': '1'
};

async function testOpportunityCreation() {
    console.log('🧪 Test de création d\'opportunité avec nouveaux champs...');

    const opportunityData = {
        title: 'Test Opportunité - Nouveaux Champs Fix',
        description: 'Test après correction des erreurs TypeScript',
        value: 25000,
        probability: 80,
        stage: 'qualification',
        expectedCloseDate: '2025-12-20',
        originAddress: 'Tunis, Tunisie',
        destinationAddress: 'Paris, France', 
        transportType: 'complet',
        traffic: 'export',
        serviceFrequency: 'monthly',
        engineType: 1,
        specialRequirements: 'Transport prioritaire',
        assignedToId: 3,
        priority: 'high',
        source: 'test_fix'
    };

    try {
        console.log('📤 Création de l\'opportunité...');
        const response = await fetch(`${API_URL}/crm/opportunities`, {
            method: 'POST',
            headers,
            body: JSON.stringify(opportunityData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Opportunité créée avec succès:', result.id);

        // Vérifier les champs
        console.log('🔍 Vérification des champs:');
        console.log(`- Transport Type: ${result.transportType} (attendu: complet)`);
        console.log(`- Traffic: ${result.traffic} (attendu: export)`);
        console.log(`- Engine Type: ${result.engineType} (attendu: 1)`);
        
        return result;

    } catch (error) {
        console.error('❌ Erreur lors de la création:', error.message);
        return null;
    }
}

async function testLeadCreation() {
    console.log('\n🧪 Test de création de prospect avec nouveaux champs...');

    const leadData = {
        fullName: 'Ahmed Ben Salah',
        email: 'ahmed.bensalah@testfix.com',
        phone: '+216 98 765 432',
        company: 'Test Fix Transport',
        position: 'Directeur Logistique',
        source: 'website',
        traffic: 'import',
        engineType: 2,
        notes: 'Test après correction des erreurs de validation'
    };

    try {
        console.log('📤 Création du prospect...');
        const response = await fetch(`${API_URL}/crm/leads`, {
            method: 'POST',
            headers,
            body: JSON.stringify(leadData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Prospect créé avec succès:', result.id);
        console.log(`- Traffic: ${result.traffic} (attendu: import)`);
        console.log(`- Engine Type: ${result.engineType} (attendu: 2)`);
        
        return result;

    } catch (error) {
        console.error('❌ Erreur lors de la création du prospect:', error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 Début des tests de validation des corrections\n');
    
    const opportunity = await testOpportunityCreation();
    const lead = await testLeadCreation();
    
    console.log('\n📊 Résumé des tests:');
    console.log(`- Création d'opportunité: ${opportunity ? '✅ Réussie' : '❌ Échouée'}`);
    console.log(`- Création de prospect: ${lead ? '✅ Réussie' : '❌ Échouée'}`);
    
    if (opportunity && lead) {
        console.log('\n🎉 Toutes les corrections fonctionnent correctement !');
    } else {
        console.log('\n⚠️  Certains tests ont échoué, vérifier les logs ci-dessus.');
    }
}

// Attendre que le serveur soit prêt
setTimeout(() => {
    main().catch(console.error);
}, 3000);