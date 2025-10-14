const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';
const headers = {
    'Content-Type': 'application/json',
    'x-user-id': '1'
};

async function testOpportunityOperations() {
    console.log('🧪 Test complet des opérations sur opportunités avec nouveaux champs');
    console.log('===============================================================\n');

    try {
        // 1. Test création d'opportunité avec vehicleTypes (format legacy)
        console.log('1️⃣ Test création d\'opportunité avec vehicleTypes...');
        const createDataLegacy = {
            title: 'Test Création - VehicleTypes Legacy',
            description: 'Test avec vehicleTypes pour vérifier la compatibilité',
            value: 15000,
            probability: 70,
            stage: 'qualification',
            expectedCloseDate: '2025-12-15',
            transportType: 'complet',
            traffic: 'export',
            serviceFrequency: 'monthly',
            vehicleTypes: ['1'], // Format legacy
            specialRequirements: 'Test création avec vehicleTypes',
            priority: 'high'
        };

        console.log('📤 Données création legacy:', JSON.stringify(createDataLegacy, null, 2));

        const createResponse = await fetch(`${API_URL}/crm/opportunities`, {
            method: 'POST',
            headers,
            body: JSON.stringify(createDataLegacy)
        });

        let createdOpportunityId = null;
        if (createResponse.ok) {
            const createdOpp = await createResponse.json();
            createdOpportunityId = createdOpp.id;
            console.log('✅ Création réussie avec vehicleTypes!');
            console.log(`   ID: ${createdOpp.id}`);
            console.log(`   Engine Type: ${createdOpp.engineType}`);
            console.log(`   Traffic: ${createdOpp.traffic}`);
            console.log(`   Transport Type: ${createdOpp.transportType}`);
        } else {
            const errorText = await createResponse.text();
            console.log('❌ Création échouée avec vehicleTypes:', errorText);
        }

        // 2. Test création d'opportunité avec engineType (format correct)
        console.log('\n2️⃣ Test création d\'opportunité avec engineType...');
        const createDataCorrect = {
            title: 'Test Création - EngineType Correct',
            description: 'Test avec engineType correct',
            value: 20000,
            probability: 80,
            stage: 'qualification',
            expectedCloseDate: '2025-12-20',
            transportType: 'groupage',
            traffic: 'import',
            serviceFrequency: 'weekly',
            engineType: 2, // Format correct
            specialRequirements: 'Test création avec engineType',
            priority: 'medium'
        };

        console.log('📤 Données création correcte:', JSON.stringify(createDataCorrect, null, 2));

        const createResponse2 = await fetch(`${API_URL}/crm/opportunities`, {
            method: 'POST',
            headers,
            body: JSON.stringify(createDataCorrect)
        });

        if (createResponse2.ok) {
            const createdOpp2 = await createResponse2.json();
            console.log('✅ Création réussie avec engineType!');
            console.log(`   ID: ${createdOpp2.id}`);
            console.log(`   Engine Type: ${createdOpp2.engineType}`);
            console.log(`   Traffic: ${createdOpp2.traffic}`);
        } else {
            const errorText = await createResponse2.text();
            console.log('❌ Création échouée avec engineType:', errorText);
        }

        // 3. Test modification d'opportunité avec vehicleTypes
        if (createdOpportunityId) {
            console.log('\n3️⃣ Test modification d\'opportunité avec vehicleTypes...');
            const updateDataLegacy = {
                title: 'Test Modification - VehicleTypes Update',
                traffic: 'import', // Changer le traffic
                vehicleTypes: ['3'], // Changer l'engin
                probability: 90
            };

            console.log('📤 Données modification legacy:', JSON.stringify(updateDataLegacy, null, 2));

            const updateResponse = await fetch(`${API_URL}/crm/opportunities/${createdOpportunityId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updateDataLegacy)
            });

            if (updateResponse.ok) {
                const updatedOpp = await updateResponse.json();
                console.log('✅ Modification réussie avec vehicleTypes!');
                console.log(`   Engine Type: ${updatedOpp.engineType}`);
                console.log(`   Traffic: ${updatedOpp.traffic}`);
                console.log(`   Probability: ${updatedOpp.probability}`);
            } else {
                const errorText = await updateResponse.text();
                console.log('❌ Modification échouée avec vehicleTypes:', errorText);
            }

            // 4. Test modification avec engineType (format correct)
            console.log('\n4️⃣ Test modification d\'opportunité avec engineType...');
            const updateDataCorrect = {
                title: 'Test Modification - EngineType Correct',
                traffic: 'export', // Changer le traffic encore
                engineType: 4, // Format correct
                probability: 95
            };

            console.log('📤 Données modification correcte:', JSON.stringify(updateDataCorrect, null, 2));

            const updateResponse2 = await fetch(`${API_URL}/crm/opportunities/${createdOpportunityId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updateDataCorrect)
            });

            if (updateResponse2.ok) {
                const updatedOpp2 = await updateResponse2.json();
                console.log('✅ Modification réussie avec engineType!');
                console.log(`   Engine Type: ${updatedOpp2.engineType}`);
                console.log(`   Traffic: ${updatedOpp2.traffic}`);
            } else {
                const errorText = await updateResponse2.text();
                console.log('❌ Modification échouée avec engineType:', errorText);
            }
        }

        // 5. Test de conversion prospect vers opportunité
        console.log('\n5️⃣ Test conversion prospect vers opportunité...');
        
        // Créer un prospect d'abord
        const leadData = {
            fullName: 'Test Conversion Traffic',
            email: `test.traffic.conversion.${Date.now()}@example.com`,
            company: 'Traffic Test Co',
            source: 'website',
            status: 'qualified',
            traffic: 'export'
        };

        const leadResponse = await fetch(`${API_URL}/crm/leads`, {
            method: 'POST',
            headers,
            body: JSON.stringify(leadData)
        });

        if (leadResponse.ok) {
            const createdLead = await leadResponse.json();
            console.log(`📝 Prospect créé - ID: ${createdLead.id}, Traffic: ${createdLead.traffic}`);

            // Convertir en opportunité
            const conversionData = {
                opportunityTitle: 'Conversion Test - Traffic & Engine',
                opportunityDescription: 'Test complet de conversion avec traffic et engine',
                opportunityValue: 30000,
                probability: 85,
                expectedCloseDate: '2025-12-31',
                transportType: 'projet',
                traffic: 'export',
                serviceFrequency: 'monthly',
                vehicleTypes: ['2'], // Utiliser vehicleTypes pour tester
                specialRequirements: 'Conversion avec traffic et engin'
            };

            console.log('📤 Données conversion:', JSON.stringify(conversionData, null, 2));

            const conversionResponse = await fetch(`${API_URL}/crm/opportunities/convert-from-lead/${createdLead.id}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(conversionData)
            });

            if (conversionResponse.ok) {
                const convertedOpp = await conversionResponse.json();
                console.log('✅ Conversion réussie!');
                console.log(`   Opportunité ID: ${convertedOpp.id}`);
                console.log(`   Traffic: ${convertedOpp.traffic}`);
                console.log(`   Engine Type: ${convertedOpp.engineType}`);
                console.log(`   Transport Type: ${convertedOpp.transportType}`);
                
                // Vérifier que le prospect est marqué comme converti
                const leadCheck = await fetch(`${API_URL}/crm/leads/${createdLead.id}`, {
                    method: 'GET',
                    headers
                });
                
                if (leadCheck.ok) {
                    const updatedLead = await leadCheck.json();
                    console.log(`   Prospect statut: ${updatedLead.status}`);
                    
                    if (updatedLead.status === 'converted') {
                        console.log('✅ Prospect correctement marqué comme converti!');
                    }
                }
            } else {
                const errorText = await conversionResponse.text();
                console.log('❌ Conversion échouée:', errorText);
            }
        }

    } catch (error) {
        console.error('❌ Erreur durante le test:', error.message);
    }
}

async function main() {
    console.log('🚀 TESTS COMPLETS - Opportunités avec Traffic et Engine Type\n');
    
    await testOpportunityOperations();
    
    console.log('\n===============================================================');
    console.log('🏁 Tests terminés');
    console.log('===============================================================');
}

// Attendre que le serveur soit prêt
setTimeout(() => {
    main().catch(console.error);
}, 3000);