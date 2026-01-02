#!/bin/bash
# Diagnostic COMPLET de tous les problèmes d'envoi d'emails sur VPS
# Vérifie: Exim, Postfix, Firewall, Ports, DNS, Config Backend, Variables, IP Reputation

echo "=========================================================================="
echo "🔍 DIAGNOSTIC COMPLET - PROBLÈMES EMAIL SUR VPS"
echo "=========================================================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROBLEMS_FOUND=0

# ==============================================================================
# 1. VÉRIFICATION DES SERVICES SMTP LOCAUX
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1️⃣  SERVICES SMTP LOCAUX (Exim, Postfix, Sendmail)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Recherche de services SMTP qui interceptent les connexions..."
echo ""

# Exim
if pgrep -x "exim" > /dev/null; then
    echo -e "${RED}❌ EXIM EST ACTIF${NC}"
    echo "   Status: $(systemctl is-active exim4 2>/dev/null || systemctl is-active exim 2>/dev/null || echo 'running')"
    echo "   PID: $(pgrep -x exim)"
    PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
else
    echo -e "${GREEN}✓ Exim non actif${NC}"
fi

# Postfix
if pgrep -x "master" > /dev/null && pgrep -f "postfix" > /dev/null; then
    echo -e "${RED}❌ POSTFIX EST ACTIF${NC}"
    echo "   Status: $(systemctl is-active postfix 2>/dev/null)"
    echo "   PID: $(pgrep -f postfix)"
    PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
else
    echo -e "${GREEN}✓ Postfix non actif${NC}"
fi

# Sendmail
if pgrep -x "sendmail" > /dev/null; then
    echo -e "${RED}❌ SENDMAIL EST ACTIF${NC}"
    echo "   PID: $(pgrep -x sendmail)"
    PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
else
    echo -e "${GREEN}✓ Sendmail non actif${NC}"
fi

# ==============================================================================
# 2. VÉRIFICATION DES PORTS SMTP UTILISÉS
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2️⃣  PORTS SMTP LOCAUX (25, 587, 465, 2525)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Vérification des services écoutant sur les ports SMTP..."
echo ""

# Vérifier port 25
PORT_25=$(netstat -tuln 2>/dev/null | grep ":25 " || ss -tuln 2>/dev/null | grep ":25 ")
if [ -n "$PORT_25" ]; then
    echo -e "${RED}❌ PORT 25 EST UTILISÉ LOCALEMENT${NC}"
    echo "$PORT_25"
    PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
else
    echo -e "${GREEN}✓ Port 25 libre${NC}"
fi

# Vérifier port 587
PORT_587=$(netstat -tuln 2>/dev/null | grep ":587 " || ss -tuln 2>/dev/null | grep ":587 ")
if [ -n "$PORT_587" ]; then
    echo -e "${RED}❌ PORT 587 EST UTILISÉ LOCALEMENT${NC}"
    echo "$PORT_587"
    PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
else
    echo -e "${GREEN}✓ Port 587 libre${NC}"
fi

# Vérifier port 465
PORT_465=$(netstat -tuln 2>/dev/null | grep ":465 " || ss -tuln 2>/dev/null | grep ":465 ")
if [ -n "$PORT_465" ]; then
    echo -e "${RED}❌ PORT 465 EST UTILISÉ LOCALEMENT${NC}"
    echo "$PORT_465"
    PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
else
    echo -e "${GREEN}✓ Port 465 libre${NC}"
fi

# ==============================================================================
# 3. TEST CONNEXION EXTERNE VERS GMAIL
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3️⃣  CONNEXION VERS GMAIL (smtp.gmail.com)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Test de connexion réelle vers Gmail..."
echo ""

# Test port 587
echo "Test port 587 (STARTTLS):"
GMAIL_TEST_587=$(timeout 10 bash -c "echo QUIT | openssl s_client -connect smtp.gmail.com:587 -starttls smtp 2>&1" | grep -E "Connected|Verify return code")
if echo "$GMAIL_TEST_587" | grep -q "Connected"; then
    echo -e "${GREEN}✓ Connexion réussie au port 587${NC}"
    echo "$GMAIL_TEST_587"
else
    echo -e "${RED}❌ IMPOSSIBLE DE SE CONNECTER AU PORT 587${NC}"
    echo "$GMAIL_TEST_587"
    PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
fi

echo ""

# Test port 465
echo "Test port 465 (SSL):"
GMAIL_TEST_465=$(timeout 10 bash -c "echo QUIT | openssl s_client -connect smtp.gmail.com:465 2>&1" | grep -E "Connected|Verify return code")
if echo "$GMAIL_TEST_465" | grep -q "Connected"; then
    echo -e "${GREEN}✓ Connexion réussie au port 465${NC}"
    echo "$GMAIL_TEST_465"
else
    echo -e "${RED}❌ IMPOSSIBLE DE SE CONNECTER AU PORT 465${NC}"
    echo "$GMAIL_TEST_465"
    PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
