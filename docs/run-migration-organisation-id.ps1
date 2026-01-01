# ================================================================
# Script: Exécuter la migration organisation_id sur crm_quotes
# Date: 2025-01-22
# Description: Ajoute la colonne organisation_id à toutes les bases
# ================================================================

Write-Host "🚀 Démarrage de la migration organisation_id..." -ForegroundColor Cyan
Write-Host ""

# Configuration des bases de données
$databases = @("velosi", "danino")

# Identifiants PostgreSQL (à adapter selon votre configuration)
$env:PGPASSWORD = "admin"
$pgUser = "postgres"
$pgHost = "localhost"
$pgPort = "5432"

foreach ($db in $databases) {
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host "📦 Base de données: $db" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    
    # Exécuter le script SQL
    $result = psql -U $pgUser -h $pgHost -p $pgPort -d $db -f "add-organisation-id-to-quotes.sql" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration réussie pour $db" -ForegroundColor Green
        Write-Host $result
    } else {
        Write-Host "❌ Erreur lors de la migration de $db" -ForegroundColor Red
        Write-Host $result
    }
    
    Write-Host ""
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Migration terminée pour toutes les bases" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

# Nettoyer la variable d'environnement
Remove-Item Env:\PGPASSWORD
