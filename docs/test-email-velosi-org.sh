#!/bin/bash
# Test d'envoi d'email avec les credentials de l'organisation Velosi
# Via Exim local qui relaye vers Gmail

echo "=========================================================================="
echo "📧 TEST ENVOI EMAIL - Organisation Velosi"
echo "=========================================================================="
echo ""

# Credentials de l'organisation Velosi
ORG_NAME="Velosi"
SMTP_USER="velosierp@gmail.com"
SMTP_PASS="qaasamaktyqqrzet"
SMTP_FROM="velosierp@gmail.com"
SMTP_FROM_NAME="Velosi"
TEST_RECIPIENT="velosierp@gmail.com"

echo "Configuration:"
echo "  Organisation: $ORG_NAME"
echo "  SMTP User: $SMTP_USER"
echo "  From: $SMTP_FROM_NAME <$SMTP_FROM>"
echo "  To: $TEST_RECIPIENT"
echo ""

# 1. Vérifier qu'Exim écoute sur localhost
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Vérification Exim local..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

EXIM_RUNNING=$(netstat -tuln 2>/dev/null | grep ":587 " | grep "127.0.0.1" || ss -tuln 2>/dev/null | grep ":587 " | grep "127.0.0.1")

if [ -n "$EXIM_RUNNING" ]; then
    echo "✅ Exim écoute sur localhost:587"
    echo "$EXIM_RUNNING"
else
    echo "❌ Exim n'écoute pas sur localhost:587"
    echo ""
    echo "Ports actifs:"
    netstat -tuln 2>/dev/null | grep ":587" || ss -tuln 2>/dev/null | grep ":587"
    exit 1
fi

# 2. Test de connexion à Exim local
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Test connexion Exim local..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

EXIM_CONNECT=$(timeout 5 bash -c "echo 'QUIT' | nc localhost 587" 2>&1 | head -5)

if echo "$EXIM_CONNECT" | grep -q "220"; then
    echo "✅ Connexion à Exim réussie"
    echo "$EXIM_CONNECT"
else
    echo "❌ Impossible de se connecter à Exim local"
    echo "$EXIM_CONNECT"
    exit 1
fi

# 3. Créer un script Node.js de test
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Préparation du test d'envoi Node.js..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat > /tmp/test-email-velosi.js << 'ENDJS'
const nodemailer = require('nodemailer');

console.log('📧 Configuration Nodemailer...');
console.log('');

// Configuration: localhost (Exim) qui relayera vers Gmail
const transporter = nodemailer.createTransport({
  host: 'localhost',  // ← Exim local
  port: 587,
  secure: false,  // STARTTLS
  auth: {
    user: 'velosierp@gmail.com',
    pass: 'qaasamaktyqqrzet',
  },
  tls: {
    rejectUnauthorized: false,
  },
  debug: true,  // Activer les logs détaillés
  logger: true
});

