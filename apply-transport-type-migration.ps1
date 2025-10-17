# Script pour appliquer la migration de l'enum transport_type
# Ajoute 'routier' aux enums transport_type dans les tables CRM

Write-Host "=== Migration de l'enum transport_type ===" -ForegroundColor Cyan

# Configuration de la base de données
$dbHost = "localhost"
$dbPort = "3306"
$dbName = "velosi_erp"
$dbUser = "root"
$dbPassword = "root"

# Chemin vers le fichier SQL
$migrationFile = ".\migrations\update-transport-type-enum.sql"

Write-Host "`nVérification du fichier de migration..." -ForegroundColor Yellow
if (-not (Test-Path $migrationFile)) {
    Write-Host "Erreur: Le fichier $migrationFile n'existe pas!" -ForegroundColor Red
    exit 1
}

Write-Host "Fichier trouvé: $migrationFile" -ForegroundColor Green

# Exécuter la migration
Write-Host "`nExécution de la migration..." -ForegroundColor Yellow

try {
    # Utiliser mysql.exe pour exécuter le fichier SQL
    $mysqlCmd = "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName"
    
    Write-Host "Commande: $mysqlCmd < $migrationFile" -ForegroundColor Gray
    
    Get-Content $migrationFile | & mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Migration appliquée avec succès!" -ForegroundColor Green
        Write-Host "`nLes tables suivantes ont été mises à jour:" -ForegroundColor Cyan
        Write-Host "  - crm_opportunities (transport_type)" -ForegroundColor White
        Write-Host "`nValeurs acceptées: aerien, groupage, complet, routier" -ForegroundColor Yellow
    } else {
        Write-Host "`n❌ Erreur lors de l'application de la migration" -ForegroundColor Red
        Write-Host "Code de sortie: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "`n❌ Erreur: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Migration terminée ===" -ForegroundColor Cyan
