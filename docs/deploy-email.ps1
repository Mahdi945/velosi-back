# Script pour deployer email.service.ts vers le VPS avec backup

$VPS_HOST = "vps-3b4fd3be.vps.ovh.ca"
$VPS_USER = "Webdesk"
$VPS_PATH = "~/velosi-back"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "=== Deploiement email.service.ts ===" -ForegroundColor Cyan

# 1. Backup
Write-Host "`nCreation du backup..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/src/services && if [ -f email.service.ts ]; then cp email.service.ts email.service.ts.backup.${TIMESTAMP}; echo 'Backup OK'; fi"

# 2. Copie
Write-Host "`nCopie du fichier..." -ForegroundColor Yellow
scp "src\services\email.service.ts" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/src/services/email.service.ts"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Copie OK" -ForegroundColor Green
    
    # 3. Redemarrage
    Write-Host "`nRedemarrage..." -ForegroundColor Yellow
    ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && pm2 restart velosi-back"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Redemarrage OK" -ForegroundColor Green
    }
}

Write-Host "`n=== Termine ===" -ForegroundColor Cyan
