const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log('=== Test SMTP Gmail avec no-reply@velosi.com.tn ===\n');
  
  // Test avec Gmail pour vérifier le type de mot de passe requis
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'no-reply@velosi.com.tn',
      pass: 'fkedeaplwbgcalrw'  // Mot de passe d'application Gmail
    },
    tls: {
      rejectUnauthorized: false,  // Désactiver vérification SSL stricte
      minVersion: 'TLSv1.2'
    }
  };

  console.log('Configuration:');
  console.log(`Host: ${config.host}`);
  console.log(`Port: ${config.port}`);
  console.log(`User: ${config.auth.user}`);
  console.log(`Pass: ${config.auth.pass.substring(0, 3)}***\n`);
  
  const transporter = nodemailer.createTransport(config);

  try {
    console.log('Test 1: Vérification de la connexion...');
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie avec mot de passe du compte!\n');

    console.log('Test 2: Envoi d\'un email de test...');
    const info = await transporter.sendMail({
      from: '"Velosi ERP" <no-reply@velosi.com.tn>',
      to: 'velosierp@gmail.com',
      subject: 'Test SMTP Gmail - no-reply@velosi.com.tn',
      text: 'Test pour vérifier si Gmail accepte le mot de passe du compte.',
      html: '<p>Test pour vérifier si Gmail accepte le <strong>mot de passe du compte</strong>.</p>'
    });

    console.log('✅✅✅ EMAIL ENVOYÉ AVEC SUCCÈS! ✅✅✅');
    console.log('Gmail accepte le mot de passe du compte directement!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.log('\n❌ ERREUR ❌');
    console.log('Message:', error.message);
    console.log('Code:', error.code);
    
    if (error.code === 'ESOCKET' && error.message.includes('certificate')) {
      console.log('\n⚠️  PROBLÈME DE CERTIFICAT SSL');
      console.log('Le VPS a un problème de configuration SSL/TLS.');
      console.log('Cela peut être dû à un proxy ou firewall qui intercepte les connexions.');
    }
    
    if (error.code === 'EAUTH' || error.message.includes('Invalid login')) {
      console.log('\n⚠️  AUTHENTIFICATION ÉCHOUÉE');
      console.log('Gmail EXIGE un mot de passe d\'application!');
      console.log('\nÉtapes pour créer un mot de passe d\'application:');
      console.log('1. Aller sur: https://myaccount.google.com/apppasswords');
      console.log('2. Créer un nouveau mot de passe d\'application');
      console.log('3. Utiliser ce mot de passe au lieu du mot de passe du compte');
    }
    
    if (error.response) {
      console.log('\nRéponse serveur:', error.response);
    }
  }
}

testSMTP().then(() => {
  console.log('\n=== Test terminé ===');
  process.exit(0);
}).catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
