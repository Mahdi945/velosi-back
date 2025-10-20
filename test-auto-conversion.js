/**
 * Script de Test - Conversion Automatique Prospect vers Client Permanent
 * 
 * Ce script teste la fonctionnalité d'auto-conversion lorsqu'une cotation est acceptée
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN'; // Remplacer par un vrai token

// Headers pour les requêtes authentifiées
const authHeaders = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

/**
 * Étape 1: Créer un lead (prospect)
 */
async function createLead() {
  console.log('\n📋 Étape 1: Création d\'un lead...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/crm/leads`, {
      fullName: 'Jean Dupont Test',
      company: 'Test Transport SARL',
      email: 'jean.dupont.test@example.com',
      phone: '21612345678',
      position: 'Directeur Logistique',
      industry: 'Transport',
      country: 'Tunisie',
      city: 'Tunis',
      source: 'website',
      status: 'new',
      priority: 'high',
      transportNeeds: ['aerien', 'routier'],
      traffic: 'export',
      estimatedValue: 50000
    }, { headers: authHeaders });

    console.log('✅ Lead créé avec succès:');
    console.log(`   ID: ${response.data.id}`);
    console.log(`   Nom: ${response.data.fullName}`);
    console.log(`   Email: ${response.data.email}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erreur création lead:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Étape 2: Créer une cotation liée au lead
 */
async function createQuote(leadId) {
  console.log('\n💼 Étape 2: Création d\'une cotation...');
  
  try {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30); // Valide 30 jours
    
    const response = await axios.post(`${API_BASE_URL}/crm/quotes`, {
      leadId: leadId,
      title: 'Cotation Transport Test',
      clientName: 'Jean Dupont Test',
      clientCompany: 'Test Transport SARL',
      clientEmail: 'jean.dupont.test@example.com',
      clientPhone: '21612345678',
      clientAddress: '123 Avenue de la République, Tunis',
      country: 'Tunisie',
      validUntil: validUntil.toISOString().split('T')[0],
      
      // Transport
      pickupLocation: 'Port de Radès',
      deliveryLocation: 'Paris, France',
      importExport: 'Export',
      transportType: 'aerien',
      
      // Termes
      paymentTerms: '30 jours',
      termsConditions: 'Conditions générales de vente',
      
      // Lignes de cotation
      items: [
        {
          description: 'Transport aérien - Conteneur 20 pieds',
          quantity: 1,
          unitPrice: 2500.00,
          sellingPrice: 3200.00,
          itemType: 'freight'
        },
        {
          description: 'Frais de douane',
          quantity: 1,
          unitPrice: 150.00,
          sellingPrice: 200.00,
          itemType: 'additional_cost'
        }
      ],
      
      // Calculs
      subtotal: 3400.00,
      taxRate: 19.0,
      taxAmount: 646.00,
      total: 4046.00
    }, { headers: authHeaders });

    console.log('✅ Cotation créée avec succès:');
    console.log(`   ID: ${response.data.id}`);
    console.log(`   Numéro: ${response.data.quoteNumber}`);
    console.log(`   Statut: ${response.data.status}`);
    console.log(`   Total TTC: ${response.data.total} TND`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erreur création cotation:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Étape 3: Envoyer la cotation au client
 */
async function sendQuote(quoteId) {
  console.log('\n📧 Étape 3: Envoi de la cotation...');
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/crm/quotes/${quoteId}/send`,
      {
        subject: 'Votre cotation transport',
        message: 'Bonjour, veuillez trouver ci-joint votre cotation.',
        sendEmail: true
      },
      { headers: authHeaders }
    );

    console.log('✅ Cotation envoyée avec succès');
    console.log(`   Statut: ${response.data.status}`);
    console.log(`   Date envoi: ${response.data.sentAt}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erreur envoi cotation:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Étape 4: Accepter la cotation (via l'endpoint public)
 */
async function acceptQuote(quoteUuid) {
  console.log('\n✅ Étape 4: Acceptation de la cotation...');
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/crm/quotes/public/${quoteUuid}/accept`,
      {
        notes: 'Cotation acceptée - Test automatique'
      }
    );

    console.log('✅ Cotation acceptée avec succès');
    console.log(`   Statut: ${response.data.status}`);
    console.log(`   Date acceptation: ${response.data.acceptedAt}`);
    console.log(`   Client ID: ${response.data.clientId || 'Non défini'}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erreur acceptation cotation:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Étape 5: Vérifier le client créé
 */
async function verifyClient(clientId) {
  console.log('\n🔍 Étape 5: Vérification du client créé...');
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/clients/${clientId}`,
      { headers: authHeaders }
    );

    const client = response.data;
    console.log('✅ Client trouvé:');
    console.log(`   ID: ${client.id}`);
    console.log(`   Nom: ${client.nom}`);
    console.log(`   Email: ${client.contacts?.[0]?.mail1 || 'N/A'}`);
    console.log(`   Est Permanent: ${client.is_permanent ? 'OUI ✅' : 'NON ❌'}`);
    console.log(`   Statut: ${client.statut}`);
    console.log(`   Keycloak ID: ${client.keycloak_id || 'Non défini'}`);
    
    return client;
  } catch (error) {
    console.error('❌ Erreur vérification client:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Test complet du flux
 */
async function runFullTest() {
  console.log('🚀 DÉBUT DU TEST - Conversion Automatique Prospect → Client Permanent\n');
  console.log('='.repeat(70));
  
  try {
    // Étape 1: Créer lead
    const lead = await createLead();
    await sleep(1000);
    
    // Étape 2: Créer cotation
    const quote = await createQuote(lead.id);
    await sleep(1000);
    
    // Étape 3: Envoyer cotation
    const sentQuote = await sendQuote(quote.id);
    await sleep(1000);
    
    // Étape 4: Accepter cotation
    const acceptedQuote = await acceptQuote(sentQuote.uuid);
    await sleep(2000); // Attendre que la conversion se fasse
    
    // Étape 5: Vérifier client
    if (acceptedQuote.clientId) {
      await verifyClient(acceptedQuote.clientId);
    } else {
      console.log('⚠️ Aucun client créé automatiquement');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST TERMINÉ AVEC SUCCÈS\n');
    
  } catch (error) {
    console.log('\n' + '='.repeat(70));
    console.log('❌ TEST ÉCHOUÉ\n');
    console.error('Erreur:', error.message);
  }
}

// Fonction utilitaire pour attendre
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Exécuter le test si le script est lancé directement
if (require.main === module) {
  runFullTest();
}

module.exports = {
  createLead,
  createQuote,
  sendQuote,
  acceptQuote,
  verifyClient
};
