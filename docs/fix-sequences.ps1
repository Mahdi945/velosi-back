# Script pour réparer toutes les séquences PostgreSQL
# Exécuter avec: .\fix-sequences.ps1

Write-Host "`n=== RÉPARATION DES SÉQUENCES POSTGRESQL ===" -ForegroundColor Cyan

# Configuration - À ADAPTER selon votre environnement
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_USER = "postgres"
$DB_NAME = "danino"  # Base de données tenant

Write-Host "`n📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Hôte: $DB_HOST"
Write-Host "   Port: $DB_PORT"
Write-Host "   Base: $DB_NAME"
Write-Host "   Utilisateur: $DB_USER"

# Demander le mot de passe
$DB_PASS = Read-Host -Prompt "Mot de passe PostgreSQL" -AsSecureString
$DB_PASS_TEXT = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASS))

# Définir la variable d'environnement pour éviter le prompt
$env:PGPASSWORD = $DB_PASS_TEXT

Write-Host "`n🔧 Réparation des séquences..." -ForegroundColor Green

# Liste des tables avec leur colonne ID
$tables = @(
    @{table="crm_leads"; column="id"},
    @{table="personnel"; column="id"},
    @{table="clients"; column="id"},
    @{table="activites"; column="id"},
    @{table="taches"; column="id"},
    @{table="opportunites"; column="id"},
    @{table="contact_client"; column="id"}
)

foreach ($t in $tables) {
    $tableName = $t.table
    $columnName = $t.column
    
    Write-Host "`n  → Réparation séquence de $tableName..." -ForegroundColor Cyan
    
    # Requête SQL pour réparer la séquence
    $sql = @"
SELECT setval(
    pg_get_serial_sequence('$tableName', '$columnName'),
    COALESCE((SELECT MAX($columnName) FROM $tableName), 0) + 1,
    false
);
"@
    
    try {
        # Exécuter la requête avec psql
        $result = $sql | & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -A 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ Séquence $tableName.$columnName réparée" -ForegroundColor Green
        } else {
            Write-Host "    ⚠️ Avertissement pour $tableName : $result" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    ❌ Erreur pour $tableName : $_" -ForegroundColor Red
    }
}

# Nettoyer la variable d'environnement
$env:PGPASSWORD = $null

Write-Host "`n✅ Réparation terminée!" -ForegroundColor Green
Write-Host "`n💡 Si vous avez d'autres bases de données tenant, relancez ce script avec le bon DB_NAME" -ForegroundColor Yellow
Write-Host ""
