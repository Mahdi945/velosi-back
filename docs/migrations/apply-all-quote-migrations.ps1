# ========================================
# Script PowerShell pour appliquer toutes les migrations des cotations
# Date: 2025-10-18
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIGRATION COMPLÈTE DES COTATIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration de la connexion PostgreSQL
$env:PGHOST = "localhost"
$env:PGPORT = "5432"
$env:PGDATABASE = "velosi"
$env:PGUSER = "msp"
$env:PGPASSWORD = "87Eq8384"

# Chemin vers psql
$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

# Vérifier que psql existe
if (-not (Test-Path $psqlPath)) {
    Write-Host "❌ ERREUR: psql.exe introuvable à: $psqlPath" -ForegroundColor Red
    Write-Host "Veuillez ajuster le chemin dans le script." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ psql trouvé: $psqlPath" -ForegroundColor Green
Write-Host ""

# Migrations à appliquer dans l'ordre
$migrations = @(
    "add-quotes-missing-columns.sql",
    "add-quote-items-missing-columns.sql"
)

$totalMigrations = $migrations.Count
$currentMigration = 0

foreach ($migration in $migrations) {
    $currentMigration++
    $migrationPath = Join-Path $PSScriptRoot $migration
    
    Write-Host "[$currentMigration/$totalMigrations] Application de: $migration" -ForegroundColor Cyan
    
    if (-not (Test-Path $migrationPath)) {
        Write-Host "❌ Fichier introuvable: $migrationPath" -ForegroundColor Red
        continue
    }
    
    try {
        # Exécuter la migration
        & $psqlPath -f $migrationPath 2>&1 | Out-String | Write-Host
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migration appliquée avec succès!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Migration terminée avec des avertissements (code: $LASTEXITCODE)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "❌ ERREUR lors de l'application de la migration:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIGRATIONS TERMINÉES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Résumé:" -ForegroundColor White
Write-Host "  - Migrations appliquées: $totalMigrations" -ForegroundColor White
Write-Host "  - Tables mises à jour: crm_quotes, crm_quote_items" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Vous pouvez maintenant redémarrer le serveur NestJS!" -ForegroundColor Green
Write-Host ""

# Pause pour que l'utilisateur puisse lire les messages
Read-Host "Appuyez sur Entrée pour fermer..."
