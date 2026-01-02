// Test détaillé de l'envoi d'email sur le VPS
// Pour identifier le vrai problème quand le mot de passe fonctionne en localhost

const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('='.repeat(60));
console.log('TEST DETAILLE ENVOI EMAIL VPS');
console.log('='.repeat(60));
console.log('');

// Afficher la configuration (masquer le mot de passe)
console.log('Configuration SMTP:');
console.log('  Host:', process.env.SMTP_HOST);
console.log('  Port:', process.env.SMTP_PORT);
console.log('  Secure:', process.env.SMTP_SECURE);
console.log('  User:', process.env.SMTP_USER);
console.log('  Password:', process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.slice(-4) : 'NON DEFINI');
console.log('  From:', process.env.SMTP_FROM);
console.log('');

// Afficher l'IP du serveur
const os = require('os');
const networkInterfaces = os.networkInterfaces();
console.log('Interfaces réseau du serveur:');
Object.keys(networkInterfaces).forEach(iface => {
  networkInterfaces[iface].forEach(addr => {
    if (addr.family === 'IPv4' && !addr.internal) {
      console.log('  -', iface, ':', addr.address);
    }
  });
});
console.log('');

// Test 1: Vérification de la connexion SMTP
console.log('[TEST 1] Verification de la connexion SMTP...');
console.log('-'.repeat(60));

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  debug: true, // Mode debug activé
  logger: true, // Logs détaillés
  tls: {
    // Ne pas échouer sur les certificats invalides (pour diagnostic seulement)
    rejectUnauthorized: false,
  }
});

transporter.verify()
  .then(() => {
    console.log('');
    console.log('✓ Connexion SMTP reussie !');
    console.log('');
    
    // Test 2: Envoi d'un email de test
    console.log('[TEST 2] Envoi d\'un email de test...');
    console.log('-'.repeat(60));
    
    return transporter.sendMail({
      from: `"Test VPS Velosi" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // S'envoyer à soi-même
      subject: `Test Email VPS - ${new Date().toLocaleString('fr-FR')}`,
      text: 'Si vous recevez cet email, la configuration SMTP fonctionne correctement !',
      html: `
        <h2>✓ Configuration SMTP fonctionnelle !</h2>
        <p>Cet email a été envoyé depuis le VPS OVH.</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        <p><strong>Serveur:</strong> ${os.hostname()}</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>Host: ${process.env.SMTP_HOST}</li>
          <li>Port: ${process.env.SMTP_PORT}</li>
          <li>User: ${process.env.SMTP_USER}</li>
        </ul>
      `,
    });
  })
  .then((info) => {
    console.log('');
    console.log('✓ Email envoye avec succes !');
    console.log('  Message ID:', info.messageId);
    console.log('  Response:', info.response);
    console.log('');
    console.log('='.repeat(60));
    console.log('RESULTAT: SUCCES - La configuration fonctionne !');
    console.log('='.repeat(60));
    process.exit(0);
  })
  .catch((error) => {
    console.log('');
    console.log('✗ ERREUR DETECTEE:');
    console.log('='.repeat(60));
    console.log('');
    console.log('Message d\'erreur:', error.message);
    console.log('');
    
    if (error.code) {
      console.log('Code d\'erreur:', error.code);
      console.log('');
    }
    
    if (error.command) {
      console.log('Commande SMTP echouee:', error.command);
      console.log('');
    }
    
    if (error.response) {
      console.log('Reponse du serveur:', error.response);
      console.log('');
    }
    
    // Diagnostic selon le type d'erreur
    console.log('DIAGNOSTIC:');
    console.log('-'.repeat(60));
    
    if (error.message.includes('535')) {
      console.log('');
      console.log('Erreur 535 = Authentification echouee');
      console.log('');
      console.log('CAUSES POSSIBLES (puisque ca marche en localhost):');
      console.log('');
      console.log('1. Google bloque l\'IP de votre VPS OVH');
      console.log('   → Gmail a des restrictions geographiques');
      console.log('   → Les IPs de VPS sont souvent blacklistees');
      console.log('   → Solution: Utiliser SendGrid ou AWS SES');
      console.log('');
      console.log('2. Acces "moins securise" desactive');
      console.log('   → Allez sur: https://myaccount.google.com/lesssecureapps');
      console.log('   → Activez "Autoriser les applications moins securisees"');
      console.log('   → OU utilisez un App Password');
      console.log('');
      console.log('3. Gmail detecte une connexion suspecte');
      console.log('   → Verifiez vos emails Google pour une alerte');
      console.log('   → Autorisez l\'acces depuis le VPS');
      console.log('');
      console.log('SOLUTION RECOMMANDEE:');
      console.log('  Utilisez SendGrid (gratuit, fiable, pas de restrictions IP)');
      console.log('  → https://sendgrid.com');
      console.log('');
      
    } else if (error.code === 'ETIMEDOUT') {
      console.log('Timeout - Le serveur ne repond pas');
      console.log('→ Verifiez que les ports ne sont pas bloques');
      
    } else if (error.code === 'ECONNREFUSED') {
      console.log('Connexion refusee');
      console.log('→ Le serveur SMTP n\'est pas accessible');
      
    } else {
      console.log('Erreur inconnue');
      console.log('→ Verifiez les logs ci-dessus pour plus de details');
    }
    
    console.log('');
    console.log('='.repeat(60));
    process.exit(1);
  });
