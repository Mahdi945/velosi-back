# Script pour appliquer la migration de suppression de contrainte sur le champ country
# Date: 2024-12-19

Write-Host "🔄 Application de la migration pour le champ country..." -ForegroundColor Yellow

# Paramètres de connexion à la base de données
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "velosi_db"
$DB_USER = "postgres"
$DB_PASSWORD = "postgres"  # À adapter selon votre configuration

# Chemin vers le fichier SQL de migration
$MIGRATION_FILE = ".\docs\migrations\remove_country_length_constraint.sql"

Write-Host "📋 Vérification de l'existence du fichier de migration..." -ForegroundColor Cyan
if (-Not (Test-Path $MIGRATION_FILE)) {
    Write-Host "❌ Fichier de migration non trouvé: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Fichier de migration trouvé" -ForegroundColor Green

Write-Host "📊 Exécution de la migration..." -ForegroundColor Cyan

try {
    # Exécuter la migration avec psql
    $env:PGPASSWORD = $DB_PASSWORD
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration appliquée avec succès!" -ForegroundColor Green
        Write-Host "📝 Le champ country peut maintenant accepter des textes libres" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de l'application de la migration (code: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de l'exécution: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Nettoyer la variable d'environnement
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "🎉 Migration terminée avec succès" -ForegroundColor Green