fi

# ==============================================================================
# 4. VÉRIFICATION FIREWALL
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4️⃣  FIREWALL (UFW / iptables)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# UFW
if command -v ufw &> /dev/null; then
    echo "État UFW:"
    UFW_STATUS=$(sudo ufw status 2>/dev/null || ufw status 2>/dev/null)
    echo "$UFW_STATUS"
    
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        if ! echo "$UFW_STATUS" | grep -q "587.*ALLOW.*OUT" && ! echo "$UFW_STATUS" | grep -q "465.*ALLOW.*OUT"; then
            echo -e "${YELLOW}⚠️  Ports SMTP sortants peut-être bloqués par UFW${NC}"
        fi
    fi
else
    echo "UFW non installé"
fi

echo ""

# iptables - vérifier les règles OUTPUT
echo "Règles iptables OUTPUT (sortant):"
IPTABLES_OUTPUT=$(sudo iptables -L OUTPUT -n -v 2>/dev/null || iptables -L OUTPUT -n -v 2>/dev/null)
if echo "$IPTABLES_OUTPUT" | grep -q "DROP\|REJECT"; then
    echo -e "${YELLOW}⚠️  Règles de blocage détectées:${NC}"
    echo "$IPTABLES_OUTPUT" | grep -E "DROP|REJECT"
else
    echo -e "${GREEN}✓ Pas de règles de blocage sortant${NC}"
fi

# ==============================================================================
# 5. VÉRIFICATION DNS ET IP
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5️⃣  DNS ET RÉPUTATION IP${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "IP publique du serveur:"
MY_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || curl -s ipecho.net/plain)
echo "$MY_IP"

echo ""
echo "Reverse DNS:"
host "$MY_IP" 2>/dev/null || echo "Pas de reverse DNS configuré"

echo ""
echo "Test de résolution Gmail:"
nslookup smtp.gmail.com 2>/dev/null | grep -A2 "Name:" || echo "Erreur de résolution DNS"

# ==============================================================================
# 6. VÉRIFICATION CONFIGURATION BACKEND
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6️⃣  CONFIGURATION BACKEND (Variables d'environnement)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f ~/velosi-back/.env ]; then
    echo "Fichier .env trouvé"
    echo ""
    
    # Vérifier les variables SMTP
    SMTP_HOST=$(grep "SMTP_HOST=" ~/velosi-back/.env | cut -d'=' -f2)
    SMTP_PORT=$(grep "SMTP_PORT=" ~/velosi-back/.env | cut -d'=' -f2)
    SMTP_USER=$(grep "SMTP_USER=" ~/velosi-back/.env | cut -d'=' -f2)
    SMTP_PASS=$(grep "SMTP_PASSWORD=" ~/velosi-back/.env | cut -d'=' -f2)
    
    echo "Configuration SMTP détectée:"
    echo "  SMTP_HOST: ${SMTP_HOST:-❌ NON DÉFINI}"
    echo "  SMTP_PORT: ${SMTP_PORT:-❌ NON DÉFINI}"
    echo "  SMTP_USER: ${SMTP_USER:-❌ NON DÉFINI}"
    
    if [ -n "$SMTP_PASS" ]; then
        PASS_LEN=${#SMTP_PASS}
        echo "  SMTP_PASSWORD: ${SMTP_PASS:0:4}************ (${PASS_LEN} caractères)"
        
        # Vérifier si c'est un App Password (16 caractères)
        if [ "$PASS_LEN" -eq 16 ]; then
            echo -e "  ${GREEN}✓ Format App Password correct (16 caractères)${NC}"
        else
            echo -e "  ${YELLOW}⚠️  Ce n'est pas un App Password Gmail (devrait être 16 caractères)${NC}"
            PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
        fi
    else
        echo -e "  ${RED}❌ SMTP_PASSWORD NON DÉFINI${NC}"
        PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
    fi
    
    echo ""
    
    # Vérifier si host = gmail
    if [ "$SMTP_HOST" != "smtp.gmail.com" ]; then
        echo -e "${YELLOW}⚠️  SMTP_HOST n'est pas Gmail: $SMTP_HOST${NC}"
    fi
    
    # Vérifier le port
    if [ "$SMTP_PORT" != "587" ] && [ "$SMTP_PORT" != "465" ]; then
        echo -e "${YELLOW}⚠️  Port inhabituel pour Gmail: $SMTP_PORT${NC}"
    fi
else
    echo -e "${RED}❌ FICHIER .env NON TROUVÉ${NC}"
    PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
fi

# ==============================================================================
# 7. VÉRIFICATION SERVICE EMAIL BACKEND
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}7️⃣  SERVICE EMAIL BACKEND (email.service.ts)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f ~/velosi-back/src/services/email.service.ts ]; then
    echo "Fichier email.service.ts trouvé"
    echo ""
    
    # Vérifier la configuration Nodemailer
    echo "Configuration Nodemailer détectée:"
    grep -A10 "createTransport" ~/velosi-back/src/services/email.service.ts | head -15
    
