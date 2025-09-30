# Script PowerShell pour réparer les données d'activité Keycloak
# Usage: .\fix-keycloak-activity.ps1

Write-Host "🔧 Script de réparation des activités Keycloak - ERP Velosi" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""

# Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERREUR: Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "Installez Node.js depuis: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Vérifier si ts-node est installé
try {
    $tsNodeVersion = npx ts-node --version
    Write-Host "✅ ts-node détecté" -ForegroundColor Green
} catch {
    Write-Host "⚠️ ts-node non trouvé, installation..." -ForegroundColor Yellow
    npm install -g ts-node
}

Write-Host ""
Write-Host "🚀 Démarrage du script de réparation..." -ForegroundColor Cyan
Write-Host ""

# Exécuter le script TypeScript
try {
    npx ts-node src/scripts/fix-keycloak-activity.ts
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Script exécuté avec succès!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Étapes suivantes:" -ForegroundColor Cyan
        Write-Host "1. Redémarrez le backend NestJS" -ForegroundColor White
        Write-Host "2. Redémarrez le frontend Angular" -ForegroundColor White
        Write-Host "3. Testez les fonctionnalités d'activité dans Personnel Management" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Le script s'est terminé avec des erreurs" -ForegroundColor Red
        Write-Host "Vérifiez les logs ci-dessus pour plus de détails" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "💥 Erreur lors de l'exécution du script:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Vérifications:" -ForegroundColor Yellow
    Write-Host "- Le backend est-il démarré ?" -ForegroundColor White
    Write-Host "- Keycloak est-il accessible sur http://localhost:8080 ?" -ForegroundColor White
    Write-Host "- Les variables d'environnement sont-elles correctes ?" -ForegroundColor White
}

Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")