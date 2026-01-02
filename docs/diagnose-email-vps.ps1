# Script de diagnostic et correction des problemes d'email sur VPS OVH
# Erreur 535 = Authentification SMTP echouee

$VPS_HOST = "Webdesk@vps-3b4fd3be.vps.ovh.ca"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC EMAIL VPS - Erreur 535" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Transfert des scripts de diagnostic
Write-Host "Transfert des scripts vers le VPS..." -ForegroundColor Yellow
scp "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\diagnose-vps-email.sh" "${VPS_HOST}:~/"
scp "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\fix-vps-email.sh" "${VPS_HOST}:~/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Scripts transferes avec succes" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Execution du diagnostic..." -ForegroundColor Yellow
    Write-Host ""
    
    # Execution du diagnostic
    $diagnosticCommand = @"
chmod +x ~/diagnose-vps-email.sh
chmod +x ~/fix-vps-email.sh
bash ~/diagnose-vps-email.sh
"@
    
    echo 'Offline25$$' | ssh $VPS_HOST $diagnosticCommand
    
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "PROCHAINES ETAPES" -ForegroundColor Yellow
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "L'erreur 535 signifie: Authentification SMTP echouee" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUTIONS POSSIBLES:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[1] Gmail - Utiliser un App Password (MOT DE PASSE D'APPLICATION)" -ForegroundColor Cyan
    Write-Host "    Vous utilisez actuellement: shipnologyerp@gmail.com" -ForegroundColor Red
    Write-Host "    Le mot de passe actuel est probablement INVALIDE" -ForegroundColor Red
    Write-Host ""
    Write-Host "    ETAPES A SUIVRE:" -ForegroundColor Green
    Write-Host "      a) Allez sur: https://myaccount.google.com/apppasswords" -ForegroundColor White
    Write-Host "      b) Activez la validation en 2 etapes si ce n'est pas fait" -ForegroundColor White
    Write-Host "      c) Generez un 'App Password' (mot de passe d'application)" -ForegroundColor White
    Write-Host "      d) Copiez le mot de passe de 16 caracteres (ex: xxxx xxxx xxxx xxxx)" -ForegroundColor White
    Write-Host "      e) Connectez-vous au VPS et lancez: bash ~/fix-vps-email.sh" -ForegroundColor White
    Write-Host "      f) Choisissez l'option 1 et entrez ce nouveau mot de passe" -ForegroundColor White
    Write-Host ""
    
    Write-Host "[2] Utiliser SendGrid (RECOMMANDE pour VPS)" -ForegroundColor Cyan
    Write-Host "    Gratuit: 100 emails/jour" -ForegroundColor Green
    Write-Host "    Fiable sur les VPS OVH" -ForegroundColor Green
    Write-Host "    Pas de probleme de ports bloques" -ForegroundColor Green
    Write-Host ""
    Write-Host "    ETAPES:" -ForegroundColor Yellow
    Write-Host "      a) Creez un compte sur: https://sendgrid.com" -ForegroundColor White
    Write-Host "      b) Verifiez votre email expediteur (Settings > Sender Authentication)" -ForegroundColor White
    Write-Host "      c) Creez une API Key (Settings > API Keys > Create API Key)" -ForegroundColor White
    Write-Host "      d) Connectez-vous au VPS et lancez: bash ~/fix-vps-email.sh" -ForegroundColor White
    Write-Host "      e) Choisissez l'option 2 et entrez votre API Key" -ForegroundColor White
    Write-Host ""
    
    Write-Host "[3] Verifier si OVH bloque les ports SMTP" -ForegroundColor Cyan
    Write-Host "    OVH bloque parfois les ports 25, 587, 465 pour eviter le spam" -ForegroundColor Yellow
    Write-Host "    Le diagnostic ci-dessus vous indique si les ports sont bloques" -ForegroundColor White
    Write-Host ""
    
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "POUR APPLIQUER LA CORRECTION:" -ForegroundColor Yellow
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Connectez-vous au VPS:" -ForegroundColor White
    Write-Host "  ssh $VPS_HOST" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Puis lancez le script de correction:" -ForegroundColor White
    Write-Host "  bash ~/fix-vps-email.sh" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou pour corriger directement la configuration Gmail:" -ForegroundColor White
    Write-Host "  1. Obtenez votre App Password Gmail" -ForegroundColor Yellow
    Write-Host "  2. Editez: nano ~/velosi-back/.env" -ForegroundColor Cyan
    Write-Host "  3. Modifiez la ligne SMTP_PASSWORD avec votre App Password" -ForegroundColor Cyan
    Write-Host "  4. Sauvegardez (Ctrl+O, Enter, Ctrl+X)" -ForegroundColor Cyan
    Write-Host "  5. Redemarrez: pm2 restart velosi-backend --update-env" -ForegroundColor Cyan
    Write-Host ""
    
} else {
    Write-Host "Erreur lors du transfert des scripts" -ForegroundColor Red
    exit 1
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Diagnostic termine" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Proposer de se connecter au VPS pour corriger
Write-Host "Voulez-vous vous connecter au VPS maintenant pour appliquer la correction ? (o/n)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "o" -or $response -eq "O") {
    Write-Host ""
    Write-Host "Connexion au VPS..." -ForegroundColor Cyan
    Write-Host "Une fois connecte, lancez: bash ~/fix-vps-email.sh" -ForegroundColor Yellow
    Write-Host ""
    echo 'Offline25$$' | ssh $VPS_HOST
}
