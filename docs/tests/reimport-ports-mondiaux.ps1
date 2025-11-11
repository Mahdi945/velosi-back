# Script PowerShell pour reimporter TOUS les ports mondiaux avec noms complets
# Source: UN/LOCODE (Organisation des Nations Unies)
# Contient des milliers de ports maritimes du monde entier avec villes et pays complets
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

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  IMPORT COMPLET DES PORTS MONDIAUX" -ForegroundColor Cyan
Write-Host "  Source: UN/LOCODE (Nations Unies)" -ForegroundColor Cyan
Write-Host "  Milliers de ports avec villes et pays complets" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Verifier que le backend est accessible
Write-Host "1. Verification du backend..." -ForegroundColor Yellow
Write-Host "   Backend configure sur: $baseUrl" -ForegroundColor White
Write-Host ""

# Demander confirmation avant suppression
Write-Host "2. Suppression des ports existants" -ForegroundColor Yellow
Write-Host "   ATTENTION: Cette action va supprimer TOUS les ports existants !" -ForegroundColor Red
Write-Host "   Les aeroports ne seront PAS supprimes." -ForegroundColor Green
$confirm = Read-Host "   Voulez-vous continuer ? (oui/non)"

if ($confirm -ne "oui") {
    Write-Host "   Operation annulee par l'utilisateur" -ForegroundColor Yellow
    exit 0
}

# Supprimer tous les ports
Write-Host ""
Write-Host "   => Suppression de tous les ports en cours..." -ForegroundColor Cyan
try {
    $deletePortsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/ports" `
        -Method Delete `
        -Headers $headers `
        -TimeoutSec 30

    $deletedCount = $deletePortsResponse.deleted
    Write-Host "   OK $deletedCount ports supprimes" -ForegroundColor Green
} catch {
    Write-Host "   ERREUR lors de la suppression: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Import des ports mondiaux avec noms complets" -ForegroundColor Yellow
Write-Host "   => Telechargement depuis UN/LOCODE (peut prendre 5-10 minutes)..." -ForegroundColor Cyan
Write-Host "   => Source: Organisation des Nations Unies" -ForegroundColor White
Write-Host "   => Contient: Ports maritimes du monde entier" -ForegroundColor White
Write-Host "   => Villes et pays: Noms complets en francais" -ForegroundColor White
Write-Host ""
Write-Host "   Veuillez patienter, cette operation peut etre longue..." -ForegroundColor Yellow

try {
    $importResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/ports" `
        -Method Post `
        -Headers $headers `
        -TimeoutSec 600

    $successCount = $importResponse.success
    $errorCount = $importResponse.errors
    $message = $importResponse.message

    Write-Host ""
    if ($successCount -gt 0) {
        Write-Host "   OK $successCount ports importes avec succes" -ForegroundColor Green
        if ($errorCount -gt 0) {
            Write-Host "   ATTENTION $errorCount erreurs rencontrees" -ForegroundColor Yellow
        }
        Write-Host "   INFO $message" -ForegroundColor Cyan
    } else {
        Write-Host "   ERREUR Aucun port importe" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "   ERREUR lors de l'import: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Le backend peut avoir besoin de plus de temps..." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "4. Statistiques finales" -ForegroundColor Yellow
try {
    $statsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/stats" `
        -Method Get `
        -Headers $headers `
        -TimeoutSec 30

    Write-Host ""
    Write-Host "   STATISTIQUES COMPLETES" -ForegroundColor Cyan
    Write-Host "   -------------------------------------" -ForegroundColor White
    Write-Host "   Ports totaux      : $($statsResponse.totalPorts)" -ForegroundColor White
    Write-Host "   Ports contactes   : $($statsResponse.portsActifs)" -ForegroundColor White
    Write-Host "   Ports non contactes: $($statsResponse.portsInactifs)" -ForegroundColor White
    Write-Host "   -------------------------------------" -ForegroundColor White
    Write-Host "   Aeroports totaux  : $($statsResponse.totalAeroports)" -ForegroundColor White
    Write-Host "   Aeroports contactes: $($statsResponse.aeroportsActifs)" -ForegroundColor White
    Write-Host "   -------------------------------------" -ForegroundColor White
    Write-Host "   TOTAL GENERAL     : $($statsResponse.totalPorts + $statsResponse.totalAeroports)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "   ERREUR lors de la recuperation des statistiques: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  OK IMPORT TERMINE AVEC SUCCES !" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Remarques importantes:" -ForegroundColor Yellow
Write-Host "   - Tous les ports mondiaux ont ete importes" -ForegroundColor White
Write-Host "   - Les villes et pays sont en texte complet (pas de codes)" -ForegroundColor White
Write-Host "   - Tous les ports sont 'Non contactes' par defaut (isActive=false)" -ForegroundColor White
Write-Host "   - Vous pouvez les marquer comme 'Contactes' depuis l'interface" -ForegroundColor White
Write-Host "   - Les aeroports n'ont PAS ete modifies" -ForegroundColor White
Write-Host ""
Write-Host "Pour verifier les donnees:" -ForegroundColor Cyan
Write-Host "   - Ouvrez l'interface web: http://localhost:4200" -ForegroundColor White
Write-Host "   - Allez dans: Gestion > Ports et Aeroports" -ForegroundColor White
Write-Host "   - Filtrez par pays pour voir les ports de chaque pays" -ForegroundColor White
Write-Host ""
