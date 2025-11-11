# Script pour démarrer ngrok et exposer Keycloak
# Utilisation : .\start-ngrok.ps1

Write-Host "🚀 Démarrage de ngrok pour exposer Keycloak..." -ForegroundColor Cyan

# Chemins possibles de ngrok
$possiblePaths = @(
    "$env:USERPROFILE\Downloads\ngrok.exe",
    "$env:USERPROFILE\Downloads\ngrok\ngrok.exe",
    "$env:LOCALAPPDATA\ngrok\ngrok.exe",
    "C:\Program Files\ngrok\ngrok.exe",
    "C:\ngrok\ngrok.exe"
)

$ngrokPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $ngrokPath = $path
        Write-Host "✅ Ngrok trouvé : $ngrokPath" -ForegroundColor Green
        break
    }
}

if (-not $ngrokPath) {
    Write-Host "❌ Ngrok non trouvé dans les emplacements habituels" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Téléchargez ngrok depuis : https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "   Puis placez ngrok.exe dans : $env:USERPROFILE\Downloads\" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ou indiquez le chemin complet :" -ForegroundColor Yellow
    $customPath = Read-Host "Chemin vers ngrok.exe (ou ENTER pour annuler)"
    
    if ($customPath -and (Test-Path $customPath)) {
        $ngrokPath = $customPath
    } else {
        Write-Host "❌ Abandon" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔗 Exposition de Keycloak (port 8080)..." -ForegroundColor Cyan
Write-Host "⚠️  Laissez cette fenêtre ouverte !" -ForegroundColor Yellow
Write-Host ""

# Démarrer ngrok
& $ngrokPath http 8080
