# Script PowerShell pour reimporter les ports et aeroports avec noms complets
# Auteur: Velosi ERP
# Date: 2025-10-30

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

# Configuration
$baseUrl = "http://localhost:3000"
$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  REIMPORT COMPLET - PORTS ET AEROPORTS" -ForegroundColor Cyan
Write-Host "  Noms complets de villes et pays" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verifier que le backend est accessible
Write-Host "1. Verification du backend..." -ForegroundColor Yellow
Write-Host "   Backend configure sur: $baseUrl" -ForegroundColor White
Write-Host ""

# Demander confirmation avant suppression
Write-Host "2. Suppression des donnees existantes" -ForegroundColor Yellow
Write-Host "   ATTENTION: Cette action va supprimer TOUS les ports et aeroports existants !" -ForegroundColor Red
$confirm = Read-Host "   Voulez-vous continuer ? (oui/non)"

if ($confirm -ne "oui") {
    Write-Host "   Operation annulee par l'utilisateur" -ForegroundColor Yellow
    exit 0
}

# Supprimer tous les ports
Write-Host ""
Write-Host "   => Suppression de tous les ports..." -ForegroundColor Cyan
try {
    $deletePortsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/ports" `
        -Method Delete `
        -Headers $headers `
        -TimeoutSec 30
    
    Write-Host "   OK $($deletePortsResponse.deleted) ports supprimes" -ForegroundColor Green
} catch {
    Write-Host "   ERREUR lors de la suppression des ports: $($_.Exception.Message)" -ForegroundColor Red
}

# Supprimer tous les aeroports
Write-Host "   => Suppression de tous les aeroports..." -ForegroundColor Cyan
try {
    $deleteAeroportsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/aeroports" `
        -Method Delete `
        -Headers $headers `
        -TimeoutSec 30
    
    Write-Host "   OK $($deleteAeroportsResponse.deleted) aeroports supprimes" -ForegroundColor Green
} catch {
    Write-Host "   ERREUR lors de la suppression des aeroports: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Importer les ports avec noms complets
Write-Host "3. Import des ports avec noms complets" -ForegroundColor Yellow
Write-Host "   => Telechargement et import en cours (70+ ports majeurs)..." -ForegroundColor Cyan
Write-Host "   Cela peut prendre quelques secondes..." -ForegroundColor Gray

try {
    $importPortsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/ports" `
        -Method Post `
        -Headers $headers `
        -TimeoutSec 120
    
    Write-Host "   OK $($importPortsResponse.success) ports importes avec succes" -ForegroundColor Green
    Write-Host "   INFO $($importPortsResponse.message)" -ForegroundColor Cyan
    
    if ($importPortsResponse.errors -gt 0) {
        Write-Host "   ATTENTION $($importPortsResponse.errors) erreurs rencontrees" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ERREUR lors de l'import des ports: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Importer les aeroports avec noms complets
Write-Host "4. Import des aeroports avec noms complets" -ForegroundColor Yellow
Write-Host "   => Telechargement depuis OurAirports (4000+ aeroports)..." -ForegroundColor Cyan
Write-Host "   Cela peut prendre 1-2 minutes..." -ForegroundColor Gray

try {
    $importAeroportsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/aeroports" `
        -Method Post `
        -Headers $headers `
        -TimeoutSec 300
    
    Write-Host "   OK $($importAeroportsResponse.success) aeroports importes avec succes" -ForegroundColor Green
    Write-Host "   INFO $($importAeroportsResponse.message)" -ForegroundColor Cyan
    
    if ($importAeroportsResponse.errors -gt 0) {
        Write-Host "   ATTENTION $($importAeroportsResponse.errors) erreurs rencontrees" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ERREUR lors de l'import des aeroports: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Statistiques finales
Write-Host "5. Statistiques finales" -ForegroundColor Yellow
try {
    $statsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/stats" `
        -Method Get `
        -Headers $headers
    
    Write-Host ""
    Write-Host "   STATISTIQUES COMPLETES" -ForegroundColor Cyan
    Write-Host "   -------------------------------------" -ForegroundColor Gray
    Write-Host "   Ports totaux      : $($statsResponse.totalPorts)" -ForegroundColor White
    Write-Host "   Ports contactes   : $($statsResponse.activePorts)" -ForegroundColor Green
    Write-Host "   -------------------------------------" -ForegroundColor Gray
    Write-Host "   Aeroports totaux  : $($statsResponse.totalAeroports)" -ForegroundColor White
    Write-Host "   Aeroports contactes: $($statsResponse.activeAeroports)" -ForegroundColor Green
    Write-Host "   -------------------------------------" -ForegroundColor Gray
    Write-Host "   TOTAL GENERAL     : $($statsResponse.totalPorts + $statsResponse.totalAeroports)" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "   ERREUR lors de la recuperation des statistiques: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  OK REIMPORT TERMINE AVEC SUCCES !" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Remarques importantes:" -ForegroundColor Yellow
Write-Host "   - Les villes et pays sont maintenant en texte complet" -ForegroundColor White
Write-Host "   - Tous les ports/aeroports sont 'Non contactes' par defaut" -ForegroundColor White
Write-Host "   - Vous pouvez les marquer comme 'Contactes' depuis l'interface" -ForegroundColor White
Write-Host ""
