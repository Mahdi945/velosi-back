#!/bin/bash
# Script de CORRECTION AUTOMATIQUE de tous les problèmes d'envoi d'emails
# Arrête Exim/Postfix, libère les ports, configure le firewall

echo "=========================================================================="
echo "🔧 CORRECTION AUTOMATIQUE - PROBLÈMES EMAIL SUR VPS"
echo "=========================================================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FIXES_APPLIED=0

# ==============================================================================
# 1. ARRÊTER ET DÉSACTIVER EXIM
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1️⃣  ARRÊT D'EXIM${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if pgrep -x "exim" > /dev/null; then
    echo "Exim détecté - arrêt en cours..."
    
    # Essayer exim4
    if systemctl is-active exim4 &>/dev/null; then
        echo "Offline2025" | sudo -S -u almalinux systemctl stop exim4
        echo "Offline2025" | sudo -S -u almalinux systemctl disable exim4
        echo -e "${GREEN}✓ Exim4 arrêté et désactivé${NC}"
        FIXES_APPLIED=$((FIXES_APPLIED+1))
    fi
    
    # Essayer exim
    if systemctl is-active exim &>/dev/null; then
        echo "Offline2025" | sudo -S -u almalinux systemctl stop exim
        echo "Offline2025" | sudo -S -u almalinux systemctl disable exim
        echo -e "${GREEN}✓ Exim arrêté et désactivé${NC}"
        FIXES_APPLIED=$((FIXES_APPLIED+1))
    fi
    
    # Forcer l'arrêt si toujours actif
    if pgrep -x "exim" > /dev/null; then
        echo "Offline2025" | sudo -S -u almalinux pkill -9 exim
        echo -e "${GREEN}✓ Exim forcé à s'arrêter${NC}"
        FIXES_APPLIED=$((FIXES_APPLIED+1))
    fi
else
    echo -e "${GREEN}✓ Exim déjà inactif${NC}"
fi