const mailOptions = {
  from: '"Velosi ERP" <velosierp@gmail.com>',
  to: 'velosierp@gmail.com',
  subject: '✅ Test Email Multi-Provider - Organisation Velosi',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2c3e50;">🎉 Test Email Réussi !</h1>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h2 style="color: #3498db;">📊 Informations</h2>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Organisation:</strong> Velosi</li>
          <li><strong>De:</strong> velosierp@gmail.com</li>
          <li><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</li>
          <li><strong>Serveur:</strong> VPS OVH (via Exim local)</li>
        </ul>
      </div>
      
      <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
        <strong>✅ Configuration Multi-Provider Fonctionnelle</strong>
        <p>Ce message confirme que:</p>
        <ul>
          <li>✓ Backend connecté à Exim local (localhost:587)</li>
          <li>✓ Exim relaye vers Gmail correctement</li>
          <li>✓ Authentification Gmail réussie</li>
          <li>✓ Système multi-organisations opérationnel</li>
        </ul>
      </div>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <strong>🔧 Architecture:</strong>
        <pre style="background: #f5f5f5; padding: 10px; overflow-x: auto;">
Backend (Node.js)
    ↓
Exim Local (localhost:587)
    ↓
Gmail SMTP (smtp.gmail.com:587)
    ↓
Email envoyé ✉️
        </pre>
      </div>
      
      <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
        Cet email a été généré automatiquement par le système de test Velosi ERP.
      </p>
    </div>
  `,
  text: `
Test Email Multi-Provider - Organisation Velosi

✅ Configuration fonctionnelle !

Informations:
- Organisation: Velosi
- De: velosierp@gmail.com
- Date: ${new Date().toLocaleString('fr-FR')}
- Serveur: VPS OVH (via Exim local)

Architecture:
Backend → Exim Local → Gmail SMTP → Email envoyé
  `
};

console.log('📤 Envoi de l\'email de test...');
console.log('   De:', mailOptions.from);
console.log('   À:', mailOptions.to);
console.log('   Sujet:', mailOptions.subject);
console.log('');

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('');
    console.error('❌ ERREUR LORS DE L\'ENVOI:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Type:', error.name);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    if (error.response) {
      console.error('Response:', error.response);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    
    console.error('💡 Causes possibles:');
    if (error.code === 'ECONNREFUSED') {
      console.error('  → Exim n\'écoute pas sur localhost:587');
      console.error('  → Vérifiez: netstat -tuln | grep :587');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('  → Timeout de connexion');
      console.error('  → Exim peut être surchargé ou bloqué');
    } else if (error.responseCode === 535) {
      console.error('  → Authentification refusée');
      console.error('  → Vérifiez les credentials Gmail');
    }
    
    process.exit(1);
  } else {
    console.log('');
    console.log('✅ EMAIL ENVOYÉ AVEC SUCCÈS !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Accepted:', info.accepted);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📬 Vérifiez votre boîte mail:', mailOptions.to);
    console.log('');
    console.log('🎉 Le système multi-provider fonctionne correctement !');
    process.exit(0);
  }
});
ENDJS

echo "✓ Script de test créé: /tmp/test-email-velosi.js"

# 4. Exécuter le test Node.js
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Envoi de l'email de test..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd ~/velosi-back
node /tmp/test-email-velosi.js

TEST_RESULT=$?

# 5. Vérifier les logs Exim
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Logs Exim (dernières lignes)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f /var/log/exim_mainlog ]; then
    echo "📋 /var/log/exim_mainlog:"
    tail -20 /var/log/exim_mainlog | grep -E "velosierp|smtp.gmail.com|T=gmail_smtp" || echo "Aucune trace d'envoi vers Gmail"
elif [ -f /var/log/exim4/mainlog ]; then
    echo "📋 /var/log/exim4/mainlog:"
    tail -20 /var/log/exim4/mainlog | grep -E "velosierp|smtp.gmail.com|T=gmail_smtp" || echo "Aucune trace d'envoi vers Gmail"
else
    echo "⚠️  Logs Exim non trouvés"
fi

# 6. Vérifier la queue d'emails
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Queue d'emails..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

QUEUE=$(exim -bp 2>/dev/null || mailq 2>/dev/null)
if [ -n "$QUEUE" ]; then
    echo "$QUEUE"
    
    if echo "$QUEUE" | grep -q "empty"; then
        echo "✅ Queue vide - emails envoyés"
    else
        echo "⚠️  Emails en attente dans la queue"
    fi
else
    echo "✓ Queue vide ou commande non disponible"
fi

# Nettoyage
rm -f /tmp/test-email-velosi.js

echo ""
echo "=========================================================================="
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ TEST RÉUSSI !"
    echo "=========================================================================="
    echo ""
    echo "📬 Vérifiez votre boîte mail: $TEST_RECIPIENT"
    echo ""
    echo "🎉 Le système multi-provider fonctionne correctement:"
    echo "  ✓ Backend connecté à Exim local"
    echo "  ✓ Exim relaye vers Gmail"
    echo "  ✓ Email envoyé avec succès"
    echo ""
else
    echo "❌ TEST ÉCHOUÉ"
    echo "=========================================================================="
    echo ""
    echo "📝 Vérifications à faire:"
    echo ""
    echo "1. Exim écoute sur localhost?"
    echo "   → netstat -tuln | grep :587"
    echo ""
    echo "2. Configuration Exim correcte?"
    echo "   → Vérifiez WHM/cPanel: Service Configuration → Exim Configuration Manager"
    echo ""
    echo "3. Logs Exim pour plus de détails:"
    echo "   → tail -f /var/log/exim_mainlog"
    echo "   → tail -f /var/log/exim_rejectlog"
    echo ""
    echo "4. OVH bloque Gmail?"
    echo "   → Test: timeout 5 bash -c 'echo QUIT | openssl s_client -connect smtp.gmail.com:587 -starttls smtp'"
    echo ""
    echo "5. Utilisez SendGrid en attendant (fonctionne!):"
    echo "   → host: smtp.sendgrid.net"
    echo "   → port: 2525"
    echo ""
fi
echo "=========================================================================="
