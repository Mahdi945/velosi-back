# ================================================================
# SCRIPT D'EXECUTION AUTOMATIQUE DE LA MIGRATION VERS SHIPNOLOGY
# ================================================================
# Ce script automatise toute la migration de velosi vers le modele multi-tenant
# Execution: .\EXECUTE_MIGRATION.ps1
# ================================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MIGRATION VERS SHIPNOLOGY (MULTI-TENANT)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ================================================================
# CONFIGURATION
# ================================================================
$DB_USER = "msp"
$DB_PASSWORD = "87Eq8384"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$POSTGRES_BIN = "C:\Program Files\PostgreSQL\17\bin"

# Ajouter PostgreSQL au PATH
$env:Path += ";$POSTGRES_BIN"
$env:PGPASSWORD = $DB_PASSWORD

# Chemins
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKUP_DIR = Join-Path $SCRIPT_DIR "backups"
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# ================================================================
# ETAPE 0 : VERIFICATIONS PRELIMINAIRES
# ================================================================
Write-Host "ETAPE 0 : Verifications preliminaires..." -ForegroundColor Yellow
Write-Host ""

# Verifier que PostgreSQL est accessible
try {
    & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d velosi -c "SELECT version();" | Out-Null
    Write-Host "[OK] Connexion PostgreSQL OK" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Impossible de se connecter a PostgreSQL" -ForegroundColor Red
    Write-Host "Verifiez que PostgreSQL est demarre et que les identifiants sont corrects" -ForegroundColor Red
    exit 1
}

