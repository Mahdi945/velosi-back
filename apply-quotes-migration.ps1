# Script PowerShell pour appliquer la migration des colonnes manquantes de crm_quotes
# Date: 2025-10-18

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration: Ajout colonnes manquantes crm_quotes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Charger les variables d'environnement depuis le fichier .env
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "✓ Fichier .env chargé" -ForegroundColor Green
} else {
    Write-Host "✗ Fichier .env non trouvé, utilisation des valeurs par défaut" -ForegroundColor Yellow
}

# Récupérer les paramètres de connexion
$DB_HOST = if ($env:DB_ADDR) { $env:DB_ADDR } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_DATABASE) { $env:DB_DATABASE } else { "velosi" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "msp" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "87Eq8384" }

Write-Host ""
Write-Host "Paramètres de connexion:" -ForegroundColor Cyan
Write-Host "  Host: $DB_HOST" -ForegroundColor Gray
Write-Host "  Port: $DB_PORT" -ForegroundColor Gray
Write-Host "  Database: $DB_NAME" -ForegroundColor Gray
Write-Host "  User: $DB_USER" -ForegroundColor Gray
Write-Host ""

# Définir la variable d'environnement PGPASSWORD pour éviter la demande de mot de passe
$env:PGPASSWORD = $DB_PASSWORD

# Chemin du fichier SQL
$sqlFile = "migrations\add-quotes-missing-columns.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "✗ Erreur: Le fichier $sqlFile n'existe pas!" -ForegroundColor Red
    exit 1
}

Write-Host "Exécution de la migration..." -ForegroundColor Yellow
Write-Host ""

# Exécuter la migration
try {
    $output = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $sqlFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migration exécutée avec succès!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Détails:" -ForegroundColor Cyan
        $output | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    } else {
        Write-Host "✗ Erreur lors de l'exécution de la migration" -ForegroundColor Red
        Write-Host ""
        Write-Host "Détails de l'erreur:" -ForegroundColor Red
        $output | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        exit 1
    }
} catch {
    Write-Host "✗ Erreur: $_" -ForegroundColor Red
    exit 1
} finally {
    # Nettoyer la variable PGPASSWORD
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration terminée" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vous pouvez maintenant redémarrer le serveur NestJS." -ForegroundColor Yellow
Write-Host ""
