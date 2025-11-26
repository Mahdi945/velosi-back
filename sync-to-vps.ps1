# Script de synchronisation du backend vers le VPS
# Exclut .env et email.service.ts
# Synchronise package.json pour les nouvelles dépendances

$VPS_HOST = "Webdesk@vps-3b4fd3be.vps.ovh.ca"
$VPS_PATH = "~/velosi-back"
$LOCAL_SRC = "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\src"
$LOCAL_ROOT = "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
$TEMP_DIR = "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\temp-sync"

Write-Host "Synchronisation du backend vers le VPS..." -ForegroundColor Cyan
Write-Host ""

# Créer un répertoire temporaire
if (Test-Path $TEMP_DIR) {
    Remove-Item -Recurse -Force $TEMP_DIR
}
New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null

# Copier tout le dossier src sauf .env et email.service.ts
Write-Host "Préparation des fichiers..." -ForegroundColor Yellow
Copy-Item -Path "$LOCAL_SRC\*" -Destination $TEMP_DIR -Recurse -Force

# Supprimer .env s'il existe
$envFile = Join-Path $TEMP_DIR ".env"
if (Test-Path $envFile) {
    Remove-Item $envFile -Force
    Write-Host "  .env exclu" -ForegroundColor Green
}

# Supprimer email.service.ts
$emailServicePath = Get-ChildItem -Path $TEMP_DIR -Recurse -Filter "email.service.ts" | Select-Object -First 1
if ($emailServicePath) {
    Remove-Item $emailServicePath.FullName -Force
    Write-Host "  email.service.ts exclu" -ForegroundColor Green
}

Write-Host ""
Write-Host "Création de l'archive..." -ForegroundColor Yellow

# Créer une archive tar.gz
$archivePath = "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\src-sync.tar.gz"
if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
}

# Utiliser tar (disponible sous Windows 10+)
Set-Location $TEMP_DIR
tar -czf $archivePath *
Set-Location "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"

Write-Host "  Archive créée" -ForegroundColor Green
Write-Host ""

# Transférer l'archive vers le VPS
Write-Host "Transfert vers le VPS..." -ForegroundColor Yellow
scp $archivePath "${VPS_HOST}:~/src-sync.tar.gz"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Transfert réussi" -ForegroundColor Green
    Write-Host ""
    Write-Host "Déploiement sur le VPS..." -ForegroundColor Yellow
   $sshCommands = @"
cd ~/velosi-back
if [ -d src_backup ]; then rm -rf src_backup; fi
cp -r src src_backup
echo \"Backup créé: src_backup\"
cd ~
tar -xzf src-sync.tar.gz -C velosi-back/src/
echo \"Fichiers extraits\"
if [ -f ~/velosi-back/src_backup/services/email.service.ts ]; then
    cp ~/velosi-back/src_backup/services/email.service.ts ~/velosi-back/src/services/
    echo \"email.service.ts restauré depuis backup\"
fi
if [ -f ~/velosi-back/src_backup/config/database.config.ts ]; then
    cp ~/velosi-back/src_backup/config/database.config.ts ~/velosi-back/src/config/
    echo \"database.config.ts préservé (config SSL VPS)\"
fi
rm ~/src-sync.tar.gz
echo \"Archive supprimée\"
pm2 restart velosi-backend --update-env
echo \"Backend redémarré avec mise à jour env\"
sleep 5
pm2 status velosi-backend
pm2 logs velosi-backend --lines 5 --nostream
"@
$sshCommands = $sshCommands -replace "`r", ""
echo 'Offline25$$' | ssh $VPS_HOST $sshCommands
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Synchronisation terminée avec succès !" -ForegroundColor Green
        Write-Host "Résumé:" -ForegroundColor Cyan
        Write-Host "  - Dossier src synchronisé" -ForegroundColor White
        Write-Host "  - .env préservé sur le VPS" -ForegroundColor White
        Write-Host "  - email.service.ts préservé sur le VPS" -ForegroundColor White
        Write-Host "  - Backend redémarré" -ForegroundColor White
        Write-Host "  - Backup disponible: ~/velosi-back/src_backup" -ForegroundColor White
    } else {
        Write-Host "Erreur lors du déploiement sur le VPS" -ForegroundColor Red
    }
} else {
    Write-Host "Erreur lors du transfert vers le VPS" -ForegroundColor Red
}

# Nettoyage local
Write-Host ""
Write-Host "Nettoyage..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $TEMP_DIR
if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
}
Write-Host "  Fichiers temporaires supprimés" -ForegroundColor Green

Write-Host ""
Write-Host "Terminé !" -ForegroundColor Cyan