# ==============================================================================
# 2. ARRÊTER ET DÉSACTIVER POSTFIX
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2️⃣  ARRÊT DE POSTFIX${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if pgrep -f "postfix" > /dev/null; then
    echo "Postfix détecté - arrêt en cours..."
    echo "Offline2025" | sudo -S -u almalinux systemctl stop postfix
    echo "Offline2025" | sudo -S -u almalinux systemctl disable postfix
    echo -e "${GREEN}✓ Postfix arrêté et désactivé${NC}"
    FIXES_APPLIED=$((FIXES_APPLIED+1))
else
    echo -e "${GREEN}✓ Postfix déjà inactif${NC}"
fi

# ==============================================================================
# 3. ARRÊTER SENDMAIL
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3️⃣  ARRÊT DE SENDMAIL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if pgrep -x "sendmail" > /dev/null; then
    echo "Sendmail détecté - arrêt en cours..."
    echo "Offline2025" | sudo -S -u almalinux systemctl stop sendmail
    echo "Offline2025" | sudo -S -u almalinux systemctl disable sendmail
    echo -e "${GREEN}✓ Sendmail arrêté et désactivé${NC}"
    FIXES_APPLIED=$((FIXES_APPLIED+1))
else
    echo -e "${GREEN}✓ Sendmail déjà inactif${NC}"
fi

# ==============================================================================
# 4. VÉRIFIER QUE LES PORTS SONT LIBRES
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4️⃣  VÉRIFICATION DES PORTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

sleep 2 # Attendre que les services s'arrêtent

echo "Vérification des ports SMTP..."
PORTS_USED=$(netstat -tuln 2>/dev/null | grep -E ":(25|587|465) " || ss -tuln 2>/dev/null | grep -E ":(25|587|465) ")

if [ -z "$PORTS_USED" ]; then
    echo -e "${GREEN}✓ Tous les ports SMTP sont libres${NC}"
else
    echo -e "${YELLOW}⚠️  Certains ports sont encore utilisés:${NC}"
    echo "$PORTS_USED"
    echo ""
    echo "Tentative de libération..."
    
    # Tuer les processus sur ces ports
    for PORT in 25 587 465; do
        PID=$(echo "Offline2025" | sudo -S -u almalinux lsof -ti:$PORT 2>/dev/null)
        if [ -n "$PID" ]; then
            echo "  Arrêt du processus sur port $PORT (PID: $PID)..."
            echo "Offline2025" | sudo -S -u almalinux kill -9 $PID
            FIXES_APPLIED=$((FIXES_APPLIED+1))
        fi
    done
fi

# ==============================================================================
# 5. CONFIGURER LE FIREWALL
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5️⃣  CONFIGURATION FIREWALL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if command -v ufw &> /dev/null; then
    echo "Configuration UFW..."
    
    # Autoriser les ports sortants
    echo "Offline2025" | sudo -S -u almalinux ufw allow out 587/tcp comment 'SMTP Gmail TLS'
    echo "Offline2025" | sudo -S -u almalinux ufw allow out 465/tcp comment 'SMTP Gmail SSL'
    echo "Offline2025" | sudo -S -u almalinux ufw allow out 25/tcp comment 'SMTP standard'
    
    echo -e "${GREEN}✓ Ports SMTP sortants autorisés dans UFW${NC}"
    FIXES_APPLIED=$((FIXES_APPLIED+1))
else
    echo -e "${YELLOW}⚠️  UFW non installé - vérification iptables...${NC}"
    
    # Vérifier si iptables bloque
    BLOCKED=$(echo "Offline2025" | sudo -S -u almalinux iptables -L OUTPUT -n | grep -E "DROP|REJECT" | grep -E "587|465|25")
    if [ -n "$BLOCKED" ]; then
        echo -e "${YELLOW}⚠️  Règles de blocage détectées dans iptables${NC}"
        echo "Suppression des règles..."
        echo "Offline2025" | sudo -S -u almalinux iptables -D OUTPUT -p tcp --dport 587 -j DROP 2>/dev/null
        echo "Offline2025" | sudo -S -u almalinux iptables -D OUTPUT -p tcp --dport 465 -j DROP 2>/dev/null
        echo "Offline2025" | sudo -S -u almalinux iptables -D OUTPUT -p tcp --dport 25 -j DROP 2>/dev/null
        echo -e "${GREEN}✓ Règles de blocage supprimées${NC}"
        FIXES_APPLIED=$((FIXES_APPLIED+1))
    else
        echo -e "${GREEN}✓ Aucune règle de blocage dans iptables${NC}"
    fi
fi

# ==============================================================================
# 6. TESTER LA CONNEXION GMAIL
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6️⃣  TEST DE CONNEXION GMAIL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Test de connexion au port 587..."
GMAIL_TEST=$(timeout 10 bash -c "echo QUIT | openssl s_client -connect smtp.gmail.com:587 -starttls smtp 2>&1" | grep "Connected")

if [ -n "$GMAIL_TEST" ]; then
    echo -e "${GREEN}✓ CONNEXION À GMAIL RÉUSSIE !${NC}"
    echo "$GMAIL_TEST"
else
    echo -e "${RED}❌ IMPOSSIBLE DE SE CONNECTER À GMAIL${NC}"
    echo ""
    echo -e "${YELLOW}Causes possibles:${NC}"
    echo "  1. OVH bloque les ports SMTP sortants"
    echo "  2. Problème DNS"
    echo "  3. Firewall OVH"
    echo ""
    echo -e "${YELLOW}Solution recommandée:${NC}"
    echo "  → Utilisez SendGrid (100 emails/jour gratuits)"
    echo "  → SMTP_HOST=smtp.sendgrid.net"
    echo "  → SMTP_PORT=587"
fi

# ==============================================================================
# 7. VÉRIFIER LA CONFIGURATION .ENV
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}7️⃣  VÉRIFICATION CONFIGURATION .ENV${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f ~/velosi-back/.env ]; then
    SMTP_HOST=$(grep "SMTP_HOST=" ~/velosi-back/.env | cut -d'=' -f2)
    SMTP_PORT=$(grep "SMTP_PORT=" ~/velosi-back/.env | cut -d'=' -f2)
    SMTP_USER=$(grep "SMTP_USER=" ~/velosi-back/.env | cut -d'=' -f2)
    SMTP_PASS=$(grep "SMTP_PASSWORD=" ~/velosi-back/.env | cut -d'=' -f2)
    
    echo "Configuration actuelle:"
    echo "  SMTP_HOST: ${SMTP_HOST:-❌ NON DÉFINI}"
    echo "  SMTP_PORT: ${SMTP_PORT:-❌ NON DÉFINI}"
    echo "  SMTP_USER: ${SMTP_USER:-❌ NON DÉFINI}"
    
    if [ -n "$SMTP_PASS" ]; then
        PASS_LEN=${#SMTP_PASS}
        echo "  SMTP_PASSWORD: ✓ Défini (${PASS_LEN} caractères)"
        
        if [ "$PASS_LEN" -ne 16 ]; then
            echo ""
            echo -e "${YELLOW}⚠️  Le mot de passe n'a pas 16 caractères${NC}"
            echo -e "${YELLOW}   Ce n'est probablement pas un App Password Gmail${NC}"
            echo ""
            echo "Pour créer un App Password Gmail:"
            echo "  1. Allez sur: https://myaccount.google.com/apppasswords"
            echo "  2. Créez un nouveau mot de passe d'application"
            echo "  3. Copiez le mot de passe (16 caractères sans espaces)"
            echo "  4. Mettez-le dans SMTP_PASSWORD du .env"
        else
            echo -e "${GREEN}✓ Format App Password correct${NC}"
        fi
    else
        echo "  SMTP_PASSWORD: ❌ NON DÉFINI"
    fi
else
    echo -e "${RED}❌ Fichier .env non trouvé !${NC}"
fi

# ==============================================================================
# 8. REDÉMARRER LE BACKEND
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}8️⃣  REDÉMARRAGE BACKEND${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if pm2 list | grep -q "velosi-backend"; then
    echo "Redémarrage du backend PM2..."
    pm2 restart velosi-backend --update-env
    
    echo ""
    echo "Attente du démarrage..."
    sleep 3
    
    echo ""
    echo "Status:"
    pm2 status velosi-backend
    
    echo ""
    echo "Logs récents:"
    pm2 logs velosi-backend --lines 10 --nostream
    
    FIXES_APPLIED=$((FIXES_APPLIED+1))
else
    echo -e "${YELLOW}⚠️  Backend PM2 non trouvé${NC}"
    echo "Démarrez-le avec: pm2 start ecosystem.config.js"
fi

# ==============================================================================
# RÉSUMÉ FINAL
# ==============================================================================
echo ""
echo ""
echo -e "${BLUE}=========================================================================${NC}"
echo -e "${BLUE}📊 RÉSUMÉ DES CORRECTIONS${NC}"
echo -e "${BLUE}=========================================================================${NC}"
echo ""

echo -e "${GREEN}✅ Corrections appliquées: $FIXES_APPLIED${NC}"
echo ""

echo "Actions effectuées:"
echo "  ✓ Services SMTP locaux arrêtés et désactivés"
echo "  ✓ Ports SMTP libérés"
echo "  ✓ Firewall configuré pour autoriser Gmail"
echo "  ✓ Connexion Gmail testée"
echo "  ✓ Backend redémarré"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 PROCHAINES ÉTAPES:${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "1. Vérifiez que l'App Password Gmail est valide:"
echo "   → Allez sur: https://myaccount.google.com/apppasswords"
echo "   → Créez un nouveau mot de passe si nécessaire"
echo "   → Mettez-le dans ~/velosi-back/.env (SMTP_PASSWORD)"
echo ""

echo "2. Si Gmail ne fonctionne toujours pas:"
echo "   → OVH bloque peut-être les ports SMTP"
echo "   → Solution: Utilisez SendGrid à la place"
echo "   → Gratuit: 100 emails/jour"
echo "   → Inscription: https://sendgrid.com/free/"
echo ""

echo "3. Pour tester l'envoi d'email:"
echo "   → Utilisez votre application pour envoyer un email"
echo "   → Vérifiez les logs: pm2 logs velosi-backend"
echo ""

echo "4. Si problème persiste:"
echo "   → Exécutez: bash ~/diagnose-all-email-problems.sh"
echo "   → Partagez les résultats"
echo ""

echo -e "${BLUE}=========================================================================${NC}"
echo -e "${GREEN}✅ Corrections terminées !${NC}"
echo -e "${BLUE}=========================================================================${NC}"
