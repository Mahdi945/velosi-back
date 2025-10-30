# Script PowerShell pour exécuter la migration des tables Ports et Aéroports
# Remplacez les valeurs par vos propres paramètres de connexion

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Migration Ports et Aéroports" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Paramètres de connexion PostgreSQL (modifiez selon votre configuration)
$PGUSER = "postgres"
$PGDATABASE = "velosi_db"
$PGHOST = "localhost"
$PGPORT = "5432"

Write-Host "Connexion à la base de données: $PGDATABASE" -ForegroundColor Yellow
Write-Host "Host: ${PGHOST}:${PGPORT}" -ForegroundColor Yellow
Write-Host "User: $PGUSER" -ForegroundColor Yellow
Write-Host ""

# Demander le mot de passe de manière sécurisée
$SecurePassword = Read-Host "Entrez le mot de passe PostgreSQL" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Définir la variable d'environnement pour éviter la demande de mot de passe
$env:PGPASSWORD = $PGPASSWORD

Write-Host ""
Write-Host "Exécution de la migration..." -ForegroundColor Yellow
Write-Host ""

try {
    # Exécuter la migration
    psql -U $PGUSER -d $PGDATABASE -h $PGHOST -p $PGPORT -f migrations/create_ports_aeroports_tables.sql
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "====================================" -ForegroundColor Green
        Write-Host "Migration réussie !" -ForegroundColor Green
        Write-Host "====================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tables créées:" -ForegroundColor Green
        Write-Host "- ports (~30 ports d'exemple)" -ForegroundColor Green
        Write-Host "- aeroports (~35 aéroports d'exemple)" -ForegroundColor Green
        Write-Host ""
        
        # Vérifier les données
        Write-Host "Vérification des données..." -ForegroundColor Yellow
        $query = "SELECT 'Ports' as type, COUNT(*) as total FROM ports UNION ALL SELECT 'Aéroports' as type, COUNT(*) as total FROM aeroports;"
        psql -U $PGUSER -d $PGDATABASE -h $PGHOST -p $PGPORT -c $query
    }
} catch {
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Red
    Write-Host "ERREUR lors de la migration" -ForegroundColor Red
    Write-Host "====================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez:" -ForegroundColor Red
    Write-Host "- Que PostgreSQL est démarré" -ForegroundColor Red
    Write-Host "- Les paramètres de connexion" -ForegroundColor Red
    Write-Host "- Que la base de données existe" -ForegroundColor Red
    Write-Host ""
    Write-Host "Erreur: $_" -ForegroundColor Red
} finally {
    # Nettoyer la variable d'environnement
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