# Verifier que la base velosi existe
$velosiExists = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='velosi';"
if (-not $velosiExists.Trim()) {
    Write-Host "[ERREUR] La base 'velosi' n'existe pas" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Base 'velosi' trouvee" -ForegroundColor Green
Write-Host ""

# ================================================================
# ETAPE 1 : BACKUP DE SECURITE
# ================================================================
Write-Host "ETAPE 1 : Creation du backup de securite..." -ForegroundColor Yellow
Write-Host ""

# Creer le dossier de backup
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

$BACKUP_FILE = Join-Path $BACKUP_DIR "velosi_backup_$TIMESTAMP.sql"

Write-Host "[BACKUP] Sauvegarde de la base 'velosi'..." -ForegroundColor Cyan
& pg_dump -U $DB_USER -h $DB_HOST -p $DB_PORT velosi > $BACKUP_FILE

if ($LASTEXITCODE -eq 0) {
    $backupSize = (Get-Item $BACKUP_FILE).Length / 1MB
    $sizeRounded = [math]::Round($backupSize, 2)
    Write-Host "[OK] Backup cree: $BACKUP_FILE ($sizeRounded MB)" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Erreur lors du backup" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ================================================================
# ETAPE 2 : CREER LA BASE PRINCIPALE 'shipnology'
# ================================================================
Write-Host "ETAPE 2 : Creation de la base principale 'shipnology'..." -ForegroundColor Yellow
Write-Host ""

# Verifier si shipnology existe deja
$shipnologyExists = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='shipnology';"
if ($shipnologyExists.Trim()) {
    Write-Host "[ATTENTION] La base 'shipnology' existe deja" -ForegroundColor Yellow
    $response = Read-Host "Voulez-vous la supprimer et recreer? (O/N)"
    if ($response -eq "O" -or $response -eq "o") {
        Write-Host "[SUPPRESSION] Suppression de 'shipnology'..." -ForegroundColor Cyan
        & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c "DROP DATABASE shipnology;"
        Write-Host "[OK] Base 'shipnology' supprimee" -ForegroundColor Green
    } else {
        Write-Host "[SKIP] Conservation de 'shipnology' existante" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Passage a l'etape suivante..." -ForegroundColor Cyan
        Write-Host ""
        # Passer a l'etape suivante sans recreer
        $skipShipnology = $true
    }
}

if (-not $skipShipnology) {
    Write-Host "[EXEC] Execution du script 000_create_shipnology_database.sql..." -ForegroundColor Cyan
    $script1 = Join-Path $SCRIPT_DIR "000_create_velosi_main_database.sql"

    # Modifier le script pour utiliser postgres au lieu de la commande \c
    $script1Content = Get-Content $script1 -Raw
    $script1Content = $script1Content -replace 'CREATE DATABASE shipnology;', '-- CREATE DATABASE shipnology; (cree separement)'
    $script1Content = $script1Content -replace '\\c shipnology;', '-- Connexion a shipnology'

    # Creer la base
    & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c "CREATE DATABASE shipnology;"
    Write-Host "[OK] Base 'shipnology' creee" -ForegroundColor Green

    # Creer les tables
    $tempScript = Join-Path $SCRIPT_DIR "temp_create_shipnology.sql"
    $script1Content | Out-File -FilePath $tempScript -Encoding UTF8
    & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d shipnology -f $tempScript

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Tables creees dans 'shipnology'" -ForegroundColor Green
        Remove-Item $tempScript -Force
    } else {
        Write-Host "[ERREUR] Erreur lors de la creation des tables" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ================================================================
# ETAPE 3 : CREER LA BASE 'shipnology_velosi'
# ================================================================
Write-Host "ETAPE 3 : Creation de 'shipnology_velosi'..." -ForegroundColor Yellow
Write-Host ""

# Verifier si shipnology_velosi existe deja
$shipnologyVelosiExists = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='shipnology_velosi';"
if ($shipnologyVelosiExists.Trim()) {
    Write-Host "[ATTENTION] La base 'shipnology_velosi' existe deja" -ForegroundColor Yellow
    $response = Read-Host "Voulez-vous la supprimer et recreer? (O/N)"
    if ($response -eq "O" -or $response -eq "o") {
        Write-Host "[SUPPRESSION] Suppression de 'shipnology_velosi'..." -ForegroundColor Cyan
        & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c "DROP DATABASE shipnology_velosi;"
        Write-Host "[OK] Base 'shipnology_velosi' supprimee" -ForegroundColor Green
    } else {
        Write-Host "[SKIP] Conservation de 'shipnology_velosi' existante" -ForegroundColor Cyan
        Write-Host ""
        $skipVelosi = $true
    }
}

if (-not $skipVelosi) {
    Write-Host "[CREATE] Creation de la base 'shipnology_velosi'..." -ForegroundColor Cyan
    & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c "CREATE DATABASE shipnology_velosi;"
    Write-Host "[OK] Base 'shipnology_velosi' creee" -ForegroundColor Green

    Write-Host "[COPY] Copie des donnees de 'velosi' vers 'shipnology_velosi'..." -ForegroundColor Cyan
    & pg_dump -U $DB_USER -h $DB_HOST -p $DB_PORT velosi | psql -U $DB_USER -h $DB_HOST -p $DB_PORT shipnology_velosi

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Donnees copiees avec succes" -ForegroundColor Green
    } else {
        Write-Host "[ERREUR] Erreur lors de la copie des donnees" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ================================================================
# ETAPE 4 : ENREGISTRER VELOSI DANS 'organisations'
# ================================================================
Write-Host "ETAPE 4 : Enregistrement de Velosi dans 'shipnology.organisations'..." -ForegroundColor Yellow
Write-Host ""

# Verifier si Velosi est deja enregistree
$velosiOrgExists = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d shipnology -t -c "SELECT 1 FROM organisations WHERE database_name='shipnology_velosi';"
if ($velosiOrgExists.Trim()) {
    Write-Host "[OK] Organisation 'Velosi' deja enregistree" -ForegroundColor Green
} else {
    Write-Host "[INSERT] Insertion de l'organisation 'Velosi'..." -ForegroundColor Cyan
    
    $insertOrg = @"
INSERT INTO organisations (
  id,
  nom,
  nom_affichage,
  database_name,
  email_contact,
  telephone,
  statut,
  plan,
  date_creation
) VALUES (
  1,
  'Velosi',
  'Velosi',
  'shipnology_velosi',
  'contact@velosi.com',
  '+216 00 000 000',
  'actif',
  'premium',
  NOW()
) ON CONFLICT (id) DO NOTHING;
"@
    
    & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d shipnology -c $insertOrg
    Write-Host "[OK] Organisation 'Velosi' enregistree (ID: 1)" -ForegroundColor Green
}

# Ajuster la sequence
& psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d shipnology -c "SELECT setval('organisations_id_seq', 1, true);"
Write-Host ""

# ================================================================
# ETAPE 5 : VERIFICATIONS FINALES
# ================================================================
Write-Host "ETAPE 5 : Verifications finales..." -ForegroundColor Yellow
Write-Host ""

Write-Host "[INFO] Verification des bases de donnees:" -ForegroundColor Cyan
& psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'shipnology%' OR datname = 'velosi' ORDER BY datname;"
Write-Host ""

Write-Host "[INFO] Verification des organisations:" -ForegroundColor Cyan
& psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d shipnology -c "SELECT id, nom, database_name, statut FROM organisations;"
Write-Host ""

Write-Host "[INFO] Verification des donnees dans shipnology_velosi:" -ForegroundColor Cyan
$counts = & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d shipnology_velosi -t -c @"
SELECT 
  (SELECT COUNT(*) FROM personnel) as nb_personnel,
  (SELECT COUNT(*) FROM clients) as nb_clients,
  (SELECT COUNT(*) FROM prospects) as nb_prospects,
  (SELECT COUNT(*) FROM devis) as nb_devis;
"@
Write-Host "Resultat: $counts" -ForegroundColor White
Write-Host ""

# ================================================================
# RESUME FINAL
# ================================================================
Write-Host "============================================" -ForegroundColor Green
Write-Host "  [OK] MIGRATION TERMINEE AVEC SUCCES" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Bases de donnees creees:" -ForegroundColor Cyan
Write-Host "  - shipnology (base principale - registre des organisations)" -ForegroundColor White
Write-Host "  - shipnology_velosi (donnees Velosi)" -ForegroundColor White
Write-Host ""
Write-Host "[INFO] Backup sauvegarde dans:" -ForegroundColor Cyan
Write-Host "  $BACKUP_FILE" -ForegroundColor White
Write-Host ""
Write-Host "[TODO] PROCHAINES ETAPES:" -ForegroundColor Yellow
Write-Host "  1. Mettre a jour le fichier .env du backend:" -ForegroundColor White
Write-Host "     DB_DATABASE=shipnology" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Redemarrer le backend NestJS" -ForegroundColor White
Write-Host ""
Write-Host "  3. Tester la connexion avec un utilisateur Velosi" -ForegroundColor White
Write-Host ""
Write-Host "  4. Une fois valide, vous pourrez supprimer l'ancienne base:" -ForegroundColor White
Write-Host "     DROP DATABASE velosi;" -ForegroundColor Gray
Write-Host ""
Write-Host "[ATTENTION] NE PAS SUPPRIMER 'velosi' AVANT D'AVOIR TESTE!" -ForegroundColor Red
Write-Host ""

# Nettoyer
$env:PGPASSWORD = ""
