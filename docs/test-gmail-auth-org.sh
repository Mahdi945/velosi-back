#!/bin/bash
# Test authentification Gmail depuis VPS avec les credentials de l'organisation

GMAIL_USER="velosierp@gmail.com"
GMAIL_PASS="qaasamaktyqqrzet"

echo "=========================================="
echo "TEST AUTHENTIFICATION GMAIL DIRECT"
echo "=========================================="
echo ""
echo "Email: $GMAIL_USER"
echo "Pass: ${GMAIL_PASS:0:4}************${GMAIL_PASS: -4}"
echo ""

# Encoder en base64
GMAIL_USER_B64=$(echo -n "$GMAIL_USER" | base64)
GMAIL_PASS_B64=$(echo -n "$GMAIL_PASS" | base64)

echo "Test connexion Gmail port 587..."
echo ""

# Test avec openssl
(
echo "EHLO localhost"
sleep 1
echo "AUTH LOGIN"
sleep 1
echo "$GMAIL_USER_B64"
sleep 1
echo "$GMAIL_PASS_B64"
sleep 1
echo "QUIT"
) | openssl s_client -connect smtp.gmail.com:587 -starttls smtp -quiet 2>&1 | grep -E "250|235|535|534|554"

echo ""
echo "=========================================="
echo "ANALYSE:"
echo "=========================================="
echo ""
echo "Si vous voyez '235 2.7.0 Accepted':"
echo "  → App Password VALIDE"
echo "  → Probleme dans le code NodeJS"
echo ""
echo "Si vous voyez '535 5.7.8':"
echo "  → App Password INVALIDE ou REVOQUE"
echo "  → Regenerez un nouveau App Password"
echo ""
echo "Si vous voyez '535 5.7.1':"
echo "  → Google BLOQUE cette IP"
echo "  → Solution: Utiliser SendGrid pour tout"
echo ""