else
    echo -e "${RED}❌ FICHIER email.service.ts NON TROUVÉ${NC}"
    PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
fi

# ==============================================================================
# 8. LOGS PM2 DU BACKEND
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}8️⃣  LOGS PM2 - Erreurs Email${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Dernières erreurs email dans les logs:"
pm2 logs velosi-backend --lines 50 --nostream 2>/dev/null | grep -i -E "email|smtp|535|auth|error" | tail -20 || echo "Aucune erreur trouvée ou PM2 non démarré"

# ==============================================================================
# 9. TEST AUTHENTIFICATION GMAIL DIRECT
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}9️⃣  TEST AUTHENTIFICATION GMAIL AVEC CREDENTIALS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f ~/velosi-back/.env ]; then
    GMAIL_USER=$(grep "SMTP_USER=" ~/velosi-back/.env | cut -d'=' -f2)
    GMAIL_PASS=$(grep "SMTP_PASSWORD=" ~/velosi-back/.env | cut -d'=' -f2)
    
    if [ -n "$GMAIL_USER" ] && [ -n "$GMAIL_PASS" ]; then
        echo "Test authentification avec credentials du .env..."
        echo "User: $GMAIL_USER"
        echo ""
        
        # Encoder en base64
        GMAIL_USER_B64=$(echo -n "$GMAIL_USER" | base64 -w 0)
        GMAIL_PASS_B64=$(echo -n "$GMAIL_PASS" | base64 -w 0)
        
        # Test avec openssl
        AUTH_RESULT=$(
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
            ) | timeout 15 openssl s_client -connect smtp.gmail.com:587 -starttls smtp -quiet 2>&1 | grep -E "250|235|535|534|554"
        )
        
        echo "Résultat authentification:"
        echo "$AUTH_RESULT"
        echo ""
        
        if echo "$AUTH_RESULT" | grep -q "235.*Accepted"; then
            echo -e "${GREEN}✓ AUTHENTIFICATION RÉUSSIE !${NC}"
        elif echo "$AUTH_RESULT" | grep -q "535"; then
            echo -e "${RED}❌ ERREUR 535 - AUTHENTIFICATION REFUSÉE${NC}"
            echo -e "${YELLOW}   → App Password invalide ou révoqué${NC}"
            echo -e "${YELLOW}   → Ou IP bloquée par Google${NC}"
            PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
        else
            echo -e "${RED}❌ ERREUR D'AUTHENTIFICATION${NC}"
            PROBLEMS_FOUND=$((PROBLEMS_FOUND+1))
        fi
    else
        echo -e "${YELLOW}⚠️  Credentials manquants dans .env${NC}"
    fi
else
    echo -e "${RED}❌ Fichier .env non trouvé${NC}"
fi

# ==============================================================================
# RÉSUMÉ FINAL
# ==============================================================================
echo ""
echo ""
echo -e "${BLUE}=========================================================================${NC}"
echo -e "${BLUE}📊 RÉSUMÉ DU DIAGNOSTIC${NC}"
echo -e "${BLUE}=========================================================================${NC}"
echo ""

if [ $PROBLEMS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ AUCUN PROBLÈME DÉTECTÉ !${NC}"
    echo ""
    echo "Le système semble correctement configuré."
    echo "Si les emails ne s'envoient toujours pas, vérifiez le code de l'application."
else
    echo -e "${RED}❌ PROBLÈMES DÉTECTÉS: $PROBLEMS_FOUND${NC}"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}🔧 SOLUTIONS PROPOSÉES:${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "1. Si services SMTP locaux actifs (Exim/Postfix):"
    echo "   → Exécutez: sudo systemctl stop exim4 && sudo systemctl disable exim4"
    echo "   → Exécutez: sudo systemctl stop postfix && sudo systemctl disable postfix"
    echo ""
    echo "2. Si ports SMTP utilisés localement:"
    echo "   → Identifiez le processus: sudo lsof -i :587"
    echo "   → Arrêtez-le ou changez la configuration"
    echo ""
    echo "3. Si connexion Gmail échoue:"
    echo "   → Vérifiez que les ports 587/465 ne sont pas bloqués par OVH"
    echo "   → Considérez utiliser SendGrid ou AWS SES"
    echo ""
    echo "4. Si authentification échoue (535):"
    echo "   → Régénérez un nouveau App Password Gmail"
    echo "   → Ou utilisez un autre service SMTP (SendGrid recommandé)"
    echo ""
    echo "5. Pour automatiser la correction:"
    echo "   → Exécutez: bash ~/fix-all-email-problems.sh"
    echo ""
fi

echo ""
echo -e "${BLUE}=========================================================================${NC}"
echo -e "${GREEN}✅ Diagnostic terminé${NC}"
echo -e "${BLUE}=========================================================================${NC}"
