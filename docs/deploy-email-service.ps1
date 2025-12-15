# Script pour déployer uniquement email.service.ts vers le VPS
# Utilise almalinux comme utilisateur admin

$VPS_HOST = "162.19.66.73"
$VPS_USER = "almalinux"
$VPS_PATH = "/home/almalinux/velosi-back"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "=== Deploiement de email.service.ts vers le VPS ===" -ForegroundColor Cyan

# 1. Créer un backup du fichier existant sur le VPS
Write-Host "`n💾 Creation du backup..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/src/services && if [ -f email.service.ts ]; then cp email.service.ts email.service.ts.backup.${TIMESTAMP} && echo 'Backup créé: email.service.ts.backup.${TIMESTAMP}'; else echo 'Aucun fichier à sauvegarder'; fi"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup cree avec succes" -ForegroundColor Green
} else {
    Write-Host "⚠️ Attention: Impossible de creer le backup (peut-etre que le fichier n'existe pas encore)" -ForegroundColor Yellow
}

# 2. Copier email.service.ts vers le VPS
Write-Host "`n📤 Copie de email.service.ts..." -ForegroundColor Yellow
scp "src\services\email.service.ts" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/src/services/email.service.ts"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ email.service.ts copie avec succes" -ForegroundColor Green
    
    # 3. Redémarrer l'application sur le VPS
    Write-Host "`n🔄 Redemarrage de l'application..." -ForegroundColor Yellow
    ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && pm2 restart velosi-back"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Application redemarree avec succes" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors du redemarrage" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Erreur lors de la copie" -ForegroundColor Red
    Write-Host "💡 Le backup peut etre restaure avec:" -ForegroundColor Yellow
    Write-Host "   ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH}/src/services && cp email.service.ts.backup.${TIMESTAMP} email.service.ts'" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Deploiement termine ===" -ForegroundColor Cyan
