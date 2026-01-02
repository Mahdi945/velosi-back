#!/bin/bash
# Test authentification Gmail après suppression de la redirection SMTP

echo "=========================================="
echo "TEST AUTHENTIFICATION GMAIL"
echo "=========================================="
echo ""

GMAIL_USER="velosierp@gmail.com"
GMAIL_PASS="qaasamaktyqqrzet"

GMAIL_USER_B64=$(echo -n "$GMAIL_USER" | base64)
GMAIL_PASS_B64=$(echo -n "$GMAIL_PASS" | base64)

echo "Email: $GMAIL_USER"
echo "User B64: $GMAIL_USER_B64"
echo ""

echo "Test connexion et authentification..."
echo ""

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
) | timeout 15 openssl s_client -connect smtp.gmail.com:587 -starttls smtp -quiet 2>&1 | grep -E "250|235|535|534|220"

echo ""
echo "=========================================="
echo "INTERPRÉTATION:"
echo "=========================================="
echo ""
echo "235 = Authentification RÉUSSIE !"
echo "535 = Authentification REFUSÉE"
echo ""
