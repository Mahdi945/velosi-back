# Script PowerShell pour exécuter le script SQL d'ajout des champs footer
# Date: 2025-12-24

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ajout des champs footer à la table organisations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration de la connexion PostgreSQL
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "shipnology"
$DB_USER = "postgres"
$SQL_FILE = "add-footer-fields-to-organisations.sql"

# Vérifier si le fichier SQL existe
if (-Not (Test-Path $SQL_FILE)) {
    Write-Host "❌ Erreur: Le fichier $SQL_FILE n'existe pas" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Host: $DB_HOST" -ForegroundColor Gray
Write-Host "   Port: $DB_PORT" -ForegroundColor Gray
Write-Host "   Database: $DB_NAME" -ForegroundColor Gray
Write-Host "   User: $DB_USER" -ForegroundColor Gray
Write-Host "   Script: $SQL_FILE" -ForegroundColor Gray
Write-Host ""

# Demander le mot de passe
$DB_PASSWORD = Read-Host "Entrez le mot de passe PostgreSQL" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
$PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "🚀 Exécution du script SQL..." -ForegroundColor Cyan

# Définir la variable d'environnement pour le mot de passe
$env:PGPASSWORD = $PlainPassword

try {
    # Exécuter le script SQL
    $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SQL_FILE 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Script exécuté avec succès!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Résultat:" -ForegroundColor Yellow
        $result | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
    } else {
        Write-Host ""
        Write-Host "❌ Erreur lors de l'exécution du script" -ForegroundColor Red
        Write-Host ""
        Write-Host "Détails de l'erreur:" -ForegroundColor Yellow
        $result | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
    exit 1
} finally {
    # Nettoyer la variable d'environnement du mot de passe
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Terminé!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
