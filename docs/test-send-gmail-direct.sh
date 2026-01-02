#!/bin/bash
# Test envoi email RÉEL via Gmail - Organisation Velosi

echo "=========================================="
echo "📧 ENVOI EMAIL RÉEL - Gmail Direct"
echo "=========================================="
echo ""

cd ~/velosi-back

cat > /tmp/test-send-gmail.js << 'ENDJS'
const nodemailer = require('nodemailer');

console.log('Configuration Gmail direct...');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'velosierp@gmail.com',
    pass: 'qaasamaktyqqrzet',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const mailOptions = {
  from: '"Velosi ERP" <velosierp@gmail.com>',
  to: 'velosierp@gmail.com',
  subject: '✅ Test Email RÉUSSI - VPS OVH via Gmail Direct',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #27ae60;">🎉 Email Envoyé avec Succès !</h1>
      
      <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
        <strong>✅ PROBLÈME RÉSOLU !</strong>
        <p>La règle iptables de redirection SMTP a été supprimée.</p>
        <p>Les emails passent maintenant directement vers Gmail.</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h2 style="color: #3498db;">📊 Informations</h2>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Organisation:</strong> Velosi</li>
          <li><strong>De:</strong> velosierp@gmail.com</li>
          <li><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</li>
          <li><strong>Serveur:</strong> VPS OVH</li>
          <li><strong>Route:</strong> Gmail Direct (plus d'interception Exim)</li>
        </ul>
      </div>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <strong>⚠️ IMPORTANT:</strong>
        <p>Pour rendre ce changement permanent, désactivez "SMTP Restrictions" dans WHM/cPanel.</p>
      </div>
      
      <p style="color: #7f8c8d; font-size: 12px;">
        Email de test Velosi ERP - ${new Date().toISOString()}
      </p>
    </div>
  `,
};

console.log('📤 Envoi en cours...');
console.log('   De:', mailOptions.from);
console.log('   À:', mailOptions.to);
console.log('');

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ ERREUR:', error.message);
    console.error('Code:', error.code);
    if (error.response) console.error('Response:', error.response);
    process.exit(1);
  } else {
    console.log('✅ EMAIL ENVOYÉ AVEC SUCCÈS !');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('');
    console.log('📬 Vérifiez votre boîte mail: velosierp@gmail.com');
    process.exit(0);
  }
});
ENDJS

node /tmp/test-send-gmail.js
rm -f /tmp/test-send-gmail.js
