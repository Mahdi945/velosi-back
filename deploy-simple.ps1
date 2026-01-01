# ========================================
# Script de deploiement SIMPLE et ROBUSTE vers le VPS
# ========================================
# Basé sur sync-to-vps.ps1 qui fonctionne
# Deploie: src/, config files, assets/
# ========================================

$VPS_HOST = "Webdesk@vps-3b4fd3be.vps.ovh.ca"
$LOCAL_ROOT = "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
$TEMP_DIR = "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\temp-deploy-simple"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPLOIEMENT SIMPLE ET ROBUSTE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# ETAPE 1: Preparation
# ========================================
Write-Host "ETAPE 1/5: Preparation des fichiers" -ForegroundColor Yellow
Write-Host ""

if (Test-Path $TEMP_DIR) {
    Remove-Item -Recurse -Force $TEMP_DIR
}
New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null

# Copier src
Write-Host "  Copie du dossier src..." -ForegroundColor Cyan
Copy-Item -Path "$LOCAL_ROOT\src" -Destination $TEMP_DIR -Recurse -Force
Write-Host "    OK src/" -ForegroundColor Green

# Supprimer fichiers a exclure
$envFile = Get-ChildItem -Path "$TEMP_DIR\src" -Recurse -Filter ".env" -ErrorAction SilentlyContinue
if ($envFile) {
    Remove-Item $envFile.FullName -Force
    Write-Host "    .env exclu" -ForegroundColor Yellow
}

# NOTE: On n'exclut PLUS email.service.ts car le VPS peut ne pas l'avoir
# Si besoin de preserver une version specifique VPS, on la copiera par dessus

# Copier les fichiers de config
Write-Host "  Copie des fichiers de configuration..." -ForegroundColor Cyan
$configFiles = @("package.json", "package-lock.json", "tsconfig.json", "tsconfig.build.json", "nest-cli.json")
foreach ($file in $configFiles) {
    $sourcePath = Join-Path $LOCAL_ROOT $file
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $TEMP_DIR -Force
        Write-Host "    OK $file" -ForegroundColor Green
    }
}

# Copier assets
if (Test-Path "$LOCAL_ROOT\assets") {
    Write-Host "  Copie du dossier assets..." -ForegroundColor Cyan
    Copy-Item -Path "$LOCAL_ROOT\assets" -Destination $TEMP_DIR -Recurse -Force
    Write-Host "    OK assets/" -ForegroundColor Green
}

Write-Host ""

# ========================================
# ETAPE 2: Archive
# ========================================
Write-Host "ETAPE 2/5: Creation de l'archive" -ForegroundColor Yellow
Write-Host ""

$archivePath = Join-Path $LOCAL_ROOT "backend-simple.tar.gz"
if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
}

Push-Location $TEMP_DIR
tar -czf $archivePath *
Pop-Location

if (Test-Path $archivePath) {
    $archiveSize = (Get-Item $archivePath).Length / 1MB
    Write-Host "  OK Archive: $([math]::Round($archiveSize, 2)) MB" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "  ERREUR: Archive non creee" -ForegroundColor Red
    exit 1
}

# ========================================
# ETAPE 3: Transfert
# ========================================
Write-Host "ETAPE 3/5: Transfert vers le VPS" -ForegroundColor Yellow
Write-Host ""

scp $archivePath "${VPS_HOST}:~/backend-simple.tar.gz"

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERREUR lors du transfert" -ForegroundColor Red
    exit 1
}
Write-Host "  OK Transfert reussi" -ForegroundColor Green
Write-Host ""

# ========================================
# ETAPE 4: Deploiement sur VPS
# ========================================
Write-Host "ETAPE 4/5: Deploiement sur le VPS" -ForegroundColor Yellow
Write-Host ""

# Utiliser un script bash externe pour éviter les problèmes d'échappement
$bashScript = @'
#!/bin/bash
set -e

echo "=========================================="
echo "Deploiement sur VPS"
echo "=========================================="
echo ""

BACKUP_NAME="velosi-back-backup-$(date +%Y%m%d-%H%M%S)"

echo "Arret du backend..."
pm2 stop velosi-backend 2>/dev/null || true
sleep 2
echo ""

echo "Backup complet..."
if [ -d ~/velosi-back ]; then
    cp -r ~/velosi-back ~/${BACKUP_NAME}
    echo "  Backup: ${BACKUP_NAME}"
else
    echo "  Pas de velosi-back existant"
fi
echo ""

echo "Extraction archive..."
TEMP_DEPLOY=~/temp-deploy-simple
rm -rf ${TEMP_DEPLOY}
mkdir -p ${TEMP_DEPLOY}
cd ${TEMP_DEPLOY}
tar -xzf ~/backend-simple.tar.gz
echo "  Archive extraite"
echo ""

echo "Verification structure..."
if [ ! -d "${TEMP_DEPLOY}/src" ]; then
    echo "ERREUR: src/ introuvable"
    exit 1
fi
if [ ! -f "${TEMP_DEPLOY}/package.json" ]; then
    echo "ERREUR: package.json introuvable"
    exit 1
