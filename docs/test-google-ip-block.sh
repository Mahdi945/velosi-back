#!/bin/bash
# Test pour verifier si Google bloque l'IP du VPS OVH
# Teste la connexion SMTP Gmail avec authentification

echo "=========================================="
echo "TEST: Google bloque-t-il l'IP du VPS OVH ?"
echo "=========================================="
echo ""

# Afficher l'IP du serveur
echo "IP publique du VPS:"
PUBLIC_IP=$(curl -s ifconfig.me)
echo "  $PUBLIC_IP"
echo ""

# Test 1: Connexion au serveur Gmail SMTP
echo "[TEST 1] Connexion au serveur Gmail (port 587)..."
echo "--------------------------------------------------"
timeout 10 bash -c 'cat < /dev/null > /dev/tcp/smtp.gmail.com/587' 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Port 587 accessible"
else
    echo "✗ Port 587 bloque"
    exit 1
fi
echo ""

# Test 2: Test SSL/TLS avec Gmail
echo "[TEST 2] Connexion SSL/TLS a Gmail..."
echo "--------------------------------------------------"
GMAIL_RESPONSE=$(timeout 10 openssl s_client -connect smtp.gmail.com:587 -starttls smtp -quiet 2>&1 | head -20)
echo "$GMAIL_RESPONSE"

if echo "$GMAIL_RESPONSE" | grep -q "220 smtp.gmail.com"; then
    echo ""
    echo "✓ Connexion SSL etablie avec Gmail"
else
    echo ""
    echo "✗ Probleme de connexion SSL avec Gmail"
fi
echo ""

# Test 3: Authentification Gmail (avec vos vrais credentials)
echo "[TEST 3] Test d'authentification Gmail..."
echo "--------------------------------------------------"
echo "Entrez vos credentials Gmail (ceux qui marchent en localhost):"
read -p "Email Gmail: " GMAIL_USER
read -sp "Mot de passe: " GMAIL_PASS
echo ""
echo ""

# Encoder en base64
GMAIL_USER_B64=$(echo -n "$GMAIL_USER" | base64)
GMAIL_PASS_B64=$(echo -n "$GMAIL_PASS" | base64)

echo "Test d'authentification..."
AUTH_TEST=$(timeout 15 openssl s_client -connect smtp.gmail.com:587 -starttls smtp -quiet 2>/dev/null << EOF
EHLO localhost
AUTH LOGIN
$GMAIL_USER_B64
$GMAIL_PASS_B64
QUIT
EOF
)

echo "$AUTH_TEST"
echo ""

# Analyser la reponse
if echo "$AUTH_TEST" | grep -q "235"; then
    echo "=========================================="
    echo "✓✓✓ SUCCES: Authentification reussie !"
    echo "=========================================="
    echo ""
    echo "Google N'EST PAS bloquant votre VPS."
    echo "Le probleme vient probablement de votre code backend."
    echo ""
    echo "Verifiez:"
    echo "  1. Les credentials sont bien charges depuis la BDD"
    echo "  2. Le service email utilise les bons parametres"
    echo "  3. Les logs du backend: pm2 logs velosi-backend"
    
elif echo "$AUTH_TEST" | grep -q "535"; then
    echo "=========================================="
    echo "✗✗✗ ERREUR 535: Authentification echouee"
    echo "=========================================="
    echo ""
    echo "CAUSES POSSIBLES:"
    echo ""
    echo "1. Google BLOQUE votre IP VPS OVH"
    echo "   → Gmail detecte l'IP comme suspecte"
    echo "   → Solution: Activer 'Acces moins securise'"
    echo "   → https://myaccount.google.com/lesssecureapps"
    echo ""
    echo "2. Mot de passe incorrect"
    echo "   → Verifiez que c'est le bon mot de passe"
    echo "   → Utilisez un App Password si 2FA active"
    echo ""
    echo "3. Compte Gmail verrouille"
    echo "   → Verifiez vos emails pour alerte de securite"
    echo "   → Autorisez l'acces depuis cette localisation"
    echo ""
    echo "VERIFICATION:"
    echo "Allez sur: https://myaccount.google.com/notifications"
    echo "Verifiez s'il y a une alerte de connexion suspecte"
    echo ""
    echo "IP du VPS a autoriser: $PUBLIC_IP"
    
elif echo "$AUTH_TEST" | grep -q "534"; then
    echo "=========================================="
    echo "✗ ERREUR 534: Acces refuse"
    echo "=========================================="
    echo ""
    echo "Google BLOQUE votre VPS OVH."
    echo ""
    echo "Solution:"
    echo "  1. Activez 'Autoriser les applications moins securisees'"
    echo "     https://myaccount.google.com/lesssecureapps"
    echo ""
    echo "  2. OU utilisez un App Password"
    echo "     https://myaccount.google.com/apppasswords"
    
else
    echo "=========================================="
    echo "✗ Erreur inconnue"
    echo "=========================================="
    echo ""
    echo "Reponse du serveur:"
    echo "$AUTH_TEST"
fi

echo ""
echo "=========================================="
echo "Test termine"
echo "=========================================="
