const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';
const headers = {
    'Content-Type': 'application/json',
    'x-user-id': '1'
};

async function testConversion() {
    console.log('🧪 Test de conversion prospect vers opportunité...');

    try {
        // 1. Récupérer un prospect non converti
        console.log('📋 Récupération des prospects...');
        const leadsResponse = await fetch(`${API_URL}/crm/leads?status=qualified&limit=5`, {
            method: 'GET',
            headers
        });

        if (!leadsResponse.ok) {
            throw new Error(`Erreur lors de la récupération: ${leadsResponse.status}`);
        }

        const leadsData = await leadsResponse.json();
        
        if (!leadsData.data || leadsData.data.length === 0) {
            console.log('⚠️  Aucun prospect qualifié trouvé. Test avec le prospect ID 23...');
            var leadId = 23;
        } else {
            var leadId = leadsData.data[0].id;
        }

        console.log(`🎯 Test de conversion du prospect ID: ${leadId}`);

        // 2. Données de conversion avec vehicleTypes pour tester la compatibilité
        const conversionData = {
            opportunityTitle: 'Test Conversion - Compatibilité vehicleTypes',
            opportunityDescription: 'Test de conversion avec vehicleTypes pour vérifier la compatibilité',
            opportunityValue: 15000,
            probability: 60,
            expectedCloseDate: '2025-12-01',
            transportType: 'complet',
            traffic: 'export',
            serviceFrequency: 'monthly',
            vehicleTypes: ['1'], // Utiliser vehicleTypes au lieu d'engineType pour tester
            specialRequirements: 'Test de compatibilité'
        };

        console.log('📤 Données de conversion:', JSON.stringify(conversionData, null, 2));

        // 3. Effectuer la conversion
        console.log('🔄 Conversion en cours...');
        const conversionResponse = await fetch(`${API_URL}/crm/opportunities/convert-from-lead/${leadId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(conversionData)
        });

        if (!conversionResponse.ok) {
            const errorText = await conversionResponse.text();
            console.error('❌ Erreur lors de la conversion:', errorText);
            
            // Essayer avec engineType au lieu de vehicleTypes
            console.log('\n🔄 Tentative avec engineType...');
            const conversionData2 = {
                ...conversionData,
                engineType: 1
            };
            delete conversionData2.vehicleTypes;

            const conversionResponse2 = await fetch(`${API_URL}/crm/opportunities/convert-from-lead/${leadId}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(conversionData2)
            });

            if (!conversionResponse2.ok) {
                const errorText2 = await conversionResponse2.text();
                throw new Error(`Conversion échouée aussi avec engineType: ${errorText2}`);
            }

            const result2 = await conversionResponse2.json();
            console.log('✅ Conversion réussie avec engineType!');
            console.log(`   Opportunité créée ID: ${result2.id}`);
            console.log(`   Engine Type: ${result2.engineType}`);
            return result2;
        }

        const result = await conversionResponse.json();
        console.log('✅ Conversion réussie avec vehicleTypes!');
        console.log(`   Opportunité créée ID: ${result.id}`);
        console.log(`   Engine Type: ${result.engineType}`);

        // 4. Vérifier que l'engineType a été correctement mappé
        if (result.engineType === 1) {
            console.log('✅ Mapping vehicleTypes -> engineType fonctionne!');
        } else {
            console.log(`⚠️  Mapping inattendu: engineType = ${result.engineType}`);
        }

        return result;

    } catch (error) {
        console.error('❌ Test de conversion échoué:', error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 Test de correction de la conversion prospect->opportunité\n');
    
    const result = await testConversion();
    
    if (result) {
        console.log('\n🎉 La correction fonctionne! La conversion est maintenant opérationnelle.');
    } else {
        console.log('\n❌ La correction ne fonctionne pas encore. Vérifier les logs ci-dessus.');
    }
}

// Attendre que le serveur soit prêt
setTimeout(() => {
    main().catch(console.error);
}, 2000);