fi
echo "  Structure OK"
echo ""

echo "Deploiement src/..."
if [ -d ~/velosi-back/src ]; then
    rm -rf ~/velosi-back/src
fi
mkdir -p ~/velosi-back
cp -r ${TEMP_DEPLOY}/src ~/velosi-back/
echo "  src/ deploye"
echo ""

echo "Preservation fichiers VPS..."
# Preserver .env uniquement (email.service.ts et database.config.ts sont maintenant deployes)
if [ -f ~/${BACKUP_NAME}/.env ]; then
    cp ~/${BACKUP_NAME}/.env ~/velosi-back/
    echo "  .env preserve depuis backup actuel"
else
    echo "  ATTENTION: .env introuvable dans backup actuel"
    echo "  Recherche dans les backups precedents..."
    
    # Chercher le .env dans les anciens backups (du plus récent au plus ancien)
    ENV_FOUND=0
    for backup_dir in $(ls -dt ~/velosi-back-backup-* 2>/dev/null); do
        if [ -f "$backup_dir/.env" ]; then
            cp "$backup_dir/.env" ~/velosi-back/
            echo "  .env copie depuis: $(basename $backup_dir)"
            ENV_FOUND=1
            break
        fi
    done
    
    if [ $ENV_FOUND -eq 0 ]; then
        echo "  ERREUR: Aucun .env trouve dans les backups!"
        echo "  Le backend demarrera mais ne pourra pas se connecter a la DB"
    fi
fi
echo ""

echo "Deploiement fichiers config..."
for file in package.json package-lock.json tsconfig.json tsconfig.build.json nest-cli.json; do
    if [ -f "${TEMP_DEPLOY}/${file}" ]; then
        cp ${TEMP_DEPLOY}/${file} ~/velosi-back/
        echo "  ${file} deploye"
    fi
done
echo ""

echo "Deploiement assets..."
if [ -d "${TEMP_DEPLOY}/assets" ]; then
    rm -rf ~/velosi-back/assets
    cp -r ${TEMP_DEPLOY}/assets ~/velosi-back/
    echo "  assets/ deploye"
fi
echo ""

echo "Installation dependances..."
cd ~/velosi-back
npm install --production --legacy-peer-deps
echo "  Dependances installees"
echo ""

echo "Build..."
npm run build
echo "  Build reussi"
echo ""

echo "Nettoyage..."
rm -rf ${TEMP_DEPLOY}
rm ~/backend-simple.tar.gz
echo "  Fichiers temp supprimes"
echo ""

echo "Redemarrage backend..."
pm2 restart velosi-backend --update-env
sleep 5
pm2 status velosi-backend
echo ""
echo "Deploiement termine avec succes!"
'@

# Sauvegarder le script bash localement avec fins de ligne Unix (LF)
$bashScriptPath = Join-Path $LOCAL_ROOT "deploy-script.sh"
# Convertir les fins de ligne Windows en Unix
$bashScript = $bashScript -replace "`r`n", "`n"
$bashScript = $bashScript -replace "`r", "`n"
[System.IO.File]::WriteAllText($bashScriptPath, $bashScript, [System.Text.UTF8Encoding]::new($false))

# Envoyer le script bash sur le VPS
Write-Host "  Envoi du script de deploiement..." -ForegroundColor Cyan
scp $bashScriptPath "${VPS_HOST}:~/deploy-script.sh"

# Executer le script bash sur le VPS
Write-Host "  Execution du deploiement..." -ForegroundColor Cyan
echo "Offline25`$`$" | ssh $VPS_HOST "chmod +x ~/deploy-script.sh && ~/deploy-script.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERREUR lors du deploiement" -ForegroundColor Red
    exit 1
}

# ========================================
# ETAPE 5: Verification
# ========================================
Write-Host ""
Write-Host "ETAPE 5/5: Verification" -ForegroundColor Yellow
Write-Host ""

$verifyCommands = @'
pm2 logs velosi-backend --lines 10 --nostream
'@

echo "Offline25`$`$" | ssh $VPS_HOST $verifyCommands

# ========================================
# NETTOYAGE
# ========================================
Write-Host ""
Write-Host "Nettoyage..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $TEMP_DIR
if (Test-Path $archivePath) { Remove-Item $archivePath -Force }
if (Test-Path $bashScriptPath) { Remove-Item $bashScriptPath -Force }
Write-Host "  OK" -ForegroundColor Green

# ========================================
# RESUME
# ========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPLOIEMENT TERMINE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resume:" -ForegroundColor Cyan
Write-Host "  src/ deploye" -ForegroundColor White
Write-Host "  Fichiers config deployes" -ForegroundColor White
Write-Host "  assets/ deploye" -ForegroundColor White
Write-Host "  .env preserve" -ForegroundColor White
Write-Host "  email.service.ts preserve" -ForegroundColor White
Write-Host "  database.config.ts preserve" -ForegroundColor White
Write-Host "  Backend compile et redemarre" -ForegroundColor White
Write-Host ""
Write-Host "Backup: ~/velosi-back-backup-YYYYMMDD-HHMMSS" -ForegroundColor Cyan
Write-Host ""
