# ============================================
# Script : Vérifier Quelle Configuration Est Active
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 VÉRIFICATION CONFIGURATION ACTIVE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier NODE_ENV
$nodeEnv = $env:NODE_ENV
if (-not $nodeEnv) {
    $nodeEnv = "development (par défaut)"
}

Write-Host "📋 Environment Actuel :" -ForegroundColor White
Write-Host "   NODE_ENV : $nodeEnv" -ForegroundColor Cyan
Write-Host ""

# Déterminer quel fichier .env sera utilisé
$envFile = ".env"
if ($nodeEnv -eq "production") {
    $envFile = ".env.production"
}

Write-Host "📁 Fichier .env Utilisé :" -ForegroundColor White
Write-Host "   $envFile" -ForegroundColor Cyan
Write-Host ""

# Vérifier si le fichier existe
if (-not (Test-Path $envFile)) {
    Write-Host "❌ ERREUR : Le fichier $envFile n'existe pas !" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "✅ Fichier $envFile trouvé" -ForegroundColor Green
Write-Host ""

# Lire et afficher la configuration
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 CONFIGURATION DÉTAILLÉE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$config = Get-Content $envFile | Where-Object { $_ -notmatch '^#' -and $_ -notmatch '^\s*$' }

$keycloakUrl = ($config | Select-String "KEYCLOAK_URL=" | Select-Object -First 1).ToString().Split("=", 2)[1]
$dbAddr = ($config | Select-String "DB_ADDR=" | Select-Object -First 1).ToString().Split("=", 2)[1]
$dbPort = ($config | Select-String "DB_PORT=" | Select-Object -First 1).ToString().Split("=", 2)[1]
$dbDatabase = ($config | Select-String "DB_DATABASE=" | Select-Object -First 1).ToString().Split("=", 2)[1]
$realm = ($config | Select-String "KEYCLOAK_REALM=" | Select-Object -First 1).ToString().Split("=", 2)[1]
$clientId = ($config | Select-String "KEYCLOAK_CLIENT_ID=" | Select-Object -First 1).ToString().Split("=", 2)[1]
$frontendUrl = ($config | Select-String "FRONTEND_URL=" | Select-Object -First 1).ToString().Split("=", 2)[1]

Write-Host "🔐 Keycloak :" -ForegroundColor Yellow
Write-Host "   URL           : $keycloakUrl" -ForegroundColor White
Write-Host "   Realm         : $realm" -ForegroundColor White
Write-Host "   Client ID     : $clientId" -ForegroundColor White
Write-Host ""

Write-Host "🗄️ Base de Données :" -ForegroundColor Yellow
Write-Host "   Host          : $dbAddr" -ForegroundColor White
Write-Host "   Port          : $dbPort" -ForegroundColor White
Write-Host "   Database      : $dbDatabase" -ForegroundColor White
Write-Host ""

Write-Host "🌐 Frontend :" -ForegroundColor Yellow
Write-Host "   URL           : $frontendUrl" -ForegroundColor White
Write-Host ""

# Déterminer le mode
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎯 MODE DÉTECTÉ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($keycloakUrl -like "*localhost*") {
    Write-Host "🏠 MODE : DÉVELOPPEMENT LOCAL" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Vous utilisez :" -ForegroundColor White
    Write-Host "   • Keycloak local (localhost:8080)" -ForegroundColor White
    Write-Host "   • Base de données locale" -ForegroundColor White
    Write-Host "   • Frontend local (localhost:4200)" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Pour démarrer :" -ForegroundColor Yellow
    Write-Host "   .\start-local.ps1" -ForegroundColor Cyan
} else {
    Write-Host "☁️ MODE : PRODUCTION (Railway/Vercel)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "✅ Vous utilisez :" -ForegroundColor White
    Write-Host "   • Keycloak Railway" -ForegroundColor White
    Write-Host "   • Base de données Supabase" -ForegroundColor White
    Write-Host "   • Frontend Vercel" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Pour tester localement :" -ForegroundColor Yellow
    Write-Host "   .\test-production.ps1" -ForegroundColor Cyan
}

Write-Host ""

# Tests de connectivité
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 TESTS DE CONNECTIVITÉ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test Keycloak
Write-Host "Test Keycloak..." -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri $keycloakUrl -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ Keycloak accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Keycloak non accessible" -ForegroundColor Red
    Write-Host "   URL : $keycloakUrl" -ForegroundColor Gray
}

Write-Host ""

# Test Backend (si démarré)
Write-Host "Test Backend (localhost:3000)..." -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "✅ Backend actif" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Backend non démarré" -ForegroundColor Yellow
}

Write-Host ""

# Test Frontend (si démarré)
if ($frontendUrl) {
    Write-Host "Test Frontend..." -ForegroundColor White
    try {
        $response = Invoke-WebRequest -Uri $frontendUrl -Method GET -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        Write-Host "✅ Frontend accessible" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Frontend non accessible" -ForegroundColor Yellow
        Write-Host "   URL : $frontendUrl" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📝 COMMANDES UTILES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Développement local :" -ForegroundColor Yellow
Write-Host "   .\start-local.ps1                    # Démarrer en mode local" -ForegroundColor Cyan
Write-Host ""

Write-Host "Test production :" -ForegroundColor Yellow
Write-Host "   .\test-production.ps1                # Tester config production" -ForegroundColor Cyan
Write-Host ""

Write-Host "Basculer manuellement :" -ForegroundColor Yellow
Write-Host "   `$env:NODE_ENV='development'         # Mode local" -ForegroundColor Cyan
Write-Host "   `$env:NODE_ENV='production'          # Mode production" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Vérification terminée !" -ForegroundColor Green
Write-Host ""
