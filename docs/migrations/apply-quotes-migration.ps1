# Script PowerShell pour exécuter la migration crm_quotes
# Date: 2025-10-18

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration crm_quotes - Ajout colonnes manquantes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration de la base de données (depuis .env ou par défaut)
$DB_HOST = $env:DB_ADDR
if ([string]::IsNullOrEmpty($DB_HOST)) { $DB_HOST = "localhost" }

$DB_PORT = $env:DB_PORT
if ([string]::IsNullOrEmpty($DB_PORT)) { $DB_PORT = "5432" }

$DB_NAME = $env:DB_DATABASE
if ([string]::IsNullOrEmpty($DB_NAME)) { $DB_NAME = "velosi" }

$DB_USER = $env:DB_USER
if ([string]::IsNullOrEmpty($DB_USER)) { $DB_USER = "msp" }

$DB_PASSWORD = $env:DB_PASSWORD
if ([string]::IsNullOrEmpty($DB_PASSWORD)) { $DB_PASSWORD = "87Eq8384" }

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Host: $DB_HOST" -ForegroundColor Gray
Write-Host "  Port: $DB_PORT" -ForegroundColor Gray
Write-Host "  Database: $DB_NAME" -ForegroundColor Gray
Write-Host "  User: $DB_USER" -ForegroundColor Gray
Write-Host ""

# Chemin vers le fichier SQL
$scriptPath = Join-Path $PSScriptRoot "add-quotes-missing-columns.sql"

if (-not (Test-Path $scriptPath)) {
    Write-Host "ERREUR: Fichier de migration introuvable: $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Fichier de migration: $scriptPath" -ForegroundColor Green
Write-Host ""

# Définir la variable d'environnement PGPASSWORD pour éviter la demande de mot de passe
$env:PGPASSWORD = $DB_PASSWORD

try {
    Write-Host "Exécution de la migration..." -ForegroundColor Yellow
    Write-Host ""
    
    # Exécuter le script SQL avec psql
    $arguments = @(
        "-h", $DB_HOST,
        "-p", $DB_PORT,
        "-U", $DB_USER,
        "-d", $DB_NAME,
        "-f", $scriptPath,
        "-v", "ON_ERROR_STOP=1",
        "--echo-errors"
    )
    
    $process = Start-Process -FilePath "psql" -ArgumentList $arguments -NoNewWindow -Wait -PassThru
    
    if ($process.ExitCode -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Migration réussie!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Les colonnes suivantes ont été ajoutées à crm_quotes:" -ForegroundColor Cyan
        Write-Host "  - commercial_id" -ForegroundColor Gray
        Write-Host "  - country, tiers, attention_to" -ForegroundColor Gray
        Write-Host "  - pickup_location, delivery_location" -ForegroundColor Gray
        Write-Host "  - transit_time, departure_frequency" -ForegroundColor Gray
        Write-Host "  - client_type, import_export, file_status" -ForegroundColor Gray
        Write-Host "  - terms, payment_method, payment_conditions" -ForegroundColor Gray
        Write-Host "  - requester, vehicle_id" -ForegroundColor Gray
        Write-Host "  - freight_purchased, freight_offered, freight_margin" -ForegroundColor Gray
        Write-Host "  - additional_costs_purchased, additional_costs_offered" -ForegroundColor Gray
        Write-Host "  - total_purchases, total_offers, total_margin" -ForegroundColor Gray
        Write-Host "  - internal_instructions, customer_request, exchange_notes" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Vous pouvez maintenant redémarrer le serveur NestJS." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "ERREUR: La migration a échoué" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "Code de sortie: $($process.ExitCode)" -ForegroundColor Red
        exit $process.ExitCode
    }
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERREUR lors de l'exécution de la migration" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Nettoyer la variable d'environnement
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
