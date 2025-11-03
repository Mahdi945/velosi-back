# Script pour basculer entre environnement LOCAL et PRODUCTION
# Usage: .\switch-env.ps1 -Environment local
#    ou: .\switch-env.ps1 -Environment prod

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("local", "prod")]
    [string]$Environment
)

$sourceFile = ""
$targetFile = ".env"

if ($Environment -eq "local") {
    $sourceFile = ".env.local"
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "🏠 BASCULEMENT VERS ENVIRONNEMENT LOCAL" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
} else {
    $sourceFile = ".env.production"
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "🚀 BASCULEMENT VERS ENVIRONNEMENT PRODUCTION" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
}

if (Test-Path $sourceFile) {
    Copy-Item -Path $sourceFile -Destination $targetFile -Force
    Write-Host "✅ Fichier .env mis à jour depuis $sourceFile" -ForegroundColor Green
    Write-Host ""
    
    # Afficher les variables importantes
    Write-Host "📋 Configuration active :" -ForegroundColor Cyan
    Write-Host "------------------------" -ForegroundColor Cyan
    
    $content = Get-Content $targetFile
    $content | Select-String "^NODE_ENV" | ForEach-Object { Write-Host $_ -ForegroundColor White }
    $content | Select-String "^DB_ADDR" | ForEach-Object { Write-Host $_ -ForegroundColor White }
    $content | Select-String "^DB_DATABASE" | ForEach-Object { Write-Host $_ -ForegroundColor White }
    $content | Select-String "^KEYCLOAK_URL" | ForEach-Object { Write-Host $_ -ForegroundColor White }
    
    Write-Host ""
    Write-Host "✨ Prêt à démarrer avec : npm run start:dev" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "❌ ERREUR : Le fichier $sourceFile n'existe pas !" -ForegroundColor Red
    Write-Host "Veuillez créer ce fichier avant de continuer." -ForegroundColor Red
    exit 1
}
