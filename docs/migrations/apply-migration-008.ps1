# ===================================================================
# Script PowerShell pour appliquer la migration 008
# ===================================================================
# Description: Applique la migration add_organisation_id aux bases velosi et danino
# ===================================================================

$ErrorActionPreference = "Stop"

# Configuration
$PGHOST = "localhost"
$PGUSER = "postgres"
$PGPASSWORD = "1234"
$PGPORT = "5432"

# Chemin vers le fichier SQL
$MIGRATION_FILE = "008_add_organisation_id_to_personnel_and_client.sql"
$SCRIPT_DIR = $PSScriptRoot

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "Migration 008: Ajout organisation_id aux tables personnel et client" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour exécuter une commande SQL
function Invoke-PgCommand {
    param (
        [string]$Database,
        [string]$Command
    )
    
    $env:PGPASSWORD = $PGPASSWORD
    $output = psql -h $PGHOST -U $PGUSER -d $Database -p $PGPORT -c $Command 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Erreur lors de l'exécution de la commande SQL: $output"
    }
    return $output
}

# Fonction pour obtenir l'ID d'une organisation
function Get-OrganisationId {
    param (
        [string]$DatabaseName
    )
    
    $env:PGPASSWORD = $PGPASSWORD
    $query = "SELECT id FROM organisations WHERE database_name = '$DatabaseName' LIMIT 1;"
    $result = psql -h $PGHOST -U $PGUSER -d shipnology -p $PGPORT -t -c $query 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Erreur lors de la récupération de l'ID de l'organisation: $result" -ForegroundColor Yellow
        return $null
    }
    
    return $result.Trim()
}

# Fonction pour appliquer la migration à une base de données
function Apply-Migration {
    param (
        [string]$Database,
        [int]$OrganisationId
    )
    
    Write-Host "-------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "📦 Base de données: $Database (organisation_id: $OrganisationId)" -ForegroundColor Yellow
    Write-Host "-------------------------------------------------------------------" -ForegroundColor Yellow
    
    try {
        # Étape 1: Appliquer le fichier SQL de migration
        Write-Host "  1️⃣  Application du fichier SQL de migration..." -ForegroundColor Cyan
        $env:PGPASSWORD = $PGPASSWORD
        $output = psql -h $PGHOST -U $PGUSER -d $Database -p $PGPORT -f "$SCRIPT_DIR\$MIGRATION_FILE" 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ❌ Erreur lors de l'application de la migration: $output" -ForegroundColor Red
            return $false
        }
        Write-Host "  ✅ Migration SQL appliquée avec succès" -ForegroundColor Green
        
        # Étape 2: Mettre à jour les organisation_id existants
        Write-Host "  2️⃣  Mise à jour des organisation_id existants..." -ForegroundColor Cyan
        
        $updatePersonnel = "UPDATE personnel SET organisation_id = $OrganisationId WHERE organisation_id = 1 OR organisation_id IS NULL;"
        Invoke-PgCommand -Database $Database -Command $updatePersonnel | Out-Null
        
        $updateClient = "UPDATE client SET organisation_id = $OrganisationId WHERE organisation_id = 1 OR organisation_id IS NULL;"
        Invoke-PgCommand -Database $Database -Command $updateClient | Out-Null
        
        Write-Host "  ✅ Données mises à jour avec succès" -ForegroundColor Green
        
        # Étape 3: Vérification
        Write-Host "  3️⃣  Vérification..." -ForegroundColor Cyan
        
        $countPersonnel = Invoke-PgCommand -Database $Database -Command "SELECT COUNT(*) FROM personnel WHERE organisation_id = $OrganisationId;"
        $countClient = Invoke-PgCommand -Database $Database -Command "SELECT COUNT(*) FROM client WHERE organisation_id = $OrganisationId;"
        
        Write-Host "  📊 Statistiques:" -ForegroundColor White
        Write-Host "     - Personnel: $countPersonnel enregistrement(s)" -ForegroundColor White
        Write-Host "     - Client: $countClient enregistrement(s)" -ForegroundColor White
        
        Write-Host ""
        Write-Host "  ✅ Migration appliquée avec succès pour $Database !" -ForegroundColor Green
        return $true
        
    } catch {
        Write-Host "  ❌ Erreur lors de la migration: $_" -ForegroundColor Red
        return $false
    }
}

# ===================================================================
# EXÉCUTION PRINCIPALE
# ===================================================================

try {
    # Récupérer les IDs des organisations depuis shipnology
    Write-Host "📋 Récupération des IDs d'organisations depuis shipnology..." -ForegroundColor Cyan
    
    $velosiId = Get-OrganisationId -DatabaseName "velosi"
    $daninoId = Get-OrganisationId -DatabaseName "danino"
    
    Write-Host "  ✅ Velosi ID: $velosiId" -ForegroundColor Green
    Write-Host "  ✅ Danino ID: $daninoId" -ForegroundColor Green
    Write-Host ""
    
    # Demander confirmation
    Write-Host "⚠️  Cette migration va modifier les tables personnel et client dans:" -ForegroundColor Yellow
    Write-Host "   - Base velosi (organisation_id = $velosiId)" -ForegroundColor Yellow
    Write-Host "   - Base danino (organisation_id = $daninoId)" -ForegroundColor Yellow
    Write-Host ""
    $confirmation = Read-Host "Voulez-vous continuer? (O/N)"
    
    if ($confirmation -ne "O") {
        Write-Host "❌ Migration annulée par l'utilisateur" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    
    # Appliquer la migration à velosi
    if ($velosiId) {
        $velosiSuccess = Apply-Migration -Database "velosi" -OrganisationId ([int]$velosiId)
    } else {
        Write-Host "⚠️  ID non trouvé pour velosi, migration ignorée" -ForegroundColor Yellow
        $velosiSuccess = $false
    }
    
    Write-Host ""
    
    # Appliquer la migration à danino
    if ($daninoId) {
        $daninoSuccess = Apply-Migration -Database "danino" -OrganisationId ([int]$daninoId)
    } else {
        Write-Host "⚠️  ID non trouvé pour danino, migration ignorée" -ForegroundColor Yellow
        $daninoSuccess = $false
    }
    
    Write-Host ""
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host "                     RÉSUMÉ DE LA MIGRATION                          " -ForegroundColor Cyan
    Write-Host "=====================================================================" -ForegroundColor Cyan
    
    if ($velosiSuccess) {
        Write-Host "✅ velosi: Migration réussie" -ForegroundColor Green
    } else {
        Write-Host "❌ velosi: Migration échouée" -ForegroundColor Red
    }
    
    if ($daninoSuccess) {
        Write-Host "✅ danino: Migration réussie" -ForegroundColor Green
    } else {
        Write-Host "❌ danino: Migration échouée" -ForegroundColor Red
    }
    
    Write-Host "=====================================================================" -ForegroundColor Cyan
    
    if ($velosiSuccess -and $daninoSuccess) {
        Write-Host ""
        Write-Host "🎉 Toutes les migrations ont été appliquées avec succès !" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Redémarrez le backend pour que les changements prennent effet." -ForegroundColor Yellow
        exit 0
    } else {
        Write-Host ""
        Write-Host "⚠️  Certaines migrations ont échoué. Vérifiez les erreurs ci-dessus." -ForegroundColor Yellow
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Erreur critique: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    exit 1
}
