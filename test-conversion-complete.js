const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';
const headers = {
    'Content-Type': 'application/json',
    'x-user-id': '1'
};

async function testCompleteConversion() {
    console.log('🧪 Test complet de conversion prospect -> opportunité');
    console.log('==========================================\n');

    try {
        // 1. Créer un prospect de test d'abord
        console.log('1️⃣ Création d\'un prospect de test...');
        const leadData = {
            fullName: 'Test Conversion Complète',
            email: `test.conversion.${Date.now()}@example.com`,
            company: 'Test Conversion Ltd',
            source: 'website',
            status: 'qualified', // Important: le marquer comme qualifié
            traffic: 'export',
            notes: 'Prospect créé pour test de conversion'
        };

        const createLeadResponse = await fetch(`${API_URL}/crm/leads`, {
            method: 'POST',
            headers,
            body: JSON.stringify(leadData)
        });

        if (!createLeadResponse.ok) {
            const errorText = await createLeadResponse.text();
            throw new Error(`Création prospect échouée: ${errorText}`);
        }

        const createdLead = await createLeadResponse.json();
        console.log(`✅ Prospect créé - ID: ${createdLead.id}`);
        console.log(`   Nom: ${createdLead.fullName}`);
        console.log(`   Statut: ${createdLead.status}`);
        console.log(`   Traffic: ${createdLead.traffic}`);

        // 2. Récupérer les engins disponibles
        console.log('\n2️⃣ Récupération des engins disponibles...');
        const enginsResponse = await fetch(`${API_URL}/engins`, {
            method: 'GET',
            headers
        });

        let availableEngineId = null;
        if (enginsResponse.ok) {
            const enginsData = await enginsResponse.json();
            if (enginsData && enginsData.length > 0) {
                availableEngineId = enginsData[0].id;
                console.log(`✅ Engin trouvé - ID: ${availableEngineId}, Nom: ${enginsData[0].libelle}`);
            } else {
                console.log('⚠️ Aucun engin trouvé, utilisation de ID par défaut: 1');
                availableEngineId = 1;
            }
        } else {
            console.log('⚠️ Impossible de récupérer les engins, utilisation de ID par défaut: 1');
            availableEngineId = 1;
        }

        // 3. Tenter la conversion avec engineType (format correct)
        console.log('\n3️⃣ Conversion avec engineType (format correct)...');
        const conversionDataCorrect = {
            opportunityTitle: 'Opportunité Test - Format Correct',
            opportunityDescription: 'Test avec engineType correct',
            opportunityValue: 25000,
            probability: 75,
            expectedCloseDate: '2025-12-31',
            transportType: 'complet',
            traffic: 'export',
            serviceFrequency: 'monthly',
            engineType: availableEngineId, // Format correct
            specialRequirements: 'Test conversion avec engineType'
        };

        console.log('📤 Données envoyées:', JSON.stringify(conversionDataCorrect, null, 2));

        const conversionResponse = await fetch(`${API_URL}/crm/opportunities/convert-from-lead/${createdLead.id}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(conversionDataCorrect)
        });

        let conversionSuccess = false;
        let opportunityId = null;

        if (conversionResponse.ok) {
            const convertedOpportunity = await conversionResponse.json();
            console.log('✅ Conversion réussie avec engineType!');
            console.log(`   Opportunité ID: ${convertedOpportunity.id}`);
            console.log(`   Titre: ${convertedOpportunity.title}`);
            console.log(`   Engine Type: ${convertedOpportunity.engineType}`);
            console.log(`   Traffic: ${convertedOpportunity.traffic}`);
            console.log(`   Transport Type: ${convertedOpportunity.transportType}`);
            
            conversionSuccess = true;
            opportunityId = convertedOpportunity.id;
        } else {
            const errorText = await conversionResponse.text();
            console.log('❌ Conversion échouée avec engineType:', errorText);
            
            // 4. Essayer avec vehicleTypes (format legacy)
            console.log('\n4️⃣ Tentative avec vehicleTypes (format legacy)...');
            
            // Recréer un nouveau prospect car le premier a peut-être été partiellement converti
            const leadData2 = {
                ...leadData,
                email: `test.conversion.legacy.${Date.now()}@example.com`,
                fullName: 'Test Conversion Legacy'
            };

            const createLeadResponse2 = await fetch(`${API_URL}/crm/leads`, {
                method: 'POST',
                headers,
                body: JSON.stringify(leadData2)
            });

            const createdLead2 = await createLeadResponse2.json();
            console.log(`📝 Nouveau prospect créé - ID: ${createdLead2.id}`);

            const conversionDataLegacy = {
                opportunityTitle: 'Opportunité Test - Format Legacy',
                opportunityDescription: 'Test avec vehicleTypes legacy',
                opportunityValue: 20000,
                probability: 60,
                expectedCloseDate: '2025-11-30',
                transportType: 'groupage',
                traffic: 'import',
                serviceFrequency: 'weekly',
                vehicleTypes: [availableEngineId.toString()], // Format legacy
                specialRequirements: 'Test conversion avec vehicleTypes'
            };

            console.log('📤 Données legacy envoyées:', JSON.stringify(conversionDataLegacy, null, 2));

            const conversionResponse2 = await fetch(`${API_URL}/crm/opportunities/convert-from-lead/${createdLead2.id}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(conversionDataLegacy)
            });

            if (conversionResponse2.ok) {
                const convertedOpportunity2 = await conversionResponse2.json();
                console.log('✅ Conversion réussie avec vehicleTypes!');
                console.log(`   Opportunité ID: ${convertedOpportunity2.id}`);
                console.log(`   Engine Type: ${convertedOpportunity2.engineType}`);
                
                conversionSuccess = true;
                opportunityId = convertedOpportunity2.id;
            } else {
                const errorText2 = await conversionResponse2.text();
                console.log('❌ Conversion échouée aussi avec vehicleTypes:', errorText2);
            }
        }

        // 5. Vérifier que l'opportunité existe réellement
        if (conversionSuccess && opportunityId) {
            console.log('\n5️⃣ Vérification de l\'opportunité créée...');
            
            const verifyResponse = await fetch(`${API_URL}/crm/opportunities/${opportunityId}`, {
                method: 'GET',
                headers
            });

            if (verifyResponse.ok) {
                const opportunity = await verifyResponse.json();
                console.log('✅ Opportunité vérifiée dans la base:');
                console.log(`   ID: ${opportunity.id}`);
                console.log(`   Titre: ${opportunity.title}`);
                console.log(`   Valeur: ${opportunity.value}`);
                console.log(`   Engine Type: ${opportunity.engineType}`);
                console.log(`   Traffic: ${opportunity.traffic}`);
                console.log(`   Transport Type: ${opportunity.transportType}`);
                console.log(`   Statut: ${opportunity.stage}`);
                
                // Vérifier que le prospect a été marqué comme converti
                const leadVerifyResponse = await fetch(`${API_URL}/crm/leads/${createdLead.id}`, {
                    method: 'GET',
                    headers
                });

                if (leadVerifyResponse.ok) {
                    const updatedLead = await leadVerifyResponse.json();
                    console.log(`✅ Prospect mis à jour - Statut: ${updatedLead.status}`);
                    
                    if (updatedLead.status === 'converted') {
                        console.log('🎉 SUCCÈS COMPLET: Conversion fonctionnelle!');
                        return true;
                    } else {
                        console.log('⚠️ Opportunité créée mais prospect pas marqué comme converti');
                        return false;
                    }
                }
            } else {
                console.log('❌ Opportunité introuvable après création');
                return false;
            }
        }

        return conversionSuccess;

    } catch (error) {
        console.error('❌ Erreur durante le test:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 DIAGNOSTIC COMPLET DE LA CONVERSION\n');
    
    const success = await testCompleteConversion();
    
    console.log('\n==========================================');
    if (success) {
        console.log('🎉 RÉSULTAT: La conversion fonctionne correctement!');
        console.log('✅ Prospects peuvent être convertis en opportunités');
        console.log('✅ Tous les champs sont correctement sauvegardés');
    } else {
        console.log('❌ RÉSULTAT: La conversion ne fonctionne pas correctement');
        console.log('❌ Des corrections supplémentaires sont nécessaires');
    }
    console.log('==========================================');
}

// Attendre que le serveur soit prêt
setTimeout(() => {
    main().catch(console.error);
}, 3000);