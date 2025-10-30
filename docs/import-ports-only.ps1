# Script d'Import Automatique - PORTS UNIQUEMENT (API Publique)
# Usage: .\import-ports-only.ps1 -Token "VOTRE_TOKEN_JWT"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$baseUrl = "http://localhost:3000/api/admin/import"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   IMPORT PORTS DEPUIS API PUBLIQUE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verifier que le backend est accessible
try {
    Write-Host "Verification du backend..." -ForegroundColor Yellow
    $testHeaders = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    $null = Invoke-RestMethod -Uri "$baseUrl/stats" -Method GET -Headers $testHeaders -ErrorAction Stop -TimeoutSec 5
    Write-Host "Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "Backend non accessible" -ForegroundColor Red
    Write-Host "Verifiez que le backend est demarre : npm run start:dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ========================================
# ETAPE 1 : NETTOYAGE DES ANCIENS PORTS
# ========================================
Write-Host "ETAPE 1/3 : Nettoyage des anciens ports" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$confirmation = Read-Host "Voulez-vous supprimer les 46 ports existants avant l'import API ? (O/N)"
if ($confirmation -eq "O" -or $confirmation -eq "o") {
    try {
        Write-Host "Suppression des ports existants..." -ForegroundColor Yellow
        
        $cleanupResponse = Invoke-RestMethod -Uri "$baseUrl/ports" `
            -Method DELETE `
            -Headers @{
                "Authorization" = "Bearer $Token"
                "Content-Type" = "application/json"
            } `
            -TimeoutSec 30
        
        Write-Host "Ports supprimes: $($cleanupResponse.deleted)" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "Erreur lors du nettoyage:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host "Poursuite de l'import quand meme..." -ForegroundColor Yellow
    }
} else {
    Write-Host "Nettoyage ignore - les doublons seront evites" -ForegroundColor Yellow
}

Write-Host ""

# ========================================
# ETAPE 2 : IMPORT DES PORTS DEPUIS API
# ========================================
Write-Host "ETAPE 2/3 : Import des Ports Maritimes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Source: UN/LOCODE GitHub Dataset" -ForegroundColor Yellow
Write-Host "Import de tous les ports maritimes mondiaux..." -ForegroundColor Yellow
Write-Host "Patientez, cela peut prendre 3-10 minutes..." -ForegroundColor Yellow
Write-Host ""

try {
    $startTime = Get-Date
    
    Write-Host "Demarrage de l'import..." -ForegroundColor Yellow
    
    $responsePorts = Invoke-RestMethod -Uri "$baseUrl/ports" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $Token"
            "Content-Type" = "application/json"
        } `
        -TimeoutSec 300
    
    $duration = (Get-Date) - $startTime
    
    Write-Host ""
    Write-Host "Import termine en $([math]::Round($duration.TotalSeconds, 2)) secondes" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resultat:" -ForegroundColor Cyan
    Write-Host "  Succes  : $($responsePorts.success) ports importes" -ForegroundColor Green
    Write-Host "  Erreurs : $($responsePorts.errors)" -ForegroundColor $(if ($responsePorts.errors -gt 0) { "Yellow" } else { "Green" })
    Write-Host "  Message : $($responsePorts.message)" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "Erreur lors de l'import des Ports:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host "Token invalide ou expire. Reconnectez-vous." -ForegroundColor Yellow
            exit 1
        } elseif ($statusCode -eq 504 -or $statusCode -eq 408) {
            Write-Host "Timeout - l'API prend trop de temps" -ForegroundColor Yellow
            Write-Host "Les ports majeurs hardcodes ont probablement ete importes" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
}

# ========================================
# ETAPE 3 : STATISTIQUES FINALES
# ========================================
Write-Host "ETAPE 3/3 : Statistiques Finales" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/stats" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $Token"
            "Content-Type" = "application/json"
        } `
        -TimeoutSec 30
    
    Write-Host "Statistiques de la base de donnees:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Ports        : $($stats.totalPorts) total ($($stats.activePorts) actifs)" -ForegroundColor Green
    Write-Host "   Aeroports    : $($stats.totalAeroports) total ($($stats.activeAeroports) actifs)" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "Impossible de recuperer les statistiques" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   IMPORT TERMINE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vous pouvez maintenant consulter les donnees dans l'interface:" -ForegroundColor Yellow
Write-Host "   http://localhost:4200/ports-aeroports" -ForegroundColor Cyan
Write-Host ""
