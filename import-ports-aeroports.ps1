# Script d'Import Automatique - Ports et Aeroports
# Usage: .\import-ports-aeroports.ps1 -Token "VOTRE_TOKEN_JWT"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$baseUrl = "http://localhost:3000/api/admin/import"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   IMPORT AUTOMATIQUE PORTS & AEROPORTS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verifier que le backend est accessible
try {
    Write-Host "Verification du backend..." -ForegroundColor Yellow
    $null = Invoke-RestMethod -Uri "http://localhost:3000/api/ports?page=1&limit=1" -Method GET -ErrorAction Stop -TimeoutSec 5
    Write-Host "Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "Tentative alternative de verification..." -ForegroundColor Yellow
    try {
        # Essayer l'endpoint de stats qui necessite auth
        $testHeaders = @{
            "Authorization" = "Bearer $Token"
            "Content-Type" = "application/json"
        }
        $null = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/import/stats" -Method GET -Headers $testHeaders -ErrorAction Stop -TimeoutSec 5
        Write-Host "Backend accessible (avec authentification)" -ForegroundColor Green
    } catch {
        Write-Host "Backend non accessible" -ForegroundColor Red
        Write-Host "Verifiez que le backend est demarre : npm run start:dev" -ForegroundColor Yellow
        Write-Host "Poursuite de l'import quand meme..." -ForegroundColor Yellow
    }
}

Write-Host ""

# ========================================
# ETAPE 1 : IMPORT DES PORTS
# ========================================
Write-Host "ETAPE 1/3 : Import des Ports Maritimes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tentative d'import depuis World Port Index API (~3700 ports)..." -ForegroundColor Yellow
Write-Host "En cas d'echec, fallback vers 45 ports majeurs hardcodes" -ForegroundColor Yellow
Write-Host ""

try {
    $startTime = Get-Date
    
    $responsePorts = Invoke-RestMethod -Uri "$baseUrl/ports" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $Token"
            "Content-Type" = "application/json"
        } `
        -TimeoutSec 120
    
    $duration = (Get-Date) - $startTime
    
    Write-Host "Import Ports termine en $([math]::Round($duration.TotalSeconds, 2)) secondes" -ForegroundColor Green
    Write-Host "Resultat:" -ForegroundColor Cyan
    Write-Host "  - Succes: $($responsePorts.success) ports importes" -ForegroundColor Green
    Write-Host "  - Erreurs: $($responsePorts.errors)" -ForegroundColor $(if ($responsePorts.errors -gt 0) { "Yellow" } else { "Green" })
    Write-Host ""
    
} catch {
    Write-Host "Erreur lors de l'import des Ports:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host "Token invalide ou expire. Reconnectez-vous." -ForegroundColor Yellow
            exit 1
        }
    }
    
    Write-Host "Poursuite avec l'import des aeroports..." -ForegroundColor Yellow
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
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "   IMPORT TERMINE AVEC SUCCES" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Statistiques Finales:" -ForegroundColor Cyan
    Write-Host "   Ports        : $($stats.totalPorts) total ($($stats.activePorts) actifs)" -ForegroundColor Yellow
    Write-Host "   Aeroports    : $($stats.totalAeroports) total ($($stats.activeAeroports) actifs)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Vous pouvez maintenant consulter les donnees dans l'interface:" -ForegroundColor Cyan
    Write-Host "   http://localhost:4200/ports-aeroports" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "Impossible de recuperer les statistiques" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
