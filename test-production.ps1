# ============================================
# Script : Test Mode PRODUCTION Localement
# ============================================
# Ce script lance le backend en mode production MAIS sur localhost
# Utile pour tester la configuration production avant de déployer

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "☁️ TEST MODE PRODUCTION (LOCAL)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Forcer le mode production
$env:NODE_ENV = "production"

Write-Host "⚠️ ATTENTION :" -ForegroundColor Yellow
Write-Host "   Vous testez la configuration PRODUCTION localement" -ForegroundColor White
Write-Host "   Le backend utilisera :" -ForegroundColor White
Write-Host "   • Keycloak Railway (production)" -ForegroundColor White
Write-Host "   • Base de données Supabase (production)" -ForegroundColor White
Write-Host "   • Configuration .env.production" -ForegroundColor White
Write-Host ""

Write-Host "✅ Configuration :" -ForegroundColor Green
Write-Host "   Environment  : $env:NODE_ENV" -ForegroundColor White
Write-Host "   Fichier .env : .env.production (Railway)" -ForegroundColor White
Write-Host ""

# Vérifier que .env.production existe
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ ERREUR : Fichier .env.production introuvable !" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solution :" -ForegroundColor Yellow
    Write-Host "   1. Copiez .env.production.keycloak.template vers .env.production" -ForegroundColor White
    Write-Host "   2. Configurez avec les valeurs Railway" -ForegroundColor White
    Write-Host "   3. Ou utilisez : .\configure-backend-railway.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Fichier .env.production trouvé" -ForegroundColor Green
Write-Host ""

# Lire et afficher quelques infos de .env.production
$envContent = Get-Content ".env.production"
$keycloakUrl = ($envContent | Select-String "KEYCLOAK_URL=" | Select-Object -First 1).ToString().Split("=")[1]
$dbAddr = ($envContent | Select-String "DB_ADDR=" | Select-Object -First 1).ToString().Split("=")[1]
$frontendUrl = ($envContent | Select-String "FRONTEND_URL=" | Select-Object -First 1).ToString().Split("=")[1]

Write-Host "📋 Configuration détectée :" -ForegroundColor White
Write-Host "   Keycloak     : $keycloakUrl" -ForegroundColor Cyan
Write-Host "   Database     : $dbAddr" -ForegroundColor Cyan
Write-Host "   Frontend     : $frontendUrl" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Keycloak production est accessible
Write-Host "🔍 Vérification Keycloak production..." -ForegroundColor White
if ($keycloakUrl -and $keycloakUrl -ne "" -and $keycloakUrl -ne "https://keycloak-production-xxxx.up.railway.app") {
    try {
        $response = Invoke-WebRequest -Uri $keycloakUrl -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        Write-Host "✅ Keycloak production est accessible" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Keycloak production n'est pas accessible" -ForegroundColor Yellow
        Write-Host "   URL testée : $keycloakUrl" -ForegroundColor Gray
        Write-Host ""
        Write-Host "💡 Vérifiez que Keycloak est déployé sur Railway" -ForegroundColor Yellow
        Write-Host ""
        
        $continue = Read-Host "Continuer quand même ? (O/N)"
        if ($continue -ne "O" -and $continue -ne "o") {
            exit 1
        }
    }
} else {
    Write-Host "⚠️ URL Keycloak non configurée dans .env.production" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🏗️ BUILD DU BACKEND" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Build d'abord
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erreur lors du build" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 DÉMARRAGE DU BACKEND" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 Backend local : http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

# Lancer le backend en mode production
npm run start:prod
