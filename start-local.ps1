# ============================================
# Script : Démarrage Mode LOCAL
# ============================================
# Ce script lance le backend en mode développement local

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🏠 DÉMARRAGE MODE LOCAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Forcer le mode développement
$env:NODE_ENV = "development"

Write-Host "✅ Configuration :" -ForegroundColor Green
Write-Host "   Environment  : $env:NODE_ENV" -ForegroundColor White
Write-Host "   Fichier .env : .env (localhost)" -ForegroundColor White
Write-Host ""

Write-Host "🔗 URLs :" -ForegroundColor Yellow
Write-Host "   Keycloak     : http://localhost:8080" -ForegroundColor Cyan
Write-Host "   Backend      : http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Frontend     : http://localhost:4200" -ForegroundColor Cyan
Write-Host ""

# Vérifier que .env existe
if (-not (Test-Path ".env")) {
    Write-Host "❌ ERREUR : Fichier .env introuvable !" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solution :" -ForegroundColor Yellow
    Write-Host "   Créez le fichier .env avec la configuration localhost" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Fichier .env trouvé" -ForegroundColor Green
Write-Host ""

# Vérifier si Keycloak local est accessible
Write-Host "🔍 Vérification Keycloak local..." -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -Method GET -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    Write-Host "✅ Keycloak local est accessible" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Keycloak local n'est pas accessible" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Lancez Keycloak local :" -ForegroundColor Yellow
    Write-Host "   Option 1 : cd C:\keycloak-old\bin ; .\kc.bat start-dev" -ForegroundColor Cyan
    Write-Host "   Option 2 : docker-compose -f docker-compose.keycloak.yml up" -ForegroundColor Cyan
    Write-Host ""
    
    $continue = Read-Host "Continuer quand même ? (O/N)"
    if ($continue -ne "O" -and $continue -ne "o") {
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 DÉMARRAGE DU BACKEND" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Lancer le backend en mode développement
npm run start:dev
