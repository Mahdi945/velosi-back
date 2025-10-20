# ========================================
# Script PowerShell pour exécuter les migrations des tables CRM Quotes
# Date: 2025-10-18
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MIGRATION DES TABLES CRM QUOTES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration de la base de données
$env:PGPASSWORD = "87Eq8384"
$DB_USER = "msp"
$DB_NAME = "velosi"
$DB_HOST = "localhost"
$DB_PORT = "5432"

# Chemins des fichiers de migration
$MIGRATION_QUOTES = "migrations\add-quotes-missing-columns.sql"
$MIGRATION_QUOTE_ITEMS = "migrations\add-quote-items-missing-columns.sql"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Base de données: $DB_NAME"
Write-Host "  Hôte: $DB_HOST"
Write-Host "  Port: $DB_PORT"
Write-Host "  Utilisateur: $DB_USER"
Write-Host ""

# Fonction pour exécuter une migration
function Execute-Migration {
    param (
        [string]$migrationFile,
        [string]$description
    )
    
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    Write-Host "Exécution: $description" -ForegroundColor Yellow
    Write-Host "Fichier: $migrationFile" -ForegroundColor Gray
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    
    if (-not (Test-Path $migrationFile)) {
        Write-Host "ERREUR: Le fichier $migrationFile n'existe pas!" -ForegroundColor Red
        return $false
    }
    
    try {
        # Exécuter le fichier SQL
        $output = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migrationFile 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host $output -ForegroundColor Green
            Write-Host "✓ Migration réussie!" -ForegroundColor Green
            Write-Host ""
            return $true
        } else {
            Write-Host "✗ Erreur lors de la migration:" -ForegroundColor Red
            Write-Host $output -ForegroundColor Red
            Write-Host ""
            return $false
        }
    }
    catch {
        Write-Host "✗ Exception: $_" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

# Vérifier que psql est disponible
Write-Host "Vérification de psql..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version 2>&1
    Write-Host "✓ $psqlVersion" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "✗ ERREUR: psql n'est pas installé ou n'est pas dans le PATH!" -ForegroundColor Red
    Write-Host "Veuillez installer PostgreSQL ou ajouter psql au PATH." -ForegroundColor Yellow
    exit 1
}

# Tester la connexion à la base de données
Write-Host "Test de connexion à la base de données..." -ForegroundColor Yellow
try {
    $testConnection = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Connexion réussie!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "✗ Impossible de se connecter à la base de données!" -ForegroundColor Red
        Write-Host $testConnection -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "✗ Erreur de connexion: $_" -ForegroundColor Red
    exit 1
}

# Exécuter les migrations
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DÉBUT DES MIGRATIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$success = $true

# 1. Migration de la table crm_quotes
$result1 = Execute-Migration -migrationFile $MIGRATION_QUOTES -description "Migration crm_quotes - Ajout des colonnes manquantes"
$success = $success -and $result1

# 2. Migration de la table crm_quote_items
$result2 = Execute-Migration -migrationFile $MIGRATION_QUOTE_ITEMS -description "Migration crm_quote_items - Ajout des colonnes manquantes"
$success = $success -and $result2

# Résultat final
Write-Host "========================================" -ForegroundColor Cyan
if ($success) {
    Write-Host "MIGRATIONS TERMINÉES AVEC SUCCÈS!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✓ Table crm_quotes mise à jour" -ForegroundColor Green
    Write-Host "✓ Table crm_quote_items mise à jour" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vous pouvez maintenant redémarrer le serveur NestJS." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "ERREUR LORS DES MIGRATIONS!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Veuillez vérifier les erreurs ci-dessus." -ForegroundColor Yellow
    exit 1
}
