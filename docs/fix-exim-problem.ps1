# Script PowerShell pour corriger le probleme EXIM sur le VPS OVH
# EXIM intercepte les connexions Gmail sur les ports 25, 587, 465

$VPS_HOST = "almalinux@vps-3b4fd3be.vps.ovh.ca"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PROBLEME IDENTIFIE" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "EXIM (serveur SMTP local) ecoute sur:" -ForegroundColor Yellow
Write-Host "  - Port 25  (SMTP)" -ForegroundColor White
Write-Host "  - Port 587 (SMTP TLS)" -ForegroundColor White
Write-Host "  - Port 465 (SMTP SSL)" -ForegroundColor White
Write-Host ""
Write-Host "Resultat:" -ForegroundColor Red
Write-Host "  Toutes les connexions vers smtp.gmail.com" -ForegroundColor White
Write-Host "  sont INTERCEPTEES par EXIM local" -ForegroundColor White
Write-Host "  → Erreur 535 (authentification echouee)" -ForegroundColor White
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "SOLUTIONS" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1] ARRETER EXIM (Simple et rapide)" -ForegroundColor Green
Write-Host "    Si vous n'utilisez pas EXIM pour autre chose" -ForegroundColor Gray
Write-Host "    Les connexions Gmail fonctionneront directement" -ForegroundColor Gray
Write-Host ""
Write-Host "[2] TESTER PORT 2525 (Solution immediate)" -ForegroundColor Green
Write-Host "    Gmail accepte le port 2525 (non intercepte par EXIM)" -ForegroundColor Gray
Write-Host "    Changez smtp_port dans votre BDD: 587 → 2525" -ForegroundColor Gray
Write-Host ""
Write-Host "[3] CONFIGURER EXIM COMME RELAIS (Avance)" -ForegroundColor Yellow
Write-Host "    Configurer EXIM pour relayer via Gmail" -ForegroundColor Gray
Write-Host "    Plus complexe mais preserve EXIM" -ForegroundColor Gray
Write-Host ""
Write-Host "[4] DIAGNOSTIQUER PLUS (Logs et config)" -ForegroundColor Cyan
Write-Host "    Voir la config EXIM et les logs" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Votre choix (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "=== ARRETER EXIM ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "ATTENTION: Etes-vous sur ?" -ForegroundColor Yellow
        Write-Host "EXIM est peut-etre utilise par d'autres applications" -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "Taper 'OUI' pour continuer"
        
        if ($confirm -eq "OUI") {
            Write-Host ""
            Write-Host "Arret d'EXIM sur le VPS..." -ForegroundColor Yellow
            
            $stopCommand = @"
echo 'Arret d EXIM...'
echo 'Offline2025' | sudo -S systemctl stop exim
echo 'Desactivation au demarrage...'
echo 'Offline2025' | sudo -S systemctl disable exim
echo ''
echo 'Statut EXIM:'
echo 'Offline2025' | sudo -S systemctl status exim | head -5
echo ''
echo 'Ports SMTP (devrait etre vide):'
echo 'Offline2025' | sudo -S netstat -tuln | grep -E ':(25|587|465)'
echo ''
echo 'EXIM arrete avec succes !'
"@
            
            ssh $VPS_HOST $stopCommand
            
            Write-Host ""
            Write-Host "=========================================" -ForegroundColor Green
            Write-Host "EXIM ARRETE" -ForegroundColor Green
            Write-Host "=========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Maintenant testez l'envoi d'email:" -ForegroundColor White
            Write-Host "  1. Redemarrez le backend: pm2 restart velosi-backend" -ForegroundColor Cyan
            Write-Host "  2. Testez l'envoi d'email depuis votre application" -ForegroundColor Cyan
            Write-Host "  3. Verifiez les logs: pm2 logs velosi-backend" -ForegroundColor Cyan
            Write-Host ""
        } else {
            Write-Host "Operation annulee" -ForegroundColor Yellow
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "=== TEST PORT 2525 ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Gmail accepte le port 2525 (non intercepte par EXIM)" -ForegroundColor White
        Write-Host ""
        Write-Host "Test en cours sur le VPS..." -ForegroundColor Yellow
        
        $testCommand = @"
cat > /tmp/test-gmail-2525.js << 'EOFTEST'
const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('Test Gmail port 2525...');

const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 2525,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'VOTRE_EMAIL@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'VOTRE_MOT_DE_PASSE',
  },
  debug: true,
});

