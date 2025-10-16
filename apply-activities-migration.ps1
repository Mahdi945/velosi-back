# Script pour appliquer la migration des activités CRM
# Date: 2025-10-16

Write-Host "=== Migration des tables d'activités CRM ===" -ForegroundColor Cyan
Write-Host ""

# Charger les variables d'environnement depuis .env
if (Test-Path ".env") {
    Write-Host "Chargement des variables d'environnement..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "Fichier .env non trouvé. Utilisation des valeurs par défaut." -ForegroundColor Yellow
}

# Configuration de la base de données
$DB_HOST = if ($env:DB_ADDR) { $env:DB_ADDR } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "msp" }
$DB_NAME = if ($env:DB_DATABASE) { $env:DB_DATABASE } else { "velosi" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "87Eq8384" }

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Hôte: $DB_HOST" -ForegroundColor Gray
Write-Host "  Port: $DB_PORT" -ForegroundColor Gray
Write-Host "  Base: $DB_NAME" -ForegroundColor Gray
Write-Host "  Utilisateur: $DB_USER" -ForegroundColor Gray
Write-Host ""

# Définir le mot de passe pour psql
$env:PGPASSWORD = $DB_PASSWORD

# Chemin vers le fichier de migration
$MIGRATION_FILE = "migrations\create-activities-tables.sql"

if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "❌ Fichier de migration non trouvé: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "Application de la migration..." -ForegroundColor Yellow
Write-Host ""

# Exécuter la migration
try {
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration appliquée avec succès!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tables créées:" -ForegroundColor Cyan
        Write-Host "  - crm_activities" -ForegroundColor Gray
        Write-Host "  - crm_activity_participants" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Index créés pour optimiser les performances" -ForegroundColor Gray
        Write-Host "Triggers créés pour mettre à jour updated_at automatiquement" -ForegroundColor Gray
    } else {
        Write-Host "❌ Erreur lors de l'application de la migration" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Migration terminée ===" -ForegroundColor Cyan

# Vérifier que les tables existent
Write-Host ""
Write-Host "Vérification des tables..." -ForegroundColor Yellow

$CHECK_QUERY = @"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('crm_activities', 'crm_activity_participants')
ORDER BY table_name;
"@

try {
    $tables = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c $CHECK_QUERY
    
    if ($tables) {
        Write-Host "✅ Tables vérifiées:" -ForegroundColor Green
        $tables -split "`n" | ForEach-Object {
            if ($_.Trim()) {
                Write-Host "  - $($_.Trim())" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "⚠️ Impossible de vérifier les tables" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Vous pouvez maintenant redémarrer le serveur backend." -ForegroundColor Cyan

