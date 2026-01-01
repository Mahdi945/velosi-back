/**
 * Script de test pour vérifier que le service d'envoi d'email fonctionne
 * 
 * Usage: node test-email-service.js
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailService() {
  console.log('🧪 Test du service d\'envoi d\'email...\n');
  
  // Afficher la configuration
  console.log('📋 Configuration SMTP:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  SMTP_USER:', process.env.SMTP_USER);
  console.log('  SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.slice(-4) : 'NON DÉFINI');
  console.log('  SMTP_FROM:', process.env.SMTP_FROM);
  console.log('  SMTP_FROM_NAME:', process.env.SMTP_FROM_NAME);
  console.log('  SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('');
  
  // Vérifier que les variables essentielles sont définies
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('❌ ERREUR: SMTP_USER et SMTP_PASSWORD doivent être définis dans le fichier .env');
    process.exit(1);
  }
  
  try {
    // Créer le transporter
    console.log('🔧 Création du transporter...');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    
    console.log('✅ Transporter créé\n');
    
    // Vérifier la connexion
    console.log('🔌 Vérification de la connexion SMTP...');
    await transporter.verify();
    console.log('✅ Connexion SMTP vérifiée avec succès!\n');
    
    // Envoyer un email de test
    console.log('📧 Envoi d\'un email de test...');
    const testEmail = process.env.SMTP_USER; // Envoyer à soi-même
    
    const info = await transporter.sendMail({
      from: {
        name: process.env.SMTP_FROM_NAME || 'Shipnology ERP',
        address: process.env.SMTP_FROM || process.env.SMTP_USER,
      },
      to: testEmail,
      subject: '🧪 Test du service email Shipnology ERP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea;">✅ Test réussi!</h2>
          <p>Ce message confirme que votre service d'envoi d'email fonctionne correctement.</p>
          <div style="background: #f0f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Configuration testée:</strong>
            <ul>
              <li>Serveur SMTP: ${process.env.SMTP_HOST}</li>
              <li>Port: ${process.env.SMTP_PORT}</li>
              <li>Utilisateur: ${process.env.SMTP_USER}</li>
              <li>Expéditeur: ${process.env.SMTP_FROM}</li>
            </ul>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Test effectué le ${new Date().toLocaleString('fr-FR')}
          </p>
        </div>
      `,
    });
    
    console.log('✅ Email de test envoyé avec succès!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📧 Destinataire:', testEmail);
    console.log('\n✨ Tous les tests ont réussi! Le service email fonctionne correctement.\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR lors du test:', error.message);
    console.error('\n📋 Détails de l\'erreur:');
    console.error(error);
    
    console.error('\n💡 Suggestions:');
    if (error.code === 'EAUTH') {
      console.error('  - Vérifiez que SMTP_USER et SMTP_PASSWORD sont corrects');
      console.error('  - Pour Gmail, utilisez un mot de passe d\'application: https://myaccount.google.com/apppasswords');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('  - Vérifiez votre connexion internet');
      console.error('  - Vérifiez que SMTP_HOST et SMTP_PORT sont corrects');
      console.error('  - Vérifiez votre pare-feu');
    } else {
      console.error('  - Vérifiez toutes les variables d\'environnement dans le fichier .env');
    }
    
    process.exit(1);
  }
}

// Exécuter le test
testEmailService();