transporter.verify()
  .then(() => {
    console.log('');
    console.log('✓✓✓ PORT 2525 FONCTIONNE !');
    console.log('');
    console.log('Solution: Changez smtp_port dans votre BDD');
    console.log('  UPDATE organisations SET smtp_port = 2525 WHERE smtp_port = 587;');
  })
  .catch(err => {
    console.log('✗ Erreur:', err.message);
  });
EOFTEST

cd ~/velosi-back
node /tmp/test-gmail-2525.js
"@
        
        ssh $VPS_HOST $testCommand
        
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host "Si le test reussit:" -ForegroundColor Green
        Write-Host "  1. Connectez-vous a votre BDD PostgreSQL" -ForegroundColor White
        Write-Host "  2. Executez: UPDATE organisations SET smtp_port = 2525 WHERE smtp_host = 'smtp.gmail.com';" -ForegroundColor Cyan
        Write-Host "  3. Redemarrez: pm2 restart velosi-backend" -ForegroundColor Cyan
        Write-Host ""
    }
    
    "3" {
        Write-Host ""
        Write-Host "=== CONFIGURER EXIM COMME RELAIS ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Cette option est avancee et necessite:" -ForegroundColor Yellow
        Write-Host "  - Editer /etc/exim/exim.conf manuellement" -ForegroundColor White
        Write-Host "  - Connaissance d'EXIM" -ForegroundColor White
        Write-Host ""
        Write-Host "Je recommande plutot:" -ForegroundColor Green
        Write-Host "  - Option 1: Arreter EXIM (simple)" -ForegroundColor White
        Write-Host "  - Option 2: Utiliser port 2525 (immediat)" -ForegroundColor White
        Write-Host ""
        Write-Host "Documentation EXIM relay:" -ForegroundColor Cyan
        Write-Host "  https://exim.org/exim-html-current/doc/html/spec_html/ch-smtp_authentication.html" -ForegroundColor Gray
        Write-Host ""
    }
    
    "4" {
        Write-Host ""
        Write-Host "=== DIAGNOSTIC EXIM ===" -ForegroundColor Cyan
        Write-Host ""
        
        $diagCommand = @"
echo 'Version EXIM:'
exim -bV | head -3
echo ''
echo 'Ports ecoutes par EXIM:'
echo 'Offline2025' | sudo -S netstat -tulpn | grep exim
echo ''
echo 'Configuration EXIM (debut):'
echo 'Offline2025' | sudo -S head -30 /etc/exim/exim.conf
echo ''
echo 'Logs EXIM recents (erreurs):'
echo 'Offline2025' | sudo -S grep -i 'error\|fail\|535' /var/log/exim/main.log | tail -20
"@
        
        ssh $VPS_HOST $diagCommand
        
        Write-Host ""
    }
    
    default {
        Write-Host "Choix invalide" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "RECOMMANDATION" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Solution la plus simple:" -ForegroundColor Green
Write-Host "  → Option 2: Utiliser le port 2525" -ForegroundColor White
Write-Host "  → Pas besoin d'arreter EXIM" -ForegroundColor White
Write-Host "  → Fonctionne immediatement" -ForegroundColor White
Write-Host ""
Write-Host "Dans votre BDD PostgreSQL:" -ForegroundColor Cyan
Write-Host "  UPDATE organisations" -ForegroundColor White
Write-Host "  SET smtp_port = 2525" -ForegroundColor White
Write-Host "  WHERE smtp_host = 'smtp.gmail.com';" -ForegroundColor White
Write-Host ""
