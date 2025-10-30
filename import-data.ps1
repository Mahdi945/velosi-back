# 🚀 Script d'Import Automatique - Ports et Aéroports
# Usage: .\import-data.ps1 -Token "VOTRE_TOKEN_JWT"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("openflights", "ourairports", "ports", "both", "all")]
    [string]$Source = "all"
)

$baseUrl = "http://localhost:3000/api/admin/import"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   🚀 IMPORT AUTOMATIQUE PORTS & AÉROPORTS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que le backend est accessible
try {
    Write-Host "🔍 Vérification du backend..." -ForegroundColor Yellow
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:3000" -Method GET -ErrorAction Stop
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible sur http://localhost:3000" -ForegroundColor Red
    Write-Host "💡 Assurez-vous que le backend est démarré : npm run start:dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Fonction pour afficher une barre de progression
function Show-Progress {
    param([string]$Message)
    Write-Host "$Message" -ForegroundColor Cyan -NoNewline
    for ($i = 0; $i -lt 3; $i++) {
        Start-Sleep -Milliseconds 500
        Write-Host "." -NoNewline -ForegroundColor Cyan
    }
    Write-Host ""
}

# Import selon la source choisie
if ($Source -eq "openflights" -or $Source -eq "both") {
    Write-Host "📥 Import depuis OpenFlights (~7000 aéroports)..." -ForegroundColor Yellow
    Write-Host "⏱️  Cela peut prendre 30-60 secondes..." -ForegroundColor Gray
    
    try {
        $startTime = Get-Date
        
        $response = Invoke-RestMethod -Uri "$baseUrl/aeroports/openflights" `
            -Method POST `
            -Headers @{
                "Authorization" = "Bearer $Token"
                "Content-Type" = "application/json"
            } `
            -TimeoutSec 120
        
        $duration = (Get-Date) - $startTime
        
        Write-Host "✅ Import OpenFlights terminé en $($duration.TotalSeconds) secondes" -ForegroundColor Green
        Write-Host "📊 Résultat:" -ForegroundColor Cyan
        $response | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor White
        Write-Host ""
        
    } catch {
        Write-Host "❌ Erreur lors de l'import OpenFlights:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "Status Code: $statusCode" -ForegroundColor Red
            
            if ($statusCode -eq 401) {
                Write-Host "💡 Token invalide ou expiré. Reconnectez-vous pour obtenir un nouveau token." -ForegroundColor Yellow
            }
        }
        
        if ($Source -ne "both") {
            exit 1
        }
    }
}

if ($Source -eq "ourairports" -or $Source -eq "both") {
    Write-Host "📥 Import depuis OurAirports (~55000 aéroports)..." -ForegroundColor Yellow
    Write-Host "⏱️  Cela peut prendre 2-5 minutes..." -ForegroundColor Gray
    
    try {
        $startTime = Get-Date
        
        $response = Invoke-RestMethod -Uri "$baseUrl/aeroports/ourairports" `
            -Method POST `
            -Headers @{
                "Authorization" = "Bearer $Token"
                "Content-Type" = "application/json"
            } `
            -TimeoutSec 300
        
        $duration = (Get-Date) - $startTime
        
        Write-Host "✅ Import OurAirports terminé en $($duration.TotalSeconds) secondes" -ForegroundColor Green
        Write-Host "📊 Résultat:" -ForegroundColor Cyan
        $response | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor White
        Write-Host ""
        
    } catch {
        Write-Host "❌ Erreur lors de l'import OurAirports:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "Status Code: $statusCode" -ForegroundColor Red
            
            if ($statusCode -eq 401) {
                Write-Host "💡 Token invalide ou expiré. Reconnectez-vous pour obtenir un nouveau token." -ForegroundColor Yellow
            }
        }
        
        exit 1
    }
}

# Afficher les statistiques finales
Write-Host ""
Write-Host "📊 Récupération des statistiques..." -ForegroundColor Yellow

try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/stats" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $Token"
            "Content-Type" = "application/json"
        }
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "   ✅ IMPORT TERMINÉ AVEC SUCCÈS" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Statistiques Finales:" -ForegroundColor Cyan
    Write-Host "   🚢 Ports        : $($stats.totalPorts) total ($($stats.activePorts) actifs)" -ForegroundColor Yellow
    Write-Host "   ✈️  Aéroports   : $($stats.totalAeroports) total ($($stats.activeAeroports) actifs)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Vous pouvez maintenant consulter les données dans l'interface:" -ForegroundColor Cyan
    Write-Host "   http://localhost:4200/ports-aeroports" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "⚠️  Impossible de récupérer les statistiques" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "================================================" -ForegroundColor Cyan
