const nodemailer = require('nodemailer');

console.log('========================================================================');
console.log('📧 TEST ENVOI EMAIL - Organisation Velosi (SendGrid)');
console.log('========================================================================');
console.log('');

// Configuration: SendGrid (qui fonctionne sur le VPS)
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 2525,
  secure: false,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY || 'SG.T-votre-clé',  // À remplacer
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const mailOptions = {
  from: '"Velosi ERP" <velosierp@gmail.com>',
  to: 'velosierp@gmail.com',
  subject: '✅ Test Email - Organisation Velosi via SendGrid',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2c3e50;">🎉 Email Envoyé via SendGrid !</h1>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h2 style="color: #3498db;">📊 Informations</h2>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Organisation:</strong> Velosi</li>
          <li><strong>De:</strong> velosierp@gmail.com</li>
          <li><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</li>
          <li><strong>Provider:</strong> SendGrid (port 2525)</li>
          <li><strong>Serveur:</strong> VPS OVH</li>
        </ul>
      </div>
      
      <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
        <strong>✅ SendGrid Fonctionnel</strong>
        <p>SendGrid utilise le port 2525 qui n'est PAS bloqué par OVH!</p>
      </div>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <strong>ℹ️  Information:</strong>
        <p>Gmail est bloqué par OVH sur les ports 587/465.</p>
        <p>Deux solutions:</p>
        <ol>
          <li>Utiliser SendGrid (fonctionne maintenant)</li>
          <li>Demander à OVH de débloquer Gmail (délai 24-48h)</li>
        </ol>
      </div>
      
      <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
        Email de test Velosi ERP - Système multi-organisations
      </p>
    </div>
  `,
};

console.log('Configuration:');
console.log('  Provider: SendGrid');
console.log('  Host: smtp.sendgrid.net');
console.log('  Port: 2525');
console.log('  From:', mailOptions.from);
console.log('  To:', mailOptions.to);
console.log('');
console.log('📤 Envoi en cours...');
console.log('');

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ ERREUR:', error.message);
    process.exit(1);
  } else {
    console.log('✅ EMAIL ENVOYÉ !');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('');
    console.log('📬 Vérifiez votre boîte mail: velosierp@gmail.com');
    process.exit(0);
  }
});
