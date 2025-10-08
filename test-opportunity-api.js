const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';

async function testOpportunityAPI() {
    console.log('🔍 Test de l\'API des opportunités...\n');
    
    try {
        // 1. Test de récupération des prospects
        console.log('1. Récupération des prospects...');
        const leadsResponse = await fetch(`${API_URL}/crm/leads`);
        const leadsData = await leadsResponse.json();
        console.log(`   Statut: ${leadsResponse.status}`);
        console.log(`   Prospects trouvés: ${leadsData.data ? leadsData.data.length : 0}`);
        
        if (leadsData.data && leadsData.data.length > 0) {
            const firstLead = leadsData.data[0];
            console.log(`   Premier prospect: ${firstLead.fullName} (ID: ${firstLead.id})`);
            
            // 2. Test de récupération des opportunités
            console.log('\n2. Récupération des opportunités...');
            const opportunitiesResponse = await fetch(`${API_URL}/crm/opportunities`);
            const opportunitiesData = await opportunitiesResponse.json();
            console.log(`   Statut: ${opportunitiesResponse.status}`);
            console.log(`   Opportunités trouvées: ${opportunitiesData.data ? opportunitiesData.data.length : 0}`);
            
            // 3. Test de conversion (si pas déjà converti)
            if (firstLead.status !== 'converted') {
                console.log(`\n3. Test de conversion du prospect ID ${firstLead.id}...`);
                const conversionData = {
                    opportunityTitle: `Opportunité Test - ${firstLead.fullName}`,
                    opportunityDescription: 'Test de conversion automatique',
                    opportunityValue: 5000,
                    probability: 25,
                    priority: 'medium',
                    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +30 jours
                };
                
                const conversionResponse = await fetch(`${API_URL}/crm/opportunities/convert-from-lead/${firstLead.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(conversionData)
                });
                
                const conversionResult = await conversionResponse.json();
                console.log(`   Statut conversion: ${conversionResponse.status}`);
                console.log(`   Résultat:`, conversionResult);
                
                if (conversionResult.success) {
                    console.log('   ✅ Conversion réussie !');
                    
                    // 4. Vérification post-conversion
                    console.log('\n4. Vérification post-conversion...');
                    const newOpportunitiesResponse = await fetch(`${API_URL}/crm/opportunities`);
                    const newOpportunitiesData = await newOpportunitiesResponse.json();
                    console.log(`   Nouvelles opportunités: ${newOpportunitiesData.data ? newOpportunitiesData.data.length : 0}`);
                    
                    // Vérifier le statut du prospect
                    const updatedLeadResponse = await fetch(`${API_URL}/crm/leads/${firstLead.id}`);
                    const updatedLeadData = await updatedLeadResponse.json();
                    console.log(`   Statut prospect mis à jour: ${updatedLeadData.data?.status}`);
                } else {
                    console.log('   ❌ Échec de la conversion:', conversionResult.message);
                }
            } else {
                console.log('\n3. Le prospect est déjà converti, on skip le test de conversion');
            }
        } else {
            console.log('   ⚠️ Aucun prospect trouvé pour tester la conversion');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
    }
}

// Installation de node-fetch si nécessaire
try {
    require('node-fetch');
} catch (e) {
    console.log('⚠️ node-fetch non installé. Installation...');
    require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
}

testOpportunityAPI();