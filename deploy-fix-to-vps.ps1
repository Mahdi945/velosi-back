# Script final pour appliquer les modifications sur le VPS

$VPS_HOST = "Webdesk@vps-3b4fd3be.vps.ovh.ca"

Write-Host "Envoi du script Python sur le VPS..." -ForegroundColor Cyan

# Envoyer le script Python sur le VPS
scp "fix-email-service.py" "${VPS_HOST}:~/velosi-back/src/services/"

Write-Host "Application des modifications sur le VPS..." -ForegroundColor Yellow

# Commandes SSH pour executer le script
$sshCommands = @"
cd ~/velosi-back/src/services

# Creer une sauvegarde avant modification
cp email.service.ts email.service.ts.backup.`$(date +%Y%m%d_%H%M%S)
echo 'Sauvegarde creee'

# Executer le script Python
python3 fix-email-service.py

# Verification finale
echo ''
echo 'Verification finale:'
MATCHES=`$(grep -c -i 'support client' email.service.ts 2>/dev/null || echo 0)
echo \"Mentions 'support client' restantes: \`$MATCHES\"

if [ \`$MATCHES -eq 0 ]; then
    echo '✅ SUCCESS: Toutes les sections ont ete supprimees!'
else
    echo 'Mentions restantes:'
    grep -n -i 'support client' email.service.ts | head -5
fi

# Redemarrer le backend
echo ''
echo 'Redemarrage du backend...'
pm2 list | grep -q velosi-back && pm2 restart velosi-back --update-env || echo 'PM2 app velosi-back non trouvee'

echo ''
echo 'Terminé!'
"@

# Nettoyer les retours chariot
$sshCommands = $sshCommands -replace "`r", ""

# Executer sur le VPS
echo 'Offline25$$' | ssh $VPS_HOST $sshCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Modifications appliquees avec succes!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Erreur" -ForegroundColor Red
}
