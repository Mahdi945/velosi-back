// Test simple pour créer un client permanent et vérifier
console.log('🔧 Script de test - Création client permanent');

const testClientPermanent = {
  nom: 'TEST CLIENT PERMANENT',
  interlocuteur: 'Test Permanent User',
  email: 'test.permanent@example.com',
  adresse: 'Test Address',
  code_postal: '1000',
  ville: 'Tunis',
  pays: 'TN',
  categorie: 'local',
  type_client: 'particulier',
  statut: 'actif',
  is_permanent: true,
  mot_de_passe: 'testpassword123'
};

console.log('Données du client à créer:', JSON.stringify(testClientPermanent, null, 2));

// Pour le moment, c'est juste pour voir la structure des données
console.log('✅ Structure préparée pour test client permanent');