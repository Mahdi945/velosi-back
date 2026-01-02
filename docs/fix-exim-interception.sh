#!/bin/bash
# Script pour corriger le probleme EXIM qui intercepte les connexions Gmail
# EXIM ecoute sur les ports 25, 587, 465 et intercepte toutes les connexions SMTP

echo "=========================================="
echo "CORRECTION PROBLEME EXIM sur VPS OVH"
echo "=========================================="
echo ""

echo "PROBLEME DETECTE:"
echo "  Exim ecoute sur les ports 25, 587, 465"
echo "  Il intercepte les connexions vers Gmail"
echo "  Resultat: Erreur 535 (auth echouee)"
echo ""

echo "SOLUTIONS DISPONIBLES:"
echo ""
echo "1. Arreter Exim (si non utilise)"
echo "2. Configurer Exim comme relais Gmail"
echo "3. Utiliser des ports alternatifs"
echo "4. Laisser tel quel et diagnostiquer plus"
echo ""
read -p "Votre choix (1-4): " choice

case $choice in
    1)
        echo ""
        echo "=== OPTION 1: Arreter Exim ==="
        echo ""
        echo "Attention: Exim est peut-etre utilise par d'autres services"
        read -p "Etes-vous sur de vouloir arreter Exim ? (oui/non): " confirm
        
        if [ "$confirm" = "oui" ]; then
            echo ""
            echo "Arret d'Exim..."
            echo "Offline2025" | sudo -S systemctl stop exim
            
            echo "Desactivation au demarrage..."
            echo "Offline2025" | sudo -S systemctl disable exim
            
            echo ""
            echo "Verification:"
            echo "Offline2025" | sudo -S systemctl status exim | head -5
            
            echo ""
            echo "Verification des ports:"
            echo "Offline2025" | sudo -S netstat -tuln | grep -E ':(25|587|465)'
            
            echo ""
            echo "✓ Exim arrete"
            echo ""
            echo "Maintenant testez l'envoi d'email depuis votre backend:"
            echo "  pm2 restart velosi-backend"
            echo "  pm2 logs velosi-backend"
        else
            echo "Operation annulee"
        fi
        ;;
        
    2)
        echo ""
        echo "=== OPTION 2: Configurer Exim comme relais Gmail ==="
        echo ""
        echo "Cette option configure Exim pour relayer les emails via Gmail"
        echo ""
        read -p "Email Gmail: " gmail_user
        read -sp "Mot de passe/App Password: " gmail_pass
        echo ""
        
        # Backup config
        echo "Offline2025" | sudo -S cp /etc/exim/exim.conf /etc/exim/exim.conf.backup.$(date +%Y%m%d_%H%M%S)
        
        # Configuration relay Gmail
        cat > /tmp/exim-gmail-relay.conf << EOFCONFIG
# Configuration relay Gmail pour Exim
# A ajouter dans /etc/exim/exim.conf

# Dans la section "routers"
send_via_gmail:
  driver = manualroute
  transport = gmail_smtp
  route_list = * smtp.gmail.com
  
# Dans la section "transports"  
gmail_smtp:
  driver = smtp
  port = 587
  hosts_require_auth = smtp.gmail.com
  hosts_require_tls = smtp.gmail.com
  
# Dans la section "authenticators"
gmail_login:
  driver = plaintext
  public_name = LOGIN
  client_send = : ${gmail_user} : ${gmail_pass}
EOFCONFIG
        
        echo ""
        echo "Configuration preparee dans /tmp/exim-gmail-relay.conf"
        echo ""
        echo "IMPORTANT: Editez manuellement /etc/exim/exim.conf"
        echo "  sudo nano /etc/exim/exim.conf"
        echo ""
        echo "Puis redemarrez Exim:"
        echo "  sudo systemctl restart exim"
        ;;
        
    3)
        echo ""
        echo "=== OPTION 3: Utiliser des ports alternatifs ==="
        echo ""
        echo "Gmail accepte aussi le port 2525 (non intercepte par Exim)"
        echo ""
        echo "Dans votre base de donnees (table organisations):"
        echo "  Changez smtp_port de 587 à 2525"
        echo ""
        echo "Ou testez directement:"
        cat > /tmp/test-gmail-2525.js << 'EOFTEST'
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 2525,  // Port alternatif
  secure: false,
  auth: {
    user: 'VOTRE_EMAIL@gmail.com',
    pass: 'VOTRE_MOT_DE_PASSE',
  },
});

transporter.verify()
  .then(() => console.log('✓ Port 2525 fonctionne !'))
  .catch(err => console.log('✗ Erreur:', err.message));
EOFTEST
        
        echo "Script de test cree: /tmp/test-gmail-2525.js"
        echo ""
        echo "Editez-le avec vos credentials puis executez:"
        echo "  cd ~/velosi-back"
        echo "  node /tmp/test-gmail-2525.js"
        ;;
        
    4)
        echo ""
        echo "=== OPTION 4: Diagnostic supplementaire ==="
        echo ""
        echo "Verification configuration Exim..."
        echo ""
        
        echo "Services SMTP actifs:"
        echo "Offline2025" | sudo -S netstat -tulpn | grep exim
        echo ""
        
        echo "Configuration Exim (debut):"
        echo "Offline2025" | sudo -S head -50 /etc/exim/exim.conf
        echo ""
        
        echo "Logs Exim recents:"
        echo "Offline2025" | sudo -S tail -30 /var/log/exim/main.log
        ;;
        
    *)
        echo "Choix invalide"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "Termine"
echo "=========================================="
