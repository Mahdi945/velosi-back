# Script pour mettre a jour email.service.ts sur le VPS
# Applique les modifications de suppression des sections "Support Client"

$VPS_HOST = "Webdesk@vps-3b4fd3be.vps.ovh.ca"
$BACKEND_PATH = "~/velosi-back/src/services"

Write-Host "Mise a jour du fichier email.service.ts sur le VPS..." -ForegroundColor Cyan

# Commandes SSH pour modifier le fichier
$sshCommands = @"
cd ~/velosi-back/src/services

# Creer une sauvegarde
cp email.service.ts email.service.ts.backup.`$(date +%Y%m%d_%H%M%S)

echo 'Application des modifications...'

# Modification 1: Remplacer Support client par Demande d assistance dans enquiryTypeMap
perl -i -pe \"s/'support': 'Support client',/'support': 'Demande d'\\\\'assistance',/g\" email.service.ts

# Modification 2: Supprimer la section Support client du template
perl -i -0pe 's/<div class=\"contact-section\">\s*<h3>💬 Support client<\/h3>.*?<\/div>\s*<\/div>/<\/div>/gs' email.service.ts

# Modification 3: Supprimer la section Support Client avec majuscule
perl -i -0pe 's/<div class=\"contact-info\">\s*<h3>📞 Support Client<\/h3>.*?<\/div>\s*<\/div>/<\/div>/gs' email.service.ts

# Verification des modifications
echo ''
echo 'Verification des modifications:'
MATCHES=`$(grep -i 'support client' email.service.ts | wc -l)
if test `$MATCHES -eq 0; then
    echo 'Toutes les mentions Support Client ont ete supprimees avec succes!'
else
    echo 'Attention: '`$MATCHES' mention(s) restante(s):'
    grep -n -i 'support client' email.service.ts
fi

# Redemarrer le service backend si PM2 est utilise
if command -v pm2 > /dev/null 2>&1; then
    echo ''
    echo 'Redemarrage du backend avec PM2...'
    pm2 restart velosi-back 2>/dev/null && echo 'Backend redemarre' || echo 'Impossible de redemarrer PM2'
fi

echo ''
echo 'Modifications appliquees avec succes!'
echo 'Sauvegarde disponible dans le meme dossier (*.backup.*)'
"@

Write-Host "Connexion au VPS et application des modifications..." -ForegroundColor Yellow

# Nettoyer les retours chariot Windows
$sshCommands = $sshCommands -replace "`r", ""

# Executer les commandes sur le VPS
echo 'Offline25$$' | ssh $VPS_HOST $sshCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nModifications appliquees avec succes sur le VPS!" -ForegroundColor Green
    Write-Host "Une sauvegarde a ete creee: email.service.ts.backup" -ForegroundColor Cyan
} else {
    Write-Host "`nErreur lors de l application des modifications" -ForegroundColor Red
    Write-Host "Verifiez la connexion SSH et les chemins sur le VPS" -ForegroundColor Yellow
